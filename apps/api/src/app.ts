import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { createApiRouter } from './routes/index.js';

/**
 * Builds the Express application. A factory so tests (and restarts) get fresh
 * per-instance state such as login rate-limit counters.
 */
export function createApp() {
  const app = express();

  // Render terminates TLS at its proxy; trusting one hop lets Secure session
  // cookies and client IPs (login throttling) work correctly in production.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === 'development' ? 'http://localhost:5173' : false,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(requestLogger);

  app.use('/api', createApiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
