import { useReferenceData } from '@/hooks/useReferenceData';
import { toneFor, type Tone } from '@/lib/status-tone';

type StatusBadgeProps = {
  /** Reference value id (status, health, phase, priority, result...). */
  valueId: number | null | undefined;
  /** Text shown when no value is recorded. */
  emptyLabel?: string;
  className?: string;
};

export function Badge({
  tone,
  children,
  className = '',
}: {
  tone: Tone;
  children: string;
  className?: string;
}) {
  return (
    <span className={`badge pmo-badge pmo-badge-${tone} ${className}`.trim()}>{children}</span>
  );
}

/** Renders a reference value as a badge coloured by its semantic, or a neutral "Not set". */
export function StatusBadge({ valueId, emptyLabel = 'Not set', className }: StatusBadgeProps) {
  const { byId } = useReferenceData();
  const value = valueId ? byId.get(valueId) : undefined;
  return (
    <Badge tone={toneFor(value)} className={className}>
      {value?.label ?? emptyLabel}
    </Badge>
  );
}
