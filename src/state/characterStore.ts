import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../lib/id';
import { computeSlots, pruneOrphanedFills } from '../lib/slotMath';
import type { Character, ExtraSlotPool, NewCharacterInput, SlotFill } from './types';

interface CharacterStoreState {
  characters: Record<string, Character>;
  createCharacter(input: NewCharacterInput): string;
  updateCharacter(id: string, patch: Partial<Omit<Character, 'id' | 'createdAt'>>): void;
  deleteCharacter(id: string): void;
  addExtraPool(charId: string, pool: Omit<ExtraSlotPool, 'id'>): void;
  removeExtraPool(charId: string, poolId: string): void;
  fillSlot(charId: string, slotInstanceId: string, fill: SlotFill): void;
  clearSlot(charId: string, slotInstanceId: string): void;
  setSlotUsed(charId: string, slotInstanceId: string, used: boolean): void;
  restCharacter(charId: string): void;
  clearAllSlots(charId: string): void;
  replaceAllCharacters(chars: Character[]): void;
  addCharacters(chars: Character[]): void;
}

function touch(character: Character): Character {
  const computed = computeSlots(character.classId, character.level, character.abilityScores, character.extraSlotPools);
  return {
    ...character,
    slotFills: pruneOrphanedFills(character.slotFills, computed) as Record<string, SlotFill>,
    updatedAt: new Date().toISOString(),
  };
}

export const useCharacterStore = create<CharacterStoreState>()(
  persist(
    (set) => ({
      characters: {},

      createCharacter(input) {
        const id = createId();
        const now = new Date().toISOString();
        const character: Character = {
          id,
          name: input.name,
          classId: input.classId,
          level: input.level,
          abilityScores: input.abilityScores,
          extraSlotPools: [],
          slotFills: {},
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ characters: { ...state.characters, [id]: character } }));
        return id;
      },

      updateCharacter(id, patch) {
        set((state) => {
          const existing = state.characters[id];
          if (!existing) return state;
          const updated = touch({ ...existing, ...patch });
          return { characters: { ...state.characters, [id]: updated } };
        });
      },

      deleteCharacter(id) {
        set((state) => {
          const { [id]: _removed, ...rest } = state.characters;
          return { characters: rest };
        });
      },

      addExtraPool(charId, pool) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newPool: ExtraSlotPool = { ...pool, id: createId() };
          const updated = touch({ ...existing, extraSlotPools: [...existing.extraSlotPools, newPool] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      removeExtraPool(charId, poolId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({
            ...existing,
            extraSlotPools: existing.extraSlotPools.filter((p) => p.id !== poolId),
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      fillSlot(charId, slotInstanceId, fill) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({
            ...existing,
            slotFills: { ...existing.slotFills, [slotInstanceId]: fill },
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      clearSlot(charId, slotInstanceId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const { [slotInstanceId]: _removed, ...restFills } = existing.slotFills;
          const updated = touch({ ...existing, slotFills: restFills });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      setSlotUsed(charId, slotInstanceId, used) {
        set((state) => {
          const existing = state.characters[charId];
          const fill = existing?.slotFills[slotInstanceId];
          if (!existing || !fill) return state;
          const updated = touch({
            ...existing,
            slotFills: { ...existing.slotFills, [slotInstanceId]: { ...fill, used } },
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      restCharacter(charId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const restedFills: Record<string, SlotFill> = {};
          for (const [slotInstanceId, fill] of Object.entries(existing.slotFills)) {
            if (fill.persistAfterRest) {
              restedFills[slotInstanceId] = { ...fill, used: false };
            }
          }
          const updated = touch({ ...existing, slotFills: restedFills });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      clearAllSlots(charId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({ ...existing, slotFills: {} });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      replaceAllCharacters(chars) {
        set(() => ({ characters: Object.fromEntries(chars.map((c) => [c.id, c])) }));
      },

      addCharacters(chars) {
        set((state) => ({
          characters: { ...state.characters, ...Object.fromEntries(chars.map((c) => [c.id, c])) },
        }));
      },
    }),
    {
      name: 'pf1e-spell-tracker',
      version: 1,
    },
  ),
);
