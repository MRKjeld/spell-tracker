import { Modal } from '../common/Modal';
import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import { getWondrousItemById } from '../../data/wondrousItems';
import { getBaseArmorItemById } from '../../data/baseArmor';
import { getWeaponItemById } from '../../data/weapons';
import { getRingItemById } from '../../data/rings';
import type { Item } from '../../state/types';
import { WondrousItemDetails } from './WondrousItemDetails';
import { BaseArmorDetails } from './BaseArmorDetails';
import { WeaponDetails } from './WeaponDetails';

interface EquippedSlotItemModalProps {
  slot: BodySlotId;
  item: Item;
  onUseCharge: () => void;
  onRecharge: () => void;
  onUnequip: () => void;
  onClose: () => void;
}

const USE_PERIOD_LABELS: Record<Item['usePeriod'], string> = {
  unlimited: 'Unlimited uses',
  rest: 'per rest',
  day: 'per day',
  week: 'per week',
  month: 'per month',
  manual: 'recharged manually',
};

export function EquippedSlotItemModal({ slot, item, onUseCharge, onRecharge, onUnequip, onClose }: EquippedSlotItemModalProps) {
  const catalogEntry = item.wondrousItemId ? getWondrousItemById(item.wondrousItemId) : undefined;
  const baseArmorEntry = item.baseArmorId ? getBaseArmorItemById(item.baseArmorId) : undefined;
  const weaponEntry = item.weaponItemId ? getWeaponItemById(item.weaponItemId) : undefined;
  const ringEntry = item.ringItemId ? getRingItemById(item.ringItemId) : undefined;
  const isUnlimited = item.usePeriod === 'unlimited';
  const depleted = !isUnlimited && item.usesRemaining <= 0;

  return (
    <Modal title={`${BODY_SLOT_LABELS[slot]}: ${item.name}`} onClose={onClose}>
      {catalogEntry && <WondrousItemDetails item={catalogEntry} />}
      {ringEntry && <WondrousItemDetails item={ringEntry} />}
      {baseArmorEntry && <BaseArmorDetails item={baseArmorEntry} />}
      {weaponEntry && <WeaponDetails item={weaponEntry} />}
      {!catalogEntry && !baseArmorEntry && !weaponEntry && !ringEntry && (
        <>
          {item.description && <p className="item-view-description">{item.description}</p>}
          {item.activation && <p>{item.activation}</p>}
        </>
      )}

      {!isUnlimited && (
        <p className="item-view-uses">
          {item.usesRemaining} / {item.maxUses} {USE_PERIOD_LABELS[item.usePeriod]}
        </p>
      )}

      <div className="spell-view-actions">
        <button type="button" className="button-danger" onClick={onUnequip}>
          Unequip
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
