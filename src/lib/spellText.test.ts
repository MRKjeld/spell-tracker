import { describe, expect, it } from 'vitest';
import { annotateSpellDuration, annotateSpellRange } from './spellText';

describe('annotateSpellRange', () => {
  it('appends the computed distance after a Close range', () => {
    expect(annotateSpellRange('Close (25 ft. + 5 ft./2 levels)', 5)).toBe(
      'Close (25 ft. + 5 ft./2 levels) [35 ft.]',
    );
  });

  it('appends the computed distance after a Medium range', () => {
    expect(annotateSpellRange('Medium (100 ft. + 10 ft./level)', 5)).toBe(
      'Medium (100 ft. + 10 ft./level) [150 ft.]',
    );
  });

  it('appends the computed distance after a Long range', () => {
    expect(annotateSpellRange('Long (400 ft. + 40 ft./level)', 5)).toBe(
      'Long (400 ft. + 40 ft./level) [600 ft.]',
    );
  });

  it('annotates every named range in a compound string', () => {
    expect(
      annotateSpellRange('Close (25 ft. + 5 ft./2 levels) or long (400 ft. + 40 ft./level); see text', 5),
    ).toBe('Close (25 ft. + 5 ft./2 levels) [35 ft.] or long (400 ft. + 40 ft./level) [600 ft.]; see text');
  });

  it('leaves ranges with no Close/Medium/Long keyword untouched', () => {
    expect(annotateSpellRange('Touch', 5)).toBe('Touch');
    expect(annotateSpellRange('40 ft./level', 5)).toBe('40 ft./level');
  });
});

describe('annotateSpellDuration', () => {
  it('appends the caster level after a /level duration', () => {
    expect(annotateSpellDuration('1 minute/level', 5)).toBe('1 minute/level (5)');
  });

  it('appends the caster level after a /caster level duration', () => {
    expect(annotateSpellDuration('1 round/caster level', 5)).toBe('1 round/caster level (5)');
  });

  it('annotates every /level occurrence', () => {
    expect(annotateSpellDuration('1 round/level, up to 1 hour/level', 5)).toBe(
      '1 round/level (5), up to 1 hour/level (5)',
    );
  });

  it('leaves durations with no /level marker untouched', () => {
    expect(annotateSpellDuration('Instantaneous', 5)).toBe('Instantaneous');
  });
});
