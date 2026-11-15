# Tests d'intégration B1 - Transitions atomiques

## Prérequis

1. **Docker Desktop** doit être démarré
2. **Conteneur PostgreSQL** `mvp_postgres` doit être actif sur le port 5433

## Lancer les tests

```bash
npm run test:integration
```

## Test de contrôle (validation négative)

### Résultats observés :

**Avec boucle de 30 essais, la race condition est DÉTERMINISTE et systématiquement détectée.**

#### Code NON-ATOMIQUE (findFirst avant transaction):
- ❌ **30/30 essais** montrent la race condition (succeeded=2, failed=0)
- ❌ Stock corrompu: 102 au lieu de 100 (double restauration)
- ❌ Les deux annulations réussissent simultanément
- ❌ Le test échoue: `Expected: 30, Received: 0`

#### Code ATOMIQUE (updateMany dans transaction):
- ✅ **30/30 essais** montrent le comportement atomique (succeeded=1, failed=1)
- ✅ Stock correct: 100 (une seule restauration)
- ✅ Une annulation réussit, l'autre retourne ConflictException (409)
- ✅ Le test passe

### Procédure pour reproduire:

1. **Appliquer version NON-ATOMIQUE** dans `backend/src/sales/sales.service.ts` (ligne ~207):

```typescript
// VERSION NON-ATOMIQUE (pour test de contrôle)
const saleCheck = await this.prisma.sale.findFirst({ 
  where: { id, tenantId, status: 'COMPLETED' } 
});
if (!saleCheck) {
  throw new ConflictException('Cette vente ne peut pas être annulée');
}

await this.prisma.$transaction(async (tx) => {
  await tx.sale.update({
    where: { id },
    data: { status: 'CANCELLED', cancelReason: dto.reason },
  });
  // ... reste du code
});
```

2. **Lancer le test**:
```bash
npm run test:integration
```

**Résultat attendu**: ❌ FAIL - Race condition détectée sur 30/30 essais

3. **Restaurer version ATOMIQUE**:
```bash
git checkout -- backend/src/sales/sales.service.ts
```

4. **Relancer le test**:
```bash
npm run test:integration
```

**Résultat attendu**: ✅ PASS - Comportement atomique 30/30

## Structure des tests

- `integration-test.helper.ts`: Helper avec PrismaClient + vrais services (SalesService, ReturnsService, PurchasesService, InventoryService)
- `sales-atomic-transitions.integration-spec.ts`: 
  - Test de concurrence avec boucle de 30 essais pour sales.cancel()
  - Test de concurrence avec boucle de 10 essais pour sales.create()
- `super-admin-uniqueness.integration-spec.ts`: Tests de contrainte d'unicité email SuperAdmin

## Sécurité

Le helper refuse de s'exécuter si la base ne se termine pas par `_test` ou n'est pas `mvp_test`.

## Conclusion

La boucle de 30 essais permet de détecter la race condition de manière **100% déterministe**. 
Chaque essai crée une nouvelle vente avec des données fraîches, maximisant les chances de collision temporelle.