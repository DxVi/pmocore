import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseConfig } from './config.js';

const pool = new Pool({
  connectionString: databaseConfig.connectionString,
  ssl: databaseConfig.ssl,
  max: 10, // Connection pool size
});

export const db = drizzle(pool);
export { pool };
