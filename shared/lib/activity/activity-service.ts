import type {
  ActivityEvent,
  ActivityEventInput,
  ActivityEventMetadata,
  ActivityListResult,
} from '@/entities/activity/model/types';
import { getActivityTypesForCategory } from '@/entities/activity/model/catalog';
import type { ActivityCategory } from '@/entities/activity/model/types';
import { prisma } from '@/shared/lib/db';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface ActivityQuery {
  from?: string;
  to?: string;
  category?: ActivityCategory;
  search?: string;
  cursor?: string;
  limit?: number;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

interface ActivityEventDbRow {
  id: string;
  userId: string;
  type: string;
  entityType: string;
  entityId: string | null;
  title: string;
  metadata: unknown;
  idempotencyKey: string;
  createdAt: Date;
}

function parseMetadata(value: unknown): ActivityEventMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as ActivityEventMetadata;
}

export function mapActivityEventFromDb(row: ActivityEventDbRow): ActivityEvent {
  return {
    id: row.id,
    type: row.type,
    entityType: row.entityType,
    entityId: row.entityId,
    title: row.title,
    metadata: parseMetadata(row.metadata),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

function normalizeInput(input: ActivityEventInput): ActivityEventInput {
  const type = input.type.trim();
  const entityType = input.entityType.trim();
  const title = input.title.trim();
  const idempotencyKey = input.idempotencyKey.trim();

  if (!type || !entityType || !idempotencyKey) {
    throw new Error('Activity type, entity type and idempotency key are required');
  }

  if (!/^[A-Z][A-Z0-9_]*$/.test(type) || !/^[A-Z][A-Z0-9_]*$/.test(entityType)) {
    throw new Error('Invalid activity type');
  }

  return {
    type,
    entityType,
    entityId: input.entityId ?? null,
    title,
    metadata: input.metadata ?? {},
    idempotencyKey,
    createdAt: input.createdAt,
  };
}

function parseDateBoundary(value: string, endOfDay: boolean): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isNaN(Date.parse(value))) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return endOfDay
      ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
      : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  return new Date(value);
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const [createdAt, id] = cursor.split('::');
  if (!createdAt || !id || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }

  return { createdAt: new Date(createdAt), id };
}

export function encodeActivityCursor(event: Pick<ActivityEvent, 'id' | 'createdAt'>): string {
  return `${event.createdAt}::${event.id}`;
}

async function findActivityByIdempotencyKey(
  db: DbClient,
  userId: string,
  idempotencyKey: string
): Promise<ActivityEventDbRow | null> {
  const rows = await db.$queryRaw<ActivityEventDbRow[]>`
    SELECT id, "userId", type, "entityType", "entityId", title, metadata, "idempotencyKey", "createdAt"
    FROM "ActivityEvent"
    WHERE "userId" = ${userId} AND "idempotencyKey" = ${idempotencyKey}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function recordActivityEvent(
  userId: string,
  input: ActivityEventInput,
  db: DbClient = prisma
): Promise<ActivityEvent> {
  const data = normalizeInput(input);
  const existing = await findActivityByIdempotencyKey(db, userId, data.idempotencyKey);

  if (existing) {
    return mapActivityEventFromDb(existing);
  }

  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  const metadata = JSON.stringify(data.metadata ?? {});

  try {
    const rows = await db.$queryRaw<ActivityEventDbRow[]>`
      INSERT INTO "ActivityEvent" (
        id, "userId", type, "entityType", "entityId", title, metadata, "idempotencyKey", "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${data.type},
        ${data.entityType},
        ${data.entityId},
        ${data.title},
        CAST(${metadata} AS JSONB),
        ${data.idempotencyKey},
        ${createdAt}
      )
      RETURNING id, "userId", type, "entityType", "entityId", title, metadata, "idempotencyKey", "createdAt"
    `;

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to record activity');
    }

    return mapActivityEventFromDb(row);
  } catch (error) {
    const duplicate = await findActivityByIdempotencyKey(db, userId, data.idempotencyKey);
    if (duplicate) {
      return mapActivityEventFromDb(duplicate);
    }

    throw error;
  }
}

export async function getActivityEvents(
  userId: string,
  query: ActivityQuery = {}
): Promise<ActivityListResult> {
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const from = query.from ? parseDateBoundary(query.from, false) : undefined;
  const to = query.to ? parseDateBoundary(query.to, true) : undefined;
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const types = query.category ? getActivityTypesForCategory(query.category) : undefined;
  const search = query.search?.trim();

  const filters: Prisma.Sql[] = [Prisma.sql`"userId" = ${userId}`];

  if (from) {
    filters.push(Prisma.sql`"createdAt" >= ${from}`);
  }

  if (to) {
    filters.push(Prisma.sql`"createdAt" <= ${to}`);
  }

  if (types && types.length > 0) {
    filters.push(Prisma.sql`type IN (${Prisma.join(types)})`);
  }

  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      Prisma.sql`(title ILIKE ${pattern} OR type ILIKE ${pattern})`
    );
  }

  if (cursor) {
    filters.push(
      Prisma.sql`(
        "createdAt" < ${cursor.createdAt}
        OR ("createdAt" = ${cursor.createdAt} AND id < ${cursor.id})
      )`
    );
  }

  const take = limit + 1;
  const rows = await prisma.$queryRaw<ActivityEventDbRow[]>`
    SELECT id, "userId", type, "entityType", "entityId", title, metadata, "idempotencyKey", "createdAt"
    FROM "ActivityEvent"
    WHERE ${Prisma.join(filters, ' AND ')}
    ORDER BY "createdAt" DESC, id DESC
    LIMIT ${take}
  `;

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const events = page.map(mapActivityEventFromDb);

  return {
    events,
    nextCursor: hasMore && events.length > 0 ? encodeActivityCursor(events[events.length - 1]) : null,
  };
}
