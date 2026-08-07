import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { LearnedSpell } from '../../state/types';
import { getAllLearnedSpellsFor } from '../../data/spells';
import type { ClassId } from '../../data/classes';
import { SpellDetails } from './SpellDetails';

interface CastSpellModalProps {
  classId: ClassId;
  learnedSpells: LearnedSpell[];
  onCast: (spell: LearnedSpell) => void;
  onClose: () => void;
}

// Spontaneous casters (see CASTING_TYPE in data/classes.ts) don't prepare
// spells ahead of time — they cast straight from their known-spells list, and
// this is what fills a slot automatically (as already-used) instead of the
// player picking an open slot first (see SpellPickerModal, used for prepared
// casters).
export function CastSpellModal({ classId, learnedSpells, onCast, onClose }: CastSpellModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedSpellName, setSelectedSpellName] = useState<string>('');

    const spells = useMemo(() => {
      const sorted = [...getAllLearnedSpellsFor(learnedSpells)].sort(
        (a, b) => (a.levels[classId] ?? 0) - (b.levels[classId] ?? 0) || a.name.localeCompare(b.name),
      );
      const normalized = query.trim().toLowerCase();
      return normalized ? sorted.filter((s) => s.name.toLowerCase().includes(normalized)) : sorted;
    }, [classId, learnedSpells, query]);

  function toggleSelected(spellId: string) {
    setSelected(spellId);
    const spell = spells.find((s) => s.id === spellId);
    setSelectedSpellName(spell ? spell.name : '');
  }
  function toggleExpanded(spellId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spellId)) next.delete(spellId);
      else next.add(spellId);
      return next;
    });
  }

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
          <li className="spell-picker-empty">No known spells match. You may need to Learn some spells first.</li>
        )}
        {spells.map((spell) => {
          const isSelected = selected === spell.id;
          const expanded = expandedIds.has(spell.id);
          return (
            <li key={spell.id}>
            <div className="spell-picker-row">
              <button
                  type="button"
                  className={`spell-picker-pick${isSelected ? ' spell-picker-pick-selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => toggleSelected(spell.id)}
                >
                  {spell.name}
                  <span className="spell-picker-school">
                    {' '}
                    · {spell.school} · Lvl {spell.levels[classId] ?? 0}
                  </span>
                </button>
                <button
                  type="button"
                  className="spell-picker-toggle"
                  aria-expanded={expanded}
                  onClick={() => toggleExpanded(spell.id)}
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
            </div>
            {expanded && <SpellDetails spell={spell}/>}
          </li>
          );
        })}
      </ul>

            <div className="form-actions">
        <button type="button" className="button-primary" onClick={() => onCast(learnedSpells.find(ls => ls.spellId === selected)!)}>
          {selectedSpellName ? `Cast ${selectedSpellName}` : 'Select a Spell'}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
