import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { type LocalAuthGuardUser, LocalAuthGuard } from './local';
import { JwtAuthGuard, JwtAuthGuardUser } from './jwt';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: Express.Request) {
    return this.authService.login(req.user as LocalAuthGuardUser);
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string) {
    await this.authService.logout(refreshToken);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Request() req: Express.Request) {
    const user = req.user as JwtAuthGuardUser;
    await this.authService.logoutAll(user.id);
    return { ok: true };
  }
}
