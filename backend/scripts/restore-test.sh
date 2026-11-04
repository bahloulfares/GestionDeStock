#!/usr/bin/env bash
# StockTN - Test de restauration PostgreSQL dans une base temporaire
# Usage : ./scripts/restore-test.sh <fichier.dump>
set -euo pipefail

DUMP_FILE=${1:-}
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage: $0 <fichier.dump>" >&2
  [ -n "$DUMP_FILE" ] && echo "Fichier non trouve : $DUMP_FILE" >&2
  exit 1
fi

PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-mvp_user}
export PGPASSWORD=${PGPASSWORD:-mvp_secret_2026}
TEST_DB=mvp_stocks_restore_test

cleanup() {
  echo "[restore-test] Suppression de $TEST_DB..."
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true
}
trap cleanup EXIT

echo "[restore-test] Creation de $TEST_DB..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB; CREATE DATABASE $TEST_DB OWNER $PGUSER;"

echo "[restore-test] Restauration de $DUMP_FILE..."
pg_restore --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$TEST_DB" --clean --if-exists --no-owner --no-privileges "$DUMP_FILE" 2>&1 || true

echo "[restore-test] Verifications..."
ERRORS=0
check_count() {
  local label=$1 query=$2 min=${3:-1}
  local val=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TEST_DB" -t -A -c "$query")
  if [ "$val" -ge "$min" ] 2>/dev/null; then echo "  OK  $label : $val";
  else echo "  FAIL $label : $val (attendu >= $min)" >&2; ERRORS=$((ERRORS+1)); fi
}

check_count 'Tables public' "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 10
check_count 'Tenants'       "SELECT COUNT(*) FROM tenants;" 1
check_count 'Users'         "SELECT COUNT(*) FROM users;" 1

echo "[restore-test] Migrations :"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TEST_DB" -c "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;" 2>/dev/null || echo "  (absente)"

if [ "$ERRORS" -gt 0 ]; then echo "ECHEC : $ERRORS echec(s)." >&2; exit 1; fi
echo "SUCCES : restauration verifiee."
exit 0
