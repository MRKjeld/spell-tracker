import { CLASS_LABELS } from '../../data/classes';
import type { ClassId } from '../../data/classes';
import { humanizeTag, SCHOOL_LABELS } from '../../data/spells';
import type { SpellEntry } from '../../data/spells';
import { schoolThemeColor } from '../../data/schoolThemes';
import { annotateSpellDuration, annotateSpellRange } from '../../lib/spellText';

function formatLevels(spell: SpellEntry): string {
  return Object.entries(spell.levels)
    .map(([classId, level]) => `${CLASS_LABELS[classId as ClassId]} ${level}`)
    .join(', ');
}

export function SpellDetails({
  spell,
  saveDC,
  casterLevel,
  themed = false,
}: {
  spell: SpellEntry;
  saveDC?: number;
  casterLevel?: number;
  themed?: boolean;
}) {
  const schoolLine = [
    SCHOOL_LABELS[spell.school] ?? spell.school,
    ...spell.subschool.map(humanizeTag),
  ].join(', ');
  const descriptorLine = spell.descriptors.map(humanizeTag).join(', ');
  const schoolColor = schoolThemeColor(spell.school);
  const rangeText = casterLevel !== undefined ? annotateSpellRange(spell.range, casterLevel) : spell.range;
  const durationText =
    casterLevel !== undefined ? annotateSpellDuration(spell.duration, casterLevel) : spell.duration;

  return (
    <div
      className={themed ? 'spell-picker-details spell-details-themed' : 'spell-picker-details'}
      style={themed ? { borderLeftColor: schoolColor } : undefined}
    >
      <p>
        <strong>School:</strong> <span style={themed ? { color: schoolColor } : undefined}>{schoolLine}</span>
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
        <strong>Range:</strong> {rangeText}
      </p>
      {spell.effect && (
        <p>
          <strong>Effect:</strong> {spell.effect}
        </p>
      )}
      <p>
        <strong>Duration:</strong> {durationText}
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
