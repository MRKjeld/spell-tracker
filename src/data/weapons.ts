import rawWeapons from './weapons.generated.json';

export interface WeaponItemEntry {
  id: string;
  name: string;
  source: string;
  description: string;
  cost: number | null;
  costRaw: string;
  weight: number | null;
  weightRaw: string;
  damage: Record<string, string | null> | null;
  critical: { threat: string; multiplier: string } | null;
  range: number | null;
  rangeRaw: string;
  type: string[];
  special: string[];
  category: string[];
  proficiency: string;
  weaponGroups: string[];
  misfire: string | null;
  capacity: string | null;
  crew: string | null;
  aim: string | null;
  load: string | null;
  speed: string | null;
}

const WEAPON_ITEMS = rawWeapons as WeaponItemEntry[];

const byId = new Map<string, WeaponItemEntry>();
for (const item of WEAPON_ITEMS) {
  byId.set(item.id, item);
}

export function getWeaponItemById(id: string): WeaponItemEntry | undefined {
  return byId.get(id);
}

export function getAllWeaponItems(): WeaponItemEntry[] {
  return WEAPON_ITEMS;
}

export function searchWeaponItems(query: string, includeDescription = false): WeaponItemEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return WEAPON_ITEMS;
  return WEAPON_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}
