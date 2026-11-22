import { describe, expect, it } from 'vitest';
import { isTransientDbError } from '@/shared/lib/db-retry';

describe('transient database errors', () => {
  it('recovers when the Prisma engine is not connected yet', () => {
    expect(
      isTransientDbError(
        new Error('Invalid `p.account.findUnique()` invocation:\n\nEngine is not yet connected.')
      )
    ).toBe(true);
    expect(isTransientDbError(new Error('Response from the Engine was empty'))).toBe(true);
  });

  it('recovers dropped database connections', () => {
    expect(isTransientDbError(new Error("Can't reach database server at `ep-db.aws.neon.tech:5432`"))).toBe(
      true
    );
    expect(isTransientDbError(new Error('Server has closed the connection.'))).toBe(true);
    expect(isTransientDbError(new Error('Error querying the database: connection reset'))).toBe(true);
  });

  it('leaves application errors alone', () => {
    expect(isTransientDbError(new Error('Unique constraint failed on the fields: (`email`)'))).toBe(false);
    expect(isTransientDbError('Engine is not yet connected.')).toBe(false);
  });
});
