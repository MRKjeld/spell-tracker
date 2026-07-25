import type { AbilityId, ClassId } from '../data/classes';
import { CASTING_ABILITY, computeBAB, isCasterClass } from '../data/classes';
import type { ClassLevelEntry } from '../state/types';

export function defaultCastingAbilityFor(classId: ClassId): AbilityId {
  return CASTING_ABILITY[classId] ?? 'str';
}

export function createDefaultClassLevel(classId: ClassId, level = 1): ClassLevelEntry {
  return { classId, level, castingAbility: defaultCastingAbilityFor(classId) };
}

export function getTotalLevel(classLevels: ClassLevelEntry[]): number {
  return classLevels.reduce((sum, cl) => sum + cl.level, 0);
}

export function getTotalBAB(classLevels: ClassLevelEntry[]): number {
  return classLevels.reduce((sum, cl) => sum + computeBAB(cl.classId, cl.level), 0);
}

export function getCasterClassLevels(classLevels: ClassLevelEntry[]): ClassLevelEntry[] {
  return classLevels.filter((cl) => isCasterClass(cl.classId));
}

export function isAnyCaster(classLevels: ClassLevelEntry[]): boolean {
  return getCasterClassLevels(classLevels).length > 0;
}

// Pre-multiclass characters (and legacy import files) persisted a single
// `classId`/`level`/`castingAbility` directly on the character instead of a
// `classLevels` array. Folds that shape into a one-entry `classLevels` array
// so every other reader can assume the array always exists.
export function migrateLegacyClassLevels(character: unknown): ClassLevelEntry[] | undefined {
  const c = character as {
    classLevels?: ClassLevelEntry[];
    classId?: ClassId;
    level?: number;
    castingAbility?: AbilityId;
  };
  if (c.classLevels) return c.classLevels;
  if (!c.classId || typeof c.level !== 'number') return undefined;
  return [{ classId: c.classId, level: c.level, castingAbility: c.castingAbility ?? defaultCastingAbilityFor(c.classId) }];
}
