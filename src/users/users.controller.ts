import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard, type JwtAuthGuardUser } from 'src/auth/jwt';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('current/with-companies')
  getCurrentWithCompanies(@Request() req: Express.Request) {
    const user = req.user as JwtAuthGuardUser;
    return this.usersService.findOneByIdWithCompanies(user.id);
  }
}
