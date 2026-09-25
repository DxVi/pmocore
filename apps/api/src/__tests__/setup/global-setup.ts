// Imported by relative path: the package entry point validates DATABASE_URL on
// import, which is not set in the main Vitest process.
import { resetTestDatabase } from '../../../../../database/src/testing.js';

/** Drops and rebuilds the local test database once per test run. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (url) await resetTestDatabase(url);
}
