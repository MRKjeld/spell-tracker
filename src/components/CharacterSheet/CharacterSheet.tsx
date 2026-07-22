import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CANTRIPS_AT_WILL, CASTING_ABILITY, CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { computeSlots } from '../../lib/slotMath';
import type { SlotFill } from '../../state/types';
import { SlotGrid } from './SlotGrid';
import { AddSlotPoolModal } from './AddSlotPoolModal';
import { SpellPickerModal } from './SpellPickerModal';
import { SpellViewModal } from './SpellViewModal';
import { CasterStatsModal } from './CasterStatsModal';

export function CharacterSheet() {
  const { id } = useParams();
  const character = useCharacterStore((s) => (id ? s.characters[id] : undefined));
  const addExtraPool = useCharacterStore((s) => s.addExtraPool);
  const removeExtraPool = useCharacterStore((s) => s.removeExtraPool);
  const fillSlot = useCharacterStore((s) => s.fillSlot);
  const clearSlot = useCharacterStore((s) => s.clearSlot);
  const setSlotUsed = useCharacterStore((s) => s.setSlotUsed);
  const restCharacter = useCharacterStore((s) => s.restCharacter);

  const [showAddPool, setShowAddPool] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    spellLevel: number | null;
    poolName?: string;
    slotInstanceId: string;
  } | null>(null);
  const [viewTarget, setViewTarget] = useState<{
    slotInstanceId: string;
    fill: SlotFill;
    spellLevel: number | null;
  } | null>(null);
  const [showCasterStats, setShowCasterStats] = useState(false);

  const computed = useMemo(() => {
    if (!character) return { levelSlots: [], levellessPools: [] };
    // Older persisted characters predate this field, so fall back to the class default.
    const castingAbility = character.castingAbility ?? CASTING_ABILITY[character.classId];
    return computeSlots(
      character.classId,
      character.level,
      character.abilityScores,
      character.extraSlotPools,
      castingAbility,
    );
  }, [character]);

  if (!character) {
    return (
      <div className="page">
        <p>Character not found.</p>
        <Link to="/">Back to characters</Link>
      </div>
    );
  }

  function handleSlotClick(spellLevel: number | null, slotInstanceId: string, poolName?: string) {
    const fill = character!.slotFills[slotInstanceId];
    if (fill) {
      setViewTarget({ slotInstanceId, fill, spellLevel });
    } else {
      setPickerTarget({ spellLevel, poolName, slotInstanceId });
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

  function handleRest() {
    if (confirm('Rest and clear all spells not marked "Persist after rest"?')) {
      restCharacter(character!.id);
    }
  }

  return (
    <div className="page page-has-footer">
      <div className="character-sheet-header">
        <div>
          <h1>{character.name}</h1>
          <button type="button" className="class-level-trigger" onClick={() => setShowCasterStats(true)}>
            {CLASS_LABELS[character.classId]} {character.level}
          </button>
        </div>
        <div className="character-sheet-header-actions">
          <Link to={`/${character.id}/edit`}>Edit Character</Link>
          <Link to="/">All Characters</Link>
        </div>
      </div>

      {CANTRIPS_AT_WILL[character.classId] && (
        <p className="cantrips-at-will-note">
          0-level spells are cast at will (unlimited) for {CLASS_LABELS[character.classId]}s — no slots to track.
        </p>
      )}

      <button type="button" onClick={() => setShowAddPool(true)} className="button-primary">
        + Add Spell
      </button>

      <SlotGrid
        character={character}
        levelSlots={computed.levelSlots}
        levellessPools={computed.levellessPools}
        onSlotClick={handleSlotClick}
        onRemovePool={(poolId) => removeExtraPool(character.id, poolId)}
      />

      <div className="character-sheet-footer">
        <button type="button" onClick={handleRest} className="button-secondary">
          Rest
        </button>
      </div>

      {showAddPool && (
        <AddSlotPoolModal
          defaultClassId={character.classId}
          existingPools={character.extraSlotPools}
          onAdd={(name, spellLevel, spells, color) =>
            addExtraPool(character.id, { name, spellLevel, count: 1, color }, spells)
          }
          onClose={() => setShowAddPool(false)}
        />
      )}

      {pickerTarget && (
        <SpellPickerModal
          defaultClassId={character.classId}
          spellLevel={pickerTarget.spellLevel}
          poolName={pickerTarget.poolName}
          onPick={handlePick}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {viewTarget && (
        <SpellViewModal
          spellId={viewTarget.fill.spellId}
          spellName={viewTarget.fill.spellName}
          used={viewTarget.fill.used}
          character={character}
          sourceClassId={viewTarget.fill.sourceClassId}
          slotSpellLevel={viewTarget.spellLevel}
          onToggleUsed={handleToggleUsed}
          onClear={handleClear}
          onClose={() => setViewTarget(null)}
        />
      )}

      {showCasterStats && (
        <CasterStatsModal
          classId={character.classId}
          level={character.level}
          abilityScores={character.abilityScores}
          castingAbility={character.castingAbility ?? CASTING_ABILITY[character.classId]}
          spellcraft={character.spellcraft}
          onClose={() => setShowCasterStats(false)}
        />
      )}
    </div>
  );
}
