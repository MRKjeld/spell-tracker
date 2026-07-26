import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CLASS_IDS, CLASS_LABELS, isCasterClass } from '../../data/classes';
import type { AbilityId, ClassId } from '../../data/classes';
import { NumberInput } from '../common/NumberInput';
import { createDefaultClassLevel, defaultCastingAbilityFor } from '../../lib/classLevels';
import type { ClassLevelEntry } from '../../state/types';

const ABILITIES: { id: AbilityId; label: string }[] = [
  { id: 'str', label: 'Strength' },
  { id: 'dex', label: 'Dexterity' },
  { id: 'con', label: 'Constitution' },
  { id: 'int', label: 'Intelligence' },
  { id: 'wis', label: 'Wisdom' },
  { id: 'cha', label: 'Charisma' },
];

const CASTING_ABILITIES: { id: AbilityId; label: string }[] = [
  { id: 'int', label: 'Intelligence' },
  { id: 'wis', label: 'Wisdom' },
  { id: 'cha', label: 'Charisma' },
];

interface CharacterFormProps {
  mode: 'create' | 'edit';
}

export function CharacterForm({ mode }: CharacterFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const characters = useCharacterStore((s) => s.characters);
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);

  const existing = mode === 'edit' && id ? characters[id] : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [classLevels, setClassLevels] = useState<ClassLevelEntry[]>(
    existing?.classLevels ?? [createDefaultClassLevel('wizard')],
  );
  const [abilityScores, setAbilityScores] = useState<Record<AbilityId, number>>(
    existing?.abilityScores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  );

  const usedClassIds = new Set(classLevels.map((cl) => cl.classId));
  const canAddClass = usedClassIds.size < CLASS_IDS.length;

  function updateClassLevel(index: number, patch: Partial<ClassLevelEntry>) {
    setClassLevels((prev) => prev.map((cl, i) => (i === index ? { ...cl, ...patch } : cl)));
  }

  function handleClassChange(index: number, newClassId: ClassId) {
    updateClassLevel(index, { classId: newClassId, castingAbility: defaultCastingAbilityFor(newClassId) });
  }

  function addClassLevel() {
    const nextClassId = CLASS_IDS.find((id) => !usedClassIds.has(id));
    if (!nextClassId) return;
    setClassLevels((prev) => [...prev, createDefaultClassLevel(nextClassId)]);
  }

  function removeClassLevel(index: number) {
    setClassLevels((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'create') {
      const newId = createCharacter({
        name,
        classLevels,
        abilityScores,
        spellcraft: 0,
        spellFocusSchools: [],
        greaterSpellFocusSchools: [],
      });
      navigate(`/${newId}`);
    } else if (existing) {
      updateCharacter(existing.id, { name, classLevels, abilityScores });
      navigate(`/${existing.id}`);
    }
  }

  return (
    <div className="page">
      <h1>{mode === 'create' ? 'New Character' : `Edit ${existing?.name}`}</h1>
      <form onSubmit={handleSubmit} className="character-form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <fieldset className="class-levels-fieldset">
          <legend>Classes</legend>
          {classLevels.map((cl, index) => (
            <div className="form-row class-level-row" key={index}>
              <label>
                Class
                <select value={cl.classId} onChange={(e) => handleClassChange(index, e.target.value as ClassId)}>
                  {CLASS_IDS.filter((id) => id === cl.classId || !usedClassIds.has(id)).map((id) => (
                    <option key={id} value={id}>
                      {CLASS_LABELS[id]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Level
                <NumberInput
                  min={1}
                  max={20}
                  value={cl.level}
                  onChange={(next) => updateClassLevel(index, { level: next })}
                />
              </label>

              {isCasterClass(cl.classId) && (
                <label>
                  Caster Modifier
                  <select
                    value={cl.castingAbility}
                    onChange={(e) => updateClassLevel(index, { castingAbility: e.target.value as AbilityId })}
                  >
                    {CASTING_ABILITIES.map(({ id, label }) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {classLevels.length > 1 && (
                <button type="button" onClick={() => removeClassLevel(index)} title="Remove class">
                  ×
                </button>
              )}
            </div>
          ))}
          {canAddClass && (
            <button type="button" onClick={addClassLevel}>
              + Add Class
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend>Ability Scores</legend>
          {ABILITIES.map(({ id, label }) => (
            <label key={id}>
              {label}
              <NumberInput
                min={1}
                max={30}
                value={abilityScores[id]}
                onChange={(next) => setAbilityScores((prev) => ({ ...prev, [id]: next }))}
              />
            </label>
          ))}
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="button-primary">
            {mode === 'create' ? 'Create Character' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
