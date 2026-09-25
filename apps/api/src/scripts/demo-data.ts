/**
 * Loads or removes the synthetic BASC demonstration projects (DEMO-HRIS,
 * DEMO-PAYROLL, DEMO-QMS). Never touches projects without the DEMO- prefix.
 *
 *   npm run demo:load   [-- owner@email]   create missing demo projects
 *   npm run demo:remove                    delete all DEMO- projects
 *
 * Production (after a build): node apps/api/dist/scripts/demo-data.js load|remove
 */
import './load-env.js';
import { pool } from '@pmocore/database';

const [command, ownerEmail] = process.argv.slice(2);
const { loadDemoData, removeDemoData } = await import('../demo/demo-data.js');

try {
  if (command === 'load') {
    const { created, skipped } = await loadDemoData(ownerEmail);
    console.log(`Demo projects created: ${created.join(', ') || 'none'}`);
    if (skipped.length > 0) console.log(`Already present (skipped): ${skipped.join(', ')}`);
  } else if (command === 'remove') {
    const { removed } = await removeDemoData();
    console.log(`Demo projects removed: ${removed.join(', ') || 'none'}`);
  } else {
    console.error('Usage: demo-data.js load [owner-email] | remove');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(
    `Demo data ${command ?? ''} failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
