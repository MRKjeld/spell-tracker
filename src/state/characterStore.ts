import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../lib/id';
import { computeSlots, pruneOrphanedFills } from '../lib/slotMath';
import { defaultUsesRemaining, recoverItemsOnRest } from '../lib/itemRecovery';
import { CASTING_ABILITY } from '../data/classes';
import { getWondrousItemById } from '../data/wondrousItems';
import type { WondrousItemEntry } from '../data/wondrousItems';
import type { BodySlotId } from '../data/bodySlots';
import type {
  Character,
  ExtraSlotPool,
  Item,
  ItemUsePeriod,
  NewCharacterInput,
  SlotFill,
  SpellSelection,
} from './types';

// Pre-refactor characters stored worn wondrous items in a separate
// `equipmentSlots` map instead of as items with an `equippedSlot`. Folded into
// `items` on first load so the Equipment list has always owned everything.
interface LegacyEquippedSlotItem {
  itemId: string;
  itemName: string;
}

function migrateLegacyEquipmentSlots(
  items: Item[],
  legacySlots: Partial<Record<BodySlotId, LegacyEquippedSlotItem>> | undefined,
): Item[] {
  if (!legacySlots) return items;
  const now = new Date().toISOString();
  const migrated: Item[] = [];
  for (const [slot, slotItem] of Object.entries(legacySlots) as [BodySlotId, LegacyEquippedSlotItem][]) {
    if (!slotItem || items.some((i) => i.equippedSlot === slot)) continue;
    migrated.push({
      id: createId(),
      name: slotItem.itemName,
      activation: '',
      usePeriod: 'unlimited',
      maxUses: 0,
      usesRemaining: 0,
      lastReset: now,
      wondrousItemId: slotItem.itemId,
      equippedSlot: slot,
    });
  }
  return migrated.length ? [...items, ...migrated] : items;
}

// Maps a wondrous item catalog entry's `uses.per` to the tracker's own
// recharge periods. Entries with no stated period (uses.per is null) still
// have a fixed charge count, but nothing says they recover on Rest — those
// only recharge manually.
function catalogUsesToPeriod(uses: WondrousItemEntry['uses']): ItemUsePeriod {
  if (!uses) return 'unlimited';
  switch (uses.per) {
    case 'day':
      return 'day';
    case 'week':
      return 'week';
    case 'month':
      return 'month';
    default:
      return 'manual';
  }
}

// Wondrous items are always created with placeholder unlimited/0 charges
// (see equipNewWondrousItem and migrateLegacyEquipmentSlots) and get their
// real charge count filled in here, from the catalog, the first time this
// runs on them. Once corrected, usePeriod is no longer 'unlimited' so this
// never re-touches (and so never clobbers) a player's tracked usesRemaining.
function reconcileWondrousItemCharges(item: Item): Item {
  if (!item.wondrousItemId || item.usePeriod !== 'unlimited') return item;
  const catalogEntry = getWondrousItemById(item.wondrousItemId);
  if (!catalogEntry?.uses) return item;
  const usePeriod = catalogUsesToPeriod(catalogEntry.uses);
  const maxUses = catalogEntry.uses.quantity;
  return { ...item, usePeriod, maxUses, usesRemaining: defaultUsesRemaining(usePeriod, maxUses) };
}

// Only one item may occupy a given body slot; equipping one bumps whatever
// was already there back to unworn-but-still-owned.
function setEquippedSlot(items: Item[], itemId: string, slot: BodySlotId | null): Item[] {
  return items.map((i) => {
    if (i.id === itemId) return { ...i, equippedSlot: slot };
    if (slot !== null && i.equippedSlot === slot) return { ...i, equippedSlot: null };
    return i;
  });
}

interface CharacterStoreState {
  characters: Record<string, Character>;
  createCharacter(input: NewCharacterInput): string;
  updateCharacter(id: string, patch: Partial<Omit<Character, 'id' | 'createdAt'>>): void;
  deleteCharacter(id: string): void;
  addExtraPool(charId: string, pool: Omit<ExtraSlotPool, 'id'>, spells?: SpellSelection[]): void;
  removeExtraPool(charId: string, poolId: string): void;
  fillSlot(charId: string, slotInstanceId: string, fill: SlotFill): void;
  clearSlot(charId: string, slotInstanceId: string): void;
  setSlotUsed(charId: string, slotInstanceId: string, used: boolean): void;
  restCharacter(charId: string): void;
  addItem(charId: string, item: { name: string; activation: string; usePeriod: ItemUsePeriod; maxUses: number }): void;
  removeItem(charId: string, itemId: string): void;
  consumeItemCharge(charId: string, itemId: string): void;
  rechargeItem(charId: string, itemId: string): void;
  equipNewWondrousItem(charId: string, slot: BodySlotId, item: { itemId: string; itemName: string }): void;
  equipItem(charId: string, itemId: string, slot: BodySlotId): void;
  unequipItem(charId: string, itemId: string): void;
  replaceAllCharacters(chars: Character[]): void;
  addCharacters(chars: Character[]): void;
}

