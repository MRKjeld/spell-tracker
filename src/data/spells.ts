import type { ClassId } from './classes';
import rawSpells from './spells.generated.json';

export interface SpellEntry {
  id: string;
  name: string;
  school: string;
  subschool: string[];
  descriptors: string[];
  levels: Partial<Record<ClassId, number>>;
}

const SPELLS = rawSpells as SpellEntry[];

const byId = new Map<string, SpellEntry>();
const byClassLevel = new Map<string, SpellEntry[]>();

function classLevelKey(classId: ClassId, spellLevel: number): string {
  return `${classId}:${spellLevel}`;
}

for (const spell of SPELLS) {
  byId.set(spell.id, spell);
  for (const [classId, spellLevel] of Object.entries(spell.levels)) {
    const key = classLevelKey(classId as ClassId, spellLevel as number);
    const list = byClassLevel.get(key);
    if (list) list.push(spell);
    else byClassLevel.set(key, [spell]);
  }
}

export function getSpellById(id: string): SpellEntry | undefined {
  return byId.get(id);
}

export function getSpellsFor(classId: ClassId, spellLevel: number): SpellEntry[] {
  return byClassLevel.get(classLevelKey(classId, spellLevel)) ?? [];
}

export function searchSpells(query: string, spellLevel?: number): SpellEntry[] {
  const normalized = query.trim().toLowerCase();
  return SPELLS.filter((spell) => {
    if (normalized && !spell.name.toLowerCase().includes(normalized)) return false;
    if (spellLevel !== undefined && !Object.values(spell.levels).includes(spellLevel)) return false;
    return true;
  });
}
