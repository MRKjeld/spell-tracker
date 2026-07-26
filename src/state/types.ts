import type { AbilityId, ClassId } from '../data/classes';
import type { PoolColorId } from '../data/poolColors';
import type { BodySlotId } from '../data/bodySlots';
import type { BaseArmorCategory } from '../data/baseArmor';

export interface ExtraSlotPool {
  id: string;
  classId: ClassId; // which class's Spells tab this pool's slots appear under
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

// A spell an Arcane-type caster (see CASTER_TYPE in data/classes.ts) has
// added to their personal spellbook/formula book/known-spells list via the
// "Learn" button. Divine casters have no equivalent -- they prepare directly
// from their full class list, so nothing needs to be learned first. Slots
// can only be filled from a class's learnedSpells at the matching spellLevel
// (see SpellPickerModal's restrictToSpellIds).
export interface LearnedSpell {
  id: string;
  classId: ClassId; // which class's Known Spells list this belongs to
  spellId: string;
  spellName: string;
  spellLevel: number;
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
  description: string; // free text flavor/rules text, set on custom (non-catalog) items
  activation: string; // free text describing what activating the item does
  usePeriod: ItemUsePeriod;
  maxUses: number; // ignored when usePeriod is 'unlimited'
  usesRemaining: number; // ignored when usePeriod is 'unlimited'
  lastReset: string; // ISO timestamp of the last time uses were recovered
  wondrousItemId: string | null; // catalog id (see data/wondrousItems.ts), if picked from it
  baseArmorId: string | null; // catalog id (see data/baseArmor.ts), if picked from it
  weaponItemId: string | null; // catalog id (see data/weapons.ts), if picked from it
  ringItemId: string | null; // catalog id (see data/rings.ts), if picked from it
  // For custom items only (no wondrousItemId/baseArmorId/weaponItemId/ringItemId):
  // which body slot this item is meant to fill, and, when that slot is
  // 'armor'/'mainHand'/'offhand', its base-armor category — mirrors how
  // catalog items imply a slot/category. Null slot means an unslotted,
  // inventory-only item (e.g. a potion or wand).
  slot: BodySlotId | null;
  category: BaseArmorCategory | null;
  // The body slot this item currently occupies, if worn. A two-handed weapon
  // is always anchored here at 'mainHand' and also fills 'offhand' — see
  // lib/equipmentSlots.ts's occupiedSlots for the item's full occupied set.
  equippedSlot: BodySlotId | null;
  // Free-text flavor fields, set on custom items only (mirrors the shape of
  // catalog entries like WondrousItemEntry) — all optional, '' when unset.
  price: string;
  aura: string;
  cl: string;
  weight: string;
  construction: string;
}

// A single named bonus/penalty, e.g. "Strength" +4 or "Point-Blank Shot" +1.
// Built up once via Add Modifier, then reused across any number of Calculations.
export interface Modifier {
  id: string;
  name: string;
  value: number;
}

// A named dice roll plus the Modifiers that apply to it, e.g. "Ranged Attack
// (<30ft)": 1d20 + BAB + Dexterity Modifier + Point-Blank Shot.
export interface Calculation {
  id: string;
  name: string;
  diceRoll: string; // free text, e.g. "1d20"
  modifierIds: string[]; // references into Character.modifiers
}

// A named activity a character can take, e.g. "Alchemist's Bomb", with a
// description and any number of Calculations relevant to using it.
export interface CharacterAction {
  id: string;
  name: string;
  description: string;
  calculationIds: string[]; // references into Character.calculations
}

// One entry per class the character has levels in. A character always has
// at least one. BAB (see computeBAB) and, for casters, spell slots (see
// computeSlots) are each computed per entry off that class's own level, then
// combined -- BAB by summing, spell slots by giving each caster class its own
// Spells tab (see CharacterSheet).
export interface ClassLevelEntry {
  classId: ClassId;
  level: number; // 1-20, levels in this class specifically
  castingAbility: AbilityId; // defaults to the class's usual ability, but overridable; ignored for non-casters
}

export interface Character {
  id: string;
  name: string;
  classLevels: ClassLevelEntry[];
  abilityScores: Record<AbilityId, number>;
  spellcraft: number;
  spellFocusSchools: string[]; // spell school keys (see SCHOOL_LABELS), each at most once
  greaterSpellFocusSchools: string[]; // subset of spellFocusSchools, each at most once
  extraSlotPools: ExtraSlotPool[];
  slotFills: Record<string, SlotFill>; // keyed by deterministic slot-instance id
  learnedSpells: LearnedSpell[]; // Arcane-type casters only (see CASTER_TYPE); always [] for Divine/non-casters
  items: Item[]; // Equipment segment; every owned item, worn or not; persists through rest (see restCharacter)
  modifiers: Modifier[]; // Actions tab: reusable named bonuses
  calculations: Calculation[]; // Actions tab: dice rolls built from modifiers
  actions: CharacterAction[]; // Actions tab: named activities built from calculations
  createdAt: string;
  updatedAt: string;
}

export type NewCharacterInput = Pick<
  Character,
  | 'name'
  | 'classLevels'
  | 'abilityScores'
  | 'spellcraft'
  | 'spellFocusSchools'
  | 'greaterSpellFocusSchools'
>;
