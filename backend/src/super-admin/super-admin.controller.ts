import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import {
  CreateTenantByAdminDto,
  RenewSubscriptionDto,
  ToggleBlockTenantDto,
} from './dto/super-admin.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipSubscriptionCheck } from '../common/decorators/skip-subscription.decorator';

@ApiTags('Super Admin — Gestion Plateforme & Abonnements')
@ApiBearerAuth('JWT')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Roles('SUPER_ADMIN')
  @Get('stats')
  @ApiOperation({ summary: 'KPIs globaux de la plateforme (Boutiques actives, expirées, revenus DT)' })
  getStats() {
    return this.superAdminService.getDashboardStats();
  }

  @Roles('SUPER_ADMIN')
  @Get('tenants')
  @ApiOperation({ summary: 'Liste de tous les clients (boutiques) avec filtres de statut et recherche' })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.superAdminService.findAllTenants(search, status, Number(page), Number(limit));
  }

  @Roles('SUPER_ADMIN')
  @Get('tenants/:id')
  @ApiOperation({ summary: 'Détail d\'une boutique avec son historique de paiements' })
  findOne(@Param('id') id: string) {
    return this.superAdminService.findOneTenant(id);
  }

  @Roles('SUPER_ADMIN')
  @Post('tenants')
  @ApiOperation({ summary: 'Créer manuellement une nouvelle boutique avec accès abonnement' })
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantByAdminDto,
  ) {
    return this.superAdminService.createTenant(dto, user.sub);
  }

  @Roles('SUPER_ADMIN')
  @Post('tenants/:id/subscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prolonger l\'abonnement d\'un client (+1 mois, +1 an, montant encaissé)' })
  renew(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RenewSubscriptionDto,
  ) {
    return this.superAdminService.renewSubscription(id, dto, user.sub);
  }

  @Roles('SUPER_ADMIN')
  @Patch('tenants/:id/toggle-block')
  @ApiOperation({ summary: 'Suspendre ou réactiver une boutique cliente' })
  toggleBlock(
    @Param('id') id: string,
    @Body() dto: ToggleBlockTenantDto,
  ) {
    return this.superAdminService.toggleBlock(id, dto);
  }
}

@ApiTags('Mon Abonnement (Espace Client)')
@ApiBearerAuth('JWT')
@Controller('tenants')
export class TenantSubscriptionController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @SkipSubscriptionCheck()
  @Get('my-subscription')
  @ApiOperation({ summary: 'Consulter l\'état de mon abonnement, jours restants et historique' })
  getMySubscription(@CurrentUser() user: any) {
    return this.superAdminService.getMySubscription(user.tenantId);
  }
}
