import { db, pool } from '../connection.js';
import { runMigrations } from '../maintenance.js';

try {
  await runMigrations(db);
  console.log('Database migrations applied.');
} catch (err) {
  console.error('Database migration failed:', err instanceof Error ? err.message : 'Unknown error');
  process.exitCode = 1;
} finally {
  await pool.end();
}
