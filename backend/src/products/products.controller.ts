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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('alerts')
  @ApiOperation({ summary: 'Produits en stock critique (qty <= minStock)' })
  getLowStockAlerts(@CurrentUser() user: CurrentUserData) {
    return this.productsService.getLowStockAlerts(user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste produits avec filtres et pagination' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('categoryId') categoryId?: string,
    @Query('lowStock') lowStock?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    const lowStockBool = lowStock === 'true' ? true : undefined;
    return this.productsService.findAll(
      user.tenantId,
      categoryId,
      lowStockBool,
      search,
      page,
      limit,
    );
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer un produit (ADMIN)' })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(user.tenantId, dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier un produit (ADMIN)' })
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete un produit (ADMIN)' })
  remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(user.tenantId, id);
  }
}
