export interface AscentEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  idempotent: boolean;
  purpose: string;
}

/**
 * Pause and resume are intentionally absent. The domain can represent a pause,
 * but this stage does not expose it to the user.
 * Every handler authenticates with the existing session, scopes rows by userId,
 * and returns 404 when the id belongs to someone else. Mutations run inside
 * prisma.$transaction, lock the challenge row, and settle elapsed days before
 * changing XP or debt. Idempotency keys use the unique indexes on
 * ChallengeXpTransaction, ChallengeActivityLog, and ChallengeRewardPurchase.
 * Habit rows are created through POST /api/habits, then linked here.
 */
export const ASCENT_API_CONTRACT: readonly AscentEndpoint[] = [
  { method: 'GET', path: '/api/ascent/challenges', idempotent: true, purpose: 'List the signed-in user challenges and settle the active one.' },
  { method: 'POST', path: '/api/ascent/challenges', idempotent: false, purpose: 'Create a challenge in the user timezone, reject a second active challenge, and insert the core behavior restriction.' },
  { method: 'POST', path: '/api/ascent/challenges/setup', idempotent: false, purpose: 'Create one active challenge and its rewards, triggers, habit links, restrictions, custom debts, and XP activities in a single transaction. A failure rolls the whole setup back. A second call cannot create another active challenge.' },
  { method: 'GET', path: '/api/ascent/challenges/:id', idempotent: true, purpose: 'Return the challenge, its setup, streak, record, and XP. Settle elapsed days in the same transaction.' },
  { method: 'PATCH', path: '/api/ascent/challenges/:id', idempotent: true, purpose: 'Edit title, description, importance, and behavior notes. A mistaken abstinence start can be corrected with abstinenceDate and abstinenceTime until the first reset. Streak, record, timezone, target, challenge start, closed days, and XP are not client-writable.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/archive', idempotent: true, purpose: 'Archive the challenge without deleting day, purchase, or XP history.' },
  { method: 'GET', path: '/api/ascent/challenges/:id/habits', idempotent: true, purpose: 'List habits linked to the challenge.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/habits', idempotent: false, purpose: 'Link an owned daily habit. Completion uses the existing habit day rules.' },
  { method: 'DELETE', path: '/api/ascent/challenges/:id/habits/:linkId', idempotent: true, purpose: 'Detach a habit from the challenge without deleting the habit.' },
  { method: 'GET', path: '/api/ascent/challenges/:id/rewards', idempotent: true, purpose: 'List XP rewards. There is no attractiveness score.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/rewards', idempotent: false, purpose: 'Create a reward priced in XP.' },
  { method: 'PATCH', path: '/api/ascent/challenges/:id/rewards/:rewardId', idempotent: true, purpose: 'Edit a reward. This cannot weaken the core behavior.' },
  { method: 'DELETE', path: '/api/ascent/challenges/:id/rewards/:rewardId', idempotent: true, purpose: 'Delete a reward that is not referenced by a restriction or purchase.' },
  { method: 'GET', path: '/api/ascent/challenges/:id/triggers', idempotent: true, purpose: 'List triggers. Triggers do not settle the day.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/triggers', idempotent: false, purpose: 'Store a trigger as reference data.' },
  { method: 'PATCH', path: '/api/ascent/challenges/:id/triggers/:triggerId', idempotent: true, purpose: 'Edit a trigger.' },
  { method: 'DELETE', path: '/api/ascent/challenges/:id/triggers/:triggerId', idempotent: true, purpose: 'Delete a trigger.' },
  { method: 'GET', path: '/api/ascent/challenges/:id/restrictions', idempotent: true, purpose: 'List strict and bypassable restrictions, including the core behavior.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/restrictions', idempotent: false, purpose: 'Add a custom restriction. Core behavior cannot reference a reward or be marked bypassable.' },
  { method: 'PATCH', path: '/api/ascent/challenges/:id/restrictions/:restrictionId', idempotent: true, purpose: 'Edit a restriction. The core behavior cannot be weakened or made bypassable.' },
  { method: 'DELETE', path: '/api/ascent/challenges/:id/restrictions/:restrictionId', idempotent: true, purpose: 'Delete a custom restriction. The core behavior stays.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/restrictions/:restrictionId/violations', idempotent: true, purpose: 'Record that a restriction was broken today. A core-behavior violation cannot be bought off.' },
  { method: 'GET', path: '/api/ascent/challenges/:id/custom-debts', idempotent: true, purpose: 'List extra required actions.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/custom-debts', idempotent: false, purpose: 'Add an extra required action for the current local date and later open days.' },
  { method: 'PATCH', path: '/api/ascent/challenges/:id/custom-debts/:debtId', idempotent: true, purpose: 'Edit a custom debt definition.' },
  { method: 'DELETE', path: '/api/ascent/challenges/:id/custom-debts/:debtId', idempotent: true, purpose: 'Remove a custom debt definition. Closed days stay unchanged.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/debt/:localDate/confirm', idempotent: true, purpose: 'Confirm restriction or custom debt items for today only.' },
  { method: 'PATCH', path: '/api/ascent/debts/:id', idempotent: true, purpose: 'Confirm or cancel one manual debt item for the open local date.' },
  { method: 'GET', path: '/api/ascent/today', idempotent: true, purpose: 'Active challenge, streak, record, XP balance, today debt, active restrictions, and the abstinence clock.' },
  { method: 'GET', path: '/api/ascent/history', idempotent: true, purpose: 'Settled days and the abstinence clock for the active challenge, or for challengeId.' },
  { method: 'GET', path: '/api/ascent/challenges/:id/days', idempotent: true, purpose: 'Settled days and debt items for one challenge.' },
  { method: 'GET', path: '/api/ascent/xp/activities', idempotent: true, purpose: 'List XP activities for the active challenge, or for challengeId.' },
  { method: 'POST', path: '/api/ascent/xp/activities', idempotent: false, purpose: 'Add a user-defined XP activity. The server does not invent a physical workload.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/xp-activities', idempotent: false, purpose: 'Add an XP activity to one challenge.' },
  { method: 'PATCH', path: '/api/ascent/xp/activities/:id', idempotent: true, purpose: 'Change an XP activity rule. Grants already stored are not rewritten.' },
  { method: 'POST', path: '/api/ascent/xp/earn', idempotent: true, purpose: 'Grant XP for a quantity logged today. The idempotency key blocks a second grant.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/activities/:activityId/logs', idempotent: true, purpose: 'Grant XP for one activity. Same ledger rules as /api/ascent/xp/earn.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/activity-logs/:logId/reversal', idempotent: true, purpose: 'Reverse a mistaken grant from today, debit the balance down to zero, and reduce lifetime earned XP.' },
  { method: 'POST', path: '/api/ascent/rewards/:id/purchase', idempotent: true, purpose: 'Buy a reward if the balance covers xpCost. The same key cannot charge twice.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/rewards/:rewardId/purchases', idempotent: true, purpose: 'Buy a reward inside a challenge. A core behavior restriction cannot be the bypass target.' },
  { method: 'POST', path: '/api/ascent/challenges/:id/purchases/:purchaseId/use', idempotent: true, purpose: 'Use a one-time bypass permission on today. Using it is not a restriction violation.' },
  { method: 'GET', path: '/api/ascent/xp/transactions', idempotent: true, purpose: 'XP ledger: why points were granted or spent.' },
  { method: 'GET', path: '/api/ascent/challenges/:id/xp', idempotent: true, purpose: 'Balance, lifetime total, and the XP ledger for one challenge.' },
  { method: 'GET', path: '/api/ascent/rewards/purchases', idempotent: true, purpose: 'Reward purchase history.' },
];
