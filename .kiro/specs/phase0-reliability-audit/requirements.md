# Requirements Document

## Introduction

La Phase 0 — Audit & Fiabilité constitue l'ensemble des corrections prioritaires à apporter au backend de StockTN avant toute nouvelle fonctionnalité. Il ne s'agit pas d'un développement de fonctionnalités mais d'un plan de remédiation ciblant huit vulnérabilités identifiées : protection de l'initialisation, rate limiting derrière proxy, génération PDF correcte, atomicité des opérations sur le stock, workflow de validation de l'inventaire, enregistrement du coût d'achat figé, sauvegardes PostgreSQL et observabilité minimale. Toutes les corrections respectent les invariants globaux du projet : isolation multi-tenant par `tenantId`, transactions Prisma pour toute opération financière ou stock, journalisation dans `ActivityLog`, montants en `Decimal` à 3 décimales et DTO validés avec messages en français.

## Glossary

- **API** : Le serveur NestJS 11 / Express exposé sous le préfixe `/api`.
- **Auth_Service** : Le service `AuthService` (`backend/src/auth/auth.service.ts`).
- **Sales_Service** : Le service `SalesService` (`backend/src/sales/sales.service.ts`).
- **Inventory_Service** : Le service `InventoryService` (`backend/src/inventory/inventory.service.ts`).
- **Purchases_Service** : Le service `PurchasesService` (`backend/src/purchases/purchases.service.ts`).
- **Health_Controller** : Le contrôleur NestJS responsable de l'endpoint `/api/health`.
- **PDF_Generator** : Le module interne responsable de la génération de documents PDF via `pdfmake`.
- **Throttler** : Le module `@nestjs/throttler` configuré dans `AppModule`.
- **Prisma** : L'ORM Prisma 7 utilisé pour toutes les interactions avec PostgreSQL 16.
- **Tenant** : Une boutique cliente isolée identifiée par un `tenantId` UUID.
- **SUPER_ADMIN** : Rôle utilisateur disposant des droits d'administration de la plateforme, sans `tenantId` associé.
- **ADMIN** : Rôle utilisateur disposant des droits de gestion au sein d'une boutique (Tenant).
- **EMPLOYEE** : Rôle utilisateur avec droits opérationnels limités au sein d'une boutique.
- **InventorySession** : Entité Prisma représentant une session d'inventaire physique.
- **SaleItem** : Entité Prisma représentant une ligne d'article dans une vente.
- **ActivityLog** : Table de journalisation de toutes les actions sensibles du système.
- **Logger_NestJS** : L'instance `Logger` du framework NestJS utilisée pour les logs structurés.
- **CI** : Pipeline d'intégration continue GitHub Actions (`.github/workflows/ci.yml`).

---

## Requirements

### Requirement 1: Protection de l'endpoint `/auth/setup` contre la réouverture

**User Story:** En tant qu'opérateur de la plateforme, je veux que l'endpoint d'initialisation soit inutilisable une fois qu'un SUPER_ADMIN existe, afin d'empêcher toute prise de contrôle non autorisée de la plateforme.

#### Acceptance Criteria

1. WHEN une requête `POST /api/auth/setup` est reçue et qu'un utilisateur de rôle `SUPER_ADMIN` existe déjà en base, THEN THE `Auth_Service` SHALL rejeter la requête avec le code HTTP 409 et un message indiquant que l'application est déjà initialisée et que l'utilisateur doit utiliser `/auth/login`.
2. WHEN une requête `POST /api/auth/setup` est reçue et qu'aucun utilisateur de rôle `SUPER_ADMIN` n'existe, THEN THE `Auth_Service` SHALL créer le premier tenant et son utilisateur ADMIN avec le statut ACTIVE et une expiration de 12 mois calendaires à compter de la date de création, et retourner HTTP 201.
3. THE `Auth_Service` SHALL vérifier l'existence d'un `SUPER_ADMIN` par une requête de comptage filtrée exclusivement sur le rôle `SUPER_ADMIN`, et non par un comptage global de tous les utilisateurs.
4. IF une requête `POST /api/auth/setup` est reçue après que l'initialisation a déjà eu lieu, THEN THE `Auth_Service` SHALL ne créer aucun tenant ni aucun compte utilisateur et retourner immédiatement une erreur.

---

### Requirement 2: Rate limiting opérationnel derrière proxy Nginx

**User Story:** En tant qu'opérateur de la plateforme, je veux que le rate limiting du login compte les tentatives par IP réelle de l'utilisateur, afin que la protection anti-brute-force soit effective même derrière un reverse proxy Nginx.

