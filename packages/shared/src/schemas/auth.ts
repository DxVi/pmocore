import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;

export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1, 'Required').max(1024),
});

export const AuthUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
