# StockTN — SaaS Gestion de Stocks MVP V1.0

Application web SaaS multi-tenant de gestion de stocks pour petites boutiques d'accessoires téléphones en Tunisie.

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite + MUI v5 |
| Backend | NestJS + TypeScript + Prisma ORM |
| Base de données | PostgreSQL 16 (via Docker) |
| Auth | JWT (15min) + Refresh token rotatif (7j) |
| Graphiques | Recharts |

## Prérequis

- Node.js ≥ 20
- Docker Desktop (pour PostgreSQL)
- npm ≥ 10

## Démarrage rapide

### 1. Variables d'environnement

```bash
# Racine du projet
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
```

### 2. Lancer PostgreSQL

```bash
docker-compose up -d
```

- PostgreSQL disponible sur `localhost:5432`
- pgAdmin disponible sur `http://localhost:5050`

### 3. Lancer le backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API disponible sur `http://localhost:3000/api`
Swagger UI sur `http://localhost:3000/api/docs`

### 4. Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible sur `http://localhost:5173`

## Structure du projet

```
MVP_V1/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── auth/         # Authentification JWT
│   │   ├── users/        # Gestion utilisateurs
│   │   ├── products/     # Produits & alertes stock
│   │   ├── categories/   # Catégories
│   │   ├── suppliers/    # Fournisseurs
│   │   ├── purchases/    # Bons de commande
│   │   ├── sales/        # Ventes & annulations
│   │   ├── reports/      # Rapports
│   │   ├── dashboard/    # Tableau de bord
│   │   ├── inventory/    # Inventaire physique
│   │   ├── activity-logs/ # Logs d'activité
│   │   └── common/       # Guards, Middleware, Pipes
│   └── prisma/           # Schéma & migrations
├── frontend/             # React + MUI
│   └── src/
│       ├── pages/        # Pages de l'application
│       ├── components/   # Composants réutilisables
│       ├── hooks/        # Custom hooks
│       ├── services/     # Appels API (axios)
│       └── theme/        # Thème MUI
├── scripts/              # Scripts utilitaires
├── docker-compose.yml    # PostgreSQL + pgAdmin
└── .env.example          # Template variables d'env
```

## Comptes de démo (après seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Administrateur | admin@demo.tn | Admin@2026! |
| Employé | employe@demo.tn | Employe@2026! |

## Sécurité

- Mots de passe hashés bcrypt (factor 12)
- JWT access token 15 min + refresh token 7 jours (rotatif)
- Isolation totale des données par tenant (boutique)
- Rate limiting : 5 tentatives/min sur le login
- Headers de sécurité via Helmet.js

## Licence

Usage interne — Confidentiel
