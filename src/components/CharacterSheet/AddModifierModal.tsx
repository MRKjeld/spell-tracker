import { useState } from 'react';
import { Modal } from '../common/Modal';
import { NumberInput } from '../common/NumberInput';

interface AddModifierModalProps {
  onAdd: (modifier: { name: string; value: number; circumstantial: boolean }) => void;
  onClose: () => void;
}

export function AddModifierModal({ onAdd, onClose }: AddModifierModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState(0);
  const [circumstantial, setCircumstantial] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), value, circumstantial });
    onClose();
  }

  return (
    <Modal title="Add Modifier" onClose={onClose}>
      <form onSubmit={handleSubmit} className="add-item-form">
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Strength"
            autoFocus
            required
          />
        </label>

        <label>
          Value
          <NumberInput value={value} onChange={setValue} />
        </label>

        <label className="picker-checklist-item">
          <input
            type="checkbox"
            checked={circumstantial}
            onChange={(e) => setCircumstantial(e.target.checked)}
          />
          Circumstantial
        </label>

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
