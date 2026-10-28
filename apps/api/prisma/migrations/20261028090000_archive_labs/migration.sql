ALTER TABLE "Lab" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "Lab_archivedAt_idx" ON "Lab"("archivedAt");
