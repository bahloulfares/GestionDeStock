import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_SUBSCRIPTION_KEY } from '../decorators/skip-subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipSubscription = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipSubscription) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si pas encore authentifié, le JwtAuthGuard s'en occupe
    if (!user) return true;

    // Le SUPER_ADMIN a tous les droits sans restriction d'abonnement
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Aucune boutique associée à cet utilisateur');
    }

    // Récupérer les informations du tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        isBlocked: true,
        blockReason: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!tenant) {
      throw new ForbiddenException('Boutique introuvable');
    }

    if (tenant.isBlocked) {
      throw new ForbiddenException(
        `Accès bloqué : Cette boutique a été suspendue par la plateforme. ${tenant.blockReason ? 'Raison: ' + tenant.blockReason : 'Contactez le support.'}`,
      );
    }

    const now = new Date();
    const isExpired = new Date(tenant.subscriptionExpiresAt) < now;

    if (isExpired) {
      // Si la méthode HTTP modifie des données (écriture/action commerciale)
      const method = request.method?.toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        throw new ForbiddenException(
          'Abonnement expiré : Votre accès en écriture est suspendu. Veuillez renouveler votre abonnement auprès du responsable commercial.',
        );
      }

      // En lecture GET, on attache l'information dans la requête
      request.isSubscriptionExpired = true;
    }

    return true;
  }
}
