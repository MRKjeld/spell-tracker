import { useRef } from 'react';
import { useCharacterStore } from '../state/characterStore';
import { exportCharacters, parseImportFile } from '../lib/importExport';
import type { Character } from '../state/types';

export function ImportExportControls({ characters }: { characters: Character[] }) {
  const addCharacters = useCharacterStore((s) => s.addCharacters);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imported = await parseImportFile(file);
      if (confirm(`Import ${imported.length} character(s)?`)) {
        addCharacters(imported);
      }
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="import-export-controls">
      <button type="button" onClick={() => exportCharacters(characters)} disabled={characters.length === 0}>
        Export All
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        Import
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
    </div>
  );
}
