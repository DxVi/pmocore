import { db, pool } from '../connection.js';
import { seedReferenceData } from '../maintenance.js';

try {
  const count = await seedReferenceData(db);
  console.log(`Reference data seeded (${count} values upserted).`);
} catch (err) {
  console.error(
    'Reference data seed failed:',
    err instanceof Error ? err.message : 'Unknown error',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
