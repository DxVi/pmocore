import type { Request } from 'express';
import type { z } from 'zod';
import { AppError } from './app-error.js';

type FieldIssue = { path: string; message: string };

function toValidationError(error: z.ZodError, message: string): AppError {
  const details: FieldIssue[] = error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}

export function parseWith<S extends z.ZodType>(
  schema: S,
  value: unknown,
  message: string,
): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw toValidationError(result.error, message);
  return result.data;
}

export const parseBody = <S extends z.ZodType>(schema: S, req: Request) =>
  parseWith(schema, req.body, 'Request body is invalid');

export const parseQuery = <S extends z.ZodType>(schema: S, req: Request) =>
  parseWith(schema, req.query, 'Query parameters are invalid');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route ids that are not UUIDs are treated as not found (design §7.1). */
export function parseIdParam(value: unknown, entity = 'Record'): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new AppError(404, 'NOT_FOUND', `${entity} not found`);
  }
  return value.toLowerCase();
}
