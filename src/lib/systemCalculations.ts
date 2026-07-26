import type { Calculation } from '../state/types';

const SYSTEM_CALCULATION_PREFIX = 'system-calc-';

export function isSystemCalculationId(id: string): boolean {
  return id.startsWith(SYSTEM_CALCULATION_PREFIX);
}

/**
 * Calculations that always exist for every character, built from the same
 * system modifiers getSystemModifiers already exposes (BAB, Str Mod, Dex
 * Mod) — they can't be created, edited, or removed, same as System
 * Modifiers themselves.
 */
export function getSystemCalculations(): Calculation[] {
  return [
    {
      id: `${SYSTEM_CALCULATION_PREFIX}melee-attack`,
      name: 'Melee Attack',
      diceRoll: '1d20',
      modifierIds: ['system-bab', 'system-str-mod'],
    },
    {
      id: `${SYSTEM_CALCULATION_PREFIX}ranged-attack`,
      name: 'Ranged Attack',
      diceRoll: '1d20',
      modifierIds: ['system-bab', 'system-dex-mod'],
    },
    {
      id: `${SYSTEM_CALCULATION_PREFIX}melee-attack-finesse`,
      name: 'Melee Attack (Finesse)',
      diceRoll: '1d20',
      modifierIds: ['system-bab', 'system-dex-mod'],
    },
  ];
}
