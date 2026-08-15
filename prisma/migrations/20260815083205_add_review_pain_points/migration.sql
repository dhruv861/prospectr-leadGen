-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "review_pain_points" JSONB,
ADD COLUMN     "review_pain_points_generated_at" TIMESTAMP(3);
