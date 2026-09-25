import type { ReferenceValue } from '@pmocore/shared';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

/**
 * Presentation tone for a reference value, derived from its machine semantic
 * (design §6.1) — never from its label. Missing values are always neutral and
 * never shown as healthy or complete (REQ-010).
 */
export function toneFor(value: ReferenceValue | undefined): Tone {
  if (!value) return 'neutral';
  if (value.category === 'STATUS' && value.code === 'BLOCKED') return 'danger';

  switch (value.semantic) {
    case 'DONE':
    case 'GREEN':
    case 'PASS':
      return 'success';
    case 'AMBER':
    case 'BLOCKED':
      return 'warning';
    case 'RED':
    case 'FAIL':
      return 'danger';
    case 'RETEST':
      return 'info';
    case 'OPEN':
      return 'primary';
    default:
      return 'neutral';
  }
}
