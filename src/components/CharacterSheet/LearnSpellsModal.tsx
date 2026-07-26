import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { getAllSpellsFor } from '../../data/spells';
import { SpellDetails } from './SpellDetails';

interface LearnSpellsModalProps {
  classId: ClassId;
  learnedSpellIds: string[];
  onConfirm: (selectedSpellIds: string[]) => void;
  onClose: () => void;
}

// Multi-select variant of the spell picker used by the "+ Learn" button:
// the list is locked to `classId` (no cross-class browsing), opens with
// already-learned spells pre-selected/highlighted, and tapping toggles
// selection in place rather than picking-and-closing. Confirming diffs the
// selection against learnedSpellIds so both newly picked and deselected
// spells are applied in one action.
export function LearnSpellsModal({ classId, learnedSpellIds, onConfirm, onClose }: LearnSpellsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(learnedSpellIds));
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const spells = useMemo(() => {
    const sorted = [...getAllSpellsFor(classId)].sort(
      (a, b) => (a.levels[classId] ?? 0) - (b.levels[classId] ?? 0) || a.name.localeCompare(b.name),
    );
    const normalized = query.trim().toLowerCase();
    return normalized ? sorted.filter((s) => s.name.toLowerCase().includes(normalized)) : sorted;
  }, [classId, query]);

  function toggleSelected(spellId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(spellId)) next.delete(spellId);
      else next.add(spellId);
      return next;
    });
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
    <Modal title={`Learn: ${CLASS_LABELS[classId]} Spells`} onClose={onClose}>
      <input
        type="search"
        placeholder="Search spells..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="spell-picker-search"
        autoFocus
      />

      <ul className="spell-picker-list">
        {spells.length === 0 && <li className="spell-picker-empty">No spells found.</li>}
        {spells.map((spell) => {
          const isSelected = selected.has(spell.id);
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
                    · {spell.school} · Lvl {spell.levels[classId]}
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
              {expanded && <SpellDetails spell={spell} />}
            </li>
          );
        })}
      </ul>

      <div className="form-actions">
        <button type="button" className="button-primary" onClick={() => onConfirm(Array.from(selected))}>
          Confirm ({selected.size})
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
