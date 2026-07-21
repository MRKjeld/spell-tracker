import type { AbilityId, ClassId } from '../data/classes';
import { CASTING_ABILITY, START_LEVEL } from '../data/classes';
import { SPELLS_PER_DAY } from '../data/spellsPerDay';
import { abilityModifier, bonusSpellsForLevel } from '../data/bonusSpells';
import type { ExtraSlotPool } from '../state/types';

const SPELL_LEVEL_COUNT = 10; // spell levels 0-9

export function getBaseSlots(classId: ClassId, level: number): number[] {
  if (level < START_LEVEL[classId]) {
    return new Array(SPELL_LEVEL_COUNT).fill(0);
  }
  const table = SPELLS_PER_DAY[classId];
  const row = table[level - 1];
  if (!row) {
    throw new Error(`No spells-per-day row for ${classId} at level ${level}`);
  }
  return row;
}

export function getBonusSlots(
  classId: ClassId,
  level: number,
  abilityScores: Record<AbilityId, number>,
): number[] {
  const base = getBaseSlots(classId, level);
  const ability = CASTING_ABILITY[classId];
  const modifier = abilityModifier(abilityScores[ability]);
  return base.map((baseCount, spellLevel) => (baseCount > 0 ? bonusSpellsForLevel(modifier, spellLevel) : 0));
}

export type SlotOrigin = 'base' | 'bonus' | 'pool';

export interface SlotInstance {
  id: string;
  origin: SlotOrigin;
  poolId?: string;
  poolName?: string;
}

export interface SpellLevelSlots {
  spellLevel: number;
  baseCount: number;
  bonusCount: number;
  poolCounts: { poolId: string; poolName: string; count: number }[];
  totalCount: number;
  instances: SlotInstance[];
}

export function computeSlots(
  classId: ClassId,
  level: number,
  abilityScores: Record<AbilityId, number>,
  extraPools: ExtraSlotPool[],
): SpellLevelSlots[] {
  const base = getBaseSlots(classId, level);
  const bonus = getBonusSlots(classId, level, abilityScores);

  const result: SpellLevelSlots[] = [];

  for (let spellLevel = 0; spellLevel < SPELL_LEVEL_COUNT; spellLevel++) {
    const instances: SlotInstance[] = [];

    for (let i = 0; i < base[spellLevel]; i++) {
      instances.push({ id: `base-${spellLevel}-${i}`, origin: 'base' });
    }
    for (let i = 0; i < bonus[spellLevel]; i++) {
      instances.push({ id: `bonus-${spellLevel}-${i}`, origin: 'bonus' });
    }

    const poolsAtThisLevel = extraPools.filter((pool) => pool.spellLevel === spellLevel);
    const poolCounts: SpellLevelSlots['poolCounts'] = [];
    for (const pool of poolsAtThisLevel) {
      for (let i = 0; i < pool.count; i++) {
        instances.push({
          id: `pool-${pool.id}-${i}`,
          origin: 'pool',
          poolId: pool.id,
          poolName: pool.name,
        });
      }
      poolCounts.push({ poolId: pool.id, poolName: pool.name, count: pool.count });
    }

    const poolTotal = poolCounts.reduce((sum, p) => sum + p.count, 0);

    result.push({
      spellLevel,
      baseCount: base[spellLevel],
      bonusCount: bonus[spellLevel],
      poolCounts,
      totalCount: base[spellLevel] + bonus[spellLevel] + poolTotal,
      instances,
    });
  }

  return result;
}

/**
 * Drops fills that reference slot-instance ids no longer produced by
 * computeSlots (e.g. after leveling down or shrinking/removing a pool),
 * so a character's slotFills map never accumulates orphaned entries.
 */
export function pruneOrphanedFills(
  slotFills: Record<string, unknown>,
  levelSlots: SpellLevelSlots[],
): Record<string, unknown> {
  const validIds = new Set(levelSlots.flatMap((ls) => ls.instances.map((i) => i.id)));
  const pruned: Record<string, unknown> = {};
  for (const [id, fill] of Object.entries(slotFills)) {
    if (validIds.has(id)) pruned[id] = fill;
  }
  return pruned;
}
