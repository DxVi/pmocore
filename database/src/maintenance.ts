import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { referenceValues } from './schema/reference.js';
import { REFERENCE_SEED } from './seed/reference-data.js';

// Resolves to database/migrations from both src/ (tsx) and dist/ (compiled).
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../migrations', import.meta.url));

export async function runMigrations<T extends Record<string, unknown>>(
  database: NodePgDatabase<T>,
): Promise<void> {
  await migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
}

/** Idempotent upsert of the approved reference values, keyed by (category, code). */
export async function seedReferenceData<T extends Record<string, unknown>>(
  database: NodePgDatabase<T>,
): Promise<number> {
  const rows = Object.entries(REFERENCE_SEED).flatMap(([category, values]) =>
    values.map((value, index) => ({
      category,
      code: value.code,
      label: value.label,
      sortOrder: (index + 1) * 10,
      semantic: value.semantic ?? null,
      isActive: true,
    })),
  );

  if (rows.length === 0) return 0;

  await database
    .insert(referenceValues)
    .values(rows)
    .onConflictDoUpdate({
      target: [referenceValues.category, referenceValues.code],
      set: {
        label: sql`excluded.label`,
        sortOrder: sql`excluded.sort_order`,
        semantic: sql`excluded.semantic`,
        isActive: sql`excluded.is_active`,
      },
    });

  return rows.length;
}
