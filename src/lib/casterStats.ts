import type { AbilityId, ClassId } from '../data/classes';
import { MAX_SPELL_LEVEL } from '../data/classes';
import { abilityModifier } from '../data/bonusSpells';

export interface CasterStats {
  casterLevel: number;
  castingAbilityModifier: number;
  concentrationCheck: number;
  spellcraftCheck: number;
  spellDCsByLevel: { spellLevel: number; dc: number }[];
  rangeCloseFt: number;
  rangeMediumFt: number;
  rangeLongFt: number;
}

/**
 * PF1E caster level equals character level for every class this tracker
 * supports (no multiclass/prestige-class caster-level stacking here), so
 * `level` doubles as caster level for range/concentration/DC purposes.
 */
export function computeCasterStats(
  classId: ClassId,
  level: number,
  abilityScores: Record<AbilityId, number>,
  castingAbility: AbilityId,
  spellcraft: number,
): CasterStats {
  const casterLevel = level;
  const castingAbilityModifier = abilityModifier(abilityScores[castingAbility]);
  const maxSpellLevel = MAX_SPELL_LEVEL[classId];

  const spellDCsByLevel = [];
  for (let spellLevel = 0; spellLevel <= maxSpellLevel; spellLevel++) {
    spellDCsByLevel.push({ spellLevel, dc: 10 + castingAbilityModifier + spellLevel });
  }

  return {
    casterLevel,
    castingAbilityModifier,
    concentrationCheck: casterLevel + castingAbilityModifier,
    spellcraftCheck: spellcraft,
    spellDCsByLevel,
    rangeCloseFt: 25 + 5 * Math.floor(casterLevel / 2),
    rangeMediumFt: 100 + 10 * casterLevel,
    rangeLongFt: 400 + 40 * casterLevel,
  };
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
