import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { User } from 'src/users/entities/user.entity';
import { type JwtPayload } from './jwt';
import {
  generateRefreshToken,
  generateSixDigitsCode,
  hashRefreshToken,
} from './auth.utils';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface SessionInfo {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly verificationCodeExpiresInMs = 30 * 60 * 1000; // 30 minutes
  private readonly verificationMaxAttempts = 5;
  private readonly refreshPepper: string;
  private readonly refreshExpiresInMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly sendingCodeRetryAfterMs = 60 * 1000; // 1 minute
  private readonly passwordResetCodeExpiresInMs = 10 * 60 * 1000; // 10 minutes

  constructor(
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetCode)
    private passwordResetCodeRepository: Repository<PasswordResetCode>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private mailService: MailService,
  ) {
    this.refreshPepper = this.configService.get(
      'REFRESH_TOKEN_PEPPER',
    ) as string;
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findOneByEmail(dto.email, {
      silent: true,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const newUser = await this.usersService.create(dto);
    await this.generateAndSendVerificationCode(newUser);
    return {
      message: 'Success. Please check your email for verification code.',
    };
  }

  async resendVerificationCode(email: string) {
    const user = await this.usersService.findOneByEmail(email, {
      silent: true,
    });
    if (!user || user.isVerified) {
      throw new BadRequestException('User not found or already verified');
    }
    await this.verificationCodeRepository.delete({
      user: { id: user.id },
    });
    await this.generateAndSendVerificationCode(user);
    return {
      message: 'Code sent. Please check your email.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto, sessionInfo: SessionInfo) {
    const incrementAttempts = (verificationCodeId: number) => {
      return this.verificationCodeRepository.increment(
        { id: verificationCodeId },
        'attempts',
        1,
      );
    };
    const invalidDataMsg = 'Please check your verification data';

    // Checking user existence, verification status
    const user = await this.usersService.findOneByEmail(dto.email, {
      silent: true,
    });
    if (!user || user.isVerified) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code existence
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: {
        user: { id: user.id },
      },
    });
    if (!verificationCode) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code expiration and max attempts
    if (
      new Date() > verificationCode.expiresAt ||
      verificationCode.attempts >= this.verificationMaxAttempts
    ) {
      await incrementAttempts(verificationCode.id);
      throw new BadRequestException(
        'Code expired or too many attempts. Please request a new one.',
      );
    }
    // Checking code compliance
    if (dto.code !== verificationCode.code) {
      await incrementAttempts(verificationCode.id);
      throw new BadRequestException(invalidDataMsg);
    }
    // All checks passed
    await this.usersService.update(user.id, { isVerified: true });
    await this.verificationCodeRepository.remove(verificationCode);
    return this.login(user, sessionInfo);
  }

  async login(user: User, sessionInfo: SessionInfo) {
    const accessToken = this.jwtService.sign<JwtPayload>({
      id: user.id,
      email: user.email,
    });
    const refreshToken = await this.generateAndSaveRefreshToken(
      user.id,
      sessionInfo,
    );
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refresh(refreshToken: string, sessionInfo: SessionInfo) {
    // Validation
    const hash = hashRefreshToken(refreshToken, this.refreshPepper);
    const entity = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hash },
      relations: { user: true },
    });
    if (!entity) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const { user, expiresAt } = entity;
    await this.refreshTokenRepository.delete({ id: entity.id });

    if (expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Refresh token is valid
    return this.login(user!, sessionInfo);
  }

  async logout(refreshToken: string) {
    const hash = hashRefreshToken(refreshToken, this.refreshPepper);
    await this.refreshTokenRepository.delete({ tokenHash: hash });
  }

  async logoutAll(userId: number) {
    await this.refreshTokenRepository.delete({ user: { id: userId } });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const codeSentMsg = 'If the email exists, a code has been sent';

    // Checking user existence
    const userEntity = await this.usersService.findOneByEmail(dto.email, {
      silent: true,
    });
    if (!userEntity) {
      return { message: codeSentMsg };
    }
    // Checking code existence
    const codeEntity = await this.passwordResetCodeRepository.findOneBy({
      user: { id: userEntity.id },
    });
    if (codeEntity) {
      // Checking code expiration
      const passedTimeMs = Date.now() - codeEntity.createdAt.getTime();

      if (passedTimeMs < this.sendingCodeRetryAfterMs) {
        return { message: codeSentMsg };
      }
      await this.passwordResetCodeRepository.delete({ id: codeEntity.id });
    }
    // Sending new code
    const code = generateSixDigitsCode();

    await this.passwordResetCodeRepository.save({
      user: { id: userEntity.id },
      code,
      expiresAt: new Date(Date.now() + this.passwordResetCodeExpiresInMs),
    });
    await this.mailService.sendPasswordResetCode(userEntity.email, code);

    return { message: codeSentMsg };
  }

  async resetPassword(dto: ResetPasswordDto, sessionInfo: SessionInfo) {
    const incrementAttempts = (id: number) => {
      return this.passwordResetCodeRepository.increment({ id }, 'attempts', 1);
    };
    const invalidDataMsg = 'Invalid reset code or email';

    // Checking user existence
    const user = await this.usersService.findOneByEmail(dto.email, {
      silent: true,
    });
    if (!user) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code existence
    const passwordResetCode = await this.passwordResetCodeRepository.findOne({
      where: {
        user: { id: user.id },
      },
    });
    if (!passwordResetCode) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code expiration and max attempts
    if (
      passwordResetCode.expiresAt < new Date() ||
      passwordResetCode.attempts >= this.verificationMaxAttempts
    ) {
      await incrementAttempts(passwordResetCode.id);
      throw new BadRequestException(
        'Code expired or too many attempts. Please request a new one.',
      );
    }
    // Checking code compliance
    if (dto.code !== passwordResetCode.code) {
      await incrementAttempts(passwordResetCode.id);
      throw new BadRequestException(invalidDataMsg);
    }
    // All checks passed
    await this.usersService.update(user.id, { password: dto.password });
    await this.passwordResetCodeRepository.remove(passwordResetCode);
    await this.logoutAll(user.id);

    return this.login(user, sessionInfo);
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.usersService.findOneByEmail(email, {
      silent: true,
    });
    if (!user?.password) {
      throw new UnauthorizedException();
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException();
    }
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email');
    }
    return user;
  }

  private async generateAndSendVerificationCode(user: User) {
    const code = generateSixDigitsCode();

    await this.verificationCodeRepository.save({
      user: { id: user.id },
      code,
      expiresAt: new Date(Date.now() + this.verificationCodeExpiresInMs),
    });
    await this.mailService.sendVerificationCode(user.email, code);
  }

  private async generateAndSaveRefreshToken(
    userId: number,
    sessionInfo: SessionInfo,
  ) {
    const refreshToken = generateRefreshToken();

    await this.refreshTokenRepository.save({
      tokenHash: hashRefreshToken(refreshToken, this.refreshPepper),
      user: { id: userId },
      expiresAt: new Date(Date.now() + this.refreshExpiresInMs),
      ...sessionInfo,
    });
    return refreshToken;
  }
}
