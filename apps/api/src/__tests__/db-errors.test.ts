import { describe, expect, it } from 'vitest';
import { mapDatabaseError } from '../lib/db-errors.js';

const pgError = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error('driver message'), { code, ...extra });

describe('database error mapping', () => {
  it('maps unique violations to DUPLICATE with a friendly field message for known constraints', () => {
    const mapped = mapDatabaseError(pgError('23505', { constraint: 'projects_code_unique' }));
    expect(mapped).toMatchObject({ statusCode: 409, code: 'DUPLICATE' });
    expect(mapped?.details).toEqual([
      { path: 'code', message: 'A project with this code already exists' },
    ]);
  });

  it('never exposes unknown constraint names', () => {
    const mapped = mapDatabaseError(pgError('23505', { constraint: 'some_internal_key' }));
    expect(mapped?.details).toBeUndefined();
    expect(JSON.stringify(mapped)).not.toContain('some_internal_key');
  });

  it('distinguishes referenced-record deletes from missing references', () => {
    expect(mapDatabaseError(pgError('23001'))).toMatchObject({
      statusCode: 409,
      code: 'RECORD_IN_USE',
    });
    const inUse = Object.assign(
      new Error('update or delete on table "requirements" violates foreign key'),
      { code: '23503' },
    );
    expect(mapDatabaseError(inUse)).toMatchObject({ code: 'RECORD_IN_USE' });
    const missing = Object.assign(new Error('insert or update on table "test_cases" violates'), {
      code: '23503',
    });
    expect(mapDatabaseError(missing)).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('unwraps errors wrapped by the ORM', () => {
    const wrapped = Object.assign(new Error('Failed query'), { cause: pgError('23514') });
    expect(mapDatabaseError(wrapped)).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('ignores non-database errors', () => {
    expect(mapDatabaseError(new Error('boom'))).toBeUndefined();
    expect(mapDatabaseError('text')).toBeUndefined();
  });
});
