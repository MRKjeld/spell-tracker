import rawBaseArmor from './baseArmor.generated.json';
import type { BodySlotId } from './bodySlots';

export type BaseArmorCategory = 'light' | 'medium' | 'heavy' | 'shield' | 'extra' | 'mod';

export interface BaseArmorItemEntry {
  id: string;
  name: string;
  category: BaseArmorCategory;
  source: string;
  description: string;
  cost: number | null;
  costRaw: string;
  weight: number | null;
  weightRaw: string;
  armorBonus: number | null;
  armorBonusRaw: string;
  maxDexBonus: number | null;
  maxDexBonusRaw: string;
  armorCheckPenalty: number | null;
  armorCheckPenaltyRaw: string;
  arcaneSpellFailureChance: number | null;
  speedAt30: string | null;
  speedAt20: string | null;
  speedRaw: string;
}

const BASE_ARMOR_ITEMS = rawBaseArmor as BaseArmorItemEntry[];

const byId = new Map<string, BaseArmorItemEntry>();
for (const item of BASE_ARMOR_ITEMS) {
  byId.set(item.id, item);
}

export function getBaseArmorItemById(id: string): BaseArmorItemEntry | undefined {
  return byId.get(id);
}

export function getAllBaseArmorItems(): BaseArmorItemEntry[] {
  return BASE_ARMOR_ITEMS;
}

export function getBaseArmorItemsByCategory(category: BaseArmorCategory): BaseArmorItemEntry[] {
  return BASE_ARMOR_ITEMS.filter((item) => item.category === category);
}

export function searchBaseArmorItems(query: string, includeDescription = false): BaseArmorItemEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return BASE_ARMOR_ITEMS;
  return BASE_ARMOR_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}

// Which base-armor categories a given body slot can be filled from: the
// 'armor' slot takes any worn armor, 'mainHand'/'offhand' take shields (per
// PF1e rules a shield is carried, not worn in its own slot). Every other slot
// returns [] -- those are filled from the wondrous item catalog instead.
const SLOT_CATEGORIES: Partial<Record<BodySlotId, BaseArmorCategory[]>> = {
  armor: ['light', 'medium', 'heavy'],
  mainHand: ['shield'],
  offhand: ['shield'],
};

export function getBaseArmorCategoriesForSlot(slot: BodySlotId): BaseArmorCategory[] {
  return SLOT_CATEGORIES[slot] ?? [];
}

export function getBaseArmorItemsForSlot(slot: BodySlotId): BaseArmorItemEntry[] {
  const categories = getBaseArmorCategoriesForSlot(slot);
  if (categories.length === 0) return [];
  const set = new Set(categories);
  return BASE_ARMOR_ITEMS.filter((item) => set.has(item.category));
}

export function searchBaseArmorItemsForSlot(slot: BodySlotId, query: string, includeDescription = false): BaseArmorItemEntry[] {
  const normalized = query.trim().toLowerCase();
  const list = getBaseArmorItemsForSlot(slot);
  if (!normalized) return list;
  return list.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}
