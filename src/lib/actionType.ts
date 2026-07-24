export type ActionTypeId = 'free' | 'swift' | 'immediate' | 'move' | 'standard' | 'full-round';

export const ACTION_TYPE_LABELS: Record<ActionTypeId, string> = {
  free: 'Free',
  swift: 'Swift',
  immediate: 'Immediate',
  move: 'Move',
  standard: 'Standard',
  'full-round': 'Full-Round',
};

const KNOWN_ACTION_TYPES = new Set<string>(Object.keys(ACTION_TYPE_LABELS));

export function normalizeActionTypeId(raw: string | null | undefined): ActionTypeId | null {
  if (!raw) return null;
  return KNOWN_ACTION_TYPES.has(raw) ? (raw as ActionTypeId) : null;
}

// Matches the same "as a standard action" / "swift action" phrasing the AoN
// scrapers look for (see extractAction in scrape-aon-wondrous-items.mjs), so
// free-text activation descriptions get an action type even when a catalog
// entry didn't already parse one out.
const ACTION_TYPE_RE = /\b(free|swift|immediate|move|standard|full[- ]?round)\s+actions?\b/i;

export function parseActionType(text: string): ActionTypeId | null {
  const m = text.match(ACTION_TYPE_RE);
  if (!m) return null;
  const normalized = m[1].toLowerCase().replace(/\s+/g, '-');
  return normalizeActionTypeId(normalized === 'fullround' ? 'full-round' : normalized);
}
