import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CANTRIPS_AT_WILL, CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { computeSlots } from '../../lib/slotMath';
import { SlotGrid } from './SlotGrid';
import { AddSlotPoolModal } from './AddSlotPoolModal';
import { SpellPickerModal } from './SpellPickerModal';

export function CharacterSheet() {
  const { id } = useParams();
  const character = useCharacterStore((s) => (id ? s.characters[id] : undefined));
  const addExtraPool = useCharacterStore((s) => s.addExtraPool);
  const removeExtraPool = useCharacterStore((s) => s.removeExtraPool);
  const fillSlot = useCharacterStore((s) => s.fillSlot);
  const clearSlot = useCharacterStore((s) => s.clearSlot);

  const [showAddPool, setShowAddPool] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    spellLevel: number | null;
    poolName?: string;
    slotInstanceId: string;
  } | null>(null);

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
    if (character!.slotFills[slotInstanceId]) {
      if (confirm('Clear this slot?')) clearSlot(character!.id, slotInstanceId);
    } else {
      setPickerTarget({ spellLevel, poolName, slotInstanceId });
    }
  }

  function handlePick(spellId: string, spellName: string, sourceClassId: ClassId | null) {
    if (pickerTarget) {
      fillSlot(character!.id, pickerTarget.slotInstanceId, { spellId, spellName, sourceClassId });
    }
    setPickerTarget(null);
  }

  return (
    <div className="page">
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

      {showAddPool && (
        <AddSlotPoolModal
          onAdd={(name, spellLevel, count) => addExtraPool(character.id, { name, spellLevel, count })}
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
    </div>
  );
}
