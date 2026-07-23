import { Modal } from '../common/Modal';
import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import { getWondrousItemById } from '../../data/wondrousItems';
import type { Item } from '../../state/types';
import { WondrousItemDetails } from './WondrousItemDetails';

interface EquippedSlotItemModalProps {
  slot: BodySlotId;
  item: Item;
  onUnequip: () => void;
  onClose: () => void;
}

export function EquippedSlotItemModal({ slot, item, onUnequip, onClose }: EquippedSlotItemModalProps) {
  const catalogEntry = item.wondrousItemId ? getWondrousItemById(item.wondrousItemId) : undefined;

  return (
    <Modal title={`${BODY_SLOT_LABELS[slot]} — ${item.name}`} onClose={onClose}>
      {catalogEntry ? <WondrousItemDetails item={catalogEntry} /> : item.activation && <p>{item.activation}</p>}
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
