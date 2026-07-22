import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CANTRIPS_AT_WILL, CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { computeSlots } from '../../lib/slotMath';
import type { SlotFill } from '../../state/types';
import { SlotGrid } from './SlotGrid';
import { AddSlotPoolModal } from './AddSlotPoolModal';
import { SpellPickerModal } from './SpellPickerModal';
import { SpellViewModal } from './SpellViewModal';

export function CharacterSheet() {
  const { id } = useParams();
  const character = useCharacterStore((s) => (id ? s.characters[id] : undefined));
  const addExtraPool = useCharacterStore((s) => s.addExtraPool);
  const removeExtraPool = useCharacterStore((s) => s.removeExtraPool);
  const fillSlot = useCharacterStore((s) => s.fillSlot);
  const setSlotUsed = useCharacterStore((s) => s.setSlotUsed);
  const restCharacter = useCharacterStore((s) => s.restCharacter);
  const clearAllSlots = useCharacterStore((s) => s.clearAllSlots);

  const [showAddPool, setShowAddPool] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    spellLevel: number | null;
    poolName?: string;
    slotInstanceId: string;
  } | null>(null);
  const [viewTarget, setViewTarget] = useState<{ slotInstanceId: string; fill: SlotFill } | null>(null);

  const computed = useMemo(() => {
    if (!character) return { levelSlots: [], levellessPools: [] };
    return computeSlots(character.classId, character.level, character.abilityScores, character.extraSlotPools);
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
      setViewTarget({ slotInstanceId, fill });
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

  function handlePick(spellId: string, spellName: string, sourceClassId: ClassId | null, persistAfterRest: boolean) {
    if (pickerTarget) {
      fillSlot(character!.id, pickerTarget.slotInstanceId, {
        spellId,
        spellName,
        sourceClassId,
        used: false,
        persistAfterRest,
      });
    }
    setPickerTarget(null);
  }

  function handleRest() {
    if (confirm('Rest and clear all spells not marked "Persist after rest"?')) {
      restCharacter(character!.id);
    }
  }

  function handleClearAll() {
    if (confirm('Clear ALL spells, including those marked "Persist after rest"?')) {
      clearAllSlots(character!.id);
    }
  }

  return (
    <div className="page page-has-footer">
      <div className="character-sheet-header">
        <div>
          <h1>{character.name}</h1>
          <p>
            {CLASS_LABELS[character.classId]} {character.level}
          </p>
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
        + Add Spell Slots
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
        <button type="button" onClick={handleClearAll} className="button-danger">
          Clear All
        </button>
      </div>

      {showAddPool && (
        <AddSlotPoolModal
          defaultClassId={character.classId}
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
          onToggleUsed={handleToggleUsed}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
