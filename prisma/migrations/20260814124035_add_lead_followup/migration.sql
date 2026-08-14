-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "follow_up_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_lead_followup" ON "leads"("follow_up_at");
