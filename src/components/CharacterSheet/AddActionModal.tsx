import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Calculation } from '../../state/types';

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

  function toggleCalculation(id: string) {
    setCalculationIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

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
            <p className="equipment-empty">No calculations yet — add one with Add Calculation first.</p>
          ) : (
            <ul className="picker-checklist">
              {calculations.map((calculation) => (
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
                  <button
                    type="button"
                    className="picker-checklist-remove"
                    onClick={() => onRemoveCalculation(calculation.id)}
                    title={`Delete ${calculation.name}`}
                    aria-label={`Delete ${calculation.name}`}
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
