import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  path.join(process.cwd(), 'prisma/migrations/20261122140000_ascent_challenges/migration.sql'),
  'utf8'
);

describe('ascent migration', () => {
  it('adds the ascent tables without deleting existing data', () => {
    const lowered = sql.toLowerCase();
    expect(lowered).not.toContain('drop table');
    expect(lowered).not.toContain('truncate');
    expect(lowered).not.toMatch(/delete\s+from/);
    expect(sql).toContain('CREATE TABLE "Challenge"');
  });

  it('keeps the partial unique indexes and check constraints outside the Prisma schema', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "Challenge_userId_active_key" ON "Challenge"("userId") WHERE "status" = \'active\'');
    expect(sql).toContain('CREATE UNIQUE INDEX "ChallengePause_one_open_key" ON "ChallengePause"("challengeId") WHERE "endedAt" IS NULL');

    for (const name of [
      'Challenge_importance_check',
      'Challenge_target_check',
      'Challenge_streak_check',
      'Challenge_xp_check',
      'Challenge_years_check',
      'Challenge_timezone_check',
      'ChallengeReward_xp_check',
      'ChallengeRestriction_unlock_check',
      'ChallengeRestriction_core_check',
      'ChallengeXpActivity_grant_check',
      'ChallengeActivityLog_quantity_check',
      'ChallengeActivityLog_date_check',
      'ChallengeRewardPurchase_xp_check',
      'ChallengeXpTransaction_delta_check',
      'ChallengeXpTransaction_balance_check',
      'ChallengeDay_date_check',
      'ChallengeDebtItem_date_check',
    ]) {
      expect(sql).toContain(`CONSTRAINT "${name}"`);
    }
  });
});
