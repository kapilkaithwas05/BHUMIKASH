-- Add question type, explicit publication, and optional server-enforced availability.
-- Existing questions remain published practice content to preserve current behavior.
CREATE TYPE "QuestionType" AS ENUM ('DAILY', 'PRACTICE');

ALTER TABLE "Question"
  ADD COLUMN "contentType" "QuestionType" NOT NULL DEFAULT 'PRACTICE',
  ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "availableFrom" TIMESTAMP(3),
  ADD COLUMN "availableUntil" TIMESTAMP(3);

CREATE INDEX "Question_isPublished_availableFrom_availableUntil_idx"
  ON "Question"("isPublished", "availableFrom", "availableUntil");
