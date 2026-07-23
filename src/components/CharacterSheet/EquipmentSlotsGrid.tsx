import { WORN_ITEMS_LAYOUT } from '../../data/bodySlots';
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
        {WORN_ITEMS_LAYOUT.map((slot, index) =>
          slot === null ? (
            <div key={`empty-${index}`} className="slot-chip slot-chip-placeholder" aria-hidden="true" />
          ) : (
            <EquipmentSlotChip
              key={`${slot}-${index}`}
              slot={slot}
              itemName={items.find((i) => i.equippedSlot === slot)?.name}
              onClick={() => onSlotClick(slot)}
            />
          ),
        )}
      </div>
    </div>
  );
}
