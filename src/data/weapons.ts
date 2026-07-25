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

// `category` entries that mean the weapon isn't something held in a hand slot
// at all (ammunition, siege-engine parts/mods, or a siege engine itself).
const NON_HAND_CATEGORIES = new Set(['Ammunition', 'Modification', 'Explosive', 'Siege']);
function isSiegeMounted(category: string): boolean {
  return category.startsWith('Direct-Fire') || category.startsWith('Indirect-Fire') || category === 'Close Assault';
}

// Whether this weapon can occupy the mainHand/offhand slots at all. Covers
// Light/One-Handed/Two-Handed melee weapons as well as Ranged weapons (bows,
// crossbows, slings, thrown weapons) -- the source data doesn't tag Ranged
// weapons with a handedness, so they're treated as usable in either hand.
export function isHandWeapon(entry: WeaponItemEntry): boolean {
  return !entry.category.some((c) => NON_HAND_CATEGORIES.has(c) || isSiegeMounted(c));
}

// Two-handed weapons occupy both mainHand and offhand once equipped.
export function isTwoHandedWeapon(entry: WeaponItemEntry): boolean {
  return entry.category.includes('Two-Handed');
}

export function isTwoHandedWeaponItemId(weaponItemId: string | null | undefined): boolean {
  if (!weaponItemId) return false;
  const entry = getWeaponItemById(weaponItemId);
  return entry ? isTwoHandedWeapon(entry) : false;
}

export function getWeaponItemsForHandSlot(): WeaponItemEntry[] {
  return WEAPON_ITEMS.filter(isHandWeapon);
}

export function searchWeaponItemsForHandSlot(query: string, includeDescription = false): WeaponItemEntry[] {
  const normalized = query.trim().toLowerCase();
  const list = getWeaponItemsForHandSlot();
  if (!normalized) return list;
  return list.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}
