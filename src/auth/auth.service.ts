import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { type LocalAuthGuardUser } from './local';
import { type JwtPayload } from './jwt';
import { RefreshToken } from './refresh-token.entity';
import { generateRefreshToken, hashToken } from './token.utils';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<LocalAuthGuardUser | null> {
    const user = await this.usersService.findOneByEmail(email, {
      throwIfNotFound: false,
    });
    if (!user) {
      return null;
    }
    const match = await bcrypt.compare(pass, user.password);
    if (!match) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async login(user: LocalAuthGuardUser) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
    };
    const accessToken = this.jwtService.sign(payload);

    const rawRefresh = generateRefreshToken();
    const pepper = this.configService.get('REFRESH_TOKEN_PEPPER') as string;
    const tokenHash = hashToken(rawRefresh, pepper);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const rt = this.refreshTokenRepository.create({
      tokenHash,
      user: { id: user.id },
      expiresAt,
    });
    await this.refreshTokenRepository.save(rt);

    return {
      access_token: accessToken,
      refresh_token: rawRefresh,
    };
  }

  async refresh(rawRefreshToken: string) {
    const pepper = this.configService.get('REFRESH_TOKEN_PEPPER') as string;
    const tokenHash = hashToken(rawRefreshToken, pepper);
    const found = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
    if (!found) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (found.expiresAt.getTime() < Date.now()) {
      await this.refreshTokenRepository.delete({ id: found.id });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate: remove old token and create a new one
    await this.refreshTokenRepository.delete({ id: found.id });

    const newRaw = generateRefreshToken();
    const newHash = hashToken(newRaw, pepper);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const newRt = this.refreshTokenRepository.create({
      tokenHash: newHash,
      user: found.user,
      expiresAt,
    });
    await this.refreshTokenRepository.save(newRt);

    const payload: JwtPayload = {
      email: found.user.email,
      sub: found.user.id,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      access_token: accessToken,
      refresh_token: newRaw,
    };
  }

  async logout(rawRefreshToken: string) {
    const pepper = this.configService.get('REFRESH_TOKEN_PEPPER') as string;
    const tokenHash = hashToken(rawRefreshToken, pepper);
    await this.refreshTokenRepository.delete({ tokenHash });
  }

  async logoutAll(userId: number) {
    await this.refreshTokenRepository.delete({ user: { id: userId } });
  }
}
