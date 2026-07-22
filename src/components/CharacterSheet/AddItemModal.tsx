import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ItemUsePeriod } from '../../state/types';

interface AddItemModalProps {
  onAdd: (item: { name: string; activation: string; usePeriod: ItemUsePeriod; maxUses: number }) => void;
  onClose: () => void;
}

const USE_PERIOD_LABELS: Record<ItemUsePeriod, string> = {
  unlimited: 'Unlimited',
  rest: 'Use(s) per rest',
  day: 'Use(s) per day',
  week: 'Use(s) per week',
  month: 'Use(s) per month',
};

export function AddItemModal({ onAdd, onClose }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [activation, setActivation] = useState('');
  const [usePeriod, setUsePeriod] = useState<ItemUsePeriod>('day');
  const [maxUses, setMaxUses] = useState(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      activation: activation.trim(),
      usePeriod,
      maxUses: usePeriod === 'unlimited' ? 0 : Math.max(1, maxUses),
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
          Activation
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
