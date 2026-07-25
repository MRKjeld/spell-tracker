import type { AbilityId } from '../data/classes';
import { abilityModifier } from '../data/bonusSpells';
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
export function getSystemModifiers(character: Pick<Character, 'level' | 'abilityScores'>): Modifier[] {
  const abilityMods = (Object.keys(ABILITY_MOD_LABELS) as AbilityId[]).map((abilityId) => ({
    id: `${SYSTEM_MODIFIER_PREFIX}${abilityId}-mod`,
    name: ABILITY_MOD_LABELS[abilityId],
    value: abilityModifier(character.abilityScores[abilityId]),
  }));

  return [
    { id: `${SYSTEM_MODIFIER_PREFIX}level`, name: 'Level', value: character.level },
    { id: `${SYSTEM_MODIFIER_PREFIX}class-level`, name: 'Class Level', value: character.level },
    ...abilityMods,
  ];
}
