-- AlterTable: make cost_price_at_sale nullable
ALTER TABLE "sale_items" ALTER COLUMN "cost_price_at_sale" DROP NOT NULL;
