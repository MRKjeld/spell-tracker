import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Modifier } from '../../state/types';
import { formatModifierValue } from '../../lib/modifiers';

interface AddCalculationModalProps {
  modifiers: Modifier[];
  onAdd: (calculation: { name: string; diceRoll: string; modifierIds: string[] }) => void;
  onRemoveModifier: (modifierId: string) => void;
  onClose: () => void;
}

export function AddCalculationModal({ modifiers, onAdd, onRemoveModifier, onClose }: AddCalculationModalProps) {
  const [name, setName] = useState('');
  const [diceRoll, setDiceRoll] = useState('');
  const [modifierIds, setModifierIds] = useState<string[]>([]);

  function toggleModifier(id: string) {
    setModifierIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), diceRoll: diceRoll.trim(), modifierIds });
    onClose();
  }

  return (
    <Modal title="Add Calculation" onClose={onClose}>
      <form onSubmit={handleSubmit} className="add-item-form">
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ranged Attack (<30ft)"
            autoFocus
            required
          />
        </label>

        <label>
          Dice Roll
          <input value={diceRoll} onChange={(e) => setDiceRoll(e.target.value)} placeholder="e.g. 1d20" />
        </label>

        <div className="picker-field">
          <span>Modifiers</span>
          {modifiers.length === 0 ? (
            <p className="equipment-empty">No modifiers yet — add one with Add Modifier first.</p>
          ) : (
            <ul className="picker-checklist">
              {modifiers.map((modifier) => (
                <li key={modifier.id}>
                  <label className="picker-checklist-item">
                    <input
                      type="checkbox"
                      checked={modifierIds.includes(modifier.id)}
                      onChange={() => toggleModifier(modifier.id)}
                    />
                    {modifier.name} ({formatModifierValue(modifier.value)})
                  </label>
                  <button
                    type="button"
                    className="picker-checklist-remove"
                    onClick={() => onRemoveModifier(modifier.id)}
                    title={`Delete ${modifier.name}`}
                    aria-label={`Delete ${modifier.name}`}
                  >
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
    </Modal>
  );
}
