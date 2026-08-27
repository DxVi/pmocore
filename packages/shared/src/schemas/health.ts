import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  timestamp: z.iso.datetime(),
  version: z.string(),
  database: z.enum(['connected', 'disconnected']),
});
