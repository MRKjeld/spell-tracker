import type { AbilityId } from '../data/classes';
import { CLASS_LABELS } from '../data/classes';
import { abilityModifier } from '../data/bonusSpells';
import { getTotalBAB, getTotalLevel } from './classLevels';
import type { Character, Modifier } from '../state/types';

const SYSTEM_MODIFIER_PREFIX = 'system-';

const ABILITY_MOD_LABELS: Record<AbilityId, string> = {
  str: 'Str Mod',
  dex: 'Dex Mod',
  con: 'Con Mod',
  int: 'Int Mod',
  wis: 'Wis Mod',
  cha: 'Cha Mod',
};

export function isSystemModifierId(id: string): boolean {
  return id.startsWith(SYSTEM_MODIFIER_PREFIX);
}

/**
 * Modifiers that always exist for every character, derived live from the
 * character sheet (level and ability scores) instead of stored data — they
 * can't be created, edited, or removed, and stay in sync automatically as
 * the sheet changes.
 */
export function getSystemModifiers(character: Pick<Character, 'classLevels' | 'abilityScores'>): Modifier[] {
  const abilityMods = (Object.keys(ABILITY_MOD_LABELS) as AbilityId[]).map((abilityId) => ({
    id: `${SYSTEM_MODIFIER_PREFIX}${abilityId}-mod`,
    name: ABILITY_MOD_LABELS[abilityId],
    value: abilityModifier(character.abilityScores[abilityId]),
    circumstantial: false,
  }));

  const totalLevel = getTotalLevel(character.classLevels);
  // Per-class-level modifiers (e.g. "Rogue Level") let a multiclass
  // character's Calculations key off one specific class's levels -- e.g.
  // Sneak Attack dice, which scale with Rogue levels, not total level.
  const perClassLevelMods = character.classLevels.map((cl) => ({
    id: `${SYSTEM_MODIFIER_PREFIX}level-${cl.classId}`,
    name: `${CLASS_LABELS[cl.classId]} Level`,
    value: cl.level,
    circumstantial: false,
  }));

  return [
    { id: `${SYSTEM_MODIFIER_PREFIX}level`, name: 'Level', value: totalLevel, circumstantial: false },
    { id: `${SYSTEM_MODIFIER_PREFIX}class-level`, name: 'Class Level', value: totalLevel, circumstantial: false },
    { id: `${SYSTEM_MODIFIER_PREFIX}bab`, name: 'BAB', value: getTotalBAB(character.classLevels), circumstantial: false },
    ...perClassLevelMods,
    ...abilityMods,
  ];
}
