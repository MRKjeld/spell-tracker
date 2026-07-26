import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { LearnedSpell } from '../../state/types';

interface CastSpellModalProps {
  learnedSpells: LearnedSpell[];
  onCast: (spell: LearnedSpell) => void;
  onClose: () => void;
}

// Spontaneous casters (see CASTING_TYPE in data/classes.ts) don't prepare
// spells ahead of time — they cast straight from their known-spells list, and
// this is what fills a slot automatically (as already-used) instead of the
// player picking an open slot first (see SpellPickerModal, used for prepared
// casters).
export function CastSpellModal({ learnedSpells, onCast, onClose }: CastSpellModalProps) {
  const [query, setQuery] = useState('');

  const spells = useMemo(() => {
    const sorted = [...learnedSpells].sort(
      (a, b) => a.spellLevel - b.spellLevel || a.spellName.localeCompare(b.spellName),
    );
    const normalized = query.trim().toLowerCase();
    return normalized ? sorted.filter((s) => s.spellName.toLowerCase().includes(normalized)) : sorted;
  }, [learnedSpells, query]);

  return (
    <Modal title="Cast a Spell" onClose={onClose}>
      <input
        type="search"
        placeholder="Search known spells..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="spell-picker-search"
        autoFocus
      />

      <ul className="spell-picker-list">
        {spells.length === 0 && (
          <li className="spell-picker-empty">No known spells match. Try Learn first.</li>
        )}
        {spells.map((spell) => (
          <li key={spell.id}>
            <div className="spell-picker-row">
              <button type="button" className="spell-picker-pick" onClick={() => onCast(spell)}>
                {spell.spellName}
                <span className="spell-picker-school"> · Lvl {spell.spellLevel}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
