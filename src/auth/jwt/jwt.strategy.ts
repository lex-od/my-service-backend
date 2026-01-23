import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

export interface JwtPayload {
  id: number;
  email: string;
}
export type JwtAuthGuardUser = JwtPayload;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET') as string,
    });
  }

  validate(payload: JwtPayload): JwtAuthGuardUser {
    return payload;
  }
}
