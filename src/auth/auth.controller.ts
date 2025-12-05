import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard, type LocalAuthGuardRequest } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: LocalAuthGuardRequest) {
    return req.user;
  }
}
