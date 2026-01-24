import {
  Injectable,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { type Request } from 'express';
import { LoginDto } from '../dto/login.dto';

function formatValidationErrors(errors: ValidationError[]) {
  return errors.map((error) =>
    Object.values(error.constraints || {}).join(', '),
  );
}

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const dto = plainToInstance(LoginDto, request.body);
    const errors = await validate(dto);

    if (errors.length) {
      const messages = formatValidationErrors(errors);
      throw new BadRequestException(messages);
    }
    return super.canActivate(context) as Promise<boolean>;
  }
}
