import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const vars = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  vars[match[1]] = value;
}

function withParam(url, key, value) {
  const next = new URL(url);
  next.searchParams.set(key, value);
  return next.toString();
}

const pooled = vars.DATABASE_URL || vars.POSTGRES_URL;
const direct = vars.DIRECT_URL || vars.POSTGRES_URL_NON_POOLING;

async function timeTransaction(label, url) {
  const parsed = new URL(url);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const started = Date.now();
  await prisma.$queryRawUnsafe('SELECT 1');
  const connectMs = Date.now() - started;
  const warmStarted = Date.now();
  await prisma.$queryRawUnsafe('SELECT 1');
  const warmMs = Date.now() - warmStarted;
  const txStarted = Date.now();
  let marks = [];
  await prisma.$transaction(
    async (tx) => {
      const lap = async (name, fn) => {
        const at = Date.now();
        await fn();
        marks.push({ name, ms: Date.now() - at });
      };
      const challenge = await tx.challenge.findFirst({ where: { status: 'active' } });
      marks.push({ name: 'challenge', ms: Date.now() - txStarted });
      if (!challenge) return;
      await lap('lock', () =>
        tx.$queryRawUnsafe(
          `SELECT "id" FROM "Challenge" WHERE "id" = $1 AND "userId" = $2 FOR UPDATE`,
          challenge.id,
          challenge.userId
        )
      );
      const batchStarted = Date.now();
      await Promise.all([
        tx.challengeDay.findMany({ where: { challengeId: challenge.id } }),
        tx.challengeXpTransaction.findMany({ where: { challengeId: challenge.id } }),
        tx.challengeRewardPurchase.findMany({ where: { challengeId: challenge.id } }),
        tx.challengeHabit.findMany({ where: { challengeId: challenge.id } }),
        tx.challengeRestriction.findMany({ where: { challengeId: challenge.id } }),
        tx.challengeCustomDebt.findMany({ where: { challengeId: challenge.id } }),
        tx.challengeDebtItem.findMany({ where: { challengeId: challenge.id } }),
      ]);
      marks.push({ name: 'batch', ms: Date.now() - batchStarted });
    },
    { timeout: 30_000 }
  );
  console.log(
    JSON.stringify({
      label,
      host: parsed.hostname,
      pooler: parsed.hostname.includes('-pooler'),
      pgbouncer: parsed.searchParams.get('pgbouncer'),
      connectMs,
      warmMs,
      txMs: Date.now() - txStarted,
      marks,
    })
  );
  await prisma.$disconnect();
}

async function timeParallelReads(label, url) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await prisma.$queryRawUnsafe('SELECT 1');
  const challenge = await prisma.challenge.findFirst({ where: { status: 'active' } });
  const started = Date.now();
  await Promise.all([
    prisma.challengeDay.findMany({ where: { challengeId: challenge.id } }),
    prisma.challengeXpTransaction.findMany({ where: { challengeId: challenge.id } }),
    prisma.challengeRewardPurchase.findMany({ where: { challengeId: challenge.id } }),
    prisma.challengeHabit.findMany({ where: { challengeId: challenge.id } }),
    prisma.challengeRestriction.findMany({ where: { challengeId: challenge.id } }),
    prisma.challengeCustomDebt.findMany({ where: { challengeId: challenge.id } }),
    prisma.challengeDebtItem.findMany({ where: { challengeId: challenge.id } }),
  ]);
  console.log(JSON.stringify({ label, parallelMs: Date.now() - started }));
  await prisma.$disconnect();
}

await timeParallelReads('parallel-outside-tx', pooled);
await timeTransaction('pooled', pooled);

const url = pooled;
const prisma = new PrismaClient({ datasources: { db: { url } } });
const started = Date.now();
await prisma.$queryRawUnsafe('SELECT 1');
console.log(JSON.stringify({ select1Ms: Date.now() - started }));

const warm = [];
for (let i = 0; i < 12; i += 1) {
  const at = Date.now();
  await prisma.$queryRawUnsafe('SELECT 1');
  warm.push(Date.now() - at);
}
console.log(JSON.stringify({ warmSelect1Ms: warm }));

const txStarted = Date.now();
await prisma.$transaction(
  async (tx) => {
    const marks = [];
    const lap = async (name, fn) => {
      const at = Date.now();
      const result = await fn();
      marks.push({ name, ms: Date.now() - at });
      return result;
    };
    const challenge = await lap('challenge', () => tx.challenge.findFirst({ where: { status: 'active' } }));
    if (!challenge) {
      console.log(JSON.stringify({ txMs: Date.now() - txStarted, marks }));
      return;
    }
    await lap('lock', () =>
      tx.$queryRawUnsafe(
        `SELECT "id" FROM "Challenge" WHERE "id" = $1 AND "userId" = $2 FOR UPDATE`,
        challenge.id,
        challenge.userId
      )
    );
    await Promise.all([
      lap('days', () => tx.challengeDay.findMany({ where: { challengeId: challenge.id } })),
      lap('xp', () => tx.challengeXpTransaction.findMany({ where: { challengeId: challenge.id } })),
      lap('purchases', () => tx.challengeRewardPurchase.findMany({ where: { challengeId: challenge.id } })),
      lap('links', () => tx.challengeHabit.findMany({ where: { challengeId: challenge.id } })),
      lap('restrictions', () => tx.challengeRestriction.findMany({ where: { challengeId: challenge.id } })),
      lap('customs', () => tx.challengeCustomDebt.findMany({ where: { challengeId: challenge.id } })),
      lap('debts', () => tx.challengeDebtItem.findMany({ where: { challengeId: challenge.id } })),
    ]);
    console.log(JSON.stringify({ txMs: Date.now() - txStarted, marks }));
  },
  { timeout: 30_000 }
);

const activity = await prisma.$queryRawUnsafe(`
  SELECT pid,
         state,
         wait_event_type,
         wait_event,
         EXTRACT(EPOCH FROM (now() - xact_start))::int AS xact_s,
         EXTRACT(EPOCH FROM (now() - query_start))::int AS query_s,
         left(query, 160) AS query
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND pid <> pg_backend_pid()
  ORDER BY xact_start NULLS LAST
`);
console.log(JSON.stringify({ activity }, null, 2));

const counts = await prisma.$queryRawUnsafe(`
  SELECT
    (SELECT count(*) FROM "Challenge")::int AS challenges,
    (SELECT count(*) FROM "ChallengeDay")::int AS days,
    (SELECT count(*) FROM "ChallengeDebtItem")::int AS debts,
    (SELECT count(*) FROM "ChallengeXpTransaction")::int AS xp,
    (SELECT count(*) FROM "ChallengeHabit")::int AS habits
`);
console.log(JSON.stringify({ counts }));

await prisma.$disconnect();
