-- Separate the abstinence clock from the challenge start.
-- Existing rows keep the previous clock by copying startsAt.
-- Prepared only: do not apply this file to production or the remote Neon database from the agent.

ALTER TABLE "Challenge" ADD COLUMN "abstinenceStartedAt" TIMESTAMP(3);

UPDATE "Challenge"
SET "abstinenceStartedAt" = "startsAt"
WHERE "abstinenceStartedAt" IS NULL;

ALTER TABLE "Challenge" ALTER COLUMN "abstinenceStartedAt" SET NOT NULL;
