import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { ServicesModule } from './services/services.module';
import { User } from './users/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { Service } from './services/entities/service.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';
import { VerificationCode } from './auth/entities/verification-code.entity';
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
        const nodeEnv = configService.get('NODE_ENV') as string;

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
            VerificationCode,
            PasswordResetCode,
          ],
          synchronize: nodeEnv === 'local',
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    CompaniesModule,
    ServicesModule,
    AuthModule,
    MailModule,
  ],
})
export class AppModule {}
