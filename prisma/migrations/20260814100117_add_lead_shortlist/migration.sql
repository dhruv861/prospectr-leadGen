-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "shortlisted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_lead_shortlisted" ON "leads"("shortlisted_at");
