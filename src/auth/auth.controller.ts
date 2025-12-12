import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body('refresh_token') refreshToken: string) {
    await this.authService.logout(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Request() req: Express.Request) {
    const user = req.user as JwtAuthGuardUser;
    await this.authService.logoutAll(user.id);
  }
}
