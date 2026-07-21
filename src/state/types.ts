import type { AbilityId, ClassId } from '../data/classes';

export interface ExtraSlotPool {
  id: string;
  name: string; // e.g. "Domain: Fire", "Drow Innate"
  spellLevel: number; // 0-9
  count: number;
}

export interface SlotFill {
  spellId: string;
  spellName: string;
  sourceClassId: ClassId; // which class's list the spell was picked from
}

export interface Character {
  id: string;
  name: string;
  classId: ClassId;
  level: number; // 1-20
  abilityScores: Record<AbilityId, number>;
  extraSlotPools: ExtraSlotPool[];
  slotFills: Record<string, SlotFill>; // keyed by deterministic slot-instance id
  createdAt: string;
  updatedAt: string;
}

export type NewCharacterInput = Pick<Character, 'name' | 'classId' | 'level' | 'abilityScores'>;
