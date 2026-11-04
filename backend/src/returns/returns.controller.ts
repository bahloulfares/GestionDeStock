import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/return.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('returns')
@ApiBearerAuth('JWT')
@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sale return' })
  create(@CurrentUser() user: any, @Body() createReturnDto: CreateReturnDto) {
    return this.returnsService.create(user.tenantId, user.sub, createReturnDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all returns' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.returnsService.findAll(
      user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return details' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.returnsService.findOne(user.tenantId, id);
  }

  @Put(':id/validate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Validate a return (ADMIN)' })
  validate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.returnsService.validate(user.tenantId, user.sub, id);
  }

  @Put(':id/reject')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject a return (ADMIN)' })
  reject(@CurrentUser() user: any, @Param('id') id: string) {
    return this.returnsService.reject(user.tenantId, user.sub, id);
  }
}
