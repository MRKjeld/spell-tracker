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
  onRemoveAction: (actionId: string) => void;
}

export function ActionsSection({
  modifiers,
  calculations,
  actions,
  onAddModifier,
  onAddCalculation,
  onAddAction,
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
        <button type="button" className="button-primary" onClick={onAddAction}>
          + Action
        </button>
        <button type="button" onClick={onAddCalculation}>
          + Calculation
        </button>
        <button type="button" onClick={onAddModifier}>
          + Modifier
        </button>
      </div>

      {actions.length === 0 ? (
        <p className="equipment-empty">
          No actions yet — build one up with Add Modifier, then Add Calculation, then Add Action.
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
                    const total = calcModifiers.reduce((sum, m) => sum + m.value, 0);
                    return (
                      <div key={calcId} className="action-calculation">
                        <div className="action-calculation-header">
                          <span className="action-calculation-name">{calculation.name}</span>
                          <span className="action-calculation-roll">
                            {calculation.diceRoll}
                            {calcModifiers.length > 0 ? ` ${formatModifierValue(total)}` : ''}
                          </span>
                        </div>
                        {calcModifiers.length > 0 && (
                          <div className="action-calculation-modifiers">
                            {calcModifiers.map((modifier) => {
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
