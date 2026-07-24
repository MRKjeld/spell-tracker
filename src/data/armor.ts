import rawArmor from './armor.generated.json';

export interface ArmorItemEntry {
  id: string;
  name: string;
  slot: string;
  price: string;
  aura: string;
  cl: string;
  weight: string;
  description: string;
  construction: { requirements: string; cost: string } | null;
  uses: { quantity: number; per: string; action: string | null } | null;
  enhancementBonus: number | null;
  armorType: string | null;
}

const ARMOR_ITEMS = rawArmor as ArmorItemEntry[];

const byId = new Map<string, ArmorItemEntry>();
for (const item of ARMOR_ITEMS) {
  byId.set(item.id, item);
}

export function getArmorItemById(id: string): ArmorItemEntry | undefined {
  return byId.get(id);
}

export function getAllArmorItems(): ArmorItemEntry[] {
  return ARMOR_ITEMS;
}

export function searchArmorItems(query: string, includeDescription = false): ArmorItemEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return ARMOR_ITEMS;
  return ARMOR_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}
