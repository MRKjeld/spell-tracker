import { CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { humanizeTag, SCHOOL_LABELS } from '../../data/spells';
import type { SpellEntry } from '../../data/spells';

function formatLevels(spell: SpellEntry): string {
  return Object.entries(spell.levels)
    .map(([classId, level]) => `${CLASS_LABELS[classId as ClassId]} ${level}`)
    .join(', ');
}

export function SpellDetails({ spell, saveDC }: { spell: SpellEntry; saveDC?: number }) {
  const schoolLine = [
    SCHOOL_LABELS[spell.school] ?? spell.school,
    ...spell.subschool.map(humanizeTag),
  ].join(', ');
  const descriptorLine = spell.descriptors.map(humanizeTag).join(', ');

  return (
    <div className="spell-picker-details">
      <p>
        <strong>School:</strong> {schoolLine}
        {descriptorLine && ` (${descriptorLine})`}
      </p>
      <p>
        <strong>Level:</strong> {formatLevels(spell)}
      </p>
      <p>
        <strong>Casting Time:</strong> {spell.castingTime}
      </p>
      <p>
        <strong>Components:</strong> {spell.components}
      </p>
      <p>
        <strong>Range:</strong> {spell.range}
      </p>
      {spell.effect && (
        <p>
          <strong>Effect:</strong> {spell.effect}
        </p>
      )}
      <p>
        <strong>Duration:</strong> {spell.duration}
      </p>
      <p>
        <strong>Saving Throw:</strong> {spell.savingThrow || 'No'}
      </p>
      {saveDC !== undefined && (
        <p>
          <strong>Spell Save DC:</strong> {saveDC}
        </p>
      )}
      <p>
        <strong>Spell Resistance:</strong> {spell.spellResistance || 'No'}
      </p>
      <p className="spell-picker-description">{spell.description || 'No description available.'}</p>
    </div>
  );
}
