#!/bin/bash
# ─── SCRIPT DE SAUVEGARDE AUTOMATIQUE POSTGRESQL (STOCKTN) ───────────────────
# Exécute un dump complet de la base de données et conserve les 7 derniers jours.

set -e

BACKUP_DIR="/home/ubuntu/stocktn_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/stocktn_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Sauvegarde en cours : ${BACKUP_FILE}"
docker exec -t stocktn_postgres pg_dump -U stocktn_admin stocktn_production | gzip > "$BACKUP_FILE"

echo "==> Nettoyage des sauvegardes datant de plus de 7 jours..."
find "$BACKUP_DIR" -type f -name "stocktn_backup_*.sql.gz" -mtime +7 -delete

echo "==> Sauvegarde terminée avec succès !"
