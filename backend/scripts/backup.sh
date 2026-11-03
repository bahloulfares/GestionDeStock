#!/usr/bin/env bash
# =============================================================================
# StockTN — Script de sauvegarde PostgreSQL
# =============================================================================
# Usage : ./backup.sh
# Variables d'environnement requises (ou DATABASE_URL) :
#   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
#   BACKUP_DIR (optionnel, défaut : ./backups)
#
# ─── Configuration cron (exécution quotidienne à 02h00, rétention 14 jours) ─
# 0 2 * * * /chemin/vers/backup.sh >> /var/log/stocktn-backup.log 2>&1
# 0 3 * * * find /chemin/vers/backups -name "*.dump" -mtime +14 -delete
# =============================================================================
set -euo pipefail

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# ─── Validation des prérequis ─────────────────────────────────────────────────
if ! command -v pg_dump &> /dev/null; then
  echo "[$(date)] ERREUR : pg_dump n'est pas installé ou n'est pas dans le PATH." >&2
  exit 1
fi

# ─── Extraction des paramètres depuis DATABASE_URL si fourni ──────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  # Format : postgresql://user:password@host:port/database?schema=public
  PGUSER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
  PGPASSWORD=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
  PGHOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
  PGPORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  PGDATABASE=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
  export PGUSER PGPASSWORD PGHOST PGPORT PGDATABASE
fi

# ─── Vérification des variables requises ─────────────────────────────────────
for var in PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD; do
  if [ -z "${!var:-}" ]; then
    echo "[$(date)] ERREUR : Variable d'environnement manquante : $var" >&2
    exit 1
  fi
done

# ─── Vérification du répertoire de sauvegarde ────────────────────────────────
mkdir -p "$BACKUP_DIR" 2>/dev/null || true
if [ ! -w "$BACKUP_DIR" ]; then
  echo "[$(date)] ERREUR : Le répertoire BACKUP_DIR='$BACKUP_DIR' n'est pas accessible en écriture." >&2
  exit 1
fi

# ─── Exécution de la sauvegarde ──────────────────────────────────────────────
DUMP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.dump"
echo "[$(date)] Démarrage de la sauvegarde de la base '$PGDATABASE' vers '$DUMP_FILE'..."

if ! pg_dump --format=custom --file="$DUMP_FILE" \
    --host="$PGHOST" --port="$PGPORT" \
    --username="$PGUSER" --dbname="$PGDATABASE"; then
  echo "[$(date)] ERREUR : pg_dump a échoué pour la base '$PGDATABASE' (hôte: $PGHOST)." >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

echo "[$(date)] Sauvegarde terminée avec succès : $DUMP_FILE"
