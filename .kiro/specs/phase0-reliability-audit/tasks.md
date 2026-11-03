# Implementation Plan: Phase 0 — Audit & Fiabilité

## Overview

Ce plan couvre huit blocs de correction ciblés sur le backend NestJS/Prisma de StockTN. Aucune fonctionnalité métier nouvelle n'est introduite. La migration Prisma est unique et couvre tous les changements de schéma (Fix 4 + Fix 5). Les blocs T1, T2, T3, T6, T7 et T8 sont indépendants ; T4 et T5 partagent la migration et doivent être livrés ensemble.

## Tasks

- [x] 1. T1 — Protection de `/auth/setup`
  - [x] 1.1 Modifier `auth.service.ts::setup()` pour compter uniquement les SUPER_ADMIN
    - Remplacer `this.prisma.user.count()` par `this.prisma.user.count({ where: { role: 'SUPER_ADMIN' } })`
    - Lever `ConflictException` avec message français si le comptage retourne > 0
    - Supprimer le fallback silencieux vers `this.register(dto)` — `setup()` ne doit plus jamais appeler `register()`
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ]* 1.2 Écrire les tests unitaires de `setup()`
    - Mock `prisma.user.count` retournant 1 → vérifier que `ConflictException` est levée
    - Mock `prisma.user.count` retournant 0 → vérifier que la création de tenant et d'utilisateur est déclenchée
    - _Requirements: 1.1, 1.2_

- [x] 2. T2 — Trust proxy + Rate limiting IP réelle
  - [x] 2.1 Activer `trust proxy` dans `main.ts` pour la production
    - Après `NestFactory.create()`, lire `configService.get('NODE_ENV')` et, si `production`, appeler `app.getHttpAdapter().getInstance().set('trust proxy', 1)`
    - _Requirements: 2.2_

  - [x] 2.2 Créer `ThrottlerProxyGuard` dans `backend/src/common/guards/throttler-proxy.guard.ts`
    - Étendre `ThrottlerGuard` de `@nestjs/throttler`
    - Implémenter `getTracker(req: Request): Promise<string>` retournant `req.ip ?? req.socket.remoteAddress ?? 'unknown'`
    - _Requirements: 2.1, 2.3_

  - [x] 2.3 Créer `ThrottlerExceptionFilter` dans `backend/src/common/filters/throttler-exception.filter.ts`
    - Implémenter `ExceptionFilter` capturant `ThrottlerException`
    - Appeler `res.setHeader('Retry-After', '60')` avant de retourner le 429
    - Corps de réponse JSON avec message français : `"Trop de tentatives. Veuillez réessayer dans 60 secondes."`
    - _Requirements: 2.4_

  - [x] 2.4 Câbler `ThrottlerProxyGuard` et `ThrottlerExceptionFilter` dans `app.module.ts`
    - Remplacer `useClass: ThrottlerGuard` par `useClass: ThrottlerProxyGuard` dans le provider `APP_GUARD`
    - Ajouter `APP_FILTER` avec `useClass: ThrottlerExceptionFilter`
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ]* 2.5 Écrire les tests unitaires de `ThrottlerProxyGuard`
    - Vérifier que `getTracker` retourne `req.ip` quand il est défini
    - Vérifier que `getTracker` tombe sur `remoteAddress` si `req.ip` est absent
    - _Requirements: 2.1, 2.3_

