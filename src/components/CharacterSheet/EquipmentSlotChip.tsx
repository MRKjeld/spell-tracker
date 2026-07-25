import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import { SlotIcon } from './SlotIcon';

interface EquipmentSlotChipProps {
  slot: BodySlotId;
  itemName: string | undefined;
  onClick: () => void;
}

export function EquipmentSlotChip({ slot, itemName, onClick }: EquipmentSlotChipProps) {
  return (
    <button
      type="button"
      className={`slot-chip ${itemName ? 'slot-chip-filled' : 'slot-chip-empty'}`}
      data-slot={slot}
      onClick={onClick}
    >
      <SlotIcon slot={slot} />
      <span className="slot-chip-text">
        <span className="slot-chip-source">{BODY_SLOT_LABELS[slot]}</span>
        {itemName ? <span className="slot-chip-spell">{itemName}</span> : <span className="slot-chip-empty-label">Empty</span>}
      </span>
    </button>
  );
}
