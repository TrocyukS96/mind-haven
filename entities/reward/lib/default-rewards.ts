import type { Reward } from '../model/types';

export const DEFAULT_PLATFORM_REWARDS: Reward[] = [
  {
    id: 'platform-subscription-10',
    type: 'platform',
    titleKey: 'platform.subscription10.title',
    descriptionKey: 'platform.subscription10.description',
    title: '',
    cost: 500,
    icon: 'percent',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'platform-notebook',
    type: 'platform',
    titleKey: 'platform.notebook.title',
    descriptionKey: 'platform.notebook.description',
    title: '',
    cost: 300,
    icon: 'book',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'platform-masterclass',
    type: 'platform',
    titleKey: 'platform.masterclass.title',
    descriptionKey: 'platform.masterclass.description',
    title: '',
    cost: 800,
    icon: 'graduation-cap',
    createdAt: new Date(0).toISOString(),
  },
];
