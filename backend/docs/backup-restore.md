# StockTN — Procédure de sauvegarde et restauration PostgreSQL

## Prérequis

- **PostgreSQL 16** client installé (`pg_dump`, `pg_restore`, `psql`)
  - Ubuntu/Debian : `sudo apt install postgresql-client-16`
  - macOS : `brew install postgresql@16`
  - Windows : inclus dans l'installation PostgreSQL
- Accès réseau à la base de données PostgreSQL
- Variables d'environnement configurées (`DATABASE_URL` ou `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`)

## Sauvegarde manuelle

```bash
# Avec DATABASE_URL
export DATABASE_URL="postgresql://mvp_user:mvp_secret_2026@localhost:5432/mvp_stocks"
./scripts/backup.sh

# Avec variables individuelles
export PGHOST=localhost PGPORT=5432 PGDATABASE=mvp_stocks
export PGUSER=mvp_user PGPASSWORD=mvp_secret_2026
./scripts/backup.sh
```

Les fichiers de sauvegarde sont créés dans `./backups/` au format :
`<nom_base>_YYYY-MM-DD_HHMMSS.dump`

## Sauvegarde automatique (cron)

Ajouter dans la crontab (`crontab -e`) :
```cron
# Sauvegarde quotidienne à 02h00
0 2 * * * /chemin/absolu/vers/backend/scripts/backup.sh >> /var/log/stocktn-backup.log 2>&1
# Suppression des sauvegardes de plus de 14 jours
0 3 * * * find /chemin/absolu/vers/backend/backups -name "*.dump" -mtime +14 -delete
```

## Restauration

### Étape 1 — Identifier le fichier de sauvegarde

```bash
ls -la ./backups/
# Exemple : mvp_stocks_2026-01-15_020000.dump
```

### Étape 2 — Restaurer la base de données

> ⚠️ La restauration écrase la base de données existante.

```bash
# Option A : avec DATABASE_URL
pg_restore --clean --if-exists \
  --dbname="postgresql://mvp_user:mvp_secret_2026@localhost:5432/mvp_stocks" \
  ./backups/mvp_stocks_2026-01-15_020000.dump

# Option B : avec variables individuelles
PGPASSWORD=mvp_secret_2026 pg_restore \
  --clean --if-exists \
  --host=localhost --port=5432 \
  --username=mvp_user --dbname=mvp_stocks \
  ./backups/mvp_stocks_2026-01-15_020000.dump
```

### Étape 3 — Vérifications post-restauration

**1. Vérifier le nombre de tables :**
```sql
-- Se connecter à la base
psql "postgresql://mvp_user:mvp_secret_2026@localhost:5432/mvp_stocks"

-- Compter les tables
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Résultat attendu : ≥ 15 tables
```

**2. Vérifier les données critiques :**
```sql
-- Compter les tenants
SELECT count(*) FROM tenants;

-- Compter les utilisateurs
SELECT count(*) FROM users;
```

**3. Vérifier la connexion applicative :**
```bash
# Démarrer le backend et appeler l'endpoint health
curl http://localhost:3000/api/health
# Réponse attendue : {"status":"ok","db":"ok","uptime":...,"version":"..."}
```

## En cas de problème

- **Erreur `role does not exist`** : créer le rôle PostgreSQL d'abord :
  ```sql
  CREATE ROLE mvp_user WITH LOGIN PASSWORD 'mvp_secret_2026';
  ```
- **Erreur `database does not exist`** : créer la base :
  ```sql
  CREATE DATABASE mvp_stocks OWNER mvp_user;
  ```
- **Erreur de version** : utiliser la même version de `pg_restore` que `pg_dump` (PostgreSQL 16).
