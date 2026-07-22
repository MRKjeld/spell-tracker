import { Modal } from '../common/Modal';
import { getSpellById } from '../../data/spells';
import { SpellDetails } from './SpellDetails';
import type { AbilityId, ClassId } from '../../data/classes';
import { CASTING_ABILITY } from '../../data/classes';
import { abilityModifier } from '../../data/bonusSpells';
import { computeSpellSaveDC, hasSavingThrow } from '../../lib/casterStats';
import type { Character } from '../../state/types';

interface SpellViewModalProps {
  spellId: string;
  spellName: string;
  used: boolean;
  character: Character;
  sourceClassId: ClassId | null;
  slotSpellLevel: number | null;
  onToggleUsed: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function SpellViewModal({
  spellId,
  spellName,
  used,
  character,
  sourceClassId,
  slotSpellLevel,
  onToggleUsed,
  onClear,
  onClose,
}: SpellViewModalProps) {
  const spell = getSpellById(spellId);

  let saveDC: number | undefined;
  if (spell && hasSavingThrow(spell.savingThrow)) {
    const effectiveClassId = sourceClassId ?? character.classId;
    const effectiveSpellLevel = slotSpellLevel ?? spell.levels[effectiveClassId] ?? 0;
    const castingAbility: AbilityId = character.castingAbility ?? CASTING_ABILITY[character.classId];
    const castingAbilityModifier = abilityModifier(character.abilityScores[castingAbility]);
    const hasSpellFocus = character.spellFocusSchools.includes(spell.school);
    const hasGreaterSpellFocus = character.greaterSpellFocusSchools.includes(spell.school);
    saveDC = computeSpellSaveDC(effectiveSpellLevel, castingAbilityModifier, hasSpellFocus, hasGreaterSpellFocus);
  }

  return (
    <Modal title={spellName} onClose={onClose}>
      {spell ? <SpellDetails spell={spell} saveDC={saveDC} /> : <p>Spell details not found.</p>}
      <div className="spell-view-actions">
        <button type="button" className="button-danger" onClick={onClear}>
          Clear
        </button>
        <button type="button" className={used ? 'button-secondary' : 'button-primary'} onClick={onToggleUsed}>
          {used ? 'Unuse' : 'Use'}
        </button>
        <button type="button" className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
