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
import { generateRefreshToken, hashRefreshToken } from './auth.utils';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

interface SessionInfo {
  ipAddress?: string;
  userAgent?: string;
}
type SaveRefreshTokenParams = {
  token: string;
  userId: number;
} & SessionInfo;

@Injectable()
export class AuthService {
  private readonly refreshPepper: string;
  private readonly refreshExpiresInMs = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private mailService: MailService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
  ) {
    this.refreshPepper = this.configService.get(
      'REFRESH_TOKEN_PEPPER',
    ) as string;
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.usersService.findOneByEmail(email, {
      throwIfNotFound: false,
    });
    if (!user) {
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

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findOneByEmail(dto.email, {
      throwIfNotFound: false,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
    });
    await this.generateAndSendCode(newUser);

    return {
      message: 'Success. Please check your email for verification code.',
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
    const invalidVerificationDataMsg = 'Please check your verification data';

    // Checking user, verification status, code existence
    const user = await this.usersService.findOneByEmail(dto.email, {
      throwIfNotFound: false,
    });
    if (!user || user.isVerified) {
      throw new BadRequestException(invalidVerificationDataMsg);
    }
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: {
        user: { id: user.id },
      },
      // relations: { user: true },
    });
    if (!verificationCode) {
      throw new BadRequestException(invalidVerificationDataMsg);
    }
    // Checking code expiration or too many attempts
    if (
      new Date() > verificationCode.expiresAt ||
      verificationCode.attempts >= 5
    ) {
      await incrementAttempts(verificationCode.id);
      throw new BadRequestException(
        'Code expired or too many attempts. Please request a new one.',
      );
    }
    // Checking code compliance
    if (dto.code !== verificationCode.code) {
      await incrementAttempts(verificationCode.id);
      throw new BadRequestException(invalidVerificationDataMsg);
    }
    // Success
    await this.usersService.update(user.id, { isVerified: true });
    await this.verificationCodeRepository.remove(verificationCode);
    return this.login(user, sessionInfo);
  }

  async login(user: User, sessionInfo: SessionInfo) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const refreshToken = generateRefreshToken();

    await this.saveRefreshTokenToDb({
      token: refreshToken,
      userId: user.id,
      ...sessionInfo,
    });
    return {
      access_token: this.jwtService.sign(payload),
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
    // Rotation
    const newRefreshToken = generateRefreshToken();
    await this.saveRefreshTokenToDb({
      token: newRefreshToken,
      userId: user!.id,
      ...sessionInfo,
    });
    const payload: JwtPayload = {
      sub: user!.id,
      email: user!.email,
    };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const hash = hashRefreshToken(refreshToken, this.refreshPepper);
    await this.refreshTokenRepository.delete({ tokenHash: hash });
  }

  async logoutAll(userId: number) {
    await this.refreshTokenRepository.delete({ user: { id: userId } });
  }

  private async saveRefreshTokenToDb({
    token,
    userId,
    ipAddress,
    userAgent,
  }: SaveRefreshTokenParams) {
    await this.refreshTokenRepository.save({
      tokenHash: hashRefreshToken(token, this.refreshPepper),
      user: { id: userId },
      expiresAt: new Date(Date.now() + this.refreshExpiresInMs),
      ipAddress,
      userAgent,
    });
  }
}
