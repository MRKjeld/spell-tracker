import { describe, expect, it } from 'vitest';
import { getBaseSlots, getBonusSlots, computeSlots, pruneOrphanedFills } from './slotMath';
import { CLASS_IDS, MAX_SPELL_LEVEL, START_LEVEL } from '../data/classes';

const NEUTRAL_SCORES = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

describe('getBaseSlots', () => {
  it('matches the SRD wizard level 1 row', () => {
    expect(getBaseSlots('wizard', 1)).toEqual([3, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('matches the SRD wizard level 20 row (all 4s)', () => {
    expect(getBaseSlots('wizard', 20)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it('is all-zero before a late-start class\'s start level', () => {
    expect(getBaseSlots('paladin', 1)).toEqual(new Array(10).fill(0));
    expect(getBaseSlots('paladin', 2)).toEqual(new Array(10).fill(0));
    expect(getBaseSlots('paladin', 3)).toEqual(new Array(10).fill(0));
  });

  it('bard level 1 has no 0-level column (at-will, represented as 0)', () => {
    expect(getBaseSlots('bard', 1)[0]).toBe(0);
    expect(getBaseSlots('bard', 1)[1]).toBe(1);
  });
});

describe('bonus spells', () => {
  it('are suppressed at a spell level with zero base slots', () => {
    // Level 1 wizard has 0 base 2nd-level slots even with a huge Int score.
    const bonus = getBonusSlots('wizard', 1, { ...NEUTRAL_SCORES, int: 20 });
    expect(bonus[2]).toBe(0);
  });

  it('18 Int grants +1 bonus at spell levels 1-4 for a high enough level wizard', () => {
    const bonus = getBonusSlots('wizard', 20, { ...NEUTRAL_SCORES, int: 18 });
    expect(bonus[1]).toBe(1);
    expect(bonus[2]).toBe(1);
    expect(bonus[3]).toBe(1);
    expect(bonus[4]).toBe(1);
    expect(bonus[5]).toBe(0);
  });

  it('20 Int grants +1 bonus at spell levels 1-5', () => {
    const bonus = getBonusSlots('wizard', 20, { ...NEUTRAL_SCORES, int: 20 });
    expect(bonus[5]).toBe(1);
    expect(bonus[6]).toBe(0);
  });

  it('never grants a bonus 0-level spell', () => {
    const bonus = getBonusSlots('wizard', 20, { ...NEUTRAL_SCORES, int: 30 });
    expect(bonus[0]).toBe(0);
  });
});

describe('computeSlots', () => {
  it('totals base + bonus + pool counts, and instances match totalCount', () => {
    const pools = [{ id: 'p1', name: 'Domain', spellLevel: 1, count: 1 }];
    const { levelSlots } = computeSlots('wizard', 5, { ...NEUTRAL_SCORES, int: 18 }, pools);
    for (const ls of levelSlots) {
      expect(ls.instances.length).toBe(ls.totalCount);
      expect(ls.totalCount).toBe(
        ls.baseCount + ls.bonusCount + ls.poolCounts.reduce((s, p) => s + p.count, 0),
      );
    }
    const level1 = levelSlots.find((r) => r.spellLevel === 1)!;
    expect(level1.poolCounts).toEqual([{ poolId: 'p1', poolName: 'Domain', count: 1 }]);
  });

  it('a pool at a spell level beyond the class max still renders', () => {
    const pools = [{ id: 'p1', name: 'Weird Boon', spellLevel: 6, count: 2 }];
    const { levelSlots } = computeSlots('paladin', 4, NEUTRAL_SCORES, pools);
    const level6 = levelSlots.find((r) => r.spellLevel === 6)!;
    expect(level6.totalCount).toBe(2);
  });

  it('a level-less pool forms its own segment and is absent from levelSlots', () => {
    const pools = [{ id: 'p1', name: 'Drow Innate', spellLevel: null, count: 3 }];
    const { levelSlots, levellessPools } = computeSlots('wizard', 5, NEUTRAL_SCORES, pools);
    for (const ls of levelSlots) {
      expect(ls.poolCounts).toEqual([]);
    }
    expect(levellessPools).toEqual([
      {
        poolName: 'Drow Innate',
        poolIds: ['p1'],
        count: 3,
        instances: [
          { id: 'pool-p1-0', origin: 'pool', poolId: 'p1', poolName: 'Drow Innate' },
          { id: 'pool-p1-1', origin: 'pool', poolId: 'p1', poolName: 'Drow Innate' },
          { id: 'pool-p1-2', origin: 'pool', poolId: 'p1', poolName: 'Drow Innate' },
        ],
      },
    ]);
  });

  it('level-less pools with matching names merge into one segment; different names stay separate', () => {
    const pools = [
      { id: 'p1', name: 'Drow', spellLevel: null, count: 1 },
      { id: 'p2', name: 'Drow Innate', spellLevel: null, count: 1 },
      { id: 'p3', name: 'Drow', spellLevel: null, count: 2 },
    ];
    const { levellessPools } = computeSlots('wizard', 5, NEUTRAL_SCORES, pools);
    expect(levellessPools).toHaveLength(2);

    const drow = levellessPools.find((p) => p.poolName === 'Drow')!;
    expect(drow.poolIds).toEqual(['p1', 'p3']);
    expect(drow.count).toBe(3);
    expect(drow.instances.map((i) => i.id)).toEqual(['pool-p1-0', 'pool-p3-0', 'pool-p3-1']);

    const drowInnate = levellessPools.find((p) => p.poolName === 'Drow Innate')!;
    expect(drowInnate.poolIds).toEqual(['p2']);
    expect(drowInnate.count).toBe(1);
  });

  it('invariant sweep: base counts are monotonic non-decreasing per spell level as character level increases, and respect MAX_SPELL_LEVEL / START_LEVEL', () => {
    for (const classId of CLASS_IDS) {
      let prevRow = new Array(10).fill(0);
      for (let level = 1; level <= 20; level++) {
        const row = getBaseSlots(classId, level);
        expect(row.length).toBe(10);

        for (let spellLevel = 0; spellLevel < 10; spellLevel++) {
          expect(row[spellLevel]).toBeGreaterThanOrEqual(prevRow[spellLevel]);

          if (spellLevel > MAX_SPELL_LEVEL[classId]) {
            expect(row[spellLevel]).toBe(0);
          }
          if (level < START_LEVEL[classId]) {
            expect(row[spellLevel]).toBe(0);
          }
        }
        prevRow = row;
      }
    }
  });
});

describe('pruneOrphanedFills', () => {
  it('drops fills whose slot instance no longer exists', () => {
    const computed = computeSlots('wizard', 1, NEUTRAL_SCORES, []);
    const fills = {
      'base-0-0': { spellId: 'a', spellName: 'A', sourceClassId: 'wizard' },
      'base-9-0': { spellId: 'b', spellName: 'B', sourceClassId: 'wizard' }, // no 9th-level slots at level 1
    };
    const pruned = pruneOrphanedFills(fills, computed);
    expect(Object.keys(pruned)).toEqual(['base-0-0']);
  });

  it('keeps fills belonging to a level-less pool', () => {
    const pools = [{ id: 'p1', name: 'Drow Innate', spellLevel: null, count: 1 }];
    const computed = computeSlots('wizard', 1, NEUTRAL_SCORES, pools);
    const fills = {
      'pool-p1-0': { spellId: 'a', spellName: 'A', sourceClassId: 'wizard' },
    };
    const pruned = pruneOrphanedFills(fills, computed);
    expect(Object.keys(pruned)).toEqual(['pool-p1-0']);
  });
});
