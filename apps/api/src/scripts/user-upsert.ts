/**
 * Creates or resets the single operational user (design §4.3, REQ-001/005).
 *
 * Account details are supplied at execution time only:
 *   - interactively (email, name, then a hidden password prompt with confirmation), or
 *   - non-interactively through PMO_USER_EMAIL, PMO_USER_NAME and PMO_USER_PASSWORD
 *     set for this one invocation.
 * The password is never echoed, logged, or stored anywhere except as a scrypt hash.
 */
import './load-env.js';
import { createInterface } from 'node:readline/promises';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db, pool, users } from '@pmocore/database';
import { PASSWORD_MIN_LENGTH } from '@pmocore/shared';
import { hashPassword } from '../modules/auth/password.js';

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  displayName: z.string().trim().min(1, 'Name is required').max(200),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(1024),
});

async function promptVisible(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    let value = '';
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Cancelled'));
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdout.write(question);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function collectInput() {
  const interactive = Boolean(process.stdin.isTTY);
  let email = process.env.PMO_USER_EMAIL;
  let displayName = process.env.PMO_USER_NAME;
  let password = process.env.PMO_USER_PASSWORD;

  if (!interactive && (!email || !displayName || !password)) {
    throw new Error(
      'Non-interactive terminal: set PMO_USER_EMAIL, PMO_USER_NAME and PMO_USER_PASSWORD for this command.',
    );
  }

  email ??= await promptVisible('Email: ');
  displayName ??= await promptVisible('Display name: ');
  if (!password) {
    password = await promptHidden('Password (hidden): ');
    const confirmation = await promptHidden('Confirm password: ');
    if (password !== confirmation) throw new Error('Passwords do not match.');
  }

  const parsed = InputSchema.safeParse({ email, displayName, password });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  }
  return parsed.data;
}

try {
  const input = await collectInput();
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({ email: input.email, displayName: input.displayName, passwordHash, isActive: true })
    .onConflictDoUpdate({
      target: users.email,
      set: { displayName: input.displayName, passwordHash, isActive: true, updatedAt: new Date() },
    })
    .returning({ id: users.id, email: users.email });
  // A password reset signs the user out everywhere.
  if (row) await db.execute(sql`DELETE FROM session WHERE sess->>'userId' = ${row.id}`);
  console.log(`User ${row?.email ?? input.email} is ready. Any existing sessions were signed out.`);
} catch (err) {
  console.error(`User setup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
