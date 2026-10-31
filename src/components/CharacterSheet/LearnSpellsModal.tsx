import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { CASTER_CLASS_IDS, CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { getAllSpellsFor, SCHOOL_LABELS, searchSpells, spellMatchesQuery } from '../../data/spells';
import type { SpellEntry } from '../../data/spells';
import { SchoolBadge } from './SchoolBadge';
import { SpellDetails } from './SpellDetails';

interface LearnSpellsModalProps {
  classId: ClassId;
  learnedSpellIds: string[];
  // `levelBySpellId` holds the spell level shown in the picker for every
  // spell selected during this session, so spells browsed from another
  // class's list are stored at the level they were listed at.
  onConfirm: (selectedSpellIds: string[], levelBySpellId: Record<string, number>) => void;
  onClose: () => void;
}

const SCHOOL_KEYS = Object.keys(SCHOOL_LABELS);
const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Multi-select variant of the spell picker used by the "+ Learn" button:
// opens with already-learned spells pre-selected/highlighted, and tapping
// toggles selection in place rather than picking-and-closing. Confirming
// diffs the selection against learnedSpellIds so both newly picked and
// deselected spells are applied in one action. The class filter starts on
// `classId` (the tab's own class) but can be widened to browse other lists.
export function LearnSpellsModal({ classId, learnedSpellIds, onConfirm, onClose }: LearnSpellsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(learnedSpellIds));
  const [levelBySpellId, setLevelBySpellId] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<ClassId | 'all'>(classId);
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Level shown for a spell: in the filtered class, else the tab's class,
  // else the first class that lists it (only reachable under "All Classes").
  function levelFor(spell: SpellEntry): number {
    if (classFilter !== 'all') return spell.levels[classFilter] ?? 0;
    return spell.levels[classId] ?? Object.values(spell.levels)[0] ?? 0;
  }

  const spells = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const base = classFilter === 'all' ? searchSpells('') : getAllSpellsFor(classFilter);
    const level = (spell: SpellEntry) =>
      classFilter !== 'all' ? (spell.levels[classFilter] ?? 0) : (spell.levels[classId] ?? Object.values(spell.levels)[0] ?? 0);
    const bySchoolAndLevel = base
      .filter((s) => (schoolFilter ? s.school === schoolFilter : true))
      .filter((s) => (levelFilter === null ? true : level(s) === levelFilter));
    const byLevelThenName = (a: SpellEntry, b: SpellEntry) =>
      level(a) - level(b) || a.name.localeCompare(b.name);

    if (!normalized) return bySchoolAndLevel.sort(byLevelThenName);

    // Two passes: spells with the query in their name come first, then spells
    // that only mention it in the description (never listed twice).
    const nameMatches = bySchoolAndLevel.filter((s) => spellMatchesQuery(s, normalized, false));
    const nameMatchIds = new Set(nameMatches.map((s) => s.id));
    const descriptionMatches = bySchoolAndLevel.filter(
      (s) => !nameMatchIds.has(s.id) && spellMatchesQuery(s, normalized, true),
    );
    return [...nameMatches.sort(byLevelThenName), ...descriptionMatches.sort(byLevelThenName)];
  }, [classId, classFilter, query, schoolFilter, levelFilter]);

  function toggleSelected(spell: SpellEntry) {
    const isSelecting = !selected.has(spell.id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(spell.id)) next.delete(spell.id);
      else next.add(spell.id);
      return next;
    });
    if (isSelecting) setLevelBySpellId((prev) => ({ ...prev, [spell.id]: levelFor(spell) }));
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
        placeholder="Search names, then descriptions..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="spell-picker-search"
        autoFocus
      />

      <div className="spell-picker-filters">
        <label className="spell-picker-class-filter">
          Class
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value as ClassId | 'all')}>
            <option value="all">All Classes</option>
            {CASTER_CLASS_IDS.map((id) => (
              <option key={id} value={id}>
                {CLASS_LABELS[id]}
              </option>
            ))}
          </select>
        </label>

        <label className="spell-picker-class-filter">
          Level
          <select
            value={levelFilter ?? ''}
            onChange={(e) => setLevelFilter(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">All Levels</option>
            {SPELL_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </label>

        <label className="spell-picker-class-filter">
          School
          <select value={schoolFilter ?? ''} onChange={(e) => setSchoolFilter(e.target.value || null)}>
            <option value="">All Schools</option>
            {SCHOOL_KEYS.map((school) => (
              <option key={school} value={school}>
                {SCHOOL_LABELS[school]}
              </option>
            ))}
          </select>
        </label>
      </div>

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
                  onClick={() => toggleSelected(spell)}
                >
                  {spell.name}{' '}
                  <SchoolBadge school={spell.school} />
                  <span className="spell-picker-school"> · Lvl {levelFor(spell)}</span>
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
              {expanded && <SpellDetails spell={spell} themed tinted />}
            </li>
          );
        })}
      </ul>

      <div className="form-actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => onConfirm(Array.from(selected), levelBySpellId)}
        >
          Confirm ({selected.size})
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
