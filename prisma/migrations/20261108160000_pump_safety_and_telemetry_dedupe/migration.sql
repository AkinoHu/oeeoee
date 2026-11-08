-- AlterTable: bookkeeping for pump doses handed out by /api/device/telemetry
ALTER TABLE "Device" ADD COLUMN     "lastPumpCommandAt" TIMESTAMP(3),
ADD COLUMN     "lastPumpCommandSec" INTEGER;

-- Drop duplicate readings (same pot, same instant) left by retried uploads,
-- keeping one row each, so the unique index below can be created.
DELETE FROM "Telemetry" a
USING "Telemetry" b
WHERE a."deviceId" = b."deviceId"
  AND a."recordedAt" = b."recordedAt"
  AND a."id" > b."id";

-- DropIndex
DROP INDEX "Telemetry_deviceId_recordedAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Telemetry_deviceId_recordedAt_key" ON "Telemetry"("deviceId", "recordedAt");
