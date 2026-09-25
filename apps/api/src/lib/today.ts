import { env } from '../config/env.js';

/**
 * Today's business date (YYYY-MM-DD) in APP_TIMEZONE (Asia/Manila). Used for
 * derived states such as overdue actions and the next milestone (design §11.1).
 */
export function todayInTimeZone(timeZone: string = env.APP_TIMEZONE, now: Date = new Date()) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
