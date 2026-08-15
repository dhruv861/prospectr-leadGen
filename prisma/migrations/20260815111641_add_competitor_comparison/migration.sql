-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "competitor_gaps" JSONB,
ADD COLUMN     "competitor_gaps_generated_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_opener" TEXT,
ADD COLUMN     "whatsapp_opener_generated_at" TIMESTAMP(3);
