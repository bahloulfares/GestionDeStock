-- Index unique partiel pour garantir l'unicite de l'email des SUPER_ADMIN
-- Un SUPER_ADMIN n'a pas de tenant (tenantId IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_super_admin_unique
ON users (email)
WHERE tenant_id IS NULL;
