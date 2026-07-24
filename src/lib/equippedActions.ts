import type { Item } from '../state/types';
import { getWondrousItemById } from '../data/wondrousItems';
import type { ActionTypeId } from './actionType';
import { normalizeActionTypeId, parseActionType } from './actionType';

export interface EquippedAction {
  item: Item;
  description: string;
  actionType: ActionTypeId | null;
}

// Only wondrous items carry a full ability write-up (their catalog
// `description`); mundane armor/shields (baseArmorId) are purely passive
// stat blocks with nothing to activate, so they never contribute one.
// Manually-added items (no catalog link at all) fall back to whatever the
// player typed into the item's own `activation` field.
function resolveDescription(item: Item): string {
  if (item.wondrousItemId) {
    const entry = getWondrousItemById(item.wondrousItemId);
    if (entry?.description) return entry.description;
  }
  return item.activation.trim();
}

function resolveActionType(item: Item, description: string): ActionTypeId | null {
  if (item.wondrousItemId) {
    const entry = getWondrousItemById(item.wondrousItemId);
    const catalogType = normalizeActionTypeId(entry?.uses?.action);
    if (catalogType) return catalogType;
  }
  return description ? parseActionType(description) : null;
}

// Everything a player currently has worn/equipped that actually has
// something to activate: it has a description to show, or the player is
// tracking discrete charges/uses for it (usePeriod isn't 'unlimited').
// Plain passive gear (most armor, most rings) has neither and is excluded.
export function getEquippedActions(items: Item[]): EquippedAction[] {
  return items
    .filter((item) => item.equippedSlot !== null)
    .map((item) => {
      const description = resolveDescription(item);
      const hasTrackedUses = item.usePeriod !== 'unlimited';
      if (!description && !hasTrackedUses) return null;
      return { item, description, actionType: resolveActionType(item, description) };
    })
    .filter((action): action is EquippedAction => action !== null)
    .sort((a, b) => a.item.name.localeCompare(b.item.name));
}

const PERIOD_LABELS: Partial<Record<Item['usePeriod'], string>> = {
  rest: 'Rest',
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

// "2/Day" for periodic uses; a bare remaining count ("5") for a fixed charge
// pool with no automatic refresh (usePeriod 'manual'); "Unlimited" otherwise.
export function formatUsesRemaining(item: Item): string {
  if (item.usePeriod === 'unlimited') return 'Unlimited';
  if (item.usePeriod === 'manual') return String(item.usesRemaining);
  return `${item.usesRemaining}/${PERIOD_LABELS[item.usePeriod]}`;
}
