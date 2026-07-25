import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ItemUsePeriod } from '../../state/types';
import { BODY_SLOT_IDS, BODY_SLOT_LABELS } from '../../data/bodySlots';
import type { BodySlotId } from '../../data/bodySlots';
import type { BaseArmorCategory } from '../../data/baseArmor';

interface AddItemModalProps {
  onAdd: (item: {
    name: string;
    description: string;
    slot: BodySlotId | null;
    category: BaseArmorCategory | null;
    activation: string;
    usePeriod: ItemUsePeriod;
    maxUses: number;
  }) => void;
  onClose: () => void;
}

const USE_PERIOD_LABELS: Record<ItemUsePeriod, string> = {
  unlimited: 'Unlimited',
  rest: 'Use(s) per rest',
  day: 'Use(s) per day',
  week: 'Use(s) per week',
  month: 'Use(s) per month',
  manual: 'Use(s), recharge manually',
};

const ARMOR_CATEGORY_LABELS: Record<'light' | 'medium' | 'heavy', string> = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

export function AddItemModal({ onAdd, onClose }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slot, setSlot] = useState<BodySlotId | ''>('');
  const [armorCategory, setArmorCategory] = useState<'light' | 'medium' | 'heavy'>('light');
  const [activation, setActivation] = useState('');
  const [usePeriod, setUsePeriod] = useState<ItemUsePeriod>('day');
  const [maxUses, setMaxUses] = useState(1);

  // Armor and shields are mundane gear in this app's catalog (no activation);
  // every other slot — plus unslotted inventory items — behaves like a
  // wondrous item and can have an activated ability with charges.
  const isArmorSlot = slot === 'armor';
  const isShieldSlot = slot === 'mainHand' || slot === 'offhand';
  const showActionFields = !isArmorSlot && !isShieldSlot;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      description: description.trim(),
      slot: slot || null,
      category: isArmorSlot ? armorCategory : isShieldSlot ? 'shield' : null,
      activation: showActionFields ? activation.trim() : '',
      usePeriod: showActionFields ? usePeriod : 'unlimited',
      maxUses: showActionFields && usePeriod !== 'unlimited' ? Math.max(1, maxUses) : 0,
    });
    onClose();
  }

  return (
    <Modal title="Add Item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="add-item-form">
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wand of Cure Light Wounds"
            autoFocus
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Flavor text, rules text, or notes about this item"
            rows={3}
          />
        </label>

        <label>
          Slot
          <select value={slot} onChange={(e) => setSlot(e.target.value as BodySlotId | '')}>
            <option value="">No Slot (Inventory Only)</option>
            {BODY_SLOT_IDS.map((s) => (
              <option key={s} value={s}>
                {BODY_SLOT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        {isArmorSlot && (
          <label>
            Category
            <select value={armorCategory} onChange={(e) => setArmorCategory(e.target.value as 'light' | 'medium' | 'heavy')}>
              {(Object.keys(ARMOR_CATEGORY_LABELS) as (keyof typeof ARMOR_CATEGORY_LABELS)[]).map((cat) => (
                <option key={cat} value={cat}>
                  {ARMOR_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>
        )}

        {showActionFields && (
          <>
            <label>
              Action
              <textarea
                value={activation}
                onChange={(e) => setActivation(e.target.value)}
                placeholder="What happens when this item is activated?"
                rows={4}
              />
            </label>

            <label>
              Uses
              <select value={usePeriod} onChange={(e) => setUsePeriod(e.target.value as ItemUsePeriod)}>
                {(Object.keys(USE_PERIOD_LABELS) as ItemUsePeriod[]).map((period) => (
                  <option key={period} value={period}>
                    {USE_PERIOD_LABELS[period]}
                  </option>
                ))}
              </select>
            </label>

            {usePeriod !== 'unlimited' && (
              <label>
                Charges
                <input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                />
              </label>
            )}
          </>
        )}

        <div className="form-actions">
          <button type="submit" className="button-primary">
            Add
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
