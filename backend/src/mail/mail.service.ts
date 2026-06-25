import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private isEthereal = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initTransporter();
  }

  async initTransporter() {
    const isDev = this.configService.get<string>('NODE_ENV') === 'development';
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');

    if (isDev && (!smtpHost || smtpUser === 'votre@email.com' || smtpHost === 'smtp.gmail.com')) {
      try {
        console.log('Generating Ethereal Email test account...');
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.isEthereal = true;
        console.log(`Ethereal Email transporter initialized. User: ${testAccount.user}`);
      } catch (err) {
        console.error('Failed to create Ethereal Email account, falling back to dummy JSON transporter:', err);
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    } else {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.configService.get<string>('SMTP_PORT') || 587),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: smtpUser,
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      console.log('SMTP email transporter initialized.');
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      await this.initTransporter();
    }

    const from = this.configService.get<string>('SMTP_FROM') || '"StockTN" <noreply@stocktn.tn>';
    const info = await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    if (this.isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('\n==================================================');
        console.log(`[EMAIL SENT] To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Preview URL: ${previewUrl}`);
        console.log('==================================================\n');
      }
    }

    return info;
  }
}
