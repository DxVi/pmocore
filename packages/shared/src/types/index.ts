import type { z } from 'zod';
import type {
  ApiErrorResponseSchema,
  ApiSuccessResponseSchema,
  PaginationMetaSchema,
} from '../schemas/api.js';
import type { HealthResponseSchema } from '../schemas/health.js';

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export type ApiSuccessResponse<T extends z.ZodTypeAny> = z.infer<
  ReturnType<typeof ApiSuccessResponseSchema<T>>
>;

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
