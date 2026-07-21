import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { CLASS_IDS, CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { getSpellsFor, searchSpells } from '../../data/spells';

interface SpellPickerModalProps {
  defaultClassId: ClassId;
  spellLevel: number;
  onPick: (spellId: string, spellName: string, sourceClassId: ClassId) => void;
  onClose: () => void;
}

export function SpellPickerModal({ defaultClassId, spellLevel, onPick, onClose }: SpellPickerModalProps) {
  const [activeTab, setActiveTab] = useState<ClassId | 'all'>(defaultClassId);
  const [query, setQuery] = useState('');

  const spells = useMemo(() => {
    if (activeTab === 'all') {
      return searchSpells(query, spellLevel);
    }
    const list = getSpellsFor(activeTab, spellLevel);
    if (!query.trim()) return list;
    const normalized = query.trim().toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(normalized));
  }, [activeTab, query, spellLevel]);

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
        {spells.map((spell) => (
          <li key={spell.id}>
            <button
              type="button"
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
          </li>
        ))}
      </ul>
    </Modal>
  );
}
