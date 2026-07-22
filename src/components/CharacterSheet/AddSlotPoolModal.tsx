import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ClassId } from '../../data/classes';
import type { SpellSelection } from '../../state/types';
import { SpellPickerModal } from './SpellPickerModal';

interface AddSlotPoolModalProps {
  defaultClassId: ClassId;
  onAdd: (name: string, spellLevel: number | null, count: number, spells: SpellSelection[]) => void;
  onClose: () => void;
}

export function AddSlotPoolModal({ defaultClassId, onAdd, onClose }: AddSlotPoolModalProps) {
  const [name, setName] = useState('');
  const [noLevel, setNoLevel] = useState(false);
  const [spellLevel, setSpellLevel] = useState(1);
  const [count, setCount] = useState(1);
  const [spells, setSpells] = useState<SpellSelection[]>([]);
  const [showSpellPicker, setShowSpellPicker] = useState(false);

  function handleCountChange(next: number) {
    setCount(next);
    setSpells((prev) => prev.slice(0, next));
  }

  function handleRemoveSpell(index: number) {
    setSpells((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), noLevel ? null : spellLevel, count, spells);
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
            onChange={(e) => handleCountChange(Number(e.target.value))}
          />
        </label>

        <div className="add-slot-pool-spells">
          <div className="add-slot-pool-spells-header">
            <span>Spells (optional — added as persisted fills)</span>
            {spells.length < count && (
              <button type="button" onClick={() => setShowSpellPicker(true)}>
                + Specify Spell
              </button>
            )}
          </div>
          {spells.length > 0 && (
            <ul className="add-slot-pool-spells-list">
              {spells.map((spell, i) => (
                <li key={`${spell.spellId}-${i}`} className="slot-grid-pool-tag">
                  {spell.spellName}
                  <button type="button" onClick={() => handleRemoveSpell(i)} title={`Remove ${spell.spellName}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="button-primary">
            Add
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>

      {showSpellPicker && (
        <SpellPickerModal
          defaultClassId={defaultClassId}
          spellLevel={noLevel ? null : spellLevel}
          poolName={name.trim() || undefined}
          onPick={(spellId, spellName, sourceClassId) => {
            setSpells((prev) => [...prev, { spellId, spellName, sourceClassId }]);
            setShowSpellPicker(false);
          }}
          onClose={() => setShowSpellPicker(false)}
        />
      )}
    </Modal>
  );
}
