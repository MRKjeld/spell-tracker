import { Modal } from '../common/Modal';
import type { Item } from '../../state/types';

interface ItemViewModalProps {
  item: Item;
  onUseCharge: () => void;
  onRecharge: () => void;
  onRemove: () => void;
  onClose: () => void;
}

const USE_PERIOD_LABELS: Record<Item['usePeriod'], string> = {
  unlimited: 'Unlimited uses',
  rest: 'per rest',
  day: 'per day',
  week: 'per week',
  month: 'per month',
};

export function ItemViewModal({ item, onUseCharge, onRecharge, onRemove, onClose }: ItemViewModalProps) {
  const isUnlimited = item.usePeriod === 'unlimited';
  const depleted = !isUnlimited && item.usesRemaining <= 0;

  return (
    <Modal title={item.name} onClose={onClose}>
      {item.activation && <p className="item-view-activation">{item.activation}</p>}

      <p className="item-view-uses">
        {isUnlimited ? USE_PERIOD_LABELS.unlimited : `${item.usesRemaining} / ${item.maxUses} ${USE_PERIOD_LABELS[item.usePeriod]}`}
      </p>

      <div className="spell-view-actions">
        <button type="button" className="button-danger" onClick={onRemove}>
          Remove Item
        </button>
        {!isUnlimited && (
          <button type="button" className="button-secondary" onClick={onRecharge} disabled={item.usesRemaining >= item.maxUses}>
            Recharge
          </button>
        )}
        {!isUnlimited && (
          <button type="button" className="button-primary" onClick={onUseCharge} disabled={depleted}>
            Use a Charge
          </button>
        )}
        <button type="button" className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
