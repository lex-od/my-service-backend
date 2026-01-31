import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type Request as ExpressRequest } from 'express';
import { LocalAuthGuard, type LocalAuthGuardUser } from './local';
import { JwtAuthGuard, type JwtAuthGuardUser } from './jwt';
import { getClientIp } from './auth.utils';
import { AuthService, type SessionInfo } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const throttleOptions = {
  medium: { limit: 10, ttl: 60000 }, // 1 minute
};
const getSessionInfo = (req: ExpressRequest): SessionInfo => ({
  ipAddress: getClientIp(req),
  userAgent: req.headers['user-agent'],
});

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle(throttleOptions)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(throttleOptions)
  @Post('resend-verification-code')
  async resendVerificationCode(@Body() dto: ResendVerificationCodeDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  @Throttle(throttleOptions)
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.verifyEmail(dto, getSessionInfo(req));
  }

  @Throttle(throttleOptions)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: ExpressRequest) {
    return this.authService.login(
      req.user as LocalAuthGuardUser,
      getSessionInfo(req),
    );
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Request() req: ExpressRequest) {
    return this.authService.refresh(dto.refresh_token, getSessionInfo(req));
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

  @Throttle(throttleOptions)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle(throttleOptions)
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.resetPassword(dto, getSessionInfo(req));
  }
}
