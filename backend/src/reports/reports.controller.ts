import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@Roles('ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('top-products')
  @ApiOperation({ summary: 'Top N produits par quantité vendue sur une période (ADMIN)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    return this.reportsService.getTopProducts(
      user.tenantId,
      startDate,
      endDate,
      limit,
    );
  }

  @Get('sales-by-period')
  @ApiOperation({ summary: 'Total ventes par période groupées (ADMIN)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  getSalesByPeriod(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.reportsService.getSalesByPeriod(
      user.tenantId,
      startDate,
      endDate,
      groupBy,
    );
  }

  @Get('stock-value')
  @ApiOperation({ summary: 'Valeur totale du stock par catégorie + produits inactifs (ADMIN)' })
  getStockValue(@CurrentUser() user: CurrentUserData) {
    return this.reportsService.getStockValue(user.tenantId);
  }

  @Get('stock-alerts')
  @ApiOperation({ summary: 'Produits sous le seuil minimum (ADMIN)' })
  getStockAlerts(@CurrentUser() user: CurrentUserData) {
    return this.reportsService.getStockAlerts(user.tenantId);
  }

  @Get('sales/export')
  @ApiOperation({ summary: 'Exporter les ventes en Excel (ADMIN)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportSales(
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const buffer = await this.reportsService.exportSalesExcel(
      user.tenantId,
      startDate,
      endDate,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="ventes.xlsx"');
    res.send(buffer);
  }
}
