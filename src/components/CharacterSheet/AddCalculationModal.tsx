import { useState } from 'react';
import { Modal } from '../common/Modal';
import { ScrollPicker } from '../common/ScrollPicker';
import type { Modifier } from '../../state/types';
import { formatModifierValue } from '../../lib/modifiers';

const DICE_COUNTS = Array.from({ length: 40 }, (_, i) => i + 1);
const DICE_SIDES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

interface AddCalculationModalProps {
  modifiers: Modifier[];
  onAdd: (calculation: { name: string; diceRoll: string; modifierIds: string[] }) => void;
  onRemoveModifier: (modifierId: string) => void;
  onClose: () => void;
}

export function AddCalculationModal({ modifiers, onAdd, onRemoveModifier, onClose }: AddCalculationModalProps) {
  const [name, setName] = useState('');
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(20);
  const [modifierIds, setModifierIds] = useState<string[]>([]);

  function toggleModifier(id: string) {
    setModifierIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), diceRoll: `${diceCount}d${diceSides}`, modifierIds });
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

        <div className="picker-field">
          <span>Dice Roll</span>
          <div className="dice-roll-field">
            <ScrollPicker values={DICE_COUNTS} value={diceCount} onChange={setDiceCount} label="Number of dice" />
            <span className="dice-roll-separator">d</span>
            <ScrollPicker values={DICE_SIDES} value={diceSides} onChange={setDiceSides} label="Dice sides" />
          </div>
        </div>

        <div className="picker-field">
          <span>Modifiers</span>
          {modifiers.length === 0 ? (
            <p className="equipment-empty">No modifiers yet — add one with Add Modifier first.</p>
          ) : (
            <ul className="modifier-block-list">
              {modifiers.map((modifier) => {
                const isSelected = modifierIds.includes(modifier.id);
                return (
                  <li key={modifier.id} className="modifier-block-item">
                    <button
                      type="button"
                      className={`modifier-block${isSelected ? ' modifier-block-selected' : ''}`}
                      onClick={() => toggleModifier(modifier.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="modifier-block-studs" aria-hidden="true">
                        <span className="modifier-block-stud" />
                        <span className="modifier-block-stud" />
                      </span>
                      <span className="modifier-block-label">{modifier.name}</span>
                      <span className="modifier-block-value">{formatModifierValue(modifier.value)}</span>
                    </button>
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
                );
              })}
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
