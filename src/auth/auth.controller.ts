import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { type LocalAuthGuardUser } from './local.strategy';

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
