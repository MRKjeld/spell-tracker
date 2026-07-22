import { CLASS_IDS } from '../data/classes';
import { createId } from './id';
import type { Character } from '../state/types';

interface ExportPayload {
  schemaVersion: 1;
  exportedAt: string;
  characters: Character[];
}

export function exportCharacters(characters: Character[]): void {
  const payload: ExportPayload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    characters,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pf1e-spell-tracker-export-${payload.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function isValidCharacter(value: unknown): value is Character {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Partial<Character>;
  return (
    typeof c.name === 'string' &&
    typeof c.classId === 'string' &&
    (CLASS_IDS as string[]).includes(c.classId) &&
    typeof c.level === 'number' &&
    c.level >= 1 &&
    c.level <= 20 &&
    typeof c.abilityScores === 'object' &&
    c.abilityScores !== null
  );
}

export async function parseImportFile(file: File): Promise<Character[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const rawCharacters = Array.isArray(parsed) ? parsed : parsed?.characters;
  if (!Array.isArray(rawCharacters)) {
    throw new Error('Import file does not contain a characters array.');
  }

  const valid = rawCharacters.filter(isValidCharacter);
  if (valid.length === 0) {
    throw new Error('No valid characters found in import file.');
  }

  const now = new Date().toISOString();
  // Always assign fresh ids so importing never clobbers an existing character.
  return valid.map((c) => ({
    ...c,
    id: createId(),
    extraSlotPools: c.extraSlotPools ?? [],
    slotFills: c.slotFills ?? {},
    items: c.items ?? [],
    createdAt: c.createdAt ?? now,
    updatedAt: now,
  }));
}
