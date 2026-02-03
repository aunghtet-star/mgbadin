/*
  Warnings:

  - The `bet_slip_id` column on the `bets` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "bets" DROP COLUMN "bet_slip_id",
ADD COLUMN     "bet_slip_id" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "current_slip_id" INTEGER NOT NULL DEFAULT 0;
