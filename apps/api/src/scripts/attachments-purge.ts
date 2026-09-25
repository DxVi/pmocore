/**
 * Purges stored objects of attachments removed longer than ATTACHMENT_PURGE_DAYS
 * ago and reports orphan objects that have no metadata row (design §10.6).
 *
 *   development: npx tsx --tsconfig apps/api/tsconfig.typecheck.json apps/api/src/scripts/attachments-purge.ts
 *   production:  node apps/api/dist/scripts/attachments-purge.js
 *
 * Orphans are reported only, never deleted automatically.
 */
import './load-env.js';
import { pool } from '@pmocore/database';

const { purgeDeletedAttachments } = await import('../modules/attachments/attachments.service.js');

try {
  const result = await purgeDeletedAttachments();
  console.log(`Purged ${result.purged} stored object(s).`);
  if (result.failed.length > 0) {
    console.error(
      `Failed to purge ${result.failed.length} attachment(s): ${result.failed.join(', ')}`,
    );
    process.exitCode = 1;
  }
  if (result.orphans.length > 0) {
    console.warn(`Orphan objects without metadata (${result.orphans.length}):`);
    for (const key of result.orphans) console.warn(`  ${key}`);
  }
} catch (err) {
  console.error(`Attachment purge failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
