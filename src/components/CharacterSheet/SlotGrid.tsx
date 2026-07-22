import type { LevellessPoolSlots, SpellLevelSlots } from '../../lib/slotMath';
import type { Character } from '../../state/types';
import type { PoolColorId } from '../../data/poolColors';
import { POOL_COLOR_HEX, POOL_COLOR_TEXT } from '../../data/poolColors';
import { SlotChip } from './SlotChip';

interface SlotGridProps {
  character: Character;
  levelSlots: SpellLevelSlots[];
  levellessPools: LevellessPoolSlots[];
  onSlotClick: (spellLevel: number | null, slotInstanceId: string, poolName?: string) => void;
  onRemovePool: (poolId: string) => void;
}

function poolTagStyle(color: PoolColorId | undefined) {
  if (!color) return undefined;
  return { backgroundColor: POOL_COLOR_HEX[color], color: POOL_COLOR_TEXT[color] };
}

export function SlotGrid({ character, levelSlots, levellessPools, onSlotClick, onRemovePool }: SlotGridProps) {
  const visibleLevels = levelSlots.filter((ls) => ls.totalCount > 0);

  if (visibleLevels.length === 0 && levellessPools.length === 0) {
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
              <span key={p.poolId} className="slot-grid-pool-tag" style={poolTagStyle(p.color)}>
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

      {levellessPools.map((pool) => (
        <div key={pool.poolName} className="slot-grid-row">
          <div className="slot-grid-row-header">
            <h3>{pool.poolName}</h3>
            <span className="slot-grid-row-summary">
              {pool.count} slot{pool.count === 1 ? '' : 's'}
            </span>
            <span className="slot-grid-pool-tag" style={poolTagStyle(pool.color)}>
              No level
              <button
                type="button"
                onClick={() => pool.poolIds.forEach(onRemovePool)}
                title={`Remove ${pool.poolName}`}
              >
                ×
              </button>
            </span>
          </div>
          <div className="slot-grid-chips">
            {pool.instances.map((instance) => (
              <SlotChip
                key={instance.id}
                instance={instance}
                fill={character.slotFills[instance.id]}
                characterClassId={character.classId}
                onClick={() => onSlotClick(null, instance.id, pool.poolName)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
