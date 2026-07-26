import type { LearnedSpell } from '../../state/types';

interface KnownSpellsSectionProps {
  learnedSpells: LearnedSpell[];
  onUnlearn: (learnedSpellId: string) => void;
}

// Arcane-type casters (see CASTER_TYPE in data/classes.ts) draw their daily
// preparations from a personal list of spells they've Learned via the
// "+ Learn" button, rather than their entire class list -- this is that
// list. Divine casters have no equivalent section since they prepare freely
// from the full list.
export function KnownSpellsSection({ learnedSpells, onUnlearn }: KnownSpellsSectionProps) {
  const sorted = [...learnedSpells].sort((a, b) => a.spellLevel - b.spellLevel || a.spellName.localeCompare(b.spellName));

  return (
    <div className="slot-grid-row known-spells-section">
      <div className="slot-grid-row-header">
        <h3>Known Spells</h3>
        <span className="slot-grid-row-summary">
          {learnedSpells.length} learned
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="equipment-empty">No spells learned yet. Learn adds a spell to this list so it can be prepared.</p>
      ) : (
        <div className="slot-grid-chips">
          {sorted.map((spell) => (
            <span key={spell.id} className="slot-grid-pool-tag">
              Lvl {spell.spellLevel} · {spell.spellName}
              <button type="button" onClick={() => onUnlearn(spell.id)} title={`Unlearn ${spell.spellName}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
