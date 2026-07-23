import type { AbilityId, ClassId } from '../data/classes';
import type { PoolColorId } from '../data/poolColors';
import type { BodySlotId } from '../data/bodySlots';

export interface ExtraSlotPool {
  id: string;
  name: string; // e.g. "Domain: Fire", "Drow Innate"
  spellLevel: number | null; // 0-9, or null for a level-less pool that forms its own segment
  count: number;
  color?: PoolColorId;
}

export interface SlotFill {
  spellId: string;
  spellName: string;
  sourceClassId: ClassId | null; // which class's list the spell was picked from; null if picked from All Classes
  used: boolean; // greyed out once cast; toggled back off via an "unuse" confirmation
  persistAfterRest: boolean; // if true, Rest does not clear this fill
}

// A spell chosen up front while creating a slot pool (see AddSlotPoolModal).
// Pools created this way pre-fill their slots with these spells as persisted fills.
export interface SpellSelection {
  spellId: string;
  spellName: string;
  sourceClassId: ClassId | null;
}

// How an item's uses/charges recover. 'rest' and 'day' both recover whenever
// the character rests (this tracker only has one rest action); 'week' and
// 'month' recover automatically once real-world time has elapsed; 'manual'
// never auto-recovers (matches wondrous items with a fixed charge count and
// no stated recharge period) — all can also be force-recharged from the
// item's view.
export type ItemUsePeriod = 'unlimited' | 'rest' | 'day' | 'week' | 'month' | 'manual';

export interface Item {
  id: string;
  name: string;
  activation: string; // free text describing what activating the item does
  usePeriod: ItemUsePeriod;
  maxUses: number; // ignored when usePeriod is 'unlimited'
  usesRemaining: number; // ignored when usePeriod is 'unlimited'
  lastReset: string; // ISO timestamp of the last time uses were recovered
  wondrousItemId: string | null; // catalog id (see data/wondrousItems.ts), if picked from it
  equippedSlot: BodySlotId | null; // the body slot this item currently occupies, if worn
}

export interface Character {
  id: string;
  name: string;
  classId: ClassId;
  level: number; // 1-20
  abilityScores: Record<AbilityId, number>;
  castingAbility: AbilityId; // defaults to the class's usual ability, but overridable
  spellcraft: number;
  spellFocusSchools: string[]; // spell school keys (see SCHOOL_LABELS), each at most once
  greaterSpellFocusSchools: string[]; // subset of spellFocusSchools, each at most once
  extraSlotPools: ExtraSlotPool[];
  slotFills: Record<string, SlotFill>; // keyed by deterministic slot-instance id
  items: Item[]; // Equipment segment; every owned item, worn or not; persists through rest (see restCharacter)
  createdAt: string;
  updatedAt: string;
}

export type NewCharacterInput = Pick<
  Character,
  | 'name'
  | 'classId'
  | 'level'
  | 'abilityScores'
  | 'castingAbility'
  | 'spellcraft'
  | 'spellFocusSchools'
  | 'greaterSpellFocusSchools'
>;
