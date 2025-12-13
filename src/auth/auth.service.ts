import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { type LocalAuthGuardUser } from './local';
import { type JwtPayload } from './jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { generateRefreshToken, hashRefreshToken } from './auth.utils';

interface LoginParams {
  user: LocalAuthGuardUser;
  ipAddress?: string;
  userAgent?: string;
}
interface RefreshParams {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}
interface SaveRefreshTokenParams {
  token: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly refreshPepper: string;
  private readonly refreshExpiresInMs = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {
    this.refreshPepper = this.configService.get(
      'REFRESH_TOKEN_PEPPER',
    ) as string;
  }

  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<LocalAuthGuardUser | null> {
    const user = await this.usersService.findOneByEmail(email, {
      throwIfNotFound: false,
    });
    if (!user) {
      return null;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return null;
    }
    return this.usersService.purifyUser(user);
  }

  async login({ user, ipAddress, userAgent }: LoginParams) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const refreshToken = generateRefreshToken();

    await this.saveRefreshTokenToDb({
      token: refreshToken,
      userId: user.id,
      ipAddress,
      userAgent,
    });
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
    };
  }

  async refresh({ refreshToken, ipAddress, userAgent }: RefreshParams) {
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
      ipAddress,
      userAgent,
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
