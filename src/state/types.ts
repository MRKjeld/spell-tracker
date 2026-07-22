import type { AbilityId, ClassId } from '../data/classes';
import type { PoolColorId } from '../data/poolColors';

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

export interface Character {
  id: string;
  name: string;
  classId: ClassId;
  level: number; // 1-20
  abilityScores: Record<AbilityId, number>;
  castingAbility: AbilityId; // defaults to the class's usual ability, but overridable
  extraSlotPools: ExtraSlotPool[];
  slotFills: Record<string, SlotFill>; // keyed by deterministic slot-instance id
  createdAt: string;
  updatedAt: string;
}

export type NewCharacterInput = Pick<
  Character,
  'name' | 'classId' | 'level' | 'abilityScores' | 'castingAbility'
>;
