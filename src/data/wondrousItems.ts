import type { BodySlotId } from './bodySlots';
import { BODY_SLOT_IDS } from './bodySlots';
import rawWondrousItems from './wondrousItems.generated.json';

export interface WondrousItemEntry {
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

// The source data has a few alternate spellings for the same slot (e.g. a
// single bracer-type item tagged "wrist" instead of "wrists"); fold those
// into the canonical body slot id so pickers find them.
const SLOT_ALIASES: Record<string, BodySlotId> = {
  wrist: 'wrists',
  shoulder: 'shoulders',
};

export function normalizeSlot(slot: string): BodySlotId | null {
  const key = slot.trim().toLowerCase();
  if ((BODY_SLOT_IDS as string[]).includes(key)) return key as BodySlotId;
  return SLOT_ALIASES[key] ?? null;
}

const WONDROUS_ITEMS = rawWondrousItems as WondrousItemEntry[];

const byId = new Map<string, WondrousItemEntry>();
const bySlot = new Map<BodySlotId, WondrousItemEntry[]>();

for (const item of WONDROUS_ITEMS) {
  byId.set(item.id, item);
  const slot = normalizeSlot(item.slot);
  if (!slot) continue;
  const list = bySlot.get(slot);
  if (list) list.push(item);
  else bySlot.set(slot, [item]);
}

export function getWondrousItemById(id: string): WondrousItemEntry | undefined {
  return byId.get(id);
}

export function getWondrousItemsForSlot(slot: BodySlotId): WondrousItemEntry[] {
  return bySlot.get(slot) ?? [];
}

export function searchWondrousItemsForSlot(slot: BodySlotId, query: string, includeDescription = false): WondrousItemEntry[] {
  const normalized = query.trim().toLowerCase();
  const list = getWondrousItemsForSlot(slot);
  if (!normalized) return list;
  return list.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      (includeDescription && item.description.toLowerCase().includes(normalized)),
  );
}