#### Acceptance Criteria

1. THE `API` SHALL appliquer le rate limiting en utilisant l'adresse IP du client telle que transmise par le reverse proxy Nginx, de sorte que deux clients distincts derrière le même proxy soient comptés séparément.
2. IF `NODE_ENV` est `production`, THEN THE `API` SHALL limiter la confiance aux en-têtes de proxy au premier proxy déclaré uniquement, de sorte que les requêtes dont l'en-tête de proxy provient d'un second niveau ou plus ne soient pas considérées comme provenant d'une IP client de confiance.
3. THE `Throttler` SHALL appliquer le comptage des tentatives par adresse IP client réelle pour toutes les routes nécessitant authentification, de sorte que deux clients distincts partageant le même proxy Nginx ne partagent pas le même compteur de tentatives.
4. WHEN une même IP client réelle dépasse 5 tentatives de `POST /api/auth/login` en 60 secondes, THE `Throttler` SHALL retourner une réponse HTTP 429 contenant un message indiquant que trop de tentatives ont été effectuées et un en-tête `Retry-After` avec la valeur `60`, et SHALL remettre le compteur de cette IP à zéro à l'expiration de la fenêtre de 60 secondes.
5. THE `Throttler` SHALL ne pas modifier la limite globale de 100 requêtes par minute pour les autres routes.

---

### Requirement 3: Génération PDF sans import dynamique ni mention TVA fantôme

**User Story:** En tant que commerçant, je veux que les factures et bons de commande générés soient corrects et ne mentionnent aucune TVA inexistante, afin de remettre des documents conformes à mes clients et fournisseurs.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL être disponible sans délai supplémentaire dès le démarrage de l'application, c'est-à-dire que son chargement doit intervenir à l'initialisation du module NestJS et non à la première utilisation.
2. THE `PDF_Generator` SHALL utiliser une seule instance partagée du moteur PDF pour l'ensemble des appels au sein du processus serveur.
3. WHEN la méthode `generateInvoicePdf` est appelée, THE `PDF_Generator` SHALL produire un document PDF ne contenant aucun libellé, en-tête de colonne, ligne de sous-total ou valeur numérique associés à la TVA (incluant les termes TVA, taxe, VAT, Tax, taux de taxe, montant de taxe, ou tout pourcentage de taxe).
4. WHEN la méthode `generateOrderPdf` est appelée, THE `PDF_Generator` SHALL produire un document PDF ne contenant aucun libellé, en-tête de colonne, ligne de sous-total ou valeur numérique associés à la TVA (incluant les termes TVA, taxe, VAT, Tax, taux de taxe, montant de taxe, ou tout pourcentage de taxe).
5. WHEN la méthode `generateInvoicePdf` est appelée et se termine avec succès, THE `PDF_Generator` SHALL retourner un document PDF contenant au minimum : un en-tête d'identification de la boutique, un tableau des articles avec quantité et prix unitaire pour chaque ligne, et une ligne de total général.
6. IF une erreur survient pendant la construction ou l'écriture du document PDF, THEN THE `PDF_Generator` SHALL propager une exception NestJS avec un message indiquant l'échec de la génération du PDF et SHALL journaliser le détail de l'erreur via le Logger NestJS avec le contexte du service appelant.

---

### Requirement 4: Atomicité de la décrémentation de stock lors d'une vente

**User Story:** En tant que commerçant, je veux que deux ventes simultanées d'un même article ne puissent pas amener le stock en négatif, afin d'éviter les surventes et les incohérences comptables.

#### Acceptance Criteria

1. WHEN la méthode `create` de `Sales_Service` est appelée, THE `Sales_Service` SHALL vérifier la disponibilité du stock et décrémenter la quantité vendue en une seule opération atomique à l'intérieur d'une transaction couvrant à la fois la mise à jour du stock et la création de l'enregistrement de vente.
2. IF l'opération atomique de mise à jour du stock n'affecte aucune ligne pour un article donné en raison d'un stock insuffisant au moment de l'écriture, THEN THE `Sales_Service` SHALL rejeter la transaction complète et retourner une erreur indiquant le nom du produit concerné, la quantité disponible au moment de la tentative, et la quantité demandée.
3. IF la transaction de vente se termine avec succès, THEN THE `Sales_Service` SHALL enregistrer un événement dans `ActivityLog` avec l'action `CREATE` et l'entité `sale`.
4. IF la transaction de vente échoue pour quelque raison que ce soit, THEN THE `Sales_Service` SHALL ne pas créer d'entrée dans `ActivityLog` pour cette tentative de vente.
5. THE `Sales_Service` SHALL garantir que pour tout ensemble de ventes concurrentes portant sur le même produit et le même tenant, le stock final de ce produit ne soit jamais inférieur à zéro et que toute vente dont la quantité demandée dépasse le stock disponible au moment de l'écriture soit rejetée.

