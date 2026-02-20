import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { emailVerificationTemplate } from './templates/email-verification.template';
import { passwordResetTemplate } from './templates/password-reset.template';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
    this.frontendUrl = this.configService.get('FRONTEND_URL') as string;
  }

  async sendVerificationCode(email: string, code: string) {
    const html = emailVerificationTemplate({
      email,
      code,
      frontendUrl: this.frontendUrl,
    });
    const { error } = await this.resend.emails.send({
      from: 'MyTime Info <info@mail.mytime.com.ua>',
      to: email,
      replyTo: 'MyTime Support <esinru@gmail.com>',
      subject: `Код підтвердження MyTime: ${code}`,
      html,
    });
    if (error) {
      throw new InternalServerErrorException('Error sending email');
    }
  }

  async sendPasswordResetCode(email: string, code: string) {
    const html = passwordResetTemplate({
      email,
      code,
      frontendUrl: this.frontendUrl,
    });
    const { error } = await this.resend.emails.send({
      from: 'MyTime Info <info@mail.mytime.com.ua>',
      to: email,
      replyTo: 'MyTime Support <esinru@gmail.com>',
      subject: `Скидання пароля MyTime: ${code}`,
      html,
    });
    if (error) {
      throw new InternalServerErrorException('Error sending email');
    }
  }
}
