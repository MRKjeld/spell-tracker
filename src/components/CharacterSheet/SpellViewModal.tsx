import { Modal } from '../common/Modal';
import { getSpellById } from '../../data/spells';
import { SpellDetails } from './SpellDetails';

interface SpellViewModalProps {
  spellId: string;
  spellName: string;
  used: boolean;
  onToggleUsed: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function SpellViewModal({ spellId, spellName, used, onToggleUsed, onClear, onClose }: SpellViewModalProps) {
  const spell = getSpellById(spellId);

  return (
    <Modal title={spellName} onClose={onClose}>
      {spell ? <SpellDetails spell={spell} /> : <p>Spell details not found.</p>}
      <div className="spell-view-actions">
        <button type="button" className="button-danger" onClick={onClear}>
          Clear
        </button>
        <button type="button" className={used ? 'button-secondary' : 'button-primary'} onClick={onToggleUsed}>
          {used ? 'Unuse' : 'Use'}
        </button>
        <button type="button" className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
