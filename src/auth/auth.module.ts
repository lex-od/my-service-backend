import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { MailModule } from 'src/mail/mail.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local';
import { JwtStrategy } from './jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { PasswordResetCode } from './entities/password-reset-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshToken,
      VerificationCode,
      PasswordResetCode,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MailModule,
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
