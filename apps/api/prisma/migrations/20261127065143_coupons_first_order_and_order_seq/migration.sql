-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false;

-- Human-friendly order numbers: MM10001, MM10002, ...
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10001;