---

### Requirement 5: Workflow de validation de l'inventaire physique (DRAFT → VALIDATED)

**User Story:** En tant qu'ADMIN, je veux pouvoir créer une session d'inventaire en mode brouillon et la corriger avant validation, afin d'éviter qu'une erreur de saisie corrige immédiatement les stocks de manière irrattrapable.

#### Acceptance Criteria

1. THE `Inventory_Service` SHALL créer toute nouvelle session d'inventaire avec le statut `DRAFT` et conserver deux états distincts : `DRAFT` (modifiable, sans effet sur les stocks) et `VALIDATED` (verrouillée, stocks ajustés).
2. WHEN la méthode `create` de `Inventory_Service` est appelée, THE `Inventory_Service` SHALL créer la session avec le statut `DRAFT` sans modifier les quantités en stock des produits concernés.
3. IF l'utilisateur appelant `POST /api/inventory/:id/validate` possède le rôle `ADMIN` ou `SUPER_ADMIN`, THEN WHEN la requête est reçue, THE `Inventory_Service` SHALL, dans une transaction atomique, appliquer les écarts (`qtyPhysical - qtySystem`) sur les quantités produits — sans permettre qu'une quantité produit devienne inférieure à zéro — et passer la session au statut `VALIDATED` ; si la transaction échoue, THE `Inventory_Service` SHALL annuler intégralement les modifications et laisser les stocks et le statut de la session inchangés.
4. IF la session d'inventaire ciblée par `POST /api/inventory/:id/validate` est déjà au statut `VALIDATED`, THEN THE `Inventory_Service` SHALL retourner une erreur indiquant que la session a déjà été validée.
5. IF une requête tente de modifier ou supprimer une session au statut `VALIDATED`, THEN THE `Inventory_Service` SHALL retourner une erreur indiquant que la modification d'une session validée est interdite.
6. WHEN la validation d'une session d'inventaire est effectuée avec succès, THE `Inventory_Service` SHALL enregistrer dans `ActivityLog` l'action `INVENTORY_VALIDATE` sur l'entité `inventory_session` avec le `tenantId` de la session.
7. WHEN la méthode `findAll` ou `findOne` de `Inventory_Service` est appelée, THE `Inventory_Service` SHALL inclure le champ `status` dans la réponse sérialisée.
8. IF l'utilisateur appelant `POST /api/inventory/:id/validate` ne possède pas le rôle `ADMIN` ou `SUPER_ADMIN`, THEN THE `Inventory_Service` SHALL rejeter la requête avec une erreur indiquant un accès non autorisé sans effectuer aucune modification.
9. IF la session d'inventaire identifiée par `:id` dans `POST /api/inventory/:id/validate` n'existe pas ou n'appartient pas au tenant de l'utilisateur appelant, THEN THE `Inventory_Service` SHALL retourner une erreur indiquant que la session est introuvable.

---

### Requirement 6: Enregistrement du coût d'achat figé sur `SaleItem`

**User Story:** En tant que commerçant, je veux que le prix d'achat au moment de chaque vente soit enregistré sur la ligne d'article, afin de pouvoir calculer la marge réelle même si le prix d'achat du produit change ultérieurement.

#### Acceptance Criteria

1. THE `Prisma` SHALL déclarer le champ `costPriceAtSale` de type `Decimal(10,3)` sur le modèle `SaleItem`, sans valeur par défaut, mappé sur la colonne `cost_price_at_sale`.
2. THE `Prisma` SHALL produire une migration qui ajoute la colonne `cost_price_at_sale` à la table `sale_items` avec la contrainte `NOT NULL` et une valeur de remplissage de `0.000` appliquée uniquement aux lignes historiques existantes au moment de la migration.
3. WHEN la méthode `create` de `Sales_Service` est appelée, THE `Sales_Service` SHALL lire `product.priceBuy` pour chaque article et le stocker dans le champ `costPriceAtSale` de la ligne `SaleItem` correspondante dans la même opération de persistance que la vente.
4. IF `product.priceBuy` est `null` au moment de la création de la vente, THEN THE `Sales_Service` SHALL rejeter la création de la vente et retourner une erreur indiquant que le coût d'achat du produit est manquant, sans persister aucune donnée de cette vente.
5. THE `Sales_Service` SHALL inclure `costPriceAtSale` dans la réponse sérialisée de `mapSale()` comme valeur décimale à 3 chiffres après la virgule, sans modifier ni supprimer les champs existants de l'API.
6. IF `product.priceBuy` est modifié après la création d'une vente, THEN THE `Sales_Service` SHALL conserver la valeur de `costPriceAtSale` figée au moment de la vente, sans la recalculer ni la mettre à jour.

