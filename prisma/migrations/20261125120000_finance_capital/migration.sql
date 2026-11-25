-- Non-destructive capital extension. Existing accounts stay REGULAR.
-- Do not apply to production without an explicit decision.

CREATE TYPE "FinanceAccountPurpose" AS ENUM ('REGULAR', 'CAPITAL');

ALTER TABLE "FinanceAccount"
  ADD COLUMN "purpose" "FinanceAccountPurpose" NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "FinanceAccount_userId_purpose_idx" ON "FinanceAccount"("userId", "purpose");

CREATE TABLE "FinanceTransfer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "fromAccountId" TEXT NOT NULL,
  "toAccountId" TEXT NOT NULL,
  "debitAmount" DECIMAL(14,2) NOT NULL,
  "creditAmount" DECIMAL(14,2) NOT NULL,
  "exchangeRate" DECIMAL(18,8),
  "feeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "date" DATE NOT NULL,
  "comment" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceAccountPurposeChange" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "fromPurpose" "FinanceAccountPurpose",
  "toPurpose" "FinanceAccountPurpose" NOT NULL,
  "balanceAtChange" DECIMAL(14,2) NOT NULL,
  "effectiveDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceAccountPurposeChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCapitalGoal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "goalType" TEXT NOT NULL,
  "targetAmount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "archivedAt" TIMESTAMP(3),
  "celebratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceCapitalGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExchangeRateHistory" (
  "id" TEXT NOT NULL,
  "rateDate" DATE NOT NULL,
  "currency" TEXT NOT NULL,
  "scale" INTEGER NOT NULL,
  "rate" DECIMAL(18,8) NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExchangeRateHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinanceTransaction"
  ADD COLUMN "capitalFlow" TEXT,
  ADD COLUMN "capitalKind" TEXT,
  ADD COLUMN "transferId" TEXT,
  ADD COLUMN "transferLeg" TEXT,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "expenseCategory" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "counterpartyAccountId" TEXT;

CREATE UNIQUE INDEX "FinanceTransfer_userId_idempotencyKey_key" ON "FinanceTransfer"("userId", "idempotencyKey");
CREATE INDEX "FinanceTransfer_userId_date_idx" ON "FinanceTransfer"("userId", "date");
CREATE UNIQUE INDEX "FinanceTransaction_userId_idempotencyKey_key" ON "FinanceTransaction"("userId", "idempotencyKey");
CREATE INDEX "FinanceTransaction_transferId_idx" ON "FinanceTransaction"("transferId");
CREATE INDEX "FinanceAccountPurposeChange_userId_accountId_effectiveDate_idx" ON "FinanceAccountPurposeChange"("userId", "accountId", "effectiveDate");
CREATE INDEX "FinanceCapitalGoal_userId_idx" ON "FinanceCapitalGoal"("userId");
CREATE UNIQUE INDEX "ExchangeRateHistory_rateDate_currency_key" ON "ExchangeRateHistory"("rateDate", "currency");
CREATE INDEX "ExchangeRateHistory_currency_rateDate_idx" ON "ExchangeRateHistory"("currency", "rateDate");

ALTER TABLE "FinanceTransfer" ADD CONSTRAINT "FinanceTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceTransfer" ADD CONSTRAINT "FinanceTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceTransfer" ADD CONSTRAINT "FinanceTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "FinanceTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountPurposeChange" ADD CONSTRAINT "FinanceAccountPurposeChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountPurposeChange" ADD CONSTRAINT "FinanceAccountPurposeChange_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceCapitalGoal" ADD CONSTRAINT "FinanceCapitalGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
