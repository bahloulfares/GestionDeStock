import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { InventoryModule } from './inventory/inventory.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { ReturnsModule } from './returns/returns.module';
import { MailModule } from './mail/mail.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { HealthModule } from './health/health.module';
import { PdfModule } from './pdf/pdf.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { ThrottlerProxyGuard } from './common/guards/throttler-proxy.guard';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

@Module({
  imports: [
    // ─── Configuration ───────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ─── Rate Limiting ───────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // 1 minute
        limit: 100,   // 100 requêtes par minute par défaut
      },
    ]),

    // ─── JWT (global pour les guards) ────────────────────────────────────────
    JwtModule.register({ global: true }),

    // ─── Base de données ─────────────────────────────────────────────────────
    PrismaModule,

    // ─── Modules métier ──────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    SuppliersModule,
    PurchasesModule,
    SalesModule,
    DashboardModule,
    ReportsModule,
    InventoryModule,
    ActivityLogsModule,
    ReturnsModule,
    MailModule,
    SuperAdminModule,
    PdfModule,
    HealthModule,
  ],
  providers: [
    // Guards globaux — appliqués sur toutes les routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerProxyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },

    // Filtre global — personnalise la réponse 429 du throttler (Retry-After + message FR)
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
  ],
})
export class AppModule {}
