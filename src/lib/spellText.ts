import { closeRangeFt, longRangeFt, mediumRangeFt } from './casterStats';

const RANGE_FORMULAS: Record<string, (casterLevel: number) => number> = {
  close: closeRangeFt,
  medium: mediumRangeFt,
  long: longRangeFt,
};

/** Appends the computed distance after every Close/Medium/Long clause, e.g. "Close (25 ft. + 5 ft./2 levels) [45 ft.]". */
export function annotateSpellRange(range: string, casterLevel: number): string {
  return range.replace(/\b(Close|Medium|Long)\b(\s*\([^)]*\))?/gi, (match, keyword: string) => {
    const ft = RANGE_FORMULAS[keyword.toLowerCase()](casterLevel);
    return `${match} [${ft} ft.]`;
  });
}

/** Appends the caster level after every "/level" or "/caster level" clause, e.g. "1 minute/level (5)". */
export function annotateSpellDuration(duration: string, casterLevel: number): string {
  return duration.replace(/\/\s*(caster\s+)?level\b/gi, (match) => `${match} (${casterLevel})`);
}
