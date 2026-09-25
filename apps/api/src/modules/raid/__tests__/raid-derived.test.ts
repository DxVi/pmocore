import { describe, expect, it } from 'vitest';
import { daysOpen, isOpenSemantic, isOverdue, resolveClosedDate } from '../raid-derived.js';

describe('RAID derived state (REQ-048)', () => {
  it('treats OPEN or missing status as open, DONE/INACTIVE as closed', () => {
    expect(isOpenSemantic('OPEN')).toBe(true);
    expect(isOpenSemantic(null)).toBe(true);
    expect(isOpenSemantic('DONE')).toBe(false);
    expect(isOpenSemantic('INACTIVE')).toBe(false);
  });

  it('is overdue only when open and the due date is before today', () => {
    expect(isOverdue('2026-10-12', 'OPEN', '2026-10-13')).toBe(true);
    expect(isOverdue('2026-10-13', 'OPEN', '2026-10-13')).toBe(false);
    expect(isOverdue('2026-10-01', 'DONE', '2026-10-13')).toBe(false);
    expect(isOverdue('2026-10-01', 'INACTIVE', '2026-10-13')).toBe(false);
    expect(isOverdue(null, 'OPEN', '2026-10-13')).toBe(false);
  });

  it('counts days open until closed or today, never negative', () => {
    expect(daysOpen('2026-10-01', null, '2026-10-13')).toBe(12);
    expect(daysOpen('2026-10-01', '2026-10-05', '2026-10-13')).toBe(4);
    expect(daysOpen('2026-10-20', null, '2026-10-13')).toBe(0);
  });

  it('auto-fills, keeps, and clears the closed date by status', () => {
    expect(resolveClosedDate('DONE', null, '2026-10-01', '2026-10-13')).toBe('2026-10-13');
    expect(resolveClosedDate('INACTIVE', '2026-10-05', '2026-10-01', '2026-10-13')).toBe(
      '2026-10-05',
    );
    expect(resolveClosedDate('DONE', null, '2026-10-20', '2026-10-13')).toBe('2026-10-20');
    expect(resolveClosedDate('OPEN', '2026-10-05', '2026-10-01', '2026-10-13')).toBeNull();
  });
});
