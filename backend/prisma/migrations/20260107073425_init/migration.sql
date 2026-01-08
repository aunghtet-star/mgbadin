-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COLLECTOR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_phases" (
    "id" UUID NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(6),
    "global_limit" DECIMAL(15,2) NOT NULL DEFAULT 50000.00,

    CONSTRAINT "game_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_limits" (
    "phase_id" UUID NOT NULL,
    "number" CHAR(3) NOT NULL,
    "max_amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "number_limits_pkey" PRIMARY KEY ("phase_id","number")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "number" CHAR(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_ledger" (
    "id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "total_in" DECIMAL(15,2) NOT NULL,
    "total_out" DECIMAL(15,2) NOT NULL,
    "net_profit" DECIMAL(15,2) NOT NULL,
    "settled_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_ledger_phase_id_key" ON "settlement_ledger"("phase_id");

-- AddForeignKey
ALTER TABLE "number_limits" ADD CONSTRAINT "number_limits_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "game_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "game_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_ledger" ADD CONSTRAINT "settlement_ledger_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "game_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
