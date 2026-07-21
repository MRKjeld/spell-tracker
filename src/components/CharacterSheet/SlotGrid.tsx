import type { SpellLevelSlots } from '../../lib/slotMath';
import type { Character } from '../../state/types';
import { SlotChip } from './SlotChip';

interface SlotGridProps {
  character: Character;
  levelSlots: SpellLevelSlots[];
  onSlotClick: (spellLevel: number, slotInstanceId: string) => void;
  onRemovePool: (poolId: string) => void;
}

export function SlotGrid({ character, levelSlots, onSlotClick, onRemovePool }: SlotGridProps) {
  const visibleLevels = levelSlots.filter((ls) => ls.totalCount > 0);

  if (visibleLevels.length === 0) {
    return <p>This character has no spell slots yet at their current level.</p>;
  }

  return (
    <div className="slot-grid">
      {visibleLevels.map((ls) => (
        <div key={ls.spellLevel} className="slot-grid-row">
          <div className="slot-grid-row-header">
            <h3>Level {ls.spellLevel}</h3>
            <span className="slot-grid-row-summary">
              {ls.totalCount} slot{ls.totalCount === 1 ? '' : 's'}
              {ls.bonusCount > 0 && ` (${ls.baseCount} base + ${ls.bonusCount} bonus)`}
            </span>
            {ls.poolCounts.map((p) => (
              <span key={p.poolId} className="slot-grid-pool-tag">
                {p.poolName} +{p.count}
                <button type="button" onClick={() => onRemovePool(p.poolId)} title={`Remove ${p.poolName}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="slot-grid-chips">
            {ls.instances.map((instance) => (
              <SlotChip
                key={instance.id}
                instance={instance}
                fill={character.slotFills[instance.id]}
                characterClassId={character.classId}
                onClick={() => onSlotClick(ls.spellLevel, instance.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
