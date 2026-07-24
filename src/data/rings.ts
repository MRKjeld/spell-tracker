import rawRings from './rings.generated.json';

export interface RingItemEntry {
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
}

const RING_ITEMS = rawRings as RingItemEntry[];

const byId = new Map<string, RingItemEntry>();
for (const item of RING_ITEMS) {
  byId.set(item.id, item);
}

export function getRingItemById(id: string): RingItemEntry | undefined {
  return byId.get(id);
}

export function getAllRingItems(): RingItemEntry[] {
  return RING_ITEMS;
}

export function searchRingItems(query: string, includeDescription = false): RingItemEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return RING_ITEMS;
  return RING_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}
