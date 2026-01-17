import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { emailVerificationTpl } from './templates/email-verification.template';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendVerificationCode(email: string, code: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL') as string;

    const html = emailVerificationTpl({
      code,
      frontendUrl,
      email: encodeURIComponent(email),
    });
    const { error } = await this.resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `Ваш код підтвердження: ${code}`,
      html,
    });
    if (error) {
      throw new InternalServerErrorException('Error sending email');
    }
  }
}
