import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

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
        this.logger.log('Tentative de connexion Ethereal Email...');
        const testAccount = await Promise.race([
          nodemailer.createTestAccount(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]) as any;
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
        this.logger.log(`✅ Ethereal Email prêt. Compte: ${testAccount.user}`);
      } catch (err) {
        // Pas d'internet ou timeout — on affiche les emails dans la console (mode dev sans réseau)
        this.logger.warn('⚠️  Ethereal Email non disponible (pas de réseau). Les emails seront affichés dans la console.');
        this.transporter = nodemailer.createTransport({ jsonTransport: true });
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
      this.logger.log('SMTP email transporter initialized.');
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
        this.logger.log('==================================================');
        this.logger.log(`[EMAIL SENT] To: ${to}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Preview URL: ${previewUrl}`);
        this.logger.log('==================================================');
      }
    } else {
      // Mode console (pas de réseau Ethereal, pas de SMTP configuré)
      this.logger.log('══════════════ EMAIL (MODE DEV - CONSOLE) ══════════════');
      this.logger.log(`📧 À        : ${to}`);
      this.logger.log(`📌 Sujet    : ${subject}`);
      this.logger.log(`📝 Contenu  : ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)}...`);
      this.logger.log('═══════════════════════════════════════════════════════');
      this.logger.log('💡 Pour recevoir de vrais emails, configurez SMTP dans backend/.env');
    }

    return info;
  }
}
