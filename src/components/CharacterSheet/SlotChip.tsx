import type { ClassId } from '../../data/classes';
import { CLASS_LABELS } from '../../data/classes';
import type { SlotInstance } from '../../lib/slotMath';
import type { SlotFill } from '../../state/types';

interface SlotChipProps {
  instance: SlotInstance;
  fill: SlotFill | undefined;
  characterClassId: ClassId;
  onClick: () => void;
}

export function SlotChip({ instance, fill, characterClassId, onClick }: SlotChipProps) {
  const originLabel = instance.origin === 'pool' ? instance.poolName : instance.origin === 'bonus' ? 'Bonus' : null;
  const fromOtherClass = fill && fill.sourceClassId !== characterClassId ? CLASS_LABELS[fill.sourceClassId] : null;

  const filledSourceParts = [originLabel, fromOtherClass ? `from ${fromOtherClass}` : null].filter(Boolean);

  return (
    <button
      type="button"
      className={`slot-chip slot-chip-${instance.origin} ${fill ? 'slot-chip-filled' : 'slot-chip-empty'}`}
      onClick={onClick}
      title={originLabel ?? undefined}
    >
      {fill ? (
        <>
          <span className="slot-chip-spell">{fill.spellName}</span>
          {filledSourceParts.length > 0 && (
            <span className="slot-chip-source">{filledSourceParts.join(' · ')}</span>
          )}
        </>
      ) : (
        <span className="slot-chip-empty-label">{originLabel ?? 'Empty'}</span>
      )}
    </button>
  );
}
