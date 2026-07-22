import { Modal } from '../common/Modal';
import type { AbilityId, ClassId } from '../../data/classes';
import { CLASS_LABELS } from '../../data/classes';
import { computeCasterStats, formatModifier } from '../../lib/casterStats';

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

interface CasterStatsModalProps {
  classId: ClassId;
  level: number;
  abilityScores: Record<AbilityId, number>;
  castingAbility: AbilityId;
  spellcraft: number;
  onClose: () => void;
}

export function CasterStatsModal({
  classId,
  level,
  abilityScores,
  castingAbility,
  spellcraft,
  onClose,
}: CasterStatsModalProps) {
  const stats = computeCasterStats(classId, level, abilityScores, castingAbility, spellcraft);

  return (
    <Modal title={`${CLASS_LABELS[classId]} ${level} — Caster Stats`} onClose={onClose}>
      <div className="caster-stats">
        <p>
          <strong>Caster Level:</strong> {stats.casterLevel}
        </p>
        <p>
          <strong>Casting Ability:</strong> {ABILITY_LABELS[castingAbility]} (
          {formatModifier(stats.castingAbilityModifier)})
        </p>
        <p>
          <strong>Concentration Check:</strong> {formatModifier(stats.concentrationCheck)}
        </p>
        <p>
          <strong>Spellcraft Check:</strong> {formatModifier(stats.spellcraftCheck)}
        </p>

        <h3>Spell Save DCs</h3>
        <table className="caster-stats-table">
          <thead>
            <tr>
              <th>Spell Level</th>
              <th>DC</th>
            </tr>
          </thead>
          <tbody>
            {stats.spellDCsByLevel.map(({ spellLevel, dc }) => (
              <tr key={spellLevel}>
                <td>{spellLevel}</td>
                <td>{dc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Spell Range</h3>
        <table className="caster-stats-table">
          <tbody>
            <tr>
              <td>Close</td>
              <td>{stats.rangeCloseFt} ft.</td>
            </tr>
            <tr>
              <td>Medium</td>
              <td>{stats.rangeMediumFt} ft.</td>
            </tr>
            <tr>
              <td>Long</td>
              <td>{stats.rangeLongFt} ft.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
