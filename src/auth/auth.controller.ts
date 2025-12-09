import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { type LocalAuthGuardUser, LocalAuthGuard } from './local';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: Express.Request) {
    return this.authService.login(req.user as LocalAuthGuardUser);
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  logout(@Request() req: Express.Request) {
    req.logout(() => null);
  }
}
