import { Modal } from '../common/Modal';
import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import { getWondrousItemById } from '../../data/wondrousItems';
import { WondrousItemDetails } from './WondrousItemDetails';

interface EquippedSlotItemModalProps {
  slot: BodySlotId;
  itemId: string;
  itemName: string;
  onUnequip: () => void;
  onClose: () => void;
}

export function EquippedSlotItemModal({ slot, itemId, itemName, onUnequip, onClose }: EquippedSlotItemModalProps) {
  const item = getWondrousItemById(itemId);

  return (
    <Modal title={`${BODY_SLOT_LABELS[slot]} — ${itemName}`} onClose={onClose}>
      {item ? <WondrousItemDetails item={item} /> : <p>Item details not found.</p>}
      <div className="spell-view-actions">
        <button type="button" className="button-danger" onClick={onUnequip}>
          Unequip
        </button>
        <button type="button" className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
