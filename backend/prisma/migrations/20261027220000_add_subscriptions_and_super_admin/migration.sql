-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YEARLY', 'TRIAL', 'LIFETIME');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "tenants" 
  DROP COLUMN IF EXISTS "plan",
  ADD COLUMN IF NOT EXISTS "plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS "subscription_expires_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS "max_users" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "is_blocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "block_reason" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "tenant_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "notes" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_payments_tenant_id_idx" ON "tenant_payments"("tenant_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "tenant_payments" ADD CONSTRAINT "tenant_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