// Fills in fields added to the Character shape after some characters were
// already persisted, so components never see them as undefined. Applied both
// on every store mutation (touch) and once at load time (see the `merge`
// option below) — the latter matters because opening a tab is a pure
// render/state change that never calls a mutator, so a character that predates
// a newly-added field would otherwise stay undefined until first edited.
function backfillDefaults(character: Character): Character {
  const { equipmentSlots: legacyEquipmentSlots, ...rest } = character as Character & {
    equipmentSlots?: Partial<Record<BodySlotId, { itemId: string; itemName: string }>>;
  };
  const items = (rest.items ?? []).map((i) => ({
    ...i,
    wondrousItemId: i.wondrousItemId ?? null,
    equippedSlot: i.equippedSlot ?? null,
  }));
  return {
    ...rest,
    castingAbility: rest.castingAbility ?? CASTING_ABILITY[rest.classId],
    spellcraft: rest.spellcraft ?? 0,
    spellFocusSchools: rest.spellFocusSchools ?? [],
    greaterSpellFocusSchools: rest.greaterSpellFocusSchools ?? [],
    items: migrateLegacyEquipmentSlots(items, legacyEquipmentSlots).map(reconcileWondrousItemCharges),
  };
}

function touch(character: Character): Character {
  const filled = backfillDefaults(character);
  const computed = computeSlots(
    filled.classId,
    filled.level,
    filled.abilityScores,
    filled.extraSlotPools,
    filled.castingAbility,
  );
  return {
    ...filled,
    slotFills: pruneOrphanedFills(filled.slotFills, computed) as Record<string, SlotFill>,
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
          castingAbility: input.castingAbility ?? CASTING_ABILITY[input.classId],
          spellcraft: input.spellcraft,
          spellFocusSchools: input.spellFocusSchools,
          greaterSpellFocusSchools: input.greaterSpellFocusSchools,
          extraSlotPools: [],
          slotFills: {},
          items: [],
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

      addExtraPool(charId, pool, spells = []) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newPool: ExtraSlotPool = { ...pool, id: createId() };
          // Spells specified up front fill this pool's slots immediately, as
          // persisted fills (they represent innate/fixed spells, not picks
          // that get cleared on the next Rest).
          const newFills: Record<string, SlotFill> = {};
          spells.slice(0, newPool.count).forEach((spell, i) => {
            newFills[`pool-${newPool.id}-${i}`] = {
              spellId: spell.spellId,
              spellName: spell.spellName,
              sourceClassId: spell.sourceClassId,
              used: false,
              persistAfterRest: true,
            };
          });
          const updated = touch({
            ...existing,
            extraSlotPools: [...existing.extraSlotPools, newPool],
            slotFills: { ...existing.slotFills, ...newFills },
          });
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
          // Items live in their own Equipment segment and are unaffected by
          // clearing slotFills above — only their own uses/charges recover,
          // and only for periods that have actually elapsed.
          const restedItems = recoverItemsOnRest(existing.items ?? [], new Date());
          const updated = touch({ ...existing, slotFills: restedFills, items: restedItems });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addItem(charId, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.name,
            activation: item.activation,
            usePeriod: item.usePeriod,
            maxUses: item.maxUses,
            usesRemaining: defaultUsesRemaining(item.usePeriod, item.maxUses),
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            equippedSlot: null,
          };
          const updated = touch({ ...existing, items: [...(existing.items ?? []), newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      removeItem(charId, itemId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({
            ...existing,
            items: (existing.items ?? []).filter((i) => i.id !== itemId),
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      consumeItemCharge(charId, itemId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const items = (existing.items ?? []).map((i) =>
            i.id === itemId && i.usePeriod !== 'unlimited' && i.usesRemaining > 0
              ? { ...i, usesRemaining: i.usesRemaining - 1 }
              : i,
          );
          const updated = touch({ ...existing, items });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      rechargeItem(charId, itemId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const items = (existing.items ?? []).map((i) =>
            i.id === itemId ? { ...i, usesRemaining: i.maxUses, lastReset: new Date().toISOString() } : i,
          );
          const updated = touch({ ...existing, items });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      equipNewWondrousItem(charId, slot, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: item.itemId,
            equippedSlot: slot,
          };
          const clearedItems = setEquippedSlot(existing.items ?? [], newItem.id, slot);
          const updated = touch({ ...existing, items: [...clearedItems, newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      equipItem(charId, itemId, slot) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({ ...existing, items: setEquippedSlot(existing.items ?? [], itemId, slot) });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      unequipItem(charId, itemId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const items = (existing.items ?? []).map((i) => (i.id === itemId ? { ...i, equippedSlot: null } : i));
          const updated = touch({ ...existing, items });
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
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CharacterStoreState> | undefined;
        if (!persisted?.characters) return currentState;
        return {
          ...currentState,
          ...persisted,
          characters: Object.fromEntries(
            Object.entries(persisted.characters).map(([id, character]) => [id, backfillDefaults(character)]),
          ),
        };
      },
    },
  ),
);
