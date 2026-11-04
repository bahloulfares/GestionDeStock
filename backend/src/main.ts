import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logger/json-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(new JsonLoggerService());
  const configService = app.get(ConfigService);

  // ─── Trust proxy (production derrière Nginx) ──────────────────────────────
  if (configService.get<string>('NODE_ENV') === 'production') {
    const trustProxyHopsStr = configService.get<string>('TRUST_PROXY_HOPS', '1');
    const trustProxyHops = parseInt(trustProxyHopsStr, 10);
    
    if (isNaN(trustProxyHops) || trustProxyHops < 0) {
      Logger.error(
        `TRUST_PROXY_HOPS invalide : ${trustProxyHopsStr}. Valeur attendue : entier >= 0.`,
        'Bootstrap',
      );
      process.exit(1);
    }
    
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
    Logger.log(`Trust proxy configure : ${trustProxyHops} saut(s)`, 'Bootstrap');
  }

  // ─── Préfixe API ──────────────────────────────────────────────────────────
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // ─── Sécurité : Helmet ────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          imgSrc: [`'self'`, 'data:', 'https:'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          defaultSrc: [`'self'`],
        },
      },
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Validation globale ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger ──────────────────────────────────────────────────────────────
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('StockTN API')
      .setDescription(
        'API SaaS Gestion de Stocks — Boutiques Accessoires Téléphones Tunisie',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('Auth', 'Authentification et gestion des sessions')
      .addTag('Products', 'Gestion des produits')
      .addTag('Categories', 'Gestion des catégories')
      .addTag('Suppliers', 'Gestion des fournisseurs')
      .addTag('Purchase Orders', 'Bons de commande')
      .addTag('Sales', 'Gestion des ventes')
      .addTag('Dashboard', 'Tableau de bord')
      .addTag('Reports', 'Rapports et statistiques')
      .addTag('Inventory', 'Inventaire physique')
      .addTag('Users', 'Gestion des utilisateurs')
      .addTag('Activity Logs', "Journaux d'activité")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ─── Démarrage ────────────────────────────────────────────────────────────
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  Logger.log(
    `🚀 StockTN API démarrée sur : http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  if (configService.get<string>('NODE_ENV') !== 'production') {
    Logger.log(
      `📚 Swagger UI          : http://localhost:${port}/${apiPrefix}/docs`,
      'Bootstrap',
    );
  }
}

bootstrap();
