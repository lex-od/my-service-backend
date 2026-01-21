import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { type LocalAuthGuardUser, LocalAuthGuard } from './local';
import { JwtAuthGuard, JwtAuthGuardUser } from './jwt';
import { getClientIp } from './auth.utils';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Request() req: ExpressRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(req.user as LocalAuthGuardUser, {
      ipAddress: getClientIp(req),
      userAgent,
    });
  }

  @Post('refresh')
  async refresh(
    @Body('refresh_token') refreshToken: string,
    @Request() req: ExpressRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.refresh(refreshToken, {
      ipAddress: getClientIp(req),
      userAgent,
    });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string) {
    await this.authService.logout(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  async logoutAll(@Request() req: ExpressRequest) {
    const user = req.user as JwtAuthGuardUser;
    await this.authService.logoutAll(user.id);
  }
}
