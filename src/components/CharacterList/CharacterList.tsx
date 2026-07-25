import { Link } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterStore';
import { CLASS_LABELS } from '../../data/classes';
import { ImportExportControls } from '../ImportExportControls';

function classSummary(classLevels: { classId: keyof typeof CLASS_LABELS; level: number }[]): string {
  return classLevels.map((cl) => `${CLASS_LABELS[cl.classId]} ${cl.level}`).join(' / ');
}

export function CharacterList() {
  const characters = useCharacterStore((s) => s.characters);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);
  const list = Object.values(characters).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <h1>My Characters</h1>

      {list.length === 0 && <p>No characters yet. Create one to get started.</p>}

      <ul className="character-list">
        {list.map((c) => (
          <li key={c.id} className="character-list-row">
            <Link to={`/${c.id}`}>
              {c.name} ({classSummary(c.classLevels)})
            </Link>
            <span className="character-list-actions">
              <Link to={`/${c.id}/edit`}>Edit</Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete ${c.name}?`)) deleteCharacter(c.id);
                }}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="character-list-footer">
        <Link to="/new" className="button-primary">
          + New Character
        </Link>
        <ImportExportControls characters={list} />
      </div>
    </div>
  );
}
