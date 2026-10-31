import type { ClassId } from '../../data/classes';
import { CLASS_LABELS } from '../../data/classes';
import type { SlotInstance } from '../../lib/slotMath';
import type { SlotFill } from '../../state/types';
import { POOL_COLOR_HEX, POOL_COLOR_TEXT } from '../../data/poolColors';
import { getSpellById } from '../../data/spells';
import { schoolThemeColor, schoolThemeTextColor } from '../../data/schoolThemes';

interface SlotChipProps {
  instance: SlotInstance;
  fill: SlotFill | undefined;
  // The class whose Spells tab this slot belongs to -- used only to decide
  // whether to show a "from X" tag (when the fill was picked from a
  // different class's list than the tab it's sitting in).
  tabClassId: ClassId;
  onClick: () => void;
}

export function SlotChip({ instance, fill, tabClassId, onClick }: SlotChipProps) {
  const originLabel = instance.origin === 'pool' ? instance.poolName : instance.origin === 'bonus' ? 'Bonus' : null;
  const fromOtherClass =
    fill && fill.sourceClassId !== null && fill.sourceClassId !== tabClassId ? CLASS_LABELS[fill.sourceClassId] : null;

  const filledSourceParts = [originLabel, fromOtherClass ? `from ${fromOtherClass}` : null].filter(Boolean);
  const stateClass = fill ? (fill.used ? 'slot-chip-used' : 'slot-chip-filled') : 'slot-chip-empty';
  const poolColor = instance.poolColor ? POOL_COLOR_HEX[instance.poolColor] : undefined;
  const poolTextColor = instance.poolColor ? POOL_COLOR_TEXT[instance.poolColor] : undefined;
  // A prepared (not yet used) spell takes its school's colour; a pool's own
  // colour wins when set, and used spells stay greyed.
  const school = fill && !fill.used ? getSpellById(fill.spellId)?.school : undefined;
  const schoolColor = school ? schoolThemeColor(school) : undefined;
  const schoolTextColor = school ? schoolThemeTextColor(school) : undefined;

  return (
    <button
      type="button"
      className={`slot-chip slot-chip-${instance.origin} ${stateClass}`}
      onClick={onClick}
      title={originLabel ?? undefined}
      style={
        poolColor
          ? { backgroundColor: poolColor, borderColor: poolColor, color: poolTextColor }
          : schoolColor
            ? { backgroundColor: schoolColor, borderColor: schoolColor, color: schoolTextColor }
            : undefined
      }
    >
      {fill ? (
        <>
          <span className="slot-chip-spell">{fill.spellName}</span>
          {filledSourceParts.length > 0 && (
            <span className="slot-chip-source">{filledSourceParts.join(' · ')}</span>
          )}
          {fill.used && <span className="slot-chip-used-label">Used</span>}
        </>
      ) : (
        <span className="slot-chip-empty-label">{originLabel ?? 'Empty'}</span>
      )}
    </button>
  );
}
