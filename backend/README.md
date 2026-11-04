# StockTN - Backend NestJS

SaaS multi-tenant de gestion commerciale pour commerces tunisiens.
Stack : NestJS 11 / TypeScript strict / Prisma 7 / PostgreSQL 16

## Prerequis

- Node.js >= 20
- Docker Desktop (pour PostgreSQL)
- pg_dump / pg_restore (PostgreSQL 16 client)

## Demarrage rapide

    cp .env.example .env
    docker-compose up -d
    npx prisma migrate deploy
    npx prisma db seed
    npm run start:dev

API  : http://localhost:3000/api
Docs : http://localhost:3000/api/docs

## TRUST_PROXY_HOPS

Nombre de proxys de confiance pour X-Forwarded-For. Actif si NODE_ENV=production.
  0 = pas de proxy (dev local)
  1 = un seul Nginx (DEFAUT)
  2 = Nginx + Cloudflare / load balancer
Exemple : TRUST_PROXY_HOPS=2

## Sauvegardes

    ./scripts/backup.sh
    ./scripts/restore-test.sh backups/<fichier>.dump
    crontab -l 2>/dev/null | cat - scripts/crontab.txt | crontab -

Documentation : docs/backup-restore.md


## Creation d'un SUPER_ADMIN

Sur une installation neuve, creer le premier SUPER_ADMIN :

    export SUPER_ADMIN_EMAIL=admin@stocktn.tn
    export SUPER_ADMIN_PASSWORD=VotreMotDePasse123
    npm run create-super-admin

Le SUPER_ADMIN n'a pas de boutique (tenantId NULL) et accede au panneau plateforme.
Email unique garanti par index partiel PostgreSQL WHERE tenant_id IS NULL.
## Tests et build

    npm test
    npm run lint
    npm run build