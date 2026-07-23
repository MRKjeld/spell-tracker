import { BODY_SLOT_IDS } from '../../data/bodySlots';
import type { BodySlotId } from '../../data/bodySlots';
import type { Item } from '../../state/types';
import { EquipmentSlotChip } from './EquipmentSlotChip';

interface EquipmentSlotsGridProps {
  items: Item[];
  onSlotClick: (slot: BodySlotId) => void;
}

export function EquipmentSlotsGrid({ items, onSlotClick }: EquipmentSlotsGridProps) {
  return (
    <div className="slot-grid-row">
      <div className="slot-grid-row-header">
        <h3>Worn Items</h3>
      </div>
      <div className="slot-grid-chips slot-paperdoll">
        {BODY_SLOT_IDS.map((slot) => (
          <EquipmentSlotChip
            key={slot}
            slot={slot}
            itemName={items.find((i) => i.equippedSlot === slot)?.name}
            onClick={() => onSlotClick(slot)}
          />
        ))}
      </div>
    </div>
  );
}
