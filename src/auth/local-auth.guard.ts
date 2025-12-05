import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

// Types

export type LocalAuthGuardUser = Awaited<ReturnType<LocalStrategy['validate']>>;
export type LocalAuthGuardRequest = Express.Request & {
  user: LocalAuthGuardUser;
};
