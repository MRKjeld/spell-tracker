import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ClassId } from '../../data/classes';
import type { SpellSelection } from '../../state/types';
import { POOL_COLOR_PRESETS } from '../../data/poolColors';
import type { PoolColorId } from '../../data/poolColors';
import { SpellPickerModal } from './SpellPickerModal';

interface AddSlotPoolModalProps {
  defaultClassId: ClassId;
  onAdd: (name: string, spellLevel: number | null, spells: SpellSelection[], color?: PoolColorId) => void;
  onClose: () => void;
}

export function AddSlotPoolModal({ defaultClassId, onAdd, onClose }: AddSlotPoolModalProps) {
  const [name, setName] = useState('');
  const [specifyLevel, setSpecifyLevel] = useState(false);
  const [spellLevel, setSpellLevel] = useState(1);
  const [spell, setSpell] = useState<SpellSelection | null>(null);
  const [color, setColor] = useState<PoolColorId | undefined>(undefined);
  const [showSpellPicker, setShowSpellPicker] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), specifyLevel ? spellLevel : null, spell ? [spell] : [], color);
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
          <input type="checkbox" checked={specifyLevel} onChange={(e) => setSpecifyLevel(e.target.checked)} />
          Specify a spell level
        </label>
        {specifyLevel && (
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

        <label className="add-slot-pool-color">
          Colour
          <div className="add-slot-pool-color-swatches">
            <button
              type="button"
              className={`add-slot-pool-color-swatch add-slot-pool-color-none${color === undefined ? ' selected' : ''}`}
              onClick={() => setColor(undefined)}
              title="No colour"
              aria-label="No colour"
            />
            {POOL_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`add-slot-pool-color-swatch${color === preset.id ? ' selected' : ''}`}
                style={{ backgroundColor: preset.value }}
                onClick={() => setColor(preset.id)}
                title={preset.label}
                aria-label={preset.label}
              />
            ))}
          </div>
        </label>

        <div className="add-slot-pool-spells">
          <div className="add-slot-pool-spells-header">
            <span>Spell (optional — added as a persisted fill)</span>
            {!spell && (
              <button type="button" onClick={() => setShowSpellPicker(true)}>
                + Specify Spell
              </button>
            )}
          </div>
          {spell && (
            <ul className="add-slot-pool-spells-list">
              <li className="slot-grid-pool-tag">
                {spell.spellName}
                <button type="button" onClick={() => setSpell(null)} title={`Remove ${spell.spellName}`}>
                  ×
                </button>
              </li>
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
          spellLevel={specifyLevel ? spellLevel : null}
          poolName={name.trim() || undefined}
          onPick={(spellId, spellName, sourceClassId) => {
            setSpell({ spellId, spellName, sourceClassId });
            setShowSpellPicker(false);
          }}
          onClose={() => setShowSpellPicker(false)}
        />
      )}
    </Modal>
  );
}
