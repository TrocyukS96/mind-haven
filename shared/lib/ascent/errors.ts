export const ASCENT_ERROR_CODES = [
  'invalid_timezone',
  'invalid_local_date',
  'invalid_quantity',
  'invalid_activity_rule',
  'invalid_idempotency_key',
  'invalid_challenge',
  'invalid_title',
  'invalid_importance',
  'invalid_target_days',
  'invalid_restriction',
  'xp_grant_too_large',
  'activity_inactive',
  'below_minimum',
  'insufficient_xp',
  'reward_unavailable',
  'invalid_xp_cost',
  'core_behavior_not_bypassable',
  'core_behavior_required',
  'bypass_requires_reward',
  'reward_link_requires_bypass',
  'permission_already_used',
  'not_a_permit',
  'future_date',
  'day_already_closed',
  'challenge_not_active',
  'challenge_not_paused',
  'invalid_pause',
  'pending_day_cannot_settle',
  'inconsistent_day',
  'invariant_broken',
  'active_challenge_exists',
  'start_date_in_past',
  'abstinence_start_invalid',
  'abstinence_start_in_future',
  'abstinence_start_locked',
  'habit_owner_mismatch',
  'timezone_locked',
  'not_found',
  'habit_not_daily',
  'habit_already_linked',
  'debt_not_manual',
  'violation_locked',
  'resource_in_use',
] as const;

export type AscentErrorCode = (typeof ASCENT_ERROR_CODES)[number];

const MESSAGES: Record<AscentErrorCode, string> = {
  invalid_timezone: 'Invalid timezone',
  invalid_local_date: 'Invalid local date',
  invalid_quantity: 'Invalid quantity',
  invalid_activity_rule: 'Invalid XP activity',
  invalid_idempotency_key: 'Invalid idempotency key',
  invalid_challenge: 'Invalid challenge',
  invalid_title: 'Title is required',
  invalid_importance: 'Importance must be between 0 and 100',
  invalid_target_days: 'Target duration must be at least 1 day',
  invalid_restriction: 'Invalid restriction',
  xp_grant_too_large: 'XP grant is too large',
  activity_inactive: 'XP activity is inactive',
  below_minimum: 'Quantity is below the minimum',
  insufficient_xp: 'Not enough XP',
  reward_unavailable: 'Reward is unavailable',
  invalid_xp_cost: 'Invalid XP cost',
  core_behavior_not_bypassable: 'The core behavior cannot be bypassed with XP',
  core_behavior_required: 'Challenge requires an active core behavior restriction',
  bypass_requires_reward: 'A bypassable restriction needs a reward',
  reward_link_requires_bypass: 'A reward link requires a bypassable restriction',
  permission_already_used: 'Reward permission is already used',
  not_a_permit: 'This purchase does not grant a bypass',
  future_date: 'Cannot log a future day',
  day_already_closed: 'This day is already closed',
  challenge_not_active: 'Challenge is not active',
  challenge_not_paused: 'Challenge is not paused',
  invalid_pause: 'Invalid pause window',
  pending_day_cannot_settle: 'A pending day cannot be settled',
  inconsistent_day: 'Day evaluation contradicts its status',
  invariant_broken: 'Ascent state is inconsistent',
  active_challenge_exists: 'Only one active challenge is allowed',
  start_date_in_past: 'The start date cannot be in the past',
  abstinence_start_invalid: 'The abstinence start is invalid',
  abstinence_start_in_future: 'The abstinence start cannot be in the future',
  abstinence_start_locked: 'The abstinence start cannot be changed after the first reset',
  habit_owner_mismatch: 'Habit belongs to another user',
  timezone_locked: 'Challenge timezone cannot be changed',
  not_found: 'Not found',
  habit_not_daily: 'Only a daily habit can be linked',
  habit_already_linked: 'Habit is already linked to this challenge',
  debt_not_manual: 'Habit debt follows the habit tracker',
  violation_locked: 'A recorded violation cannot be confirmed away',
  resource_in_use: 'This item is still used by the challenge',
};

export class AscentRuleError extends Error {
  readonly code: AscentErrorCode;

  constructor(code: AscentErrorCode) {
    super(MESSAGES[code]);
    this.name = 'AscentRuleError';
    this.code = code;
  }
}

export function isAscentRuleError(error: unknown): error is AscentRuleError {
  return error instanceof AscentRuleError;
}
