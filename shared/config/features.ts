import type { UserRole } from '@/entities/user';

export const FEATURE_KEYS = [
  'dashboard',
  'goals',
  'tasks',
  'journal',
  'habits',
  'tables',
  'analytics',
  'ai_assistant',
  'profile',
  'admin_panel',
  'admin_feature_settings',
  'admin_manage_admins',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureCategory = 'core' | 'premium' | 'admin';

export interface FeatureDefinition {
  key: FeatureKey;
  category: FeatureCategory;
  /** Minimum role required to access the feature */
  minRole: UserRole;
  /** If true, only users with active subscription (or granted access) can use it */
  requiresSubscription: boolean;
  /** If true, admins can globally hide this feature for regular users */
  adminToggleable: boolean;
  /** Default visibility when no DB flag exists yet */
  defaultEnabled: boolean;
}

export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  dashboard: {
    key: 'dashboard',
    category: 'core',
    minRole: 'GUEST',
    requiresSubscription: false,
    adminToggleable: true,
    defaultEnabled: true,
  },
  goals: {
    key: 'goals',
    category: 'core',
    minRole: 'GUEST',
    requiresSubscription: false,
    adminToggleable: true,
    defaultEnabled: true,
  },
  tasks: {
    key: 'tasks',
    category: 'core',
    minRole: 'GUEST',
    requiresSubscription: false,
    adminToggleable: true,
    defaultEnabled: true,
  },
  journal: {
    key: 'journal',
    category: 'core',
    minRole: 'GUEST',
    requiresSubscription: false,
    adminToggleable: true,
    defaultEnabled: true,
  },
  habits: {
    key: 'habits',
    category: 'core',
    minRole: 'GUEST',
    requiresSubscription: false,
    adminToggleable: true,
    defaultEnabled: true,
  },
  tables: {
    key: 'tables',
    category: 'core',
    minRole: 'GUEST',
    requiresSubscription: false,
    adminToggleable: true,
    defaultEnabled: true,
  },
  analytics: {
    key: 'analytics',
    category: 'premium',
    minRole: 'USER',
    requiresSubscription: true,
    adminToggleable: true,
    defaultEnabled: false,
  },
  ai_assistant: {
    key: 'ai_assistant',
    category: 'premium',
    minRole: 'USER',
    requiresSubscription: true,
    adminToggleable: true,
    defaultEnabled: false,
  },
  profile: {
    key: 'profile',
    category: 'core',
    minRole: 'USER',
    requiresSubscription: false,
    adminToggleable: false,
    defaultEnabled: true,
  },
  admin_panel: {
    key: 'admin_panel',
    category: 'admin',
    minRole: 'ADMIN',
    requiresSubscription: false,
    adminToggleable: false,
    defaultEnabled: true,
  },
  admin_feature_settings: {
    key: 'admin_feature_settings',
    category: 'admin',
    minRole: 'ADMIN',
    requiresSubscription: false,
    adminToggleable: false,
    defaultEnabled: true,
  },
  admin_manage_admins: {
    key: 'admin_manage_admins',
    category: 'admin',
    minRole: 'SUPER_ADMIN',
    requiresSubscription: false,
    adminToggleable: false,
    defaultEnabled: true,
  },
};

export const NAV_FEATURE_KEYS: FeatureKey[] = [
  'dashboard',
  'goals',
  'tasks',
  'journal',
  'habits',
  'tables',
];

export function getDefaultFeatureFlags(): Record<FeatureKey, boolean> {
  return Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, FEATURES[key].defaultEnabled])
  ) as Record<FeatureKey, boolean>;
}

export function getFeatureListByCategory(category: FeatureCategory): FeatureDefinition[] {
  return FEATURE_KEYS.map((key) => FEATURES[key]).filter(
    (feature) => feature.category === category
  );
}
