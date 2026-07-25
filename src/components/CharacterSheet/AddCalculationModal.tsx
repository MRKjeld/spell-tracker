import { useState } from 'react';
import { Modal } from '../common/Modal';
import { ScrollPicker } from '../common/ScrollPicker';
import type { Modifier } from '../../state/types';
import { formatModifierValue } from '../../lib/modifiers';
import { isSystemModifierId } from '../../lib/systemModifiers';

const DICE_COUNTS = Array.from({ length: 40 }, (_, i) => i + 1);
const DICE_SIDES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

interface AddCalculationModalProps {
  modifiers: Modifier[];
  systemModifiers: Modifier[];
  onAdd: (calculation: { name: string; diceRoll: string; modifierIds: string[] }) => void;
  onRemoveModifier: (modifierId: string) => void;
  onClose: () => void;
}

export function AddCalculationModal({
  modifiers,
  systemModifiers,
  onAdd,
  onRemoveModifier,
  onClose,
}: AddCalculationModalProps) {
  const [name, setName] = useState('');
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(20);
  const [modifierIds, setModifierIds] = useState<string[]>([]);
  const [modifierSearch, setModifierSearch] = useState('');

  function toggleModifier(id: string) {
    setModifierIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  // System modifiers are concatenated after the user's own, so they stay
  // pinned to the bottom of the list even once the search filter is applied.
  const allModifiers = [...modifiers, ...systemModifiers];
  const visibleModifiers = allModifiers.filter((modifier) =>
    modifier.name.toLowerCase().includes(modifierSearch.trim().toLowerCase()),
  );

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
          {allModifiers.length === 0 ? (
            <p className="equipment-empty">No modifiers yet — add one with Add Modifier first.</p>
          ) : (
            <>
              <input
                type="search"
                value={modifierSearch}
                onChange={(e) => setModifierSearch(e.target.value)}
                placeholder="Search modifiers…"
                aria-label="Search modifiers"
                className="picker-search"
              />
              {visibleModifiers.length === 0 ? (
                <p className="equipment-empty">No modifiers match "{modifierSearch}".</p>
              ) : (
                <ul className="modifier-block-list">
                  {visibleModifiers.map((modifier) => {
                    const isSelected = modifierIds.includes(modifier.id);
                    const isSystem = isSystemModifierId(modifier.id);
                    return (
                      <li key={modifier.id} className="modifier-block-item">
                        <button
                          type="button"
                          className={`modifier-block${isSelected ? ' modifier-block-selected' : ''}${isSystem ? ' modifier-block-system' : ''}`}
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
                        {isSystem ? (
                          <span className="modifier-block-system-tag" title="Always available; can't be removed">
                            System
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="picker-checklist-remove"
                            onClick={() => onRemoveModifier(modifier.id)}
                            title={`Delete ${modifier.name}`}
                            aria-label={`Delete ${modifier.name}`}
                          >
                            ×
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
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
