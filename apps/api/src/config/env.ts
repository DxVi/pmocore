import { z } from 'zod';

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

// Approved environment set (SOLO-MVP-01 design §15.4, DS-08). DATABASE_URL and
// DATABASE_SSL remain owned and authoritatively validated by @pmocore/database.
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().url(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Comma-separated list of browser origins allowed to make state-changing requests.
    // Behind the Vercel proxy this is the Vercel site origin (the browser's origin).
    APP_ORIGIN: z.string().optional(),
    APP_TIMEZONE: z.string().default('Asia/Manila'),
    // false when the web app is hosted elsewhere (Vercel) and this service is API-only.
    SERVE_WEB_APP: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),

    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    SESSION_IDLE_DAYS: positiveInt(7),
    SESSION_ABSOLUTE_DAYS: positiveInt(30),

    ATTACHMENT_STORAGE_DRIVER: z.enum(['local', 's3', 'postgres']).default('local'),
    ATTACHMENT_STORAGE_DIR: z.string().default('./.data/attachments'),
    ATTACHMENT_MAX_BYTES: positiveInt(10_485_760),
    ATTACHMENT_PURGE_DAYS: positiveInt(30),
    // postgres driver only: cap on stored content, well below the database plan's storage limit.
    ATTACHMENT_DB_QUOTA_MB: positiveInt(300),

    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && !value.APP_ORIGIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_ORIGIN'],
        message: 'APP_ORIGIN is required in production',
      });
    }
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: value.APP_TIMEZONE });
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_TIMEZONE'],
        message: 'APP_TIMEZONE must be an IANA time zone',
      });
    }
    if (value.ATTACHMENT_MAX_BYTES > 10_485_760) {
      ctx.addIssue({
        code: 'custom',
        path: ['ATTACHMENT_MAX_BYTES'],
        message: 'ATTACHMENT_MAX_BYTES cannot exceed the approved 10 MB limit',
      });
    }
    if (value.ATTACHMENT_STORAGE_DRIVER === 's3') {
      for (const key of [
        'S3_ENDPOINT',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when ATTACHMENT_STORAGE_DRIVER=s3`,
          });
        }
      }
    }
  })
  .transform((value) => ({
    ...value,
    appOrigins: (value.APP_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  }));

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Prettified issues name keys and rules only; values (including secrets) are never printed.
    console.error('Invalid environment configuration:');
    console.error(z.prettifyError(result.error));
    process.exit(1);
  }

  return result.data;
}

export const env: Env = loadEnv();
