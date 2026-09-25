import { asc } from 'drizzle-orm';
import { db, referenceValues } from '@pmocore/database';
import {
  REFERENCE_FIELD_CATEGORIES,
  type ReferenceCategory,
  type ReferenceValue,
} from '@pmocore/shared';
import { AppError } from '../../lib/app-error.js';

let cache: Promise<Map<number, ReferenceValue>> | undefined;

async function load(): Promise<Map<number, ReferenceValue>> {
  const rows = await db
    .select()
    .from(referenceValues)
    .orderBy(asc(referenceValues.category), asc(referenceValues.sortOrder));
  return new Map(rows.map((row) => [row.id, row]));
}

/** Reference data changes only through the seed, so an in-memory cache is safe. */
function ensureCache(): Promise<Map<number, ReferenceValue>> {
  cache ??= load().catch((err: unknown) => {
    cache = undefined;
    throw err;
  });
  return cache;
}

export async function getReferenceValues(): Promise<ReferenceValue[]> {
  return [...(await ensureCache()).values()];
}

export function clearReferenceCache(): void {
  cache = undefined;
}

export async function findReferenceValue(id: number): Promise<ReferenceValue | undefined> {
  return (await ensureCache()).get(id);
}

export async function findReferenceByCode(category: ReferenceCategory, code: string) {
  return (await getReferenceValues()).find((v) => v.category === category && v.code === code);
}

type ReferenceField = keyof typeof REFERENCE_FIELD_CATEGORIES;

/**
 * Validates taxonomy fields against their categories (design §12). A value must
 * belong to the expected category; inactive values are accepted only when they
 * are unchanged from the record's current value, so legacy values survive edits.
 */
export async function assertReferenceFields(
  values: Partial<Record<ReferenceField, number | null>>,
  current: Partial<Record<ReferenceField, number | null>> = {},
): Promise<void> {
  const issues: { path: string; message: string }[] = [];

  for (const [field, id] of Object.entries(values) as [ReferenceField, number | null][]) {
    if (id === null || id === undefined) continue;
    const expected = REFERENCE_FIELD_CATEGORIES[field];
    const value = await findReferenceValue(id);
    if (!value || value.category !== expected) {
      issues.push({ path: field, message: 'Select a valid value' });
    } else if (!value.isActive && current[field] !== id) {
      issues.push({ path: field, message: 'This value is no longer available' });
    }
  }

  if (issues.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'One or more values are invalid', issues);
  }
}
