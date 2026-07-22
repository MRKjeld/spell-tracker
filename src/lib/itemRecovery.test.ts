import { describe, expect, it } from 'vitest';
import { recoverItemsOnRest, shouldRecoverOnRest } from './itemRecovery';
import type { Item } from '../state/types';

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: 'item-1',
    name: 'Test Item',
    activation: 'Activate for an effect.',
    usePeriod: 'day',
    maxUses: 1,
    usesRemaining: 0,
    lastReset: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('shouldRecoverOnRest', () => {
  it('never recovers unlimited items (they have no charges to track)', () => {
    expect(shouldRecoverOnRest(makeItem({ usePeriod: 'unlimited' }), new Date('2026-01-01T12:00:00.000Z'))).toBe(
      false,
    );
  });

  it('always recovers rest/day items on rest', () => {
    const now = new Date('2026-01-01T00:00:01.000Z');
    expect(shouldRecoverOnRest(makeItem({ usePeriod: 'rest' }), now)).toBe(true);
    expect(shouldRecoverOnRest(makeItem({ usePeriod: 'day' }), now)).toBe(true);
  });

  it('does not recover a weekly item before 7 days have passed', () => {
    const now = new Date('2026-01-05T00:00:00.000Z');
    expect(shouldRecoverOnRest(makeItem({ usePeriod: 'week' }), now)).toBe(false);
  });

  it('recovers a weekly item once 7 days have passed', () => {
    const now = new Date('2026-01-08T00:00:00.000Z');
    expect(shouldRecoverOnRest(makeItem({ usePeriod: 'week' }), now)).toBe(true);
  });

  it('does not recover a monthly item within the same calendar month', () => {
    const now = new Date('2026-01-31T00:00:00.000Z');
    expect(shouldRecoverOnRest(makeItem({ usePeriod: 'month' }), now)).toBe(false);
  });

  it('recovers a monthly item once the calendar month changes', () => {
    const now = new Date('2026-02-01T00:00:00.000Z');
    expect(shouldRecoverOnRest(makeItem({ usePeriod: 'month' }), now)).toBe(true);
  });
});

describe('recoverItemsOnRest', () => {
  it('refills usesRemaining and bumps lastReset only for items that should recover', () => {
    const now = new Date('2026-01-02T00:00:00.000Z');
    const items = [
      makeItem({ id: 'a', usePeriod: 'day', maxUses: 3, usesRemaining: 0 }),
      makeItem({ id: 'b', usePeriod: 'week', maxUses: 2, usesRemaining: 0 }),
    ];
    const result = recoverItemsOnRest(items, now);
    expect(result[0]).toMatchObject({ usesRemaining: 3, lastReset: now.toISOString() });
    expect(result[1]).toMatchObject({ usesRemaining: 0, lastReset: '2026-01-01T00:00:00.000Z' });
  });
});
