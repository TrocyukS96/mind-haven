import type { ActivityEventInput, ActivityEventMetadata } from '../model/types';
import { getActivityTypeDefinition } from '../model/catalog';

interface BuildActivityInputParams {
  type: string;
  entityId?: string | null;
  title: string;
  metadata?: ActivityEventMetadata;
  idempotencyKey: string;
  createdAt?: string;
  entityType?: string;
}

export function buildActivityInput({
  type,
  entityId,
  title,
  metadata,
  idempotencyKey,
  createdAt,
  entityType,
}: BuildActivityInputParams): ActivityEventInput {
  const definition = getActivityTypeDefinition(type);

  return {
    type,
    entityType: entityType ?? definition?.entityType ?? type.split('_')[0] ?? 'UNKNOWN',
    entityId: entityId ?? null,
    title,
    metadata: { title, ...metadata },
    idempotencyKey,
    createdAt,
  };
}
