export type RewardType = 'platform' | 'personal';

export interface Reward {
  id: string;
  type: RewardType;
  title: string;
  description?: string;
  cost: number;
  icon?: string;
  titleKey?: string;
  descriptionKey?: string;
  claimedAt?: string;
  createdAt: string;
}

export type CreatePersonalRewardInput = Pick<Reward, 'title' | 'description' | 'cost' | 'icon'>;
