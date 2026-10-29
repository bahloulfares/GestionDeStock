import { Module } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import {
  SuperAdminController,
  TenantSubscriptionController,
} from './super-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminController, TenantSubscriptionController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
