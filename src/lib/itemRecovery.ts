import type { Item as ItemType, ItemUsePeriod } from '../state/types';

export function defaultUsesRemaining(usePeriod: ItemUsePeriod, maxUses: number): number {
  return usePeriod === 'unlimited' ? 0 : maxUses;
}

// Whether an item's uses should be recovered given the current time, as part
// of the character's Rest action. 'rest' and 'day' always recover on Rest
// (this tracker has no separate short-rest/long-rest distinction). 'week'
// and 'month' only auto-recover once that much real-world time has actually
// passed since the last reset, so resting twice in one day doesn't refill a
// weekly item early.
export function shouldRecoverOnRest(item: Pick<ItemType, 'usePeriod' | 'lastReset'>, now: Date): boolean {
  switch (item.usePeriod) {
    case 'unlimited':
      return false;
    case 'rest':
    case 'day':
      return true;
    case 'week': {
      const last = new Date(item.lastReset);
      return now.getTime() - last.getTime() >= 7 * 24 * 60 * 60 * 1000;
    }
    case 'month': {
      const last = new Date(item.lastReset);
      return now.getFullYear() !== last.getFullYear() || now.getMonth() !== last.getMonth();
    }
  }
}

export function recoverItemsOnRest(items: ItemType[], now: Date): ItemType[] {
  return items.map((item) =>
    shouldRecoverOnRest(item, now)
      ? { ...item, usesRemaining: item.maxUses, lastReset: now.toISOString() }
      : item,
  );
}
