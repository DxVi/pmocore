/**
 * Stable record code prefixes (design §5.5). Codes are allocated server-side per
 * project, formatted `PREFIX-001`, and never change or get reused.
 */
export const RECORD_CODE_PREFIXES = {
  workItem: 'WI',
  requirement: 'REQ',
  activity: 'MV',
  testCase: 'TC',
  defect: 'DEF',
  release: 'REL',
  acceptance: 'ACC',
  document: 'DOC',
} as const;

/** RAID codes use a prefix chosen by type at creation; retyping keeps the original code. */
export const RAID_CODE_PREFIXES = {
  ACTION: 'ACT',
  RISK: 'RSK',
  ISSUE: 'ISS',
  DECISION: 'DEC',
  DEPENDENCY: 'DEP',
  CHANGE_REQUEST: 'CR',
} as const;

export function formatRecordCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(3, '0')}`;
}
