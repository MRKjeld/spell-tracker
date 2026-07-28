import { useState } from 'react';
import type { Calculation, CharacterAction, Modifier } from '../../state/types';
import { formatModifierValue } from '../../lib/modifiers';

interface ActionsSectionProps {
  modifiers: Modifier[];
  calculations: Calculation[];
  actions: CharacterAction[];
  onAddModifier: () => void;
  onAddCalculation: () => void;
  onAddAction: () => void;
  onSetCalculationSelectedCircumstantials: (calculationId: string, selectedModifierIds: string[]) => void;
  onRemoveAction: (actionId: string) => void;
}

export function ActionsSection({
  modifiers,
  calculations,
  actions,
  onAddModifier,
  onAddCalculation,
  onAddAction,
  onSetCalculationSelectedCircumstantials,
  onRemoveAction,
}: ActionsSectionProps) {
  // Which modifier chip currently has its name revealed, keyed by
  // `${calculationId}-${modifierId}` since the same modifier can appear
  // under more than one calculation on the page at once.
  const [revealedChip, setRevealedChip] = useState<string | null>(null);

  const modifierById = new Map(modifiers.map((m) => [m.id, m]));
  const calculationById = new Map(calculations.map((c) => [c.id, c]));

  return (
    <div className="slot-grid-row actions-section">
      <div className="slot-grid-row-header">
        <h3>Actions</h3>
        <span className="slot-grid-row-summary">
          {actions.length} action{actions.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="actions-toolbar">
        <button type="button" className="button-primary button-theme-action" onClick={onAddAction}>
          + Action
        </button>
        <button type="button" className="button-theme-calculation" onClick={onAddCalculation}>
          + Calculation
        </button>
        <button type="button" className="button-theme-modifier" onClick={onAddModifier}>
          + Modifier
        </button>
      </div>

      {actions.length === 0 ? (
        <p className="equipment-empty">
          No actions yet. Build one up with Add Modifier, then Add Calculation, then Add Action.
        </p>
      ) : (
        <div className="action-card-list">
          {actions.map((action) => (
            <div key={action.id} className="action-card">
              <div className="action-card-header">
                <span className="action-card-name">{action.name}</span>
                <button
                  type="button"
                  className="action-card-remove"
                  onClick={() => onRemoveAction(action.id)}
                  title={`Delete ${action.name}`}
                  aria-label={`Delete ${action.name}`}
                >
                  ×
                </button>
              </div>

              {action.description && <p className="action-card-body">{action.description}</p>}

              {action.calculationIds.length > 0 && (
                <div className="action-calculation-list">
                  {action.calculationIds.map((calcId) => {
                    const calculation = calculationById.get(calcId);
                    if (!calculation) return null;
                    const calcModifiers = calculation.modifierIds
                      .map((id) => modifierById.get(id))
                      .filter((m): m is Modifier => m !== undefined);
                    const baseModifiers = calcModifiers.filter((m) => !m.circumstantial);
                    const circumstantialModifiers = calcModifiers.filter((m) => m.circumstantial);
                    const selectedCircumstantialIdList = calculation.selectedCircumstantialIds ?? [];
                    const selectedCircumstantialIds = new Set(selectedCircumstantialIdList);
                    const selectedCircumstantialModifiers = circumstantialModifiers.filter((m) =>
                      selectedCircumstantialIds.has(m.id),
                    );
                    const appliedModifiers = [...baseModifiers, ...selectedCircumstantialModifiers];
                    const total = appliedModifiers.reduce(
                      (sum, m) => sum + m.value,
                      0,
                    );

                    function toggleCircumstantial(modifierId: string) {
                      const nextSelected = new Set(selectedCircumstantialIdList);
                      if (nextSelected.has(modifierId)) {
                        nextSelected.delete(modifierId);
                      } else {
                        nextSelected.add(modifierId);
                      }
                      onSetCalculationSelectedCircumstantials(calcId, [...nextSelected]);
                    }

                    return (
                      <div key={calcId} className="action-calculation">
                        <div className="action-calculation-header">
                          <span className="action-calculation-name">{calculation.name}</span>
                          <span className="action-calculation-roll">
                            {calculation.diceRoll}
                            {appliedModifiers.length > 0 ? ` ${formatModifierValue(total)}` : ''}
                          </span>
                        </div>
                        {calcModifiers.length > 0 && (
                          <div className="action-calculation-modifiers">
                            {baseModifiers.map((modifier) => {
                              const chipKey = `${calcId}-${modifier.id}`;
                              const isRevealed = revealedChip === chipKey;
                              return (
                                <button
                                  key={modifier.id}
                                  type="button"
                                  className="modifier-chip"
                                  onClick={() => setRevealedChip(isRevealed ? null : chipKey)}
                                >
                                  {formatModifierValue(modifier.value)}
                                  {isRevealed && <span className="modifier-chip-tooltip">{modifier.name}</span>}
                                </button>
                              );
                            })}
                            {circumstantialModifiers.length > 0 && (
                              <div className="action-calculation-circumstantial-modifiers">
                                {circumstantialModifiers.map((modifier) => {
                                  const isSelected = selectedCircumstantialIds.has(modifier.id);
                                  return (
                                    <button
                                      key={modifier.id}
                                      type="button"
                                      className={`modifier-chip modifier-chip-circumstantial${isSelected ? ' modifier-chip-circumstantial-selected' : ''}`}
                                      onClick={() => toggleCircumstantial(modifier.id)}
                                      title={modifier.name}
                                      aria-pressed={isSelected}
                                    >
                                      {isSelected ? modifier.name + " " + formatModifierValue(modifier.value) : modifier.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
