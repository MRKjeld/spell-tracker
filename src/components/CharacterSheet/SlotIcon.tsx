import type { BodySlotId } from '../../data/bodySlots';
import { SLOT_ICONS } from '../../data/slotIcons';

interface SlotIconProps {
  slot: BodySlotId;
}

export function SlotIcon({ slot }: SlotIconProps) {
  const icon = SLOT_ICONS[slot];
  return (
    <svg className="slot-chip-icon" viewBox={icon.viewBox} aria-hidden="true">
      <path d={icon.d} />
    </svg>
  );
}
