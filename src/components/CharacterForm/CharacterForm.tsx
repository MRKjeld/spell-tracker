import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CLASS_IDS, CLASS_LABELS } from '../../data/classes';
import type { AbilityId, ClassId } from '../../data/classes';

const ABILITIES: { id: AbilityId; label: string }[] = [
  { id: 'str', label: 'Strength' },
  { id: 'dex', label: 'Dexterity' },
  { id: 'con', label: 'Constitution' },
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
  const [classId, setClassId] = useState<ClassId>(existing?.classId ?? 'wizard');
  const [level, setLevel] = useState(existing?.level ?? 1);
  const [abilityScores, setAbilityScores] = useState<Record<AbilityId, number>>(
    existing?.abilityScores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'create') {
      const newId = createCharacter({ name, classId, level, abilityScores });
      navigate(`/${newId}`);
    } else if (existing) {
      updateCharacter(existing.id, { name, classId, level, abilityScores });
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

        <label>
          Spell Casting Class
          <select value={classId} onChange={(e) => setClassId(e.target.value as ClassId)}>
            {CLASS_IDS.map((id) => (
              <option key={id} value={id}>
                {CLASS_LABELS[id]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Level
          <input
            type="number"
            min={1}
            max={20}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          />
        </label>

        <fieldset>
          <legend>Ability Scores</legend>
          {ABILITIES.map(({ id, label }) => (
            <label key={id}>
              {label}
              <input
                type="number"
                min={1}
                max={30}
                value={abilityScores[id]}
                onChange={(e) =>
                  setAbilityScores((prev) => ({ ...prev, [id]: Number(e.target.value) }))
                }
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
