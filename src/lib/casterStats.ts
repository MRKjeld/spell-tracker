import type { AbilityId } from '../data/classes';
import { abilityModifier } from '../data/bonusSpells';

export interface CasterStats {
  casterLevel: number;
  castingAbilityModifier: number;
  concentrationCheck: number;
  spellcraftCheck: number;
  baseSpellDC: number;
  rangeCloseFt: number;
  rangeMediumFt: number;
  rangeLongFt: number;
}

export function closeRangeFt(casterLevel: number): number {
  return 25 + 5 * Math.floor(casterLevel / 2);
}

export function mediumRangeFt(casterLevel: number): number {
  return 100 + 10 * casterLevel;
}

export function longRangeFt(casterLevel: number): number {
  return 400 + 40 * casterLevel;
}

/**
 * PF1E caster level equals character level for every class this tracker
 * supports (no multiclass/prestige-class caster-level stacking here), so
 * `level` doubles as caster level for range/concentration/DC purposes.
 */
export function computeCasterStats(
  level: number,
  abilityScores: Record<AbilityId, number>,
  castingAbility: AbilityId,
  spellcraft: number,
): CasterStats {
  const casterLevel = level;
  const castingAbilityModifier = abilityModifier(abilityScores[castingAbility]);

  return {
    casterLevel,
    castingAbilityModifier,
    concentrationCheck: casterLevel + castingAbilityModifier,
    spellcraftCheck: spellcraft,
    baseSpellDC: 10 + castingAbilityModifier,
    rangeCloseFt: closeRangeFt(casterLevel),
    rangeMediumFt: mediumRangeFt(casterLevel),
    rangeLongFt: longRangeFt(casterLevel),
  };
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

// The scraped savingThrow text is free-form ('', 'No', 'None', 'See text',
// 'Reflex negates', 'None or Will negates; see text', ...) so "not one of
// the no-save phrasings" isn't reliable -- instead check for an actual named
// save type, which is present whenever a DC is meaningful (including
// mixed cases like "None or Will negates; see text").
export function hasSavingThrow(savingThrow: string): boolean {
  return /\b(will|fortitude|reflex)\b/i.test(savingThrow);
}

export function computeSpellSaveDC(
  spellLevel: number,
  castingAbilityModifier: number,
  hasSpellFocus: boolean,
  hasGreaterSpellFocus: boolean,
): number {
  return 10 + spellLevel + castingAbilityModifier + (hasSpellFocus ? 1 : 0) + (hasGreaterSpellFocus ? 1 : 0);
}
