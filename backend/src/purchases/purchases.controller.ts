import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dto/purchase.dto';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Purchase Orders')
@ApiBearerAuth('JWT')
@Roles('ADMIN')
@Controller('purchase-orders')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des bons de commande avec filtres' })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.purchasesService.findAll(
      user.tenantId,
      supplierId,
      status,
      startDate,
      endDate,
      page,
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un bon de commande avec items" })
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un bon de commande (ADMIN)' })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasesService.create(user.tenantId, user.sub, dto);
  }

  @Put(':id/validate')
  @ApiOperation({ summary: 'Valider un BC DRAFT → met à jour les stocks (ADMIN)' })
  validate(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.purchasesService.validate(user.tenantId, user.sub, id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Annuler un BC (non VALIDATED) (ADMIN)' })
  cancel(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.purchasesService.cancel(user.tenantId, user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un BC DRAFT (ADMIN)' })
  remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.purchasesService.remove(user.tenantId, user.sub, id);
  }
}