- [x] 3. T3 — PdfService singleton + suppression TVA
  - [x] 3.1 Créer `backend/src/pdf/pdf.service.ts`
    - Import statique : `import PdfPrinter from 'pdfmake/build/pdfmake'` (ou `import * as PdfPrinter` si nécessaire selon `esModuleInterop`)
    - Instancier `PdfPrinter` avec les polices Helvetica dans le constructeur — une seule instance par processus
    - Implémenter `generateBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer>` utilisant `createPdfKitDocument` + stream vers `Buffer`
    - Journaliser via `Logger` NestJS, lever `InternalServerErrorException` avec message français en cas d'erreur
    - _Requirements: 3.1, 3.2, 3.6_

  - [x] 3.2 Créer `backend/src/pdf/pdf.module.ts` et l'exporter globalement
    - Déclarer et exporter `PdfService`
    - Importer `PdfModule` dans `SalesModule` et `PurchasesModule`
    - _Requirements: 3.1, 3.2_

  - [x] 3.3 Refactorer `sales.service.ts::generateInvoicePdf()` pour utiliser `PdfService`
    - Supprimer `require('pdfmake')` dynamique et les déclarations `fonts` locales
    - Construire le `docDefinition` sans aucune mention de TVA (pas de libellé TVA, taxe, VAT, Tax, ni de pourcentage de taxe)
    - Déléguer la génération du buffer à `this.pdfService.generateBuffer(docDefinition)`
    - _Requirements: 3.3, 3.5_

  - [x] 3.4 Refactorer `purchases.service.ts::generateOrderPdf()` pour utiliser `PdfService`
    - Supprimer `require('pdfmake')` dynamique et les déclarations `fonts` locales
    - Construire le `docDefinition` sans aucune mention de TVA
    - Déléguer la génération du buffer à `this.pdfService.generateBuffer(docDefinition)`
    - _Requirements: 3.4_

  - [ ]* 3.5 Écrire les tests unitaires de `PdfService`
    - Vérifier que le constructeur crée bien une instance unique de `PdfPrinter`
    - Mock `createPdfKitDocument` qui émet une erreur → vérifier que `InternalServerErrorException` est levée
    - Vérifier qu'aucune `docDefinition` passée à `generateBuffer` ne contient les termes TVA / taxe / VAT
    - _Requirements: 3.2, 3.6_

- [x] 4. Checkpoint — Compiler et vérifier les blocs indépendants
  - Vérifier que `npm run build` passe sans erreur TypeScript sur T1, T2, T3.
  - S'assurer qu'aucun test existant n'est cassé.
  - Demander à l'utilisateur confirmation avant de continuer si des erreurs subsistent.

- [x] 5. T4 + T5 — Migration Prisma unique + Atomicité stock + Inventaire DRAFT/VALIDATED
  - [x] 5.1 Mettre à jour `backend/prisma/schema.prisma` avec les deux changements de schéma
    - Ajouter l'enum `InventoryStatus { DRAFT VALIDATED }`
    - Ajouter `status InventoryStatus @default(DRAFT)` sur `InventorySession`
    - Ajouter `costPriceAtSale Decimal @map("cost_price_at_sale") @db.Decimal(10, 3)` sur `SaleItem` (sans valeur par défaut dans le schéma)
    - _Requirements: 5.1, 6.1_

  - [x] 5.2 Générer la migration Prisma `phase0_reliability`
    - Exécuter `npx prisma migrate dev --name phase0_reliability` (à effectuer manuellement dans le terminal)
    - Vérifier que le SQL généré contient : `CREATE TYPE "InventoryStatus"`, `ADD COLUMN "status"` avec DEFAULT DRAFT, `ADD COLUMN "cost_price_at_sale"` avec `NOT NULL DEFAULT 0.000`
    - _Requirements: 5.1, 6.2_

  - [x] 5.3 Modifier `inventory.service.ts::create()` — statut DRAFT, sans toucher aux stocks
    - Créer la session avec `status: 'DRAFT'`
    - Supprimer la boucle `tx.product.update({ qty: d.qtyPhysical })` : la méthode `create()` ne modifie plus les stocks
    - Conserver le snapshot `qtySystem = product.qty` et le calcul de `difference`
    - _Requirements: 5.2_

  - [x] 5.4 Ajouter `inventory.service.ts::validate()` — transaction atomique
    - Récupérer la session avec ses items ; lever `NotFoundException` si absente ou hors tenant
    - Lever `BadRequestException` si `session.status === 'VALIDATED'`
    - Dans une transaction : pour chaque item où `difference !== 0`, vérifier que `product.qty + difference >= 0` (sinon rollback + `BadRequestException` avec message français), puis `tx.product.update({ qty: { increment: item.difference } })`; enfin `tx.inventorySession.update({ status: 'VALIDATED' })`
    - Enregistrer `INVENTORY_VALIDATE` dans `ActivityLog`
    - _Requirements: 5.3, 5.4, 5.6, 5.9_

  - [x] 5.5 Ajouter `POST /inventory/:id/validate` dans `inventory.controller.ts`
    - Décorateur `@Roles('ADMIN', 'SUPER_ADMIN')` sur l'action
    - Appel à `this.inventoryService.validate(user.tenantId, user.sub, id)`
    - Documentation Swagger : `@ApiOperation`
    - _Requirements: 5.3, 5.8_

  - [x] 5.6 Mettre à jour `mapSession()` dans `inventory.service.ts` — inclure `status`
    - Ajouter `status: session.status` dans l'objet retourné par `mapSession()`
    - _Requirements: 5.7_

  - [x] 5.7 Modifier `sales.service.ts::create()` — atomicité + costPriceAtSale
    - Avant la transaction, lire `product.name` et `product.priceBuy` (supprimer la lecture de `product.qty`)
    - Si `product.priceBuy` est `null` → lever `BadRequestException` avec message français avant toute transaction
    - À l'intérieur de la transaction, remplacer `tx.product.update({ qty: { decrement } })` par `tx.$executeRaw` avec clause `WHERE qty >= ${item.qty}`
    - Si `$executeRaw` retourne 0 → lire `qty` actuel et lever `BadRequestException` avec nom, qty disponible et qty demandée
    - Passer `costPriceAtSale: product.priceBuy` dans chaque ligne `SaleItem` créée
    - _Requirements: 4.1, 4.2, 4.5, 6.3, 6.4_

  - [x] 5.8 Mettre à jour `mapSale()` dans `sales.service.ts` — inclure `costPriceAtSale`
    - Ajouter `costPriceAtSale: Number(item.costPriceAtSale).toFixed(3)` dans le mapping des items
    - Ne supprimer aucun champ existant
    - _Requirements: 6.5_

  - [ ]* 5.9 Écrire les tests unitaires de `sales.service.ts::create()`
    - Mock `$executeRaw` retournant 0 → vérifier que `BadRequestException` est levée avec les bonnes infos
    - Mock `product.priceBuy = null` → vérifier rejection avant transaction
    - Vérifier que `costPriceAtSale` est bien passé dans `SaleItem`
    - _Requirements: 4.2, 6.3, 6.4_

  - [ ]* 5.10 Écrire les tests unitaires de `inventory.service.ts`
    - Mock `create()` : vérifier qu'aucun `product.update` n'est appelé
    - Mock `validate()` avec `session.status = 'VALIDATED'` → vérifier `BadRequestException`
    - Mock `validate()` avec ajustement résultant en qty < 0 → vérifier rollback et `BadRequestException`
    - Mock `validate()` avec id inconnu → vérifier `NotFoundException`
    - _Requirements: 5.2, 5.3, 5.4, 5.9_

