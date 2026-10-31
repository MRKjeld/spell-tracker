import { Modal } from '../common/Modal';
import { getSpellById } from '../../data/spells';
import { SpellDetails } from './SpellDetails';
import type { AbilityId, ClassId } from '../../data/classes';
import { abilityModifier } from '../../data/bonusSpells';
import { computeSpellSaveDC, hasSavingThrow } from '../../lib/casterStats';
import { schoolThemeColor } from '../../data/schoolThemes';
import type { Character } from '../../state/types';

interface SpellViewModalProps {
  spellId: string;
  spellName: string;
  used: boolean;
  character: Character;
  // The class whose Spells tab this slot belongs to -- provides the caster
  // level/casting ability used below, distinct from sourceClassId (which
  // class's list the spell itself was picked from).
  tabClassId: ClassId;
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
  tabClassId,
  sourceClassId,
  slotSpellLevel,
  onToggleUsed,
  onClear,
  onClose,
}: SpellViewModalProps) {
  const spell = getSpellById(spellId);
  const classLevel = character.classLevels.find((cl) => cl.classId === tabClassId);

  let saveDC: number | undefined;
  if (spell && hasSavingThrow(spell.savingThrow)) {
    const effectiveClassId = sourceClassId ?? tabClassId;
    const effectiveSpellLevel = slotSpellLevel ?? spell.levels[effectiveClassId] ?? 0;
    const castingAbility: AbilityId = classLevel?.castingAbility ?? 'str';
    const castingAbilityModifier = abilityModifier(character.abilityScores[castingAbility]);
    const hasSpellFocus = character.spellFocusSchools.includes(spell.school);
    const hasGreaterSpellFocus = character.greaterSpellFocusSchools.includes(spell.school);
    saveDC = computeSpellSaveDC(effectiveSpellLevel, castingAbilityModifier, hasSpellFocus, hasGreaterSpellFocus);
  }

  return (
    <Modal title={spellName} onClose={onClose} accentColor={spell ? schoolThemeColor(spell.school) : undefined}>
      <div className="spell-view-scroll">
        {spell ? (
          <SpellDetails spell={spell} saveDC={saveDC} casterLevel={classLevel?.level} themed />
        ) : (
          <p>Spell details not found.</p>
        )}
      </div>
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
