import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { createApiRouter } from './routes/index.js';

// Resolves to apps/web/dist from both src/ (tsx) and dist/ (compiled).
const DEFAULT_WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));

export type AppOptions = {
  /** Directory of the built web app to serve; production default is apps/web/dist. */
  webDistPath?: string | null;
};

/**
 * Approved V1 deployment (D-005): one service serves the API under /api and the
 * built React app for everything else, falling back to index.html for client routes.
 */
function serveWebApp(app: Express, webDistPath: string) {
  app.use(
    '/assets',
    express.static(join(webDistPath, 'assets'), {
      immutable: true,
      maxAge: '1y',
      fallthrough: false,
    }),
  );
  app.use(express.static(webDistPath, { index: false, maxAge: 0 }));
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(webDistPath, 'index.html'));
  });
}

/**
 * Builds the Express application. A factory so tests (and restarts) get fresh
 * per-instance state such as login rate-limit counters.
 */
export function createApp(options: AppOptions = {}) {
  const app = express();
  const webDistPath =
    options.webDistPath !== undefined
      ? options.webDistPath
      : env.NODE_ENV === 'production'
        ? DEFAULT_WEB_DIST
        : null;

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

  if (webDistPath) serveWebApp(app, webDistPath);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
