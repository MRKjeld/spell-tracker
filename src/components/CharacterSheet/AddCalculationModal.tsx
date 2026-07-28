import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { ScrollPicker } from '../common/ScrollPicker';
import type { Calculation, Modifier } from '../../state/types';
import { formatModifierValue } from '../../lib/modifiers';
import { isSystemModifierId } from '../../lib/systemModifiers';

const DICE_COUNTS = Array.from({ length: 40 }, (_, i) => i + 1);
const DICE_SIDES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

// Parses a diceRoll string like "2d6" back into its count/sides, falling
// back to 1d20 if it doesn't match (shouldn't happen -- every Calculation's
// diceRoll is built from these same scroll pickers).
function parseDiceRoll(diceRoll: string): { diceCount: number; diceSides: number } {
  const match = /^(\d+)d(\d+)$/.exec(diceRoll);
  return match ? { diceCount: Number(match[1]), diceSides: Number(match[2]) } : { diceCount: 1, diceSides: 20 };
}

// Ranks how well a clone candidate matches what's typed in Name so far --
// exact match first, then starts-with, then contains, then everything else --
// so the closest suggestions surface as the player types.
function cloneMatchRank(calculationName: string, typedName: string): number {
  const name = calculationName.toLowerCase();
  const typed = typedName.toLowerCase();
  if (name === typed) return 0;
  if (name.startsWith(typed)) return 1;
  if (name.includes(typed)) return 2;
  return 3;
}

interface AddCalculationModalProps {
  modifiers: Modifier[];
  systemModifiers: Modifier[];
  existingCalculations: Calculation[];
  onAdd: (calculation: { name: string; diceRoll: string; modifierIds: string[] }) => void;
  onRemoveModifier: (modifierId: string) => void;
  onClose: () => void;
}

export function AddCalculationModal({
  modifiers,
  systemModifiers,
  existingCalculations,
  onAdd,
  onRemoveModifier,
  onClose,
}: AddCalculationModalProps) {
  const [name, setName] = useState('');
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(20);
  const [modifierIds, setModifierIds] = useState<string[]>([]);
  const [modifierSearch, setModifierSearch] = useState('');

  // Cloning an existing Calculation just pre-fills this form with its name,
  // dice roll, and modifiers -- submitting still creates a brand new
  // Calculation (see onAdd), so the source is left untouched.
  function cloneCalculation(source: Calculation) {
    setName(source.name);
    const { diceCount: sourceDiceCount, diceSides: sourceDiceSides } = parseDiceRoll(source.diceRoll);
    setDiceCount(sourceDiceCount);
    setDiceSides(sourceDiceSides);
    setModifierIds([...source.modifierIds]);
  }

  function toggleModifier(id: string) {
    setModifierIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  const cloneSuggestions = useMemo(() => {
    const typed = name.trim();
    if (!typed) return existingCalculations;
    return [...existingCalculations].sort(
      (a, b) => cloneMatchRank(a.name, typed) - cloneMatchRank(b.name, typed),
    );
  }, [existingCalculations, name]);

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

        {existingCalculations.length > 0 && (
          <div className="picker-field">
            <span>Clone Existing (optional)</span>
            <ul className="clone-calculation-list">
              {cloneSuggestions.map((calculation) => (
                <li key={calculation.id}>
                  <button type="button" onClick={() => cloneCalculation(calculation)}>
                    {calculation.name}
                    {calculation.diceRoll ? ` (${calculation.diceRoll})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
            <p className="equipment-empty">No modifiers yet. Add one with Add Modifier first.</p>
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
                          className={`modifier-block${isSelected ? ' modifier-block-selected' : ''}${isSystem ? ' modifier-block-system' : ''}${modifier.circumstantial ? ' modifier-block-circumstantial' : ''}`}
                          onClick={() => toggleModifier(modifier.id)}
                          aria-pressed={isSelected}
                        >
                          <span className="modifier-block-label">{modifier.name}</span>
                          <span className="modifier-block-value">{formatModifierValue(modifier.value)}</span>
                        </button>
                        {isSystem ? (
                          <span className="modifier-block-system-tag" title="Always available; can't be removed"/>
                        ) : (
                          <button
                            type="button"
                            className={`picker-checklist-remove${modifier.circumstantial ? ' picker-checklist-remove-circumstantial' : ''}`}
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
