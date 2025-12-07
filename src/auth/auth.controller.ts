import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard, type LocalAuthGuardRequest } from './local-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: LocalAuthGuardRequest) {
    return this.authService.login(req.user);
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  logout(@Request() req: LocalAuthGuardRequest) {
    req.logout(() => null);
  }
}
