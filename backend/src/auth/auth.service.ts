import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  // ─── Setup (Initialisation de l'application / Premier démarrage) ───────────
  async setup(dto: RegisterDto) {
    const superAdminCount = await this.prisma.user.count({
      where: { role: 'SUPER_ADMIN' },
    });
    if (superAdminCount > 0) {
      throw new ConflictException(
        "L'application est déjà initialisée. Utilisez /auth/login pour vous connecter.",
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Si c'est le tout premier démarrage absolu : on crée le Super-Admin ou la première boutique
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName,
          email: dto.email,
          phone: dto.phone,
          plan: 'YEARLY',
          status: 'ACTIVE',
          subscriptionExpiresAt: oneYearFromNow,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          verifyToken: null,
        },
      });

      return { tenant, user };
    });

    this.logger.log(`[SETUP] Application initialized successfully by Admin: ${dto.email}`);

    return {
      message: 'Application configurée avec succès. Vous pouvez maintenant vous connecter.',
      tenantId: result.tenant.id,
    };
  }

  // ─── Register (Nouvelle boutique cliente avec 14 jours d'essai gratuit) ────
  async register(dto: RegisterDto) {
    // Vérifier si un tenant avec cet email existe déjà
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });
    if (existingTenant) {
      throw new ConflictException('Une boutique avec cet email existe déjà');
    }

    // Vérifier si un utilisateur global avec cet email existe
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Période d'essai de 14 jours gratuite
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 14);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName,
          email: dto.email,
          phone: dto.phone,
          plan: 'TRIAL',
          status: 'TRIAL',
          subscriptionExpiresAt: trialExpiry,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          verifyToken: null,
        },
      });

      return { tenant, user };
    });

    this.logger.log(`[REGISTER] New shop registered: ${dto.shopName} (${dto.email}) with 14-day trial`);

    return {
      message: 'Compte créé avec succès ! Vous bénéficiez de 14 jours d\'essai gratuit.',
      tenantId: result.tenant.id,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    // Chercher l'utilisateur avec son tenant éventuel
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Compte non vérifié. Vérifiez votre email.');
    }

    // Si c'est un utilisateur rattaché à une boutique (ADMIN ou EMPLOYEE)
    let subscriptionInfo: any = null;
    if (user.tenant) {
      if (user.tenant.isBlocked) {
        throw new ForbiddenException(
          `Accès suspendu : ${user.tenant.blockReason || 'Veuillez contacter le support pour réactiver votre boutique.'}`,
        );
      }

      const now = new Date();
      const expiresAt = new Date(user.tenant.subscriptionExpiresAt);
      const isExpired = expiresAt < now;
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24));

      subscriptionInfo = {
        status: isExpired ? 'EXPIRED' : user.tenant.status,
        plan: user.tenant.plan,
        expiresAt: user.tenant.subscriptionExpiresAt,
        daysLeft: Math.max(0, daysLeft),
        isExpired,
        shopName: user.tenant.name,
      };
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    return {
      ...tokens,
      subscription: subscriptionInfo,
    };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        isActive: true,
      },
    });

    if (!user) {
      return {
        message: "Si un compte est associé à cette adresse, un e-mail de réinitialisation a été envoyé.",
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordExpiry: expiry,
      },
    });

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background-color: #f9fafb; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800;">StockTN</h1>
          <p style="color: #4b5563; margin: 4px 0 0 0; font-size: 14px;">Gestion de Stock Professionnelle</p>
        </div>
        <div style="background-color: white; padding: 24px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 18px; font-weight: 600; border-bottom: 1px solid #f3f4f6; padding-bottom: 12px;">Réinitialisation de votre mot de passe</h2>
          <p style="font-size: 15px; line-height: 1.5; color: #4b5563;">Vous avez demandé la réinitialisation de votre mot de passe pour votre compte StockTN.</p>
          <p style="font-size: 15px; line-height: 1.5; color: #4b5563;">Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est valide pendant <strong>15 minutes</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Réinitialiser mon mot de passe</a>
          </div>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.4; background-color: #f3f4f6; padding: 12px; border-radius: 4px; border-left: 4px solid #d1d5db;">
            Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :<br/>
            <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
          </p>
          <p style="font-size: 14px; color: #4b5563; margin-top: 24px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>Ceci est un e-mail automatique, veuillez ne pas y répondre.</p>
          <p>&copy; ${new Date().getFullYear()} StockTN. Tous droits réservés.</p>
        </div>
      </div>
    `;

    try {
      await this.mailService.sendMail(
        user.email,
        'Réinitialisation de votre mot de passe — StockTN',
        htmlContent,
      );
    } catch (error) {
      this.logger.error(
        'Failed to send forgot password email',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      message: "Si un compte est associé à cette adresse, un e-mail de réinitialisation a été envoyé.",
    };
  }

  // ─── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpiry: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Le lien de réinitialisation est invalide ou a expiré (Invalid or expired token)');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        passwordChangedAt: new Date(),
      },
    });

    this.logger.log(`[AUTH] Password reset successfully for user: ${user.email}`);

    return {
      message: 'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Trouver le token en base
    const storedTokens = await this.prisma.tokenStore.findMany({
      where: {
        userId: payload.sub,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let validToken: typeof storedTokens[0] | undefined;
    for (const stored of storedTokens) {
      const matches = await bcrypt.compare(refreshToken, stored.refreshTokenHash);
      if (matches) {
        validToken = stored;
        break;
      }
    }

    if (!validToken) {
      // Token réutilisé ou non trouvé → révoquer toutes les sessions
      await this.prisma.tokenStore.updateMany({
        where: { userId: payload.sub },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Session invalide. Veuillez vous reconnecter.');
    }

    // Révoquer l'ancien token (rotation)
    await this.prisma.tokenStore.update({
      where: { id: validToken.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return { message: 'Déconnecté avec succès' };
    }

    const storedTokens = await this.prisma.tokenStore.findMany({
      where: { userId: payload.sub, revoked: false },
    });

    for (const stored of storedTokens) {
      const matches = await bcrypt.compare(refreshToken, stored.refreshTokenHash);
      if (matches) {
        await this.prisma.tokenStore.update({
          where: { id: stored.id },
          data: { revoked: true },
        });
        break;
      }
    }

    return { message: 'Déconnecté avec succès' };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    tenantId: string | null,
  ) {
    const payload = { sub: userId, email, role, tenantId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
    });

    // Stocker le refresh token hashé
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.tokenStore.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, role, tenantId };
  }
}
