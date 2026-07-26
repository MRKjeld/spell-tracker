import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Item } from '../../state/types';
import { BODY_SLOT_IDS, BODY_SLOT_LABELS } from '../../data/bodySlots';
import type { BodySlotId } from '../../data/bodySlots';
import { getWondrousItemById, normalizeSlot } from '../../data/wondrousItems';
import { defaultSlotForBaseArmorCategory, getBaseArmorItemById } from '../../data/baseArmor';
import { getWeaponItemById } from '../../data/weapons';
import { getRingItemById } from '../../data/rings';

interface ItemViewModalProps {
  item: Item;
  onUseCharge: () => void;
  onRecharge: () => void;
  onRemove: () => void;
  onEquip: (slot: BodySlotId) => void;
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

export function ItemViewModal({ item, onUseCharge, onRecharge, onRemove, onEquip, onUnequip, onClose }: ItemViewModalProps) {
  const hasOptionalDetails = item.price || item.aura || item.cl || item.weight || item.construction;
  const isUnlimited = item.usePeriod === 'unlimited';
  const depleted = !isUnlimited && item.usesRemaining <= 0;
  const catalogEntry = item.wondrousItemId ? getWondrousItemById(item.wondrousItemId) : undefined;
  const baseArmorEntry = item.baseArmorId ? getBaseArmorItemById(item.baseArmorId) : undefined;
  const weaponEntry = item.weaponItemId ? getWeaponItemById(item.weaponItemId) : undefined;
  const ringEntry = item.ringItemId ? getRingItemById(item.ringItemId) : undefined;
  const defaultSlot = catalogEntry
    ? normalizeSlot(catalogEntry.slot)
    : baseArmorEntry
      ? defaultSlotForBaseArmorCategory(baseArmorEntry.category)
      : weaponEntry
        ? 'mainHand'
        : ringEntry
          ? 'ring1'
          : item.slot;
  const [equipSlot, setEquipSlot] = useState<BodySlotId>(defaultSlot ?? BODY_SLOT_IDS[0]);

  return (
    <Modal title={item.name} onClose={onClose}>
      {item.description && <p className="item-view-description">{item.description}</p>}
      {item.activation && <p className="item-view-activation">{item.activation}</p>}

      {hasOptionalDetails && (
        <div className="spell-picker-details">
          {item.price && (
            <p>
              <strong>Price:</strong> {item.price}
            </p>
          )}
          {(item.aura || item.cl) && (
            <p>
              {item.aura && (
                <>
                  <strong>Aura:</strong> {item.aura}{' '}
                </>
              )}
              {item.cl && (
                <>
                  <strong>CL:</strong> {item.cl}
                </>
              )}
            </p>
          )}
          {item.weight && (
            <p>
              <strong>Weight:</strong> {item.weight}
            </p>
          )}
          {item.construction && (
            <p>
              <strong>Construction:</strong> {item.construction}
            </p>
          )}
        </div>
      )}

      <p className="item-view-uses">
        {isUnlimited ? USE_PERIOD_LABELS.unlimited : `${item.usesRemaining} / ${item.maxUses} ${USE_PERIOD_LABELS[item.usePeriod]}`}
      </p>

      <div className="item-view-equip">
        {item.equippedSlot ? (
          <p className="item-view-worn">Worn: {BODY_SLOT_LABELS[item.equippedSlot]}</p>
        ) : (
          <label className="item-view-equip-picker">
            Equip to
            <select value={equipSlot} onChange={(e) => setEquipSlot(e.target.value as BodySlotId)}>
              {BODY_SLOT_IDS.map((slot) => (
                <option key={slot} value={slot}>
                  {BODY_SLOT_LABELS[slot]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

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
        {item.equippedSlot ? (
          <button type="button" className="button-secondary" onClick={onUnequip}>
            Unequip
          </button>
        ) : (
          <button type="button" className="button-primary" onClick={() => onEquip(equipSlot)}>
            Equip
          </button>
        )}
        <button type="button" className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
