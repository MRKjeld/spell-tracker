export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * PF1E's universal "bonus spells per day from a high ability score" table,
 * expressed as a closed-form formula rather than a lookup table: a caster
 * gets +1 bonus spell of a given spell level once their ability modifier
 * is at least that spell level, plus one more for every 9 additional points
 * of modifier (mirrors the SRD table's staircase pattern out to score 30+).
 */
export function bonusSpellsForLevel(modifier: number, spellLevel: number): number {
  if (spellLevel <= 0) return 0;
  if (modifier < spellLevel) return 0;
  return 1 + Math.floor((modifier - spellLevel) / 9);
}
