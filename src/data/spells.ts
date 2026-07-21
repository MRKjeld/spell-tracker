import type { ClassId } from './classes';
import rawSpells from './spells.generated.json';

export interface SpellEntry {
  id: string;
  name: string;
  school: string;
  subschool: string[];
  descriptors: string[];
  levels: Partial<Record<ClassId, number>>;
  description: string;
  castingTime: string;
  components: string;
  range: string;
  effect: string;
  duration: string;
  savingThrow: string;
  spellResistance: string;
}

export const SCHOOL_LABELS: Record<string, string> = {
  abj: 'Abjuration',
  con: 'Conjuration',
  div: 'Divination',
  enc: 'Enchantment',
  evo: 'Evocation',
  ill: 'Illusion',
  nec: 'Necromancy',
  trs: 'Transmutation',
  uni: 'Universal',
};

export function humanizeTag(tag: string): string {
  const spaced = tag.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const SPELLS = rawSpells as SpellEntry[];

const byId = new Map<string, SpellEntry>();
const byClassLevel = new Map<string, SpellEntry[]>();
const byClass = new Map<ClassId, SpellEntry[]>();

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

    const classList = byClass.get(classId as ClassId);
    if (classList) classList.push(spell);
    else byClass.set(classId as ClassId, [spell]);
  }
}

export function getSpellById(id: string): SpellEntry | undefined {
  return byId.get(id);
}

export function getSpellsFor(classId: ClassId, spellLevel: number): SpellEntry[] {
  return byClassLevel.get(classLevelKey(classId, spellLevel)) ?? [];
}

// All spells on a class's list, across every spell level -- for pickers with no level constraint.
export function getAllSpellsFor(classId: ClassId): SpellEntry[] {
  return byClass.get(classId) ?? [];
}

export function spellMatchesQuery(spell: SpellEntry, normalizedQuery: string, includeDescription: boolean): boolean {
  if (!normalizedQuery) return true;
  if (spell.name.toLowerCase().includes(normalizedQuery)) return true;
  return includeDescription && spell.description.toLowerCase().includes(normalizedQuery);
}

export function searchSpells(query: string, spellLevel?: number, includeDescription = false): SpellEntry[] {
  const normalized = query.trim().toLowerCase();
  return SPELLS.filter((spell) => {
    if (!spellMatchesQuery(spell, normalized, includeDescription)) return false;
    if (spellLevel !== undefined && !Object.values(spell.levels).includes(spellLevel)) return false;
    return true;
  });
}
