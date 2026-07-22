import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CASTING_ABILITY, CLASS_IDS, CLASS_LABELS } from '../../data/classes';
import type { AbilityId, ClassId } from '../../data/classes';
import { SCHOOL_LABELS } from '../../data/spells';

// Universal has no school proper, so it isn't a valid Spell Focus target.
const FOCUSABLE_SCHOOLS = Object.keys(SCHOOL_LABELS).filter((school) => school !== 'uni');

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
  const [classId, setClassId] = useState<ClassId>(existing?.classId ?? 'wizard');
  const [castingAbility, setCastingAbility] = useState<AbilityId>(
    existing?.castingAbility ?? CASTING_ABILITY[existing?.classId ?? 'wizard'],
  );
  const [level, setLevel] = useState(existing?.level ?? 1);
  const [abilityScores, setAbilityScores] = useState<Record<AbilityId, number>>(
    existing?.abilityScores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  );
  const [spellcraft, setSpellcraft] = useState(existing?.spellcraft ?? 0);
  const [spellFocusSchools, setSpellFocusSchools] = useState<string[]>(
    existing?.spellFocusSchools ?? [],
  );
  const [greaterSpellFocusSchools, setGreaterSpellFocusSchools] = useState<string[]>(
    existing?.greaterSpellFocusSchools ?? [],
  );
  const [showSpellFocusPicker, setShowSpellFocusPicker] = useState(false);
  const [showGreaterSpellFocusPicker, setShowGreaterSpellFocusPicker] = useState(false);

  function handleClassChange(newClassId: ClassId) {
    setClassId(newClassId);
    setCastingAbility(CASTING_ABILITY[newClassId]);
  }

  function addSpellFocusSchool(school: string) {
    setSpellFocusSchools((prev) => (prev.includes(school) ? prev : [...prev, school]));
    setShowSpellFocusPicker(false);
  }

  function removeSpellFocusSchool(school: string) {
    setSpellFocusSchools((prev) => prev.filter((s) => s !== school));
    // Greater Spell Focus requires Spell Focus in the same school.
    setGreaterSpellFocusSchools((prev) => prev.filter((s) => s !== school));
  }

  function addGreaterSpellFocusSchool(school: string) {
    setGreaterSpellFocusSchools((prev) => (prev.includes(school) ? prev : [...prev, school]));
    setSpellFocusSchools((prev) => (prev.includes(school) ? prev : [...prev, school]));
    setShowGreaterSpellFocusPicker(false);
  }

  function removeGreaterSpellFocusSchool(school: string) {
    setGreaterSpellFocusSchools((prev) => prev.filter((s) => s !== school));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      classId,
      level,
      abilityScores,
      castingAbility,
      spellcraft,
      spellFocusSchools,
      greaterSpellFocusSchools,
    };
    if (mode === 'create') {
      const newId = createCharacter(payload);
      navigate(`/${newId}`);
    } else if (existing) {
      updateCharacter(existing.id, payload);
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

        <div className="form-row">
          <label>
            Spell Casting Class
            <select value={classId} onChange={(e) => handleClassChange(e.target.value as ClassId)}>
              {CLASS_IDS.map((id) => (
                <option key={id} value={id}>
                  {CLASS_LABELS[id]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Caster Modifier
            <select value={castingAbility} onChange={(e) => setCastingAbility(e.target.value as AbilityId)}>
              {CASTING_ABILITIES.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

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

        <label>
          Spellcraft
          <input
            type="number"
            min={0}
            value={spellcraft}
            onChange={(e) => setSpellcraft(Number(e.target.value))}
          />
        </label>

        <div className="school-focus-field">
          <div className="school-focus-header">
            <span>Spell Focus</span>
            {spellFocusSchools.length < FOCUSABLE_SCHOOLS.length && (
              <button type="button" onClick={() => setShowSpellFocusPicker((v) => !v)}>
                + Add
              </button>
            )}
          </div>
          {showSpellFocusPicker && (
            <ul className="school-focus-options">
              {FOCUSABLE_SCHOOLS.filter((s) => !spellFocusSchools.includes(s)).map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => addSpellFocusSchool(s)}>
                    {SCHOOL_LABELS[s]}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {spellFocusSchools.length > 0 && (
            <ul className="school-focus-list">
              {spellFocusSchools.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="school-focus-tag"
                    onClick={() => removeSpellFocusSchool(s)}
                    title={`Remove ${SCHOOL_LABELS[s]}`}
                  >
                    {SCHOOL_LABELS[s]} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="school-focus-field">
          <div className="school-focus-header">
            <span>Greater Spell Focus</span>
            {greaterSpellFocusSchools.length < FOCUSABLE_SCHOOLS.length && (
              <button type="button" onClick={() => setShowGreaterSpellFocusPicker((v) => !v)}>
                + Add
              </button>
            )}
          </div>
          {showGreaterSpellFocusPicker && (
            <ul className="school-focus-options">
              {FOCUSABLE_SCHOOLS.filter((s) => !greaterSpellFocusSchools.includes(s)).map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => addGreaterSpellFocusSchool(s)}>
                    {SCHOOL_LABELS[s]}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {greaterSpellFocusSchools.length > 0 && (
            <ul className="school-focus-list">
              {greaterSpellFocusSchools.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="school-focus-tag"
                    onClick={() => removeGreaterSpellFocusSchool(s)}
                    title={`Remove ${SCHOOL_LABELS[s]}`}
                  >
                    {SCHOOL_LABELS[s]} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
