import { Router } from 'express';
import { createRequire } from 'node:module';
import type { HealthResponse } from '@pmocore/shared';
import { pool } from '@pmocore/database';
import { sendSuccess } from '../lib/api-response.js';
import { logger } from '../lib/logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let database: HealthResponse['database'] = 'connected';

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    database = 'disconnected';
    logger.error(err, 'Health check database query failed');
  }

  const data: HealthResponse = {
    status: database === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version,
    database,
  };

  sendSuccess(res, data);
});
