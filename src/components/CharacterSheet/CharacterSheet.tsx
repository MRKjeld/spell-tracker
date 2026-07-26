import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CANTRIPS_AT_WILL, CASTER_TYPE, CASTING_TYPE, CLASS_LABELS, isCasterClass } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { computeSlots } from '../../lib/slotMath';
import type { ComputedSlots } from '../../lib/slotMath';
import { formatModifier } from '../../lib/casterStats';
import { getSpellById } from '../../data/spells';
import { getCasterClassLevels, getTotalBAB } from '../../lib/classLevels';
import type { Item, LearnedSpell, SlotFill } from '../../state/types';
import type { BodySlotId } from '../../data/bodySlots';
import { SlotGrid } from './SlotGrid';
import { AddSlotPoolModal } from './AddSlotPoolModal';
import { SpellPickerModal } from './SpellPickerModal';
import { LearnSpellsModal } from './LearnSpellsModal';
import { CastSpellModal } from './CastSpellModal';
import { SpellViewModal } from './SpellViewModal';
import { CasterStatsModal } from './CasterStatsModal';
import { KnownSpellsSection } from './KnownSpellsSection';
import { SpellFocusSection } from './SpellFocusSection';
import { AddItemModal } from './AddItemModal';
import { ItemPickerModal } from './ItemPickerModal';
import { ItemViewModal } from './ItemViewModal';
import { EquipmentSlotsGrid } from './EquipmentSlotsGrid';
import { EquipmentSection } from './EquipmentSection';
import { WondrousItemPickerModal } from './WondrousItemPickerModal';
import { BaseArmorPickerModal } from './BaseArmorPickerModal';
import { HandItemPickerModal } from './HandItemPickerModal';
import { RingPickerModal } from './RingPickerModal';
import { EquippedSlotItemModal } from './EquippedSlotItemModal';
import { ActionsSection } from './ActionsSection';
import { AddModifierModal } from './AddModifierModal';
import { AddCalculationModal } from './AddCalculationModal';
import { AddActionModal } from './AddActionModal';
import { findItemForSlot } from '../../lib/equipmentSlots';
import { getSystemModifiers, isSystemModifierId } from '../../lib/systemModifiers';
import { getSystemCalculations, isSystemCalculationId } from '../../lib/systemCalculations';

// Which catalog/picker a given body slot is filled from: 'armor' takes worn
// armor, 'mainHand'/'offhand' take shields and hand-eligible weapons,
// 'ring1'/'ring2' take rings, and everything else uses the wondrous catalog.
type SlotPickerKind = 'armor' | 'hand' | 'ring' | 'wondrous';
function getSlotPickerKind(slot: BodySlotId): SlotPickerKind {
  if (slot === 'armor') return 'armor';
  if (slot === 'mainHand' || slot === 'offhand') return 'hand';
  if (slot === 'ring1' || slot === 'ring2') return 'ring';
  return 'wondrous';
}

const SPELLS_TAB_PREFIX = 'spells:';
type TabId = 'actions' | 'items' | `${typeof SPELLS_TAB_PREFIX}${string}`;

function spellsTabId(classId: ClassId): TabId {
  return `${SPELLS_TAB_PREFIX}${classId}`;
}

