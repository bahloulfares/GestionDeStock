import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventorySessionDto } from './dto/inventory.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Inventory')
@ApiBearerAuth('JWT')
@Roles('ADMIN')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({
    summary: "Liste des sessions d'inventaire du tenant (ADMIN)",
  })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.inventoryService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Détail d'une session d'inventaire avec items (ADMIN)",
  })
  findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.inventoryService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({
    summary: "Créer une session d'inventaire et corriger les stocks (ADMIN)",
  })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateInventorySessionDto,
  ) {
    return this.inventoryService.create(user.tenantId, user.sub, dto);
  }

  @Post(':id/validate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary:
      "Valider une session d'inventaire DRAFT et appliquer les écarts de stock",
  })
  validate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.inventoryService.validate(user.tenantId, user.sub, id);
  }
}
