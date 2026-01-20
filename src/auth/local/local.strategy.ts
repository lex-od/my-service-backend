import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { AuthService } from '../auth.service';

export type LocalAuthGuardUser = User;

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  validate(email: string, password: string): Promise<LocalAuthGuardUser> {
    return this.authService.validateCredentials(email, password);
  }
}
