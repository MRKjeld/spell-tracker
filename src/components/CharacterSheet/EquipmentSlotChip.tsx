import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import type { EquippedSlotItem } from '../../state/types';

interface EquipmentSlotChipProps {
  slot: BodySlotId;
  fill: EquippedSlotItem | undefined;
  onClick: () => void;
}

export function EquipmentSlotChip({ slot, fill, onClick }: EquipmentSlotChipProps) {
  return (
    <button
      type="button"
      className={`slot-chip ${fill ? 'slot-chip-filled' : 'slot-chip-empty'}`}
      data-slot={slot}
      onClick={onClick}
    >
      <span className="slot-chip-source">{BODY_SLOT_LABELS[slot]}</span>
      {fill ? (
        <span className="slot-chip-spell">{fill.itemName}</span>
      ) : (
        <span className="slot-chip-empty-label">Empty</span>
      )}
    </button>
  );
}
