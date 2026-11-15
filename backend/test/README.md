# Tests d'integration B1 - Transitions atomiques

## Prerequis

1. **Docker Desktop** doit etre demarre
2. **Conteneur PostgreSQL** mvp_postgres doit etre actif sur le port 5433

## Lancer les tests

npm run test:integration

## Test de controle (validation negative)

Pour verifier que le test detecte bien l'absence d'atomicite:

### Etape 1: Desactiver la transition atomique

Dans backend/src/sales/sales.service.ts, ligne ~207, remplacer la transition atomique updateMany par une version non-atomique (findFirst + update separes).

### Etape 2: Lancer le test

npm run test:integration

**Resultat attendu**: Le test should allow only one concurrent cancellation to succeed doit **ECHOUER** car les deux annulations vont reussir.

### Etape 3: Restaurer le code atomique

Retablir la version atomique avec updateMany + verification result.count.

### Etape 4: Relancer le test

npm run test:integration

**Resultat attendu**: Le test doit **REUSSIR**.

## Structure des tests

- integration-test.helper.ts: Helper avec PrismaService + vrais services (SalesService, ReturnsService, PurchasesService, InventoryService)
- sales-atomic-transitions.integration-spec.ts: Tests d'atomicite pour sales.cancel() et sales.create()
- super-admin-uniqueness.integration-spec.ts: Tests de contrainte d'unicite email SuperAdmin

## Securite

Le helper refuse de s'executer si la base ne se termine pas par _test ou n'est pas mvp_test.
