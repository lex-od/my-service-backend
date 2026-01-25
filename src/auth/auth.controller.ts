import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';
import { LocalAuthGuard, type LocalAuthGuardUser } from './local';
import { JwtAuthGuard, type JwtAuthGuardUser } from './jwt';
import { getClientIp } from './auth.utils';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('resend-verification-code')
  async resendVerificationCode(@Body() dto: ResendVerificationCodeDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.verifyEmail(dto, {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: ExpressRequest) {
    return this.authService.login(req.user as LocalAuthGuardUser, {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Request() req: ExpressRequest) {
    return this.authService.refresh(dto.refresh_token, {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Request() req: ExpressRequest) {
    const user = req.user as JwtAuthGuardUser;
    await this.authService.logoutAll(user.id);
  }
}
