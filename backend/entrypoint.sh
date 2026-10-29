#!/bin/sh
set -e

echo "==> Attente et application des migrations Prisma..."
npx prisma migrate deploy

echo "==> Démarrage du serveur NestJS..."
exec "$@"
