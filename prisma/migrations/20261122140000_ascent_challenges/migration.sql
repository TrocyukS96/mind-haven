-- Ascent (Восхождение). Prepared only: do not apply this file to production from the architecture stage.
-- Partial unique indexes live only in this SQL file. Prisma 6.12 cannot declare them.
-- CHECK constraints are intentional. A later Prisma diff cannot see them and must not drop them.

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('active', 'paused', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "ChallengeDayStatus" AS ENUM ('pending', 'successful', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "ChallengeRestrictionKind" AS ENUM ('core_behavior', 'custom');

-- CreateEnum
CREATE TYPE "ChallengeDebtSource" AS ENUM ('habit', 'restriction', 'custom');

-- CreateEnum
CREATE TYPE "ChallengeDebtState" AS ENUM ('pending', 'satisfied', 'missed', 'not_applicable', 'bypassed');

-- CreateEnum
CREATE TYPE "ChallengeXpUnit" AS ENUM ('repetitions', 'minutes', 'kilometers', 'completion');

-- CreateEnum
CREATE TYPE "ChallengeXpReason" AS ENUM ('activity_grant', 'reward_purchase', 'streak_reset', 'activity_reversal', 'adjustment');

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unwantedBehavior" TEXT NOT NULL,
    "behaviorPreset" TEXT,
    "yearsStruggling" INTEGER,
    "importance" INTEGER NOT NULL,
    "targetDays" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'active',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL,
    "xpBalance" INTEGER NOT NULL DEFAULT 0,
    "xpEarnedTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Challenge_importance_check" CHECK ("importance" >= 0 AND "importance" <= 100),
    CONSTRAINT "Challenge_target_check" CHECK ("targetDays" >= 1),
    CONSTRAINT "Challenge_streak_check" CHECK ("currentStreak" >= 0 AND "bestStreak" >= "currentStreak"),
    CONSTRAINT "Challenge_xp_check" CHECK ("xpBalance" >= 0 AND "xpEarnedTotal" >= "xpBalance"),
    CONSTRAINT "Challenge_years_check" CHECK ("yearsStruggling" IS NULL OR "yearsStruggling" >= 0),
    CONSTRAINT "Challenge_timezone_check" CHECK (char_length("timezone") > 0)
);

-- CreateTable
CREATE TABLE "ChallengeReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "xpCost" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeReward_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeReward_xp_check" CHECK ("xpCost" >= 0)
);

-- CreateTable
CREATE TABLE "ChallengeTrigger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeHabit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completionRule" TEXT NOT NULL DEFAULT 'as_habit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeHabit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeRestriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" "ChallengeRestrictionKind" NOT NULL,
    "unlockAfterSuccessfulDays" INTEGER NOT NULL DEFAULT 0,
    "rewardId" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "bypassable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeRestriction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeRestriction_unlock_check" CHECK ("unlockAfterSuccessfulDays" >= 0),
    CONSTRAINT "ChallengeRestriction_core_check" CHECK (
        "kind" <> 'core_behavior' OR ("bypassable" = false AND "rewardId" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "ChallengeCustomDebt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeCustomDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeXpActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "unit" "ChallengeXpUnit" NOT NULL,
    "xpPerGrant" INTEGER NOT NULL,
    "quantityPerGrant" DECIMAL(12,3) NOT NULL,
    "minQuantity" DECIMAL(12,3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeXpActivity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeXpActivity_grant_check" CHECK (
        "xpPerGrant" > 0 AND "quantityPerGrant" > 0 AND "minQuantity" >= 0
    )
);

-- CreateTable
CREATE TABLE "ChallengeActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "xpGranted" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeActivityLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeActivityLog_quantity_check" CHECK ("quantity" > 0 AND "xpGranted" >= 0),
    CONSTRAINT "ChallengeActivityLog_date_check" CHECK ("localDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);

-- CreateTable
CREATE TABLE "ChallengeRewardPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "restrictionId" TEXT,
    "xpSpent" INTEGER NOT NULL,
    "grantsBypass" BOOLEAN NOT NULL DEFAULT false,
    "permissionUsed" BOOLEAN NOT NULL DEFAULT false,
    "permissionUsedAt" TIMESTAMP(3),
    "usedOnLocalDate" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeRewardPurchase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeRewardPurchase_xp_check" CHECK ("xpSpent" >= 0),
    CONSTRAINT "ChallengeRewardPurchase_date_check" CHECK (
        "usedOnLocalDate" IS NULL OR "usedOnLocalDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    )
);

-- CreateTable
CREATE TABLE "ChallengeXpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "lifetimeDelta" INTEGER NOT NULL DEFAULT 0,
    "reason" "ChallengeXpReason" NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "earnedTotalAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "localDate" TEXT,
    "sourceId" TEXT,
    "activityLogId" TEXT,
    "purchaseId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeXpTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeXpTransaction_delta_check" CHECK ("amount" <> 0 OR "lifetimeDelta" <> 0),
    CONSTRAINT "ChallengeXpTransaction_balance_check" CHECK (
        "balanceAfter" >= 0 AND "earnedTotalAfter" >= "balanceAfter"
    ),
    CONSTRAINT "ChallengeXpTransaction_date_check" CHECK (
        "localDate" IS NULL OR "localDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    )
);

-- CreateTable
CREATE TABLE "ChallengeDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "status" "ChallengeDayStatus" NOT NULL DEFAULT 'pending',
    "obligationsMet" BOOLEAN NOT NULL DEFAULT false,
    "debtClosed" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "settledAt" TIMESTAMP(3),
    "streakAfter" INTEGER,
    "bestStreakAfter" INTEGER,
    "xpBalanceAfter" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeDay_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeDay_date_check" CHECK ("localDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);

-- CreateTable
CREATE TABLE "ChallengeDebtItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "source" "ChallengeDebtSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "state" "ChallengeDebtState" NOT NULL,
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeDebtItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengeDebtItem_date_check" CHECK ("localDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);

