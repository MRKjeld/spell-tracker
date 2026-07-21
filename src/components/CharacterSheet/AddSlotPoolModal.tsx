import { useState } from 'react';
import { Modal } from '../common/Modal';

interface AddSlotPoolModalProps {
  onAdd: (name: string, spellLevel: number | null, count: number) => void;
  onClose: () => void;
}

export function AddSlotPoolModal({ onAdd, onClose }: AddSlotPoolModalProps) {
  const [name, setName] = useState('');
  const [noLevel, setNoLevel] = useState(false);
  const [spellLevel, setSpellLevel] = useState(1);
  const [count, setCount] = useState(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), noLevel ? null : spellLevel, count);
    onClose();
  }

  return (
    <Modal title="Add Spell Slots" onClose={onClose}>
      <form onSubmit={handleSubmit} className="add-slot-pool-form">
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Domain, Drow Innate"
            autoFocus
            required
          />
        </label>
        <label className="add-slot-pool-checkbox">
          <input type="checkbox" checked={noLevel} onChange={(e) => setNoLevel(e.target.checked)} />
          No specific spell level — these spells form their own segment
        </label>
        {!noLevel && (
          <label>
            Spell Level
            <input
              type="number"
              min={0}
              max={9}
              value={spellLevel}
              onChange={(e) => setSpellLevel(Number(e.target.value))}
            />
          </label>
        )}
        <label>
          Count
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
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
