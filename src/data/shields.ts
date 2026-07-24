import rawShields from './shields.generated.json';

export interface ShieldItemEntry {
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
  shieldType: string | null;
}

const SHIELD_ITEMS = rawShields as ShieldItemEntry[];

const byId = new Map<string, ShieldItemEntry>();
for (const item of SHIELD_ITEMS) {
  byId.set(item.id, item);
}

export function getShieldItemById(id: string): ShieldItemEntry | undefined {
  return byId.get(id);
}

export function getAllShieldItems(): ShieldItemEntry[] {
  return SHIELD_ITEMS;
}

export function searchShieldItems(query: string, includeDescription = false): ShieldItemEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return SHIELD_ITEMS;
  return SHIELD_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}
