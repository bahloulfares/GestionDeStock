import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // Vérifier si le tenant/email existe déjà
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });
    if (existingTenant) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const bypassEmail = this.config.get<string>('DEV_BYPASS_EMAIL') === 'true';

    // Créer le tenant + utilisateur admin en transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName,
          email: dto.email,
          phone: dto.phone,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
          isVerified: bypassEmail,
          verifyToken: bypassEmail ? null : uuidv4(),
        },
      });

      return { tenant, user };
    });

    // TODO: Envoyer email de vérification si !bypassEmail

    return {
      message: bypassEmail
        ? 'Compte créé avec succès. Vous pouvez vous connecter.'
        : 'Compte créé. Vérifiez votre email pour activer votre compte.',
      tenantId: result.tenant.id,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    // Chercher le tenant par email
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });

    // Chercher l'utilisateur (peut être un sous-utilisateur)
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        isActive: true,
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

    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
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
    tenantId: string,
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
