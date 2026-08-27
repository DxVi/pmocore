import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { router } from './routes/index.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === 'development' ? 'http://localhost:5173' : false,
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);
