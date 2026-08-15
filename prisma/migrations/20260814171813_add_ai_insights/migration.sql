-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "opportunities" JSONB,
ADD COLUMN     "opportunities_generated_at" TIMESTAMP(3),
ADD COLUMN     "pitch_ideas" JSONB,
ADD COLUMN     "pitch_ideas_generated_at" TIMESTAMP(3);
