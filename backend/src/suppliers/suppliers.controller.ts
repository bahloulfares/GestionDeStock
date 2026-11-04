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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth('JWT')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des fournisseurs du tenant' })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('search') search?: string,
  ) {
    return this.suppliersService.findAll(user.tenantId, search);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer un fournisseur (ADMIN)' })
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user.tenantId, dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier un fournisseur (ADMIN)' })
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Supprimer un fournisseur (ADMIN) - bloqué si des BCs existent',
  })
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.suppliersService.remove(user.tenantId, id);
  }
}
