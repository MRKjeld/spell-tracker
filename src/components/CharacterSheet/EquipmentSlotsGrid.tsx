import { BODY_SLOT_IDS } from '../../data/bodySlots';
import type { BodySlotId } from '../../data/bodySlots';
import type { EquippedSlotItem } from '../../state/types';
import { EquipmentSlotChip } from './EquipmentSlotChip';

interface EquipmentSlotsGridProps {
  equipmentSlots: Partial<Record<BodySlotId, EquippedSlotItem>>;
  onSlotClick: (slot: BodySlotId) => void;
}

export function EquipmentSlotsGrid({ equipmentSlots, onSlotClick }: EquipmentSlotsGridProps) {
  return (
    <div className="slot-grid-row">
      <div className="slot-grid-row-header">
        <h3>Worn Items</h3>
      </div>
      <div className="slot-grid-chips">
        {BODY_SLOT_IDS.map((slot) => (
          <EquipmentSlotChip key={slot} slot={slot} fill={equipmentSlots[slot]} onClick={() => onSlotClick(slot)} />
        ))}
      </div>
    </div>
  );
}
