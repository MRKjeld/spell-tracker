import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Calculation } from '../../state/types';
import { isSystemCalculationId } from '../../lib/systemCalculations';

interface AddActionModalProps {
  calculations: Calculation[];
  onAdd: (action: { name: string; description: string; calculationIds: string[] }) => void;
  onRemoveCalculation: (calculationId: string) => void;
  onClose: () => void;
}

export function AddActionModal({ calculations, onAdd, onRemoveCalculation, onClose }: AddActionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [calculationIds, setCalculationIds] = useState<string[]>([]);
  const [calculationSearch, setCalculationSearch] = useState('');

  function toggleCalculation(id: string) {
    setCalculationIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function moveCalculation(id: string, toIndex: number) {
    setCalculationIds((prev) => {
      const from = prev.indexOf(id);
      if (from === -1 || toIndex < 0 || toIndex >= prev.length || from === toIndex) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(toIndex, 0, id);
      return next;
    });
  }

  // Pointer-based drag (works for mouse and touch): while the handle is held,
  // reorder the dragged row to whichever selected row is under the pointer.
  function handleDragMove(e: React.PointerEvent<HTMLElement>, id: string) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-calc-id]');
    const overId = row?.dataset.calcId;
    if (!overId || overId === id) return;
    moveCalculation(id, calculationIds.indexOf(overId));
  }

  const calculationsById = new Map(calculations.map((c) => [c.id, c]));
  const selectedCalculations = calculationIds
    .map((id) => calculationsById.get(id))
    .filter((c): c is Calculation => c !== undefined);

  const sortedCalculations =[...calculations].sort((a, b) => a.name.localeCompare(b.name));
  const visibleCalculations = sortedCalculations.filter((calculation) =>
    calculation.name.toLowerCase().includes(calculationSearch.trim().toLowerCase()),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), description: description.trim(), calculationIds });
    onClose();
  }

  return (
    <Modal title="Add Action" onClose={onClose}>
      <form onSubmit={handleSubmit} className="add-item-form">
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alchemist's Bomb"
            autoFocus
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happens when this action is taken?"
            rows={4}
          />
        </label>

        <div className="picker-field">
          <span>Calculations</span>
          {calculations.length === 0 ? (
            <p className="equipment-empty">No calculations yet. Add one with Add Calculation first.</p>
          ) : (
            <>
              <input
                type="search"
                value={calculationSearch}
                onChange={(e) => setCalculationSearch(e.target.value)}
                placeholder="Search calculations…"
                aria-label="Search calculations"
                className="picker-search"
              />
              {selectedCalculations.length > 0 && (
                <ul className="selected-calculations" aria-label="Selected calculations (drag to reorder)">
                  {selectedCalculations.map((calculation, index) => (
                    <li key={calculation.id} data-calc-id={calculation.id} className="selected-calculation">
                      <span
                        className="selected-calculation-handle"
                        role="button"
                        tabIndex={0}
                        aria-label={`Reorder ${calculation.name}. Use arrow keys or drag.`}
                        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
                        onPointerMove={(e) => handleDragMove(e, calculation.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            moveCalculation(calculation.id, index - 1);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            moveCalculation(calculation.id, index + 1);
                          }
                        }}
                      >
                        ⋮⋮
                      </span>
                      <span className="selected-calculation-name">
                        {calculation.name}
                        {calculation.diceRoll ? ` (${calculation.diceRoll})` : ''}
                      </span>
                      <button
                        type="button"
                        className="picker-checklist-remove"
                        onClick={() => toggleCalculation(calculation.id)}
                        title={`Remove ${calculation.name} from action`}
                        aria-label={`Remove ${calculation.name} from action`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {visibleCalculations.length === 0 ? (
                <p className="equipment-empty">No calculations match "{calculationSearch}".</p>
              ) : (
                <ul className="picker-checklist">
                  {visibleCalculations.map((calculation) => {
                    const isSystem = isSystemCalculationId(calculation.id);
                    return (
                      <li key={calculation.id}>
                        <label className="picker-checklist-item">
                          <input
                            type="checkbox"
                            checked={calculationIds.includes(calculation.id)}
                            onChange={() => toggleCalculation(calculation.id)}
                          />
                          {calculation.name}
                          {calculation.diceRoll ? ` (${calculation.diceRoll})` : ''}
                        </label>
                        {isSystem ? (
                          <span className="modifier-block-system-tag" title="Always available; can't be removed"/>
                        ) : (
                          <button
                            type="button"
                            className="picker-checklist-remove"
                            onClick={() => onRemoveCalculation(calculation.id)}
                            title={`Delete ${calculation.name}`}
                            aria-label={`Delete ${calculation.name}`}
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
