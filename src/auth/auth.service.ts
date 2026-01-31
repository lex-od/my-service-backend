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
  private readonly sendingCodeRetryAfterMs = 60 * 1000; // 1 minute
  private readonly inputCodeMaxAttempts = 5;
  private readonly refreshPepper: string;
  private readonly refreshExpiresInMs = 30 * 24 * 60 * 60 * 1000; // 30 days
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
    const userEntity = await this.usersService.findOneByEmail(dto.email, {
      silent: true,
    });
    if (userEntity) {
      throw new ConflictException('User with this email already exists');
    }
    const newUserEntity = await this.usersService.create(dto);
    await this.generateAndSendVerificationCode(newUserEntity);
    return {
      message: 'Check your email for verification code',
    };
  }

  async resendVerificationCode(email: string) {
    const codeSentMsg =
      'If the user exists and is not verified, a code has been sent';

    // Checking user existence and verification status
    const userEntity = await this.usersService.findOneByEmail(email, {
      silent: true,
    });
    if (!userEntity || userEntity.isVerified) {
      return { message: codeSentMsg };
    }
    // Checking code existence
    const codeEntity = await this.verificationCodeRepository.findOneBy({
      user: { id: userEntity.id },
    });
    if (codeEntity) {
      // Checking if the retry time passed
      const passedTimeMs = Date.now() - codeEntity.createdAt.getTime();

      if (passedTimeMs < this.sendingCodeRetryAfterMs) {
        return { message: codeSentMsg };
      }
      await this.verificationCodeRepository.remove(codeEntity);
    }
    // Sending new code
    await this.generateAndSendVerificationCode(userEntity);
    return {
      message: codeSentMsg,
    };
  }

  async verifyEmail(dto: VerifyEmailDto, sessionInfo: SessionInfo) {
    const invalidDataMsg = 'Invalid email or registration code';

    // Checking user existence, verification status
    const userEntity = await this.usersService.findOneByEmail(dto.email, {
      silent: true,
    });
    if (!userEntity || userEntity.isVerified) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code existence
    const codeEntity = await this.verificationCodeRepository.findOneBy({
      user: { id: userEntity.id },
    });
    if (!codeEntity) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code expiration, max attempts and code compliance
    const isExpired = Date.now() > codeEntity.expiresAt.getTime();
    const isTooManyAttempts = codeEntity.attempts >= this.inputCodeMaxAttempts;
    const isMatch = dto.code === codeEntity.code;

    if (isExpired || isTooManyAttempts || !isMatch) {
      await this.verificationCodeRepository.increment(
        { id: codeEntity.id },
        'attempts',
        1,
      );
      throw new BadRequestException(invalidDataMsg);
    }
    // Updating verification status => login
    await this.usersService.update(userEntity.id, { isVerified: true });
    await this.verificationCodeRepository.remove(codeEntity);
    return this.login(userEntity, sessionInfo);
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
    const invalidTokenMsg = 'Invalid refresh token';

    // Checking refresh token existence
    const refreshHash = hashRefreshToken(refreshToken, this.refreshPepper);
    const refreshEntity = await this.refreshTokenRepository.findOne({
      where: { tokenHash: refreshHash },
      relations: { user: true },
    });
    if (!refreshEntity) {
      throw new UnauthorizedException(invalidTokenMsg);
    }
    const { user, expiresAt } = refreshEntity;
    await this.refreshTokenRepository.remove(refreshEntity);

    // Checking refresh token expiration
    if (Date.now() > expiresAt.getTime()) {
      throw new UnauthorizedException(invalidTokenMsg);
    }
    // Login
    return this.login(user!, sessionInfo);
  }

  async logout(refreshToken: string) {
    const refreshHash = hashRefreshToken(refreshToken, this.refreshPepper);
    await this.refreshTokenRepository.delete({ tokenHash: refreshHash });
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
    const invalidDataMsg = 'Invalid email or reset code';

    // Checking user existence
    const userEntity = await this.usersService.findOneByEmail(dto.email, {
      silent: true,
    });
    if (!userEntity) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code existence
    const codeEntity = await this.passwordResetCodeRepository.findOneBy({
      user: { id: userEntity.id },
    });
    if (!codeEntity) {
      throw new BadRequestException(invalidDataMsg);
    }
    // Checking code expiration, max attempts => code compliance
    if (
      codeEntity.expiresAt.getTime() < Date.now() ||
      codeEntity.attempts >= this.inputCodeMaxAttempts ||
      dto.code !== codeEntity.code
    ) {
      await this.passwordResetCodeRepository.increment(
        { id: codeEntity.id },
        'attempts',
        1,
      );
      throw new BadRequestException(invalidDataMsg);
    }
    // Updating password => login
    await this.usersService.update(userEntity.id, {
      password: dto.password,
    });
    await this.passwordResetCodeRepository.remove(codeEntity);
    await this.logoutAll(userEntity.id);

    return this.login(userEntity, sessionInfo);
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
