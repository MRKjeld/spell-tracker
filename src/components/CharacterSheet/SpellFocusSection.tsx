import { useState } from 'react';
import type { CSSProperties } from 'react';
import { SCHOOL_LABELS } from '../../data/spells';
import { schoolThemeColor, schoolThemeTextColor } from '../../data/schoolThemes';

// Universal has no school proper, so it isn't a valid Spell Focus target.
const FOCUSABLE_SCHOOLS = Object.keys(SCHOOL_LABELS).filter((school) => school !== 'uni');

interface SpellFocusSectionProps {
  spellFocusSchools: string[];
  greaterSpellFocusSchools: string[];
  onChange: (next: { spellFocusSchools: string[]; greaterSpellFocusSchools: string[] }) => void;
}

// Spell Focus / Greater Spell Focus live on the character, not any one class,
// so a multiclassed spellcaster sees and edits the same two lists no matter
// which class's Spells tab they're on (see CharacterSheet).
export function SpellFocusSection({ spellFocusSchools, greaterSpellFocusSchools, onChange }: SpellFocusSectionProps) {
  const [showSpellFocusPicker, setShowSpellFocusPicker] = useState(false);
  const [showGreaterSpellFocusPicker, setShowGreaterSpellFocusPicker] = useState(false);

  function addSpellFocusSchool(school: string) {
    if (!spellFocusSchools.includes(school)) {
      onChange({ spellFocusSchools: [...spellFocusSchools, school], greaterSpellFocusSchools });
    }
    setShowSpellFocusPicker(false);
  }

  function removeSpellFocusSchool(school: string) {
    onChange({
      spellFocusSchools: spellFocusSchools.filter((s) => s !== school),
      // Greater Spell Focus requires Spell Focus in the same school.
      greaterSpellFocusSchools: greaterSpellFocusSchools.filter((s) => s !== school),
    });
  }

  function addGreaterSpellFocusSchool(school: string) {
    onChange({
      spellFocusSchools: spellFocusSchools.includes(school) ? spellFocusSchools : [...spellFocusSchools, school],
      greaterSpellFocusSchools: greaterSpellFocusSchools.includes(school)
        ? greaterSpellFocusSchools
        : [...greaterSpellFocusSchools, school],
    });
    setShowGreaterSpellFocusPicker(false);
  }

  function removeGreaterSpellFocusSchool(school: string) {
    onChange({ spellFocusSchools, greaterSpellFocusSchools: greaterSpellFocusSchools.filter((s) => s !== school) });
  }

  return (
    <div className="spell-focus-section">
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
                <button
                  type="button"
                  onClick={() => addSpellFocusSchool(s)}
                  style={{ '--school-color': schoolThemeColor(s) } as CSSProperties}
                >
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
                  style={{ backgroundColor: schoolThemeColor(s), color: schoolThemeTextColor(s) }}
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
                <button
                  type="button"
                  onClick={() => addGreaterSpellFocusSchool(s)}
                  style={{ '--school-color': schoolThemeColor(s) } as CSSProperties}
                >
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
                  style={{ backgroundColor: schoolThemeColor(s), color: schoolThemeTextColor(s) }}
                >
                  {SCHOOL_LABELS[s]} ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
