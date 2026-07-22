import type { AbilityId, ClassId } from '../data/classes';
import { CASTING_ABILITY, START_LEVEL } from '../data/classes';
import { SPELLS_PER_DAY } from '../data/spellsPerDay';
import { abilityModifier, bonusSpellsForLevel } from '../data/bonusSpells';
import type { ExtraSlotPool } from '../state/types';
import type { PoolColorId } from '../data/poolColors';

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
  poolColor?: PoolColorId;
}

export interface SpellLevelSlots {
  spellLevel: number;
  baseCount: number;
  bonusCount: number;
  poolCounts: { poolId: string; poolName: string; count: number; color?: PoolColorId }[];
  totalCount: number;
  instances: SlotInstance[];
}

export interface LevellessPoolSlots {
  poolName: string;
  poolIds: string[]; // every pool record contributing to this named segment
  count: number;
  instances: SlotInstance[];
  color?: PoolColorId;
}

export interface ComputedSlots {
  levelSlots: SpellLevelSlots[];
  levellessPools: LevellessPoolSlots[];
}

export function computeSlots(
  classId: ClassId,
  level: number,
  abilityScores: Record<AbilityId, number>,
  extraPools: ExtraSlotPool[],
): ComputedSlots {
  const base = getBaseSlots(classId, level);
  const bonus = getBonusSlots(classId, level, abilityScores);

  const levelSlots: SpellLevelSlots[] = [];

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
          poolColor: pool.color,
        });
      }
      poolCounts.push({ poolId: pool.id, poolName: pool.name, count: pool.count, color: pool.color });
    }

    const poolTotal = poolCounts.reduce((sum, p) => sum + p.count, 0);

    levelSlots.push({
      spellLevel,
      baseCount: base[spellLevel],
      bonusCount: bonus[spellLevel],
      poolCounts,
      totalCount: base[spellLevel] + bonus[spellLevel] + poolTotal,
      instances,
    });
  }

  // Level-less pools group into one segment per distinct name, so e.g. two
  // separate "Drow" additions merge together while "Drow" and "Drow Innate"
  // stay in their own segments.
  const levellessGroups = new Map<
    string,
    { poolIds: string[]; instances: SlotInstance[]; color?: PoolColorId }
  >();
  for (const pool of extraPools) {
    if (pool.spellLevel !== null) continue;
    const group = levellessGroups.get(pool.name) ?? { poolIds: [], instances: [] };
    group.poolIds.push(pool.id);
    for (let i = 0; i < pool.count; i++) {
      group.instances.push({
        id: `pool-${pool.id}-${i}`,
        origin: 'pool',
        poolId: pool.id,
        poolName: pool.name,
        poolColor: pool.color,
      });
    }
    if (pool.color) group.color = pool.color;
    levellessGroups.set(pool.name, group);
  }
  const levellessPools: LevellessPoolSlots[] = Array.from(levellessGroups.entries()).map(
    ([poolName, group]) => ({
      poolName,
      poolIds: group.poolIds,
      count: group.instances.length,
      instances: group.instances,
      color: group.color,
    }),
  );

  return { levelSlots, levellessPools };
}

/**
 * Drops fills that reference slot-instance ids no longer produced by
 * computeSlots (e.g. after leveling down or shrinking/removing a pool),
 * so a character's slotFills map never accumulates orphaned entries.
 */
export function pruneOrphanedFills(
  slotFills: Record<string, unknown>,
  computed: ComputedSlots,
): Record<string, unknown> {
  const validIds = new Set([
    ...computed.levelSlots.flatMap((ls) => ls.instances.map((i) => i.id)),
    ...computed.levellessPools.flatMap((p) => p.instances.map((i) => i.id)),
  ]);
  const pruned: Record<string, unknown> = {};
  for (const [id, fill] of Object.entries(slotFills)) {
    if (validIds.has(id)) pruned[id] = fill;
  }
  return pruned;
}
