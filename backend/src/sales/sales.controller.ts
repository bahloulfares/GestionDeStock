import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, CancelSaleDto } from './dto/sale.dto';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Sales')
@ApiBearerAuth('JWT')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des ventes avec filtres' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'paymentMethod', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.salesService.findAll(
      user.tenantId,
      startDate,
      endDate,
      paymentMethod,
      status,
      page,
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une vente avec items" })
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.salesService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une vente (ADMIN + EMPLOYEE)' })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(user.tenantId, user.sub, dto);
  }

  @Post(':id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Annuler une vente et réintégrer le stock (ADMIN)' })
  cancel(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: CancelSaleDto,
  ) {
    return this.salesService.cancel(user.tenantId, user.sub, id, dto);
  }
}
