-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PLACED', 'ACCEPTED', 'REJECTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Booking"
ALTER COLUMN "status" TYPE "BookingStatus"
USING ("status"::text::"BookingStatus"),
ALTER COLUMN "status" SET DEFAULT 'PLACED';