- [x] 6. Checkpoint — Vérifier la migration et les services modifiés
  - Vérifier que `npm run build` passe après T4/T5.
  - S'assurer que les tests unitaires de 5.9 et 5.10 passent.
  - Demander à l'utilisateur confirmation avant de continuer si des erreurs subsistent.

- [x] 7. T6 — Sauvegardes PostgreSQL
  - [x] 7.1 Créer `backend/scripts/backup.sh`
    - Shebang `#!/usr/bin/env bash`, `set -euo pipefail`
    - Lire `DATABASE_URL` ou les variables `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
    - Valider que `pg_dump` est disponible et que `BACKUP_DIR` est accessible en écriture ; sinon exit 1 + message sur stderr avant toute connexion DB
    - Nom de fichier : `<PGDATABASE>_YYYY-MM-DD_HHMMSS.dump`
    - Exécuter `pg_dump --format=custom` ; en cas d'erreur, exit non-zéro + message stderr avec date, nom de base et cause
    - Inclure un commentaire cron documenté (exécution quotidienne à 02h00, rétention 14 jours)
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 7.2 Créer `backend/docs/backup-restore.md`
    - Section prérequis : version PostgreSQL 16, outils `pg_dump` / `pg_restore`
    - Commande complète de restauration : `pg_restore --clean --if-exists -d $DATABASE_URL <fichier.dump>`
    - Au moins deux vérifications post-restauration : comptage des tables dans `information_schema`, comptage des tenants, et appel `GET /api/health`
    - _Requirements: 7.3_

  - [x] 7.3 Ajouter `backend/backups/` dans `.gitignore` à la racine du projet
    - Vérifier que la ligne n'existe pas déjà avant d'ajouter
    - _Requirements: 7.6_

- [x] 8. T7 — HealthModule
  - [x] 8.1 Créer `backend/src/health/health.controller.ts`
    - Décorateurs `@Public()` et `@SkipSubscription()` sur la classe
    - `GET /health` : exécuter `Promise.race([this.prisma.$queryRaw\`SELECT 1\``, timeout 2s])`
    - Réponse 200 : `{ status: 'ok', db: 'ok', uptime: Math.floor(process.uptime()), version }`
    - Réponse 503 (via `HttpException`) : `{ status: 'error', db: 'error', uptime, version }` dans un délai total ≤ 3s
    - Importer `version` depuis `package.json` (import statique)
    - _Requirements: 8.1, 8.2, 8.7_

  - [x] 8.2 Vérifier / ajouter `resolveJsonModule: true` dans `backend/tsconfig.json`
    - Ouvrir `tsconfig.json` et ajouter l'option si elle est absente
    - _Requirements: 8.1_

  - [x] 8.3 Créer `backend/src/health/health.module.ts` et l'importer dans `app.module.ts`
    - Déclarer `HealthController`, importer `PrismaModule`
    - Ajouter `HealthModule` dans le tableau `imports` de `AppModule`
    - _Requirements: 8.1_

  - [ ]* 8.4 Écrire les tests unitaires de `HealthController`
    - Mock `prisma.$queryRaw` retournant rapidement → vérifier réponse 200 avec `status: 'ok'`
    - Mock `prisma.$queryRaw` qui reject → vérifier `HttpException` 503
    - Vérifier que l'endpoint ne nécessite pas de JWT (décorateur `@Public()` présent)
    - _Requirements: 8.1, 8.2, 8.7_

- [x] 9. T8 — Logger NestJS + pipeline CI
  - [x] 9.1 Créer `backend/src/common/logger/json-logger.service.ts`
    - Implémenter `LoggerService` avec les méthodes `log`, `error`, `warn`, `debug`, `verbose`
    - En production (`NODE_ENV === 'production'`) : sérialiser chaque entrée en JSON structuré sur une ligne avec les champs `level`, `message`, `context`, `timestamp`
    - En développement : conserver le format texte natif NestJS
    - _Requirements: 8.4_

  - [x] 9.2 Déclarer `JsonLoggerService` dans `main.ts`
    - Appeler `app.useLogger(new JsonLoggerService())` après la création de l'application
    - _Requirements: 8.4_

  - [x] 9.3 Remplacer les `console.log()` et `console.error()` dans `backend/src/`
    - `auth/auth.service.ts` : ajouter `private readonly logger = new Logger(AuthService.name)` et remplacer les appels `console.log` / `console.error`
    - `main.ts` : remplacer les appels `console.log` par `Logger.log(...)` (logger statique NestJS)
    - Parcourir tous les autres fichiers `src/` contenant `console.log` ou `console.error` et appliquer la même substitution
    - _Requirements: 8.3_

  - [x] 9.4 Créer `.github/workflows/ci.yml`
    - Déclencheurs : `push` et `pull_request` sur `main`
    - Working directory : `backend`
    - Étapes dans l'ordre : `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, cache npm), `npm ci`, `npm run lint`, `npm run build`, `npm test -- --passWithNoTests`
    - Chaque étape doit échouer le workflow en cas d'erreur
    - _Requirements: 8.5, 8.6_

  - [ ]* 9.5 Écrire les tests unitaires de `JsonLoggerService`
    - Vérifier qu'en mode production, la sortie est un JSON valide contenant les quatre champs requis
    - Vérifier qu'en mode développement, la sortie n'est pas du JSON structuré
    - _Requirements: 8.4_

