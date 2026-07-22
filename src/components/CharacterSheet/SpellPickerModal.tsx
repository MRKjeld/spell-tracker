import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { CLASS_IDS, CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { getAllSpellsFor, getSpellsFor, searchSpells, spellMatchesQuery } from '../../data/spells';
import type { SpellEntry } from '../../data/spells';
import { SpellDetails } from './SpellDetails';

interface SpellPickerModalProps {
  defaultClassId: ClassId;
  spellLevel: number | null;
  poolName?: string;
  onPick: (spellId: string, spellName: string, sourceClassId: ClassId | null) => void;
  onClose: () => void;
}

function levelLabelFor(spell: SpellEntry, activeTab: ClassId | 'all', defaultClassId: ClassId): string {
  const classId = activeTab === 'all' ? (spell.levels[defaultClassId] !== undefined ? defaultClassId : (Object.keys(spell.levels)[0] as ClassId)) : activeTab;
  const level = spell.levels[classId];
  return level !== undefined ? `Lvl ${level}` : '';
}

export function SpellPickerModal({ defaultClassId, spellLevel, poolName, onPick, onClose }: SpellPickerModalProps) {
  const [activeTab, setActiveTab] = useState<ClassId | 'all'>(spellLevel === null ? 'all' : defaultClassId);
  const [query, setQuery] = useState('');
  const [searchDescriptions, setSearchDescriptions] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const spells = useMemo(() => {
    if (activeTab === 'all') {
      return searchSpells(query, spellLevel ?? undefined, searchDescriptions);
    }
    const list = spellLevel === null ? getAllSpellsFor(activeTab) : getSpellsFor(activeTab, spellLevel);
    if (!query.trim()) return list;
    const normalized = query.trim().toLowerCase();
    return list.filter((s) => spellMatchesQuery(s, normalized, searchDescriptions));
  }, [activeTab, query, spellLevel, searchDescriptions]);

  const title = spellLevel !== null ? `Fill Slot — Level ${spellLevel}` : `Fill Slot — ${poolName ?? 'No Level'}`;

  function toggleExpanded(spellId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spellId)) next.delete(spellId);
      else next.add(spellId);
      return next;
    });
  }

  return (
    <Modal title={title} onClose={onClose}>
      <input
        type="search"
        placeholder="Search spells..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="spell-picker-search"
        autoFocus
      />

      <div className="spell-picker-options">
        <label className="spell-picker-description-toggle">
          <input
            type="checkbox"
            checked={searchDescriptions}
            onChange={(e) => setSearchDescriptions(e.target.checked)}
          />
          Also search descriptions
        </label>
        <button
          type="button"
          className="spell-picker-show-all"
          aria-pressed={showAllDescriptions}
          onClick={() => setShowAllDescriptions((v) => !v)}
        >
          {showAllDescriptions ? 'Hide descriptions' : 'Show descriptions'}
        </button>
      </div>

      <label className="spell-picker-class-filter">
        Class
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as ClassId | 'all')}
        >
          <option value="all">All Classes</option>
          {CLASS_IDS.map((id) => (
            <option key={id} value={id}>
              {CLASS_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      <ul className="spell-picker-list">
        {spells.length === 0 && <li className="spell-picker-empty">No spells found.</li>}
        {spells.map((spell) => {
          const expanded = expandedIds.has(spell.id);
          return (
            <li key={spell.id}>
              <div className="spell-picker-row">
                <button
                  type="button"
                  className="spell-picker-pick"
                  onClick={() => {
                    const sourceClassId = activeTab === 'all' ? null : activeTab;
                    onPick(spell.id, spell.name, sourceClassId);
                  }}
                >
                  {spell.name}
                  <span className="spell-picker-school">
                    {' '}
                    — {spell.school}
                    {spellLevel === null && ` · ${levelLabelFor(spell, activeTab, defaultClassId)}`}
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
              {expanded ? (
                <SpellDetails spell={spell} />
              ) : (
                showAllDescriptions && (
                  <p className="spell-picker-description">{spell.description || 'No description available.'}</p>
                )
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
