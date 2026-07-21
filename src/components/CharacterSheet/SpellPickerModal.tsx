import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { CLASS_IDS, CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { getSpellsFor, humanizeTag, searchSpells, spellMatchesQuery, SCHOOL_LABELS } from '../../data/spells';
import type { SpellEntry } from '../../data/spells';

interface SpellPickerModalProps {
  defaultClassId: ClassId;
  spellLevel: number;
  onPick: (spellId: string, spellName: string, sourceClassId: ClassId) => void;
  onClose: () => void;
}

function formatLevels(spell: SpellEntry): string {
  return Object.entries(spell.levels)
    .map(([classId, level]) => `${CLASS_LABELS[classId as ClassId]} ${level}`)
    .join(', ');
}

function SpellDetails({ spell }: { spell: SpellEntry }) {
  const schoolLine = [
    SCHOOL_LABELS[spell.school] ?? spell.school,
    ...spell.subschool.map(humanizeTag),
  ].join(', ');
  const descriptorLine = spell.descriptors.map(humanizeTag).join(', ');

  return (
    <div className="spell-picker-details">
      <p>
        <strong>School:</strong> {schoolLine}
        {descriptorLine && ` (${descriptorLine})`}
      </p>
      <p>
        <strong>Level:</strong> {formatLevels(spell)}
      </p>
      <p>
        <strong>Casting Time:</strong> {spell.castingTime}
      </p>
      <p>
        <strong>Components:</strong> {spell.components}
      </p>
      <p>
        <strong>Range:</strong> {spell.range}
      </p>
      {spell.effect && (
        <p>
          <strong>Effect:</strong> {spell.effect}
        </p>
      )}
      <p>
        <strong>Duration:</strong> {spell.duration}
      </p>
      <p>
        <strong>Saving Throw:</strong> {spell.savingThrow}
      </p>
      <p>
        <strong>Spell Resistance:</strong> {spell.spellResistance}
      </p>
      <p className="spell-picker-description">{spell.description || 'No description available.'}</p>
    </div>
  );
}

export function SpellPickerModal({ defaultClassId, spellLevel, onPick, onClose }: SpellPickerModalProps) {
  const [activeTab, setActiveTab] = useState<ClassId | 'all'>(defaultClassId);
  const [query, setQuery] = useState('');
  const [searchDescriptions, setSearchDescriptions] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const spells = useMemo(() => {
    if (activeTab === 'all') {
      return searchSpells(query, spellLevel, searchDescriptions);
    }
    const list = getSpellsFor(activeTab, spellLevel);
    if (!query.trim()) return list;
    const normalized = query.trim().toLowerCase();
    return list.filter((s) => spellMatchesQuery(s, normalized, searchDescriptions));
  }, [activeTab, query, spellLevel, searchDescriptions]);

  function toggleExpanded(spellId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spellId)) next.delete(spellId);
      else next.add(spellId);
      return next;
    });
  }

  return (
    <Modal title={`Fill Slot — Level ${spellLevel}`} onClose={onClose}>
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

      <div className="spell-picker-tabs">
        {CLASS_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`spell-picker-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {CLASS_LABELS[id]}
          </button>
        ))}
        <button
          type="button"
          className={`spell-picker-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Classes
        </button>
      </div>

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
                    const sourceClassId =
                      activeTab === 'all'
                        ? spell.levels[defaultClassId] !== undefined
                          ? defaultClassId
                          : (Object.keys(spell.levels)[0] as ClassId)
                        : activeTab;
                    onPick(spell.id, spell.name, sourceClassId);
                  }}
                >
                  {spell.name}
                  <span className="spell-picker-school"> — {spell.school}</span>
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
