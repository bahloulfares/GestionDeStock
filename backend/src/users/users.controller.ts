import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste tous les utilisateurs du tenant (ADMIN)' })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.usersService.findAll(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un employé (ADMIN)' })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un utilisateur (ADMIN)' })
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.tenantId, id, dto);
  }
}
