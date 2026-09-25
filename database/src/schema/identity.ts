import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('users_email_lowercase', sql`${t.email} = lower(${t.email})`)],
);

// Exact table layout documented by connect-pg-simple. Created by our migration
// (createTableIfMissing is disabled) so migrations remain the single schema authority.
export const session = pgTable(
  'session',
  {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6 }).notNull(),
  },
  (t) => [index('IDX_session_expire').on(t.expire)],
);
