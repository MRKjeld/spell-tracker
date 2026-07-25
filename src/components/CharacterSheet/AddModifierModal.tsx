import { useState } from 'react';
import { Modal } from '../common/Modal';
import { NumberInput } from '../common/NumberInput';

interface AddModifierModalProps {
  onAdd: (modifier: { name: string; value: number }) => void;
  onClose: () => void;
}

export function AddModifierModal({ onAdd, onClose }: AddModifierModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), value });
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
