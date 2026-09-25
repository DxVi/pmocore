import { eq } from 'drizzle-orm';
import { db, users } from '@pmocore/database';
import type { AuthUser } from '@pmocore/shared';
import { burnPasswordCheck, verifyPassword } from './password.js';

function toAuthUser(row: { id: string; email: string; displayName: string }): AuthUser {
  return { id: row.id, email: row.email, displayName: row.displayName };
}

/** Returns the user for valid credentials of an active account, otherwise null. */
export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.isActive) {
    await burnPasswordCheck(password);
    return null;
  }

  if (!(await verifyPassword(password, user.passwordHash))) return null;

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return toAuthUser(user);
}

export async function findActiveUser(userId: string): Promise<AuthUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.isActive ? toAuthUser(user) : null;
}
