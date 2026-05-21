-- Script d'initialisation PostgreSQL
-- Créé automatiquement par docker-entrypoint-initdb.d

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour les performances
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