export function CharacterSheet() {
  const { id } = useParams();
  const character = useCharacterStore((s) => (id ? s.characters[id] : undefined));
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const addExtraPool = useCharacterStore((s) => s.addExtraPool);
  const removeExtraPool = useCharacterStore((s) => s.removeExtraPool);
  const fillSlot = useCharacterStore((s) => s.fillSlot);
  const clearSlot = useCharacterStore((s) => s.clearSlot);
  const setSlotUsed = useCharacterStore((s) => s.setSlotUsed);
  const restCharacter = useCharacterStore((s) => s.restCharacter);
  const addItem = useCharacterStore((s) => s.addItem);
  const addWondrousItem = useCharacterStore((s) => s.addWondrousItem);
  const addBaseArmorItem = useCharacterStore((s) => s.addBaseArmorItem);
  const addWeaponItem = useCharacterStore((s) => s.addWeaponItem);
  const addRingItem = useCharacterStore((s) => s.addRingItem);
  const removeItem = useCharacterStore((s) => s.removeItem);
  const consumeItemCharge = useCharacterStore((s) => s.consumeItemCharge);
  const rechargeItem = useCharacterStore((s) => s.rechargeItem);
  const equipNewWondrousItem = useCharacterStore((s) => s.equipNewWondrousItem);
  const equipNewBaseArmorItem = useCharacterStore((s) => s.equipNewBaseArmorItem);
  const equipNewWeaponItem = useCharacterStore((s) => s.equipNewWeaponItem);
  const equipNewRingItem = useCharacterStore((s) => s.equipNewRingItem);
  const equipItem = useCharacterStore((s) => s.equipItem);
  const unequipItem = useCharacterStore((s) => s.unequipItem);
  const addModifier = useCharacterStore((s) => s.addModifier);
  const removeModifier = useCharacterStore((s) => s.removeModifier);
  const addCalculation = useCharacterStore((s) => s.addCalculation);
  const removeCalculation = useCharacterStore((s) => s.removeCalculation);
  const addAction = useCharacterStore((s) => s.addAction);
  const removeAction = useCharacterStore((s) => s.removeAction);
  const learnSpell = useCharacterStore((s) => s.learnSpell);
  const unlearnSpell = useCharacterStore((s) => s.unlearnSpell);

  const casterClassLevels = useMemo(
    () => (character ? getCasterClassLevels(character.classLevels) : []),
    [character],
  );

  const [activeTab, setActiveTab] = useState<TabId>('actions');
  const [showAddPool, setShowAddPool] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showAddModifier, setShowAddModifier] = useState(false);
  const [showAddCalculation, setShowAddCalculation] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [showLearnPicker, setShowLearnPicker] = useState(false);
  const [showCastPicker, setShowCastPicker] = useState(false);
  const [showSpellFocus, setShowSpellFocus] = useState(false);
  const [itemViewTarget, setItemViewTarget] = useState<Item | null>(null);
  const [slotPickerTarget, setSlotPickerTarget] = useState<BodySlotId | null>(null);
  const [equippedSlotViewTarget, setEquippedSlotViewTarget] = useState<BodySlotId | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{
    classId: ClassId;
    spellLevel: number | null;
    poolName?: string;
    slotInstanceId: string;
  } | null>(null);
  const [viewTarget, setViewTarget] = useState<{
    classId: ClassId;
    slotInstanceId: string;
    fill: SlotFill;
    spellLevel: number | null;
  } | null>(null);
  const [casterStatsClassId, setCasterStatsClassId] = useState<ClassId | null>(null);

  // The class whose Spells tab is currently active, if any -- resolved at
  // render time (rather than kept perfectly in sync via an effect) so a tab
  // pointing at a class removed via Edit just falls back cleanly.
  const activeSpellClassId: ClassId | null =
    activeTab.startsWith(SPELLS_TAB_PREFIX) &&
    casterClassLevels.some((cl) => spellsTabId(cl.classId) === activeTab)
      ? (activeTab.slice(SPELLS_TAB_PREFIX.length) as ClassId)
      : null;
  const resolvedTab: TabId =
    activeTab === 'items'
      ? 'items'
      : activeSpellClassId
        ? activeTab
        : activeTab === 'actions'
          ? 'actions'
          : casterClassLevels[0]
            ? spellsTabId(casterClassLevels[0].classId)
            : 'actions';
  const resolvedSpellClassId: ClassId | null = activeSpellClassId ?? (
    resolvedTab.startsWith(SPELLS_TAB_PREFIX) ? (resolvedTab.slice(SPELLS_TAB_PREFIX.length) as ClassId) : null
  );

  const computedByClass = useMemo(() => {
    const map: Partial<Record<ClassId, ComputedSlots>> = {};
    if (!character) return map;
    for (const cl of casterClassLevels) {
      const pools = character.extraSlotPools.filter((p) => p.classId === cl.classId);
      map[cl.classId] = computeSlots(cl.classId, cl.level, character.abilityScores, pools, cl.castingAbility);
    }
    return map;
  }, [character, casterClassLevels]);

  const systemModifiers = useMemo(() => {
    if (!character) return [];
    return getSystemModifiers(character);
  }, [character]);

  const systemCalculations = useMemo(() => getSystemCalculations(), []);

  if (!character) {
    return (
      <div className="page">
        <p>Character not found.</p>
        <Link to="/">Back to characters</Link>
      </div>
    );
  }

  const activeClassLevel = resolvedSpellClassId
    ? character.classLevels.find((cl) => cl.classId === resolvedSpellClassId)
    : undefined;
  const activeComputed: ComputedSlots = (resolvedSpellClassId && computedByClass[resolvedSpellClassId]) || {
    levelSlots: [],
    levellessPools: [],
  };
  const activeCasterType = resolvedSpellClassId ? CASTER_TYPE[resolvedSpellClassId] : undefined;
  const activeLearnedSpells = resolvedSpellClassId
    ? character.learnedSpells.filter((s) => s.classId === resolvedSpellClassId)
    : [];

  function handleSlotClick(classId: ClassId, spellLevel: number | null, slotInstanceId: string, poolName?: string) {
    const fill = character!.slotFills[slotInstanceId];
    if (fill) {
      setViewTarget({ classId, slotInstanceId, fill, spellLevel });
    } else {
      setPickerTarget({ classId, spellLevel, poolName, slotInstanceId });
    }
  }

  function handleToggleUsed() {
    if (!viewTarget) return;
    const { slotInstanceId, fill } = viewTarget;
    if (fill.used) {
      if (confirm('Are you sure you want to unuse this spell?')) {
        setSlotUsed(character!.id, slotInstanceId, false);
        setViewTarget(null);
      }
    } else {
      setSlotUsed(character!.id, slotInstanceId, true);
      setViewTarget(null);
    }
  }

  function handleClear() {
    if (!viewTarget) return;
    clearSlot(character!.id, viewTarget.slotInstanceId);
    setViewTarget(null);
  }

  function handlePick(spellId: string, spellName: string, sourceClassId: ClassId | null) {
    if (pickerTarget) {
      fillSlot(character!.id, pickerTarget.slotInstanceId, {
        spellId,
        spellName,
        sourceClassId,
        used: false,
        persistAfterRest: false,
      });
    }
    setPickerTarget(null);
  }

  function handleLearnConfirm(selectedSpellIds: string[]) {
    if (!resolvedSpellClassId) return;
    const selectedSet = new Set(selectedSpellIds);
    const currentIds = new Set(activeLearnedSpells.map((s) => s.spellId));

    for (const learned of activeLearnedSpells) {
      if (!selectedSet.has(learned.spellId)) unlearnSpell(character!.id, learned.id);
    }
    for (const spellId of selectedSpellIds) {
      if (currentIds.has(spellId)) continue;
      const spell = getSpellById(spellId);
      const spellLevel = spell?.levels[resolvedSpellClassId] ?? 0;
      learnSpell(character!.id, {
        classId: resolvedSpellClassId,
        spellId,
        spellName: spell?.name ?? '',
        spellLevel,
        sourceClassId: null,
      });
    }
    setShowLearnPicker(false);
  }

  // Spontaneous casters (see CASTING_TYPE) cast straight from their known
  // spells instead of prepping a specific spell into a specific slot ahead of
  // time, so Cast picks the spell first and fills the first open slot at its
  // level automatically, already marked used.
  function handleCast(learned: LearnedSpell) {
    if (!resolvedSpellClassId) return;
    if (CANTRIPS_AT_WILL[resolvedSpellClassId] && learned.spellLevel === 0) {
      setShowCastPicker(false);
      return;
    }
    const levelSlots = activeComputed.levelSlots.find((ls) => ls.spellLevel === learned.spellLevel);
    const openInstance = levelSlots?.instances.find((inst) => !character!.slotFills[inst.id]);
    if (!openInstance) {
      alert(`No level ${learned.spellLevel} slots remaining to cast ${learned.spellName}.`);
      return;
    }
    fillSlot(character!.id, openInstance.id, {
      spellId: learned.spellId,
      spellName: learned.spellName,
      sourceClassId: learned.sourceClassId,
      used: true,
      persistAfterRest: false,
    });
    setShowCastPicker(false);
  }

  function handleRest() {
    if (confirm('Rest and clear all spells not marked "Persist after rest"?')) {
      restCharacter(character!.id);
    }
  }

  function handleUseItemCharge() {
    if (!itemViewTarget) return;
    consumeItemCharge(character!.id, itemViewTarget.id);
    setItemViewTarget(null);
  }

  function handleRechargeItem() {
    if (!itemViewTarget) return;
    rechargeItem(character!.id, itemViewTarget.id);
    setItemViewTarget(null);
  }

  function handlePickCatalogItem(pick: {
    kind: 'wondrous' | 'baseArmor' | 'weapon' | 'ring';
    itemId: string;
    itemName: string;
  }) {
    const { itemId, itemName } = pick;
    if (pick.kind === 'wondrous') {
      addWondrousItem(character!.id, { itemId, itemName });
    } else if (pick.kind === 'baseArmor') {
      addBaseArmorItem(character!.id, { itemId, itemName });
    } else if (pick.kind === 'weapon') {
      addWeaponItem(character!.id, { itemId, itemName });
    } else {
      addRingItem(character!.id, { itemId, itemName });
    }
    setShowItemPicker(false);
  }

  function handleRemoveItem() {
    if (!itemViewTarget) return;
    if (confirm(`Remove ${itemViewTarget.name}?`)) {
      removeItem(character!.id, itemViewTarget.id);
      setItemViewTarget(null);
    }
  }

  function handleRemoveAction(actionId: string) {
    const action = character!.actions.find((a) => a.id === actionId);
    if (confirm(`Delete ${action?.name ?? 'this action'}? This cannot be undone.`)) {
      removeAction(character!.id, actionId);
    }
  }

  function handleRemoveCalculation(calculationId: string) {
    if (isSystemCalculationId(calculationId)) return; // system calculations can't be removed
    const calculation = character!.calculations.find((c) => c.id === calculationId);
    if (confirm(`Delete ${calculation?.name ?? 'this calculation'}? This cannot be undone.`)) {
      removeCalculation(character!.id, calculationId);
    }
  }

  function handleRemoveModifier(modifierId: string) {
    if (isSystemModifierId(modifierId)) return; // system modifiers can't be removed
    const modifier = character!.modifiers.find((m) => m.id === modifierId);
    if (confirm(`Delete ${modifier?.name ?? 'this modifier'}? This cannot be undone.`)) {
      removeModifier(character!.id, modifierId);
    }
  }

  function handleEquipmentSlotClick(slot: BodySlotId) {
    const equipped = findItemForSlot(character!.items, slot);
    if (equipped) {
      setEquippedSlotViewTarget(slot);
    } else {
      setSlotPickerTarget(slot);
    }
  }

  function handlePickArmorItem(itemId: string, itemName: string) {
    if (slotPickerTarget) equipNewBaseArmorItem(character!.id, slotPickerTarget, { itemId, itemName });
    setSlotPickerTarget(null);
  }

  function handlePickHandItem(pick: { kind: 'shield' | 'weapon'; itemId: string; itemName: string }) {
    if (slotPickerTarget) {
      const { itemId, itemName } = pick;
      if (pick.kind === 'shield') {
        equipNewBaseArmorItem(character!.id, slotPickerTarget, { itemId, itemName });
      } else {
        equipNewWeaponItem(character!.id, slotPickerTarget, { itemId, itemName });
      }
    }
    setSlotPickerTarget(null);
  }

  function handlePickRingItem(itemId: string, itemName: string) {
    if (slotPickerTarget) equipNewRingItem(character!.id, slotPickerTarget, { itemId, itemName });
    setSlotPickerTarget(null);
  }

  function handlePickWondrousItem(itemId: string, itemName: string) {
    if (slotPickerTarget) equipNewWondrousItem(character!.id, slotPickerTarget, { itemId, itemName });
    setSlotPickerTarget(null);
  }

  function handleUnequipSlotItem() {
    if (!equippedSlotViewTarget) return;
    const equipped = findItemForSlot(character!.items, equippedSlotViewTarget);
    if (equipped) unequipItem(character!.id, equipped.id);
    setEquippedSlotViewTarget(null);
  }

  function handleUseEquippedItemCharge() {
    if (!equippedSlotViewTarget) return;
    const equipped = findItemForSlot(character!.items, equippedSlotViewTarget);
    if (equipped) consumeItemCharge(character!.id, equipped.id);
    setEquippedSlotViewTarget(null);
  }

  function handleRechargeEquippedItem() {
    if (!equippedSlotViewTarget) return;
    const equipped = findItemForSlot(character!.items, equippedSlotViewTarget);
    if (equipped) rechargeItem(character!.id, equipped.id);
    setEquippedSlotViewTarget(null);
  }

  function handleEquipItem(slot: BodySlotId) {
    if (!itemViewTarget) return;
    equipItem(character!.id, itemViewTarget.id, slot);
    setItemViewTarget(null);
  }

  function handleUnequipItem() {
    if (!itemViewTarget) return;
    unequipItem(character!.id, itemViewTarget.id);
    setItemViewTarget(null);
  }

  return (
    <div className="page page-has-footer">
      <div className="character-sheet-header">
        <div>
          <h1>{character.name}</h1>
          <span className="class-level-line">
            {character.classLevels.map((cl, i) => (
              <span key={cl.classId}>
                {i > 0 && ' / '}
                {isCasterClass(cl.classId) ? (
                  <button type="button" className="class-level-trigger" onClick={() => setCasterStatsClassId(cl.classId)}>
                    {CLASS_LABELS[cl.classId]} {cl.level}
                  </button>
                ) : (
                  <span>
                    {CLASS_LABELS[cl.classId]} {cl.level}
                  </span>
                )}
              </span>
            ))}
          </span>
          <span className="bab-badge"> · BAB {formatModifier(getTotalBAB(character.classLevels))}</span>
        </div>
        <div className="character-sheet-header-actions">
          <Link to={`/${character.id}/edit`}>Edit Character</Link>
          <Link to="/">All Characters</Link>
        </div>
      </div>

      <div className="character-sheet-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={resolvedTab === 'actions'}
          className={`character-sheet-tab${resolvedTab === 'actions' ? ' character-sheet-tab-active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          Actions
        </button>
        {casterClassLevels.map((cl) => (
          <button
            key={cl.classId}
            type="button"
            role="tab"
            aria-selected={resolvedTab === spellsTabId(cl.classId)}
            className={`character-sheet-tab${resolvedTab === spellsTabId(cl.classId) ? ' character-sheet-tab-active' : ''}`}
            onClick={() => setActiveTab(spellsTabId(cl.classId))}
          >
            Spells{casterClassLevels.length > 1 ? ` (${CLASS_LABELS[cl.classId]})` : ''}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={resolvedTab === 'items'}
          className={`character-sheet-tab${resolvedTab === 'items' ? ' character-sheet-tab-active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items
        </button>
      </div>

      {resolvedTab === 'actions' && (
        <ActionsSection
          modifiers={[...character.modifiers, ...systemModifiers]}
          calculations={[...character.calculations, ...systemCalculations]}
          actions={character.actions}
          onAddModifier={() => setShowAddModifier(true)}
          onAddCalculation={() => setShowAddCalculation(true)}
          onAddAction={() => setShowAddAction(true)}
          onRemoveAction={handleRemoveAction}
        />
      )}

      {resolvedSpellClassId && activeClassLevel && (
        <>
          {CANTRIPS_AT_WILL[resolvedSpellClassId] && (
            <p className="cantrips-at-will-note">
              0-level spells are cast at will (unlimited) for {CLASS_LABELS[resolvedSpellClassId]}s. No slots to
              track.
            </p>
          )}

          <div className="actions-toolbar">
            <button type="button" onClick={() => setShowAddPool(true)} className="button-primary button-theme-spell">
              + Spell
            </button>
            {activeCasterType === 'arcane' && (
              <button type="button" className="button-theme-spell" onClick={() => setShowLearnPicker(true)}>
                + Learn
              </button>
            )}
            {resolvedSpellClassId && CASTING_TYPE[resolvedSpellClassId] === 'spontaneous' && (
              <button type="button" className="button-theme-spell" onClick={() => setShowCastPicker(true)}>
                Cast
              </button>
            )}
            <button
              type="button"
              className="button-theme-spell"
              onClick={() => setShowSpellFocus((v) => !v)}
              aria-pressed={showSpellFocus}
            >
              Spell Focus
            </button>
          </div>

          {showSpellFocus && (
            <SpellFocusSection
              spellFocusSchools={character.spellFocusSchools}
              greaterSpellFocusSchools={character.greaterSpellFocusSchools}
              onChange={(next) => updateCharacter(character.id, next)}
            />
          )}

          <SlotGrid
            character={character}
            tabClassId={resolvedSpellClassId}
            levelSlots={activeComputed.levelSlots}
            levellessPools={activeComputed.levellessPools}
            onSlotClick={(spellLevel, slotInstanceId, poolName) =>
              handleSlotClick(resolvedSpellClassId, spellLevel, slotInstanceId, poolName)
            }
            onRemovePool={(poolId) => removeExtraPool(character.id, poolId)}
          />

          {activeCasterType === 'arcane' && (
            <KnownSpellsSection
              learnedSpells={activeLearnedSpells}
              onUnlearn={(learnedSpellId) => unlearnSpell(character.id, learnedSpellId)}
            />
          )}
        </>
      )}

      {resolvedTab === 'items' && (
        <>
          <div className="actions-toolbar">
            <button type="button" onClick={() => setShowItemPicker(true)} className="button-primary button-theme-item">
              + Item
            </button>
            <button type="button" className="button-theme-item" onClick={() => setShowAddItem(true)}>
              + Custom
            </button>
          </div>

          <EquipmentSlotsGrid items={character.items} onSlotClick={handleEquipmentSlotClick} />

          <EquipmentSection items={character.items} onItemClick={(item) => setItemViewTarget(item)} />
        </>
      )}

      <div className="character-sheet-footer">
        <button type="button" onClick={handleRest} className="button-secondary">
          Rest
        </button>
      </div>

      {showAddPool && resolvedSpellClassId && (
        <AddSlotPoolModal
          defaultClassId={resolvedSpellClassId}
          existingPools={character.extraSlotPools.filter((p) => p.classId === resolvedSpellClassId)}
          onAdd={(name, spellLevel, spells, color) =>
            addExtraPool(character.id, { classId: resolvedSpellClassId, name, spellLevel, count: 1, color }, spells)
          }
          onClose={() => setShowAddPool(false)}
        />
      )}

      {pickerTarget && (
        <SpellPickerModal
          defaultClassId={pickerTarget.classId}
          spellLevel={pickerTarget.spellLevel}
          poolName={pickerTarget.poolName}
          restrictToSpellIds={
            activeCasterType === 'arcane'
              ? character.learnedSpells
                  .filter((s) => s.classId === pickerTarget.classId)
                  .filter((s) => pickerTarget.spellLevel === null || s.spellLevel === pickerTarget.spellLevel)
                  .map((s) => s.spellId)
              : undefined
          }
          onPick={handlePick}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {showLearnPicker && resolvedSpellClassId && (
        <LearnSpellsModal
          classId={resolvedSpellClassId}
          learnedSpellIds={activeLearnedSpells.map((s) => s.spellId)}
          onConfirm={handleLearnConfirm}
          onClose={() => setShowLearnPicker(false)}
        />
      )}

      {showCastPicker && (
        <CastSpellModal
          learnedSpells={activeLearnedSpells}
          onCast={handleCast}
          onClose={() => setShowCastPicker(false)}
        />
      )}

      {viewTarget && (
        <SpellViewModal
          spellId={viewTarget.fill.spellId}
          spellName={viewTarget.fill.spellName}
          used={viewTarget.fill.used}
          character={character}
          tabClassId={viewTarget.classId}
          sourceClassId={viewTarget.fill.sourceClassId}
          slotSpellLevel={viewTarget.spellLevel}
          onToggleUsed={handleToggleUsed}
          onClear={handleClear}
          onClose={() => setViewTarget(null)}
        />
      )}

      {casterStatsClassId &&
        (() => {
          const cl = character.classLevels.find((c) => c.classId === casterStatsClassId);
          if (!cl) return null;
          return (
            <CasterStatsModal
              classId={cl.classId}
              level={cl.level}
              abilityScores={character.abilityScores}
              castingAbility={cl.castingAbility}
              spellcraft={character.spellcraft}
              onClose={() => setCasterStatsClassId(null)}
            />
          );
        })()}

      {showAddItem && (
        <AddItemModal onAdd={(item) => addItem(character.id, item)} onClose={() => setShowAddItem(false)} />
      )}

      {showItemPicker && (
        <ItemPickerModal onPick={handlePickCatalogItem} onClose={() => setShowItemPicker(false)} />
      )}

      {showAddModifier && (
        <AddModifierModal
          onAdd={(modifier) => addModifier(character.id, modifier)}
          onClose={() => setShowAddModifier(false)}
        />
      )}

      {showAddCalculation && (
        <AddCalculationModal
          modifiers={character.modifiers}
          systemModifiers={systemModifiers}
          existingCalculations={[...character.calculations, ...systemCalculations]}
          onAdd={(calculation) => addCalculation(character.id, calculation)}
          onRemoveModifier={handleRemoveModifier}
          onClose={() => setShowAddCalculation(false)}
        />
      )}

      {showAddAction && (
        <AddActionModal
          calculations={[...character.calculations, ...systemCalculations]}
          onAdd={(action) => addAction(character.id, action)}
          onRemoveCalculation={handleRemoveCalculation}
          onClose={() => setShowAddAction(false)}
        />
      )}

      {itemViewTarget && (
        <ItemViewModal
          item={itemViewTarget}
          onUseCharge={handleUseItemCharge}
          onRecharge={handleRechargeItem}
          onRemove={handleRemoveItem}
          onEquip={handleEquipItem}
          onUnequip={handleUnequipItem}
          onClose={() => setItemViewTarget(null)}
        />
      )}

      {slotPickerTarget &&
        (() => {
          const kind = getSlotPickerKind(slotPickerTarget);
          if (kind === 'armor') {
            return (
              <BaseArmorPickerModal
                slot={slotPickerTarget}
                onPick={handlePickArmorItem}
                onClose={() => setSlotPickerTarget(null)}
              />
            );
          }
          if (kind === 'hand') {
            return (
              <HandItemPickerModal
                slot={slotPickerTarget}
                onPick={handlePickHandItem}
                onClose={() => setSlotPickerTarget(null)}
              />
            );
          }
          if (kind === 'ring') {
            return (
              <RingPickerModal
                slot={slotPickerTarget}
                onPick={handlePickRingItem}
                onClose={() => setSlotPickerTarget(null)}
              />
            );
          }
          return (
            <WondrousItemPickerModal
              slot={slotPickerTarget}
              onPick={handlePickWondrousItem}
              onClose={() => setSlotPickerTarget(null)}
            />
          );
        })()}

      {equippedSlotViewTarget &&
        (() => {
          const equipped = findItemForSlot(character.items, equippedSlotViewTarget);
          return equipped ? (
            <EquippedSlotItemModal
              slot={equippedSlotViewTarget}
              item={equipped}
              onUseCharge={handleUseEquippedItemCharge}
              onRecharge={handleRechargeEquippedItem}
              onUnequip={handleUnequipSlotItem}
              onClose={() => setEquippedSlotViewTarget(null)}
            />
          ) : null;
        })()}
    </div>
  );
}
