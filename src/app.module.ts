import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { ServicesModule } from './services/services.module';
import { User } from './users/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { Service } from './services/entities/service.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';
import { EmailVerificationCode } from './auth/entities/email-verification-code.entity';
import { MailModule } from './mail/mail.module';
import { PasswordResetCode } from './auth/entities/password-reset-code.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          entities: [
            User,
            Company,
            Service,
            RefreshToken,
            EmailVerificationCode,
            PasswordResetCode,
          ],
          synchronize: configService.get('DB_SYNC') === 'true',
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'medium',
        limit: 1000,
        ttl: 60000, // 1 minute
      },
    ]),
    UsersModule,
    CompaniesModule,
    ServicesModule,
    AuthModule,
    MailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
