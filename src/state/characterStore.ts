import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../lib/id';
import { computeSlots } from '../lib/slotMath';
import { defaultUsesRemaining, recoverItemsOnRest } from '../lib/itemRecovery';
import { isCasterClass } from '../data/classes';
import type { ClassId } from '../data/classes';
import { migrateLegacyClassLevels } from '../lib/classLevels';
import { getWondrousItemById } from '../data/wondrousItems';
import type { WondrousItemEntry } from '../data/wondrousItems';
import { getRingItemById } from '../data/rings';
import { isTwoHandedWeaponItemId } from '../data/weapons';
import type { BodySlotId } from '../data/bodySlots';
import type { BaseArmorCategory } from '../data/baseArmor';
import { occupiedSlots } from '../lib/equipmentSlots';
import type {
  Calculation,
  Character,
  CharacterAction,
  ExtraSlotPool,
  Item,
  ItemUsePeriod,
  LearnedSpell,
  Modifier,
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
      description: '',
      activation: '',
      usePeriod: 'unlimited',
      maxUses: 0,
      usesRemaining: 0,
      lastReset: now,
      wondrousItemId: slotItem.itemId,
      baseArmorId: null,
      weaponItemId: null,
      ringItemId: null,
      slot: null,
      category: null,
      equippedSlot: slot,
      price: '',
      aura: '',
      cl: '',
      weight: '',
      construction: '',
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

// Same as reconcileWondrousItemCharges, but for rings -- a separate catalog
// (see data/rings.ts) with the same shape.
function reconcileRingItemCharges(item: Item): Item {
  if (!item.ringItemId || item.usePeriod !== 'unlimited') return item;
  const catalogEntry = getRingItemById(item.ringItemId);
  if (!catalogEntry?.uses) return item;
  const usePeriod = catalogUsesToPeriod(catalogEntry.uses);
  const maxUses = catalogEntry.uses.quantity;
  return { ...item, usePeriod, maxUses, usesRemaining: defaultUsesRemaining(usePeriod, maxUses) };
}

// Only one item may occupy a given body slot; equipping one bumps whatever
// was already there back to unworn-but-still-owned. A two-handed weapon
// always anchors at 'mainHand' (even if picked via the offhand slot) and
// also claims 'offhand', bumping whatever occupied either slot.
function setEquippedSlot(items: Item[], itemId: string, slot: BodySlotId | null, twoHanded = false): Item[] {
  const anchor: BodySlotId | null = twoHanded && slot === 'offhand' ? 'mainHand' : slot;
  const claimed = new Set<BodySlotId>();
  if (anchor) {
    claimed.add(anchor);
    if (twoHanded) claimed.add(anchor === 'mainHand' ? 'offhand' : 'mainHand');
  }
  return items.map((i) => {
    if (i.id === itemId) return { ...i, equippedSlot: anchor };
    if (claimed.size > 0 && occupiedSlots(i).some((s) => claimed.has(s))) return { ...i, equippedSlot: null };
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
  addItem(
    charId: string,
    item: {
      name: string;
      description: string;
      slot: BodySlotId | null;
      category: BaseArmorCategory | null;
      activation: string;
      usePeriod: ItemUsePeriod;
      maxUses: number;
      price: string;
      aura: string;
      cl: string;
      weight: string;
      construction: string;
    },
  ): void;
  removeItem(charId: string, itemId: string): void;
  consumeItemCharge(charId: string, itemId: string): void;
  rechargeItem(charId: string, itemId: string): void;
  equipNewWondrousItem(charId: string, slot: BodySlotId, item: { itemId: string; itemName: string }): void;
  equipNewBaseArmorItem(charId: string, slot: BodySlotId, item: { itemId: string; itemName: string }): void;
  equipNewWeaponItem(charId: string, slot: BodySlotId, item: { itemId: string; itemName: string }): void;
  equipNewRingItem(charId: string, slot: BodySlotId, item: { itemId: string; itemName: string }): void;
  addWondrousItem(charId: string, item: { itemId: string; itemName: string }): void;
  addBaseArmorItem(charId: string, item: { itemId: string; itemName: string }): void;
  addWeaponItem(charId: string, item: { itemId: string; itemName: string }): void;
  addRingItem(charId: string, item: { itemId: string; itemName: string }): void;
  equipItem(charId: string, itemId: string, slot: BodySlotId): void;
  unequipItem(charId: string, itemId: string): void;
  learnSpell(
    charId: string,
    spell: { classId: ClassId; spellId: string; spellName: string; spellLevel: number; sourceClassId: ClassId | null },
  ): void;
  unlearnSpell(charId: string, learnedSpellId: string): void;
  addModifier(charId: string, modifier: { name: string; value: number }): void;
  removeModifier(charId: string, modifierId: string): void;
  addCalculation(charId: string, calculation: { name: string; diceRoll: string; modifierIds: string[] }): void;
  removeCalculation(charId: string, calculationId: string): void;
  addAction(charId: string, action: { name: string; description: string; calculationIds: string[] }): void;
  removeAction(charId: string, actionId: string): void;
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
  const { equipmentSlots: legacyEquipmentSlots, classId: _legacyClassId, level: _legacyLevel, castingAbility: _legacyCastingAbility, ...rest } = character as Character & {
    equipmentSlots?: Partial<Record<BodySlotId, { itemId: string; itemName: string }>>;
    classId?: ClassId;
    level?: number;
    castingAbility?: string;
  };
  const items = (rest.items ?? []).map((i) => ({
    ...i,
    description: i.description ?? '',
    wondrousItemId: i.wondrousItemId ?? null,
    baseArmorId: i.baseArmorId ?? null,
    weaponItemId: i.weaponItemId ?? null,
    ringItemId: i.ringItemId ?? null,
    slot: i.slot ?? null,
    category: i.category ?? null,
    equippedSlot: i.equippedSlot ?? null,
    price: i.price ?? '',
    aura: i.aura ?? '',
    cl: i.cl ?? '',
    weight: i.weight ?? '',
    construction: i.construction ?? '',
  }));
  const classLevels = migrateLegacyClassLevels(character) ?? rest.classLevels ?? [];
  const primaryClassId = classLevels[0]?.classId;
  return {
    ...rest,
    classLevels,
    spellcraft: rest.spellcraft ?? 0,
    spellFocusSchools: rest.spellFocusSchools ?? [],
    greaterSpellFocusSchools: rest.greaterSpellFocusSchools ?? [],
    items: migrateLegacyEquipmentSlots(items, legacyEquipmentSlots)
      .map(reconcileWondrousItemCharges)
      .map(reconcileRingItemCharges),
    modifiers: rest.modifiers ?? [],
    calculations: rest.calculations ?? [],
    actions: rest.actions ?? [],
    extraSlotPools: (rest.extraSlotPools ?? []).map((p) => ({ ...p, classId: p.classId ?? primaryClassId })),
    learnedSpells: (rest.learnedSpells ?? []).map((s) => ({ ...s, classId: s.classId ?? s.sourceClassId ?? primaryClassId })),
  };
}

function touch(character: Character): Character {
  const filled = backfillDefaults(character);
  const validSlotIds = new Set<string>();
  for (const cl of filled.classLevels) {
    if (!isCasterClass(cl.classId)) continue;
    const pools = filled.extraSlotPools.filter((p) => p.classId === cl.classId);
    const computed = computeSlots(cl.classId, cl.level, filled.abilityScores, pools, cl.castingAbility);
    for (const ls of computed.levelSlots) for (const i of ls.instances) validSlotIds.add(i.id);
    for (const p of computed.levellessPools) for (const i of p.instances) validSlotIds.add(i.id);
  }
  const prunedFills: Record<string, SlotFill> = {};
  for (const [slotId, fill] of Object.entries(filled.slotFills)) {
    if (validSlotIds.has(slotId)) prunedFills[slotId] = fill;
  }
  return {
    ...filled,
    slotFills: prunedFills,
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
          classLevels: input.classLevels,
          abilityScores: input.abilityScores,
          spellcraft: input.spellcraft,
          spellFocusSchools: input.spellFocusSchools,
          greaterSpellFocusSchools: input.greaterSpellFocusSchools,
          extraSlotPools: [],
          slotFills: {},
          items: [],
          modifiers: [],
          calculations: [],
          actions: [],
          learnedSpells: [],
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
            description: item.description,
            activation: item.activation,
            usePeriod: item.usePeriod,
            maxUses: item.maxUses,
            usesRemaining: defaultUsesRemaining(item.usePeriod, item.maxUses),
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            baseArmorId: null,
            weaponItemId: null,
            ringItemId: null,
            slot: item.slot,
            category: item.category,
            equippedSlot: null,
            price: item.price,
            aura: item.aura,
            cl: item.cl,
            weight: item.weight,
            construction: item.construction,
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
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: item.itemId,
            baseArmorId: null,
            weaponItemId: null,
            ringItemId: null,
            slot: null,
            category: null,
            equippedSlot: slot,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const clearedItems = setEquippedSlot(existing.items ?? [], newItem.id, slot);
          const updated = touch({ ...existing, items: [...clearedItems, newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      equipNewBaseArmorItem(charId, slot, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            baseArmorId: item.itemId,
            weaponItemId: null,
            ringItemId: null,
            slot: null,
            category: null,
            equippedSlot: slot,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const clearedItems = setEquippedSlot(existing.items ?? [], newItem.id, slot);
          const updated = touch({ ...existing, items: [...clearedItems, newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      equipNewWeaponItem(charId, slot, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const twoHanded = isTwoHandedWeaponItemId(item.itemId);
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            baseArmorId: null,
            weaponItemId: item.itemId,
            ringItemId: null,
            slot: null,
            category: null,
            equippedSlot: slot,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const clearedItems = setEquippedSlot(existing.items ?? [], newItem.id, slot, twoHanded);
          const updated = touch({ ...existing, items: [...clearedItems, newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      equipNewRingItem(charId, slot, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            baseArmorId: null,
            weaponItemId: null,
            ringItemId: item.itemId,
            slot: null,
            category: null,
            equippedSlot: slot,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const clearedItems = setEquippedSlot(existing.items ?? [], newItem.id, slot);
          const updated = touch({ ...existing, items: [...clearedItems, newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addWondrousItem(charId, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: item.itemId,
            baseArmorId: null,
            weaponItemId: null,
            ringItemId: null,
            slot: null,
            category: null,
            equippedSlot: null,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const updated = touch({ ...existing, items: [...(existing.items ?? []), newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addBaseArmorItem(charId, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            baseArmorId: item.itemId,
            weaponItemId: null,
            ringItemId: null,
            slot: null,
            category: null,
            equippedSlot: null,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const updated = touch({ ...existing, items: [...(existing.items ?? []), newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addWeaponItem(charId, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            baseArmorId: null,
            weaponItemId: item.itemId,
            ringItemId: null,
            slot: null,
            category: null,
            equippedSlot: null,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const updated = touch({ ...existing, items: [...(existing.items ?? []), newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addRingItem(charId, item) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newItem: Item = {
            id: createId(),
            name: item.itemName,
            description: '',
            activation: '',
            usePeriod: 'unlimited',
            maxUses: 0,
            usesRemaining: 0,
            lastReset: new Date().toISOString(),
            wondrousItemId: null,
            baseArmorId: null,
            weaponItemId: null,
            ringItemId: item.itemId,
            slot: null,
            category: null,
            equippedSlot: null,
            price: '',
            aura: '',
            cl: '',
            weight: '',
            construction: '',
          };
          const updated = touch({ ...existing, items: [...(existing.items ?? []), newItem] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      equipItem(charId, itemId, slot) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const item = (existing.items ?? []).find((i) => i.id === itemId);
          const twoHanded = item ? isTwoHandedWeaponItemId(item.weaponItemId) : false;
          const updated = touch({
            ...existing,
            items: setEquippedSlot(existing.items ?? [], itemId, slot, twoHanded),
          });
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

      learnSpell(charId, spell) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newLearnedSpell: LearnedSpell = { ...spell, id: createId() };
          const updated = touch({
            ...existing,
            learnedSpells: [...(existing.learnedSpells ?? []), newLearnedSpell],
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      unlearnSpell(charId, learnedSpellId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({
            ...existing,
            learnedSpells: (existing.learnedSpells ?? []).filter((s) => s.id !== learnedSpellId),
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addModifier(charId, modifier) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newModifier: Modifier = { ...modifier, id: createId() };
          const updated = touch({ ...existing, modifiers: [...(existing.modifiers ?? []), newModifier] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      removeModifier(charId, modifierId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({
            ...existing,
            modifiers: (existing.modifiers ?? []).filter((m) => m.id !== modifierId),
            // A Calculation referencing a removed Modifier just drops that
            // reference — it keeps its remaining modifiers instead of vanishing.
            calculations: (existing.calculations ?? []).map((c) => ({
              ...c,
              modifierIds: c.modifierIds.filter((id) => id !== modifierId),
            })),
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addCalculation(charId, calculation) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newCalculation: Calculation = { ...calculation, id: createId() };
          const updated = touch({
            ...existing,
            calculations: [...(existing.calculations ?? []), newCalculation],
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      removeCalculation(charId, calculationId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({
            ...existing,
            calculations: (existing.calculations ?? []).filter((c) => c.id !== calculationId),
            // Same rationale as removeModifier: an Action just loses that one
            // Calculation, not itself.
            actions: (existing.actions ?? []).map((a) => ({
              ...a,
              calculationIds: a.calculationIds.filter((id) => id !== calculationId),
            })),
          });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      addAction(charId, action) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const newAction: CharacterAction = { ...action, id: createId() };
          const updated = touch({ ...existing, actions: [...(existing.actions ?? []), newAction] });
          return { characters: { ...state.characters, [charId]: updated } };
        });
      },

      removeAction(charId, actionId) {
        set((state) => {
          const existing = state.characters[charId];
          if (!existing) return state;
          const updated = touch({
            ...existing,
            actions: (existing.actions ?? []).filter((a) => a.id !== actionId),
          });
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