-- CreateTable
CREATE TABLE "ChallengePause" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "startedOnLocalDate" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endedOnLocalDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengePause_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChallengePause_date_check" CHECK (
        "startedOnLocalDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        AND ("endedOnLocalDate" IS NULL OR "endedOnLocalDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
    )
);

-- CreateIndex
CREATE INDEX "Challenge_userId_idx" ON "Challenge"("userId");

-- CreateIndex
CREATE INDEX "Challenge_userId_status_idx" ON "Challenge"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_userId_active_key" ON "Challenge"("userId") WHERE "status" = 'active';

-- CreateIndex
CREATE INDEX "ChallengeReward_userId_idx" ON "ChallengeReward"("userId");

-- CreateIndex
CREATE INDEX "ChallengeReward_challengeId_sortOrder_idx" ON "ChallengeReward"("challengeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChallengeTrigger_userId_idx" ON "ChallengeTrigger"("userId");

-- CreateIndex
CREATE INDEX "ChallengeTrigger_challengeId_sortOrder_idx" ON "ChallengeTrigger"("challengeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChallengeHabit_userId_idx" ON "ChallengeHabit"("userId");

-- CreateIndex
CREATE INDEX "ChallengeHabit_habitId_idx" ON "ChallengeHabit"("habitId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeHabit_challengeId_habitId_key" ON "ChallengeHabit"("challengeId", "habitId");

-- CreateIndex
CREATE INDEX "ChallengeRestriction_userId_idx" ON "ChallengeRestriction"("userId");

-- CreateIndex
CREATE INDEX "ChallengeRestriction_challengeId_sortOrder_idx" ON "ChallengeRestriction"("challengeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChallengeRestriction_rewardId_idx" ON "ChallengeRestriction"("rewardId");

-- CreateIndex
CREATE INDEX "ChallengeCustomDebt_userId_idx" ON "ChallengeCustomDebt"("userId");

-- CreateIndex
CREATE INDEX "ChallengeCustomDebt_challengeId_sortOrder_idx" ON "ChallengeCustomDebt"("challengeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChallengeXpActivity_userId_idx" ON "ChallengeXpActivity"("userId");

-- CreateIndex
CREATE INDEX "ChallengeXpActivity_challengeId_sortOrder_idx" ON "ChallengeXpActivity"("challengeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChallengeActivityLog_challengeId_localDate_idx" ON "ChallengeActivityLog"("challengeId", "localDate");

-- CreateIndex
CREATE INDEX "ChallengeActivityLog_activityId_idx" ON "ChallengeActivityLog"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeActivityLog_userId_idempotencyKey_key" ON "ChallengeActivityLog"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ChallengeRewardPurchase_challengeId_purchasedAt_idx" ON "ChallengeRewardPurchase"("challengeId", "purchasedAt");

-- CreateIndex
CREATE INDEX "ChallengeRewardPurchase_rewardId_idx" ON "ChallengeRewardPurchase"("rewardId");

-- CreateIndex
CREATE INDEX "ChallengeRewardPurchase_restrictionId_idx" ON "ChallengeRewardPurchase"("restrictionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeRewardPurchase_userId_idempotencyKey_key" ON "ChallengeRewardPurchase"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ChallengeXpTransaction_challengeId_createdAt_idx" ON "ChallengeXpTransaction"("challengeId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeXpTransaction_activityLogId_idx" ON "ChallengeXpTransaction"("activityLogId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeXpTransaction_userId_idempotencyKey_key" ON "ChallengeXpTransaction"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeXpTransaction_purchaseId_key" ON "ChallengeXpTransaction"("purchaseId");

-- CreateIndex
CREATE INDEX "ChallengeDay_userId_localDate_idx" ON "ChallengeDay"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeDay_challengeId_localDate_key" ON "ChallengeDay"("challengeId", "localDate");

-- CreateIndex
CREATE INDEX "ChallengeDebtItem_userId_localDate_idx" ON "ChallengeDebtItem"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeDebtItem_challengeId_localDate_source_sourceId_key" ON "ChallengeDebtItem"("challengeId", "localDate", "source", "sourceId");

-- CreateIndex
CREATE INDEX "ChallengePause_userId_idx" ON "ChallengePause"("userId");

-- CreateIndex
CREATE INDEX "ChallengePause_challengeId_startedAt_idx" ON "ChallengePause"("challengeId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengePause_one_open_key" ON "ChallengePause"("challengeId") WHERE "endedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeReward" ADD CONSTRAINT "ChallengeReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeReward" ADD CONSTRAINT "ChallengeReward_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeTrigger" ADD CONSTRAINT "ChallengeTrigger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeTrigger" ADD CONSTRAINT "ChallengeTrigger_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeHabit" ADD CONSTRAINT "ChallengeHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeHabit" ADD CONSTRAINT "ChallengeHabit_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeHabit" ADD CONSTRAINT "ChallengeHabit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRestriction" ADD CONSTRAINT "ChallengeRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRestriction" ADD CONSTRAINT "ChallengeRestriction_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRestriction" ADD CONSTRAINT "ChallengeRestriction_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ChallengeReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeCustomDebt" ADD CONSTRAINT "ChallengeCustomDebt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeCustomDebt" ADD CONSTRAINT "ChallengeCustomDebt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeXpActivity" ADD CONSTRAINT "ChallengeXpActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeXpActivity" ADD CONSTRAINT "ChallengeXpActivity_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeActivityLog" ADD CONSTRAINT "ChallengeActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeActivityLog" ADD CONSTRAINT "ChallengeActivityLog_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeActivityLog" ADD CONSTRAINT "ChallengeActivityLog_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ChallengeXpActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRewardPurchase" ADD CONSTRAINT "ChallengeRewardPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRewardPurchase" ADD CONSTRAINT "ChallengeRewardPurchase_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRewardPurchase" ADD CONSTRAINT "ChallengeRewardPurchase_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ChallengeReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRewardPurchase" ADD CONSTRAINT "ChallengeRewardPurchase_restrictionId_fkey" FOREIGN KEY ("restrictionId") REFERENCES "ChallengeRestriction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeXpTransaction" ADD CONSTRAINT "ChallengeXpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeXpTransaction" ADD CONSTRAINT "ChallengeXpTransaction_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeXpTransaction" ADD CONSTRAINT "ChallengeXpTransaction_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ChallengeActivityLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeXpTransaction" ADD CONSTRAINT "ChallengeXpTransaction_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "ChallengeRewardPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDay" ADD CONSTRAINT "ChallengeDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDay" ADD CONSTRAINT "ChallengeDay_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDebtItem" ADD CONSTRAINT "ChallengeDebtItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDebtItem" ADD CONSTRAINT "ChallengeDebtItem_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengePause" ADD CONSTRAINT "ChallengePause_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengePause" ADD CONSTRAINT "ChallengePause_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