- [x] 10. Checkpoint final — Vérifier l'ensemble
  - Vérifier que `npm run build` passe sur l'ensemble du projet.
  - Vérifier que `npm test -- --passWithNoTests` passe sans erreur.
  - Vérifier que `.github/workflows/ci.yml` est syntaxiquement valide.
  - Demander à l'utilisateur confirmation avant tout déploiement.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être sautées pour un MVP rapide
- T4 et T5 partagent la même migration Prisma (`phase0_reliability`) — ils doivent être développés ensemble dans la tâche 5
- La migration doit être générée manuellement avec `npx prisma migrate dev --name phase0_reliability` dans le terminal, car elle nécessite une connexion DB active
- Aucun champ existant de l'API n'est supprimé ni renommé — tous les changements sont additifs
- Les messages d'erreur sont systématiquement en français
- Tous les montants restent en `Decimal(10,3)` conformément aux invariants du projet

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "5.1", "7.1", "8.1", "9.1", "9.4"] },
    { "id": 1, "tasks": ["2.2", "3.2", "5.2", "7.2", "8.2", "9.2"] },
    { "id": 2, "tasks": ["2.3", "3.3", "5.3", "7.3", "8.3", "9.3"] },
    { "id": 3, "tasks": ["2.4", "3.4", "5.4", "8.4"] },
    { "id": 4, "tasks": ["3.5", "5.5", "5.7", "9.5"] },
    { "id": 5, "tasks": ["1.2", "2.5", "5.6", "5.8"] },
    { "id": 6, "tasks": ["5.9", "5.10"] }
  ]
}
```
