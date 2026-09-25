import type { ReferenceCategory } from '@pmocore/shared';
import { useReferenceData } from '@/hooks/useReferenceData';

type RefOptionsProps = {
  category: ReferenceCategory;
  /** Keeps a current inactive (legacy) value selectable so editing never silently changes it. */
  currentId?: number | null;
  emptyLabel?: string;
};

/** `<option>` list for a reference category, for use inside a native `<select>`. */
export function RefOptions({ category, currentId, emptyLabel = 'Not set' }: RefOptionsProps) {
  const { options } = useReferenceData();
  return (
    <>
      <option value="">{emptyLabel}</option>
      {options(category, currentId).map((value) => (
        <option key={value.id} value={value.id}>
          {value.label}
          {value.isActive ? '' : ' (inactive)'}
        </option>
      ))}
    </>
  );
}
