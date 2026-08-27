import 'dotenv/config';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { app } from './app.js';

app.listen(env.PORT, () => {
  logger.info(`PMOCore API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
