import type { Item } from '../state/types';
import type { BodySlotId } from '../data/bodySlots';
import { isTwoHandedWeaponItemId } from '../data/weapons';

export function isTwoHandedWeaponItem(item: Item): boolean {
  return isTwoHandedWeaponItemId(item.weaponItemId);
}

// The full set of body slots an equipped item currently fills. Every item
// fills just its own equippedSlot, except a two-handed weapon, which is
// always anchored at 'mainHand' (see setEquippedSlot in characterStore) and
// also fills 'offhand'.
export function occupiedSlots(item: Item): BodySlotId[] {
  if (!item.equippedSlot) return [];
  if (item.equippedSlot === 'mainHand' && isTwoHandedWeaponItem(item)) return ['mainHand', 'offhand'];
  return [item.equippedSlot];
}

export function findItemForSlot(items: Item[], slot: BodySlotId): Item | undefined {
  return items.find((i) => occupiedSlots(i).includes(slot));
}