---

### Requirement 7: Sauvegardes PostgreSQL automatisées

**User Story:** En tant qu'opérateur de la plateforme, je veux disposer de sauvegardes quotidiennes de la base de données et d'une procédure de restauration documentée, afin de pouvoir récupérer les données en cas d'incident.

#### Acceptance Criteria

1. THE `API` SHALL fournir un script shell `backend/scripts/backup.sh` exécutable qui lit les paramètres de connexion depuis les variables d'environnement (`DATABASE_URL` ou `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`) et écrit le dump dans le répertoire configuré par la variable d'environnement `BACKUP_DIR`, dont la valeur par défaut est `backend/backups/`, avec un nom de fichier incluant le nom de la base et l'horodatage au format `<PGDATABASE>_YYYY-MM-DD_HHMMSS.dump`.
2. THE script `backup.sh` SHALL contenir, sous forme de commentaire documenté, un exemple de configuration `cron` permettant une exécution quotidienne à 02h00 et une rétention des dumps pendant 14 jours.
3. THE `API` SHALL fournir un fichier `backend/docs/backup-restore.md` contenant au minimum : les prérequis système (version PostgreSQL, outils requis), la commande complète de restauration avec ses paramètres, et au moins deux étapes de vérification observable après restauration (nombre de tables, nombre d'enregistrements dans une table clé, ou connexion applicative réussie).
4. WHEN le script `backup.sh` est exécuté et que la commande `pg_dump` échoue, THE script SHALL terminer avec un code de sortie non-zéro et écrire sur `stderr` un message incluant la date de la tentative, le nom de la base cible et la cause de l'échec.
5. IF les variables d'environnement de connexion requises sont absentes ou si le répertoire `BACKUP_DIR` n'est pas accessible en écriture au moment de l'exécution, THEN THE script `backup.sh` SHALL terminer immédiatement avec un code de sortie non-zéro et écrire un message d'erreur descriptif sur `stderr` avant toute tentative de connexion à la base de données.
6. THE `API` SHALL ajouter `backend/backups/` au fichier `.gitignore` afin qu'aucun dump de base de données ne soit versionné.

---

### Requirement 8: Observabilité — endpoint `/health`, logs structurés et CI

**User Story:** En tant qu'opérateur de la plateforme, je veux un endpoint de santé, des logs structurés et un pipeline CI fonctionnel, afin de pouvoir monitorer l'état du système et détecter rapidement les régressions.

#### Acceptance Criteria

1. THE `Health_Controller` SHALL exposer un endpoint public `GET /api/health` retournant HTTP 200 avec le corps JSON `{ "status": "ok", "db": "ok", "uptime": <secondes depuis démarrage>, "version": <valeur de package.json version> }`.
2. WHEN la connexion à PostgreSQL échoue ou ne répond pas dans un délai de 2 secondes au moment de l'appel à `GET /api/health`, THE `Health_Controller` SHALL retourner HTTP 503 avec le corps JSON `{ "status": "error", "db": "error", "uptime": <secondes>, "version": <version> }` dans un délai total de 3 secondes maximum à compter de la réception de la requête.
3. THE `API` SHALL remplacer tous les appels `console.log()` et `console.error()` présents dans les fichiers `src/` par des appels à une instance de `Logger_NestJS` nommée par le contexte du service appelant.
4. WHILE `NODE_ENV` est `production`, THE `Logger_NestJS` SHALL produire des logs au format JSON structuré (un objet JSON par ligne) contenant au minimum les champs `level`, `message`, `context` et `timestamp` pour chaque entrée de log.
5. THE `CI` SHALL fournir un fichier `.github/workflows/ci.yml` déclenchant, sur chaque push et pull request vers `main`, les étapes suivantes dans l'ordre : installation des dépendances (`npm ci`), lint (`npm run lint`), compilation TypeScript (`npm run build`) et exécution des tests unitaires (`npm test -- --passWithNoTests`).
6. WHEN une des étapes du pipeline `CI` échoue, THE `CI` SHALL marquer le workflow comme échoué et ne pas exécuter les étapes suivantes.
7. THE `Health_Controller` SHALL utiliser le décorateur `@Public()` pour exclure l'endpoint `/api/health` de l'authentification JWT et du `SubscriptionGuard`.
