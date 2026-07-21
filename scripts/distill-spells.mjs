import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.resolve(__dirname, '.tmp/spells-raw');
const OUT_FILE = path.resolve(__dirname, '../src/data/spells.generated.json');

// The 12 classes this app supports (Core Seven + APG casters). Foundry's pf1
// system already uses these exact lowercase tag strings as learnedAt.class keys
// (confirmed via a discovery pass over the whole compendium), so no remapping
// table is needed -- we just allowlist these keys and drop everything else
// (NPC classes, 3rd-party classes, unchained variants, etc).
const SUPPORTED_CLASSES = [
  'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'wizard',
  'inquisitor', 'magus', 'oracle', 'summoner', 'witch',
];

const files = await fs.readdir(RAW_DIR);

function htmlToPlainText(html) {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const ACTION_TYPE_LABELS = {
  standard: 'standard action',
  full: 'full-round action',
  swift: 'swift action',
  immediate: 'immediate action',
  move: 'move action',
  free: 'free action',
  attack: 'attack action',
  nonaction: 'none',
  special: 'special',
  round: 'round(s)',
  minute: 'minute(s)',
  hour: 'hour(s)',
};

const RANGE_LABELS = {
  personal: 'Personal',
  touch: 'Touch',
  close: 'Close (25 ft. + 5 ft./2 levels)',
  medium: 'Medium (100 ft. + 10 ft./level)',
  long: 'Long (400 ft. + 40 ft./level)',
  unlimited: 'Unlimited',
  melee: 'Melee',
  reach: 'Reach',
  seeText: 'See text',
  spec: 'See text',
};

const DURATION_LABELS = {
  inst: 'Instantaneous',
  perm: 'Permanent',
  seeText: 'See text',
  spec: 'See text',
};

const SAVE_TYPE_LABELS = { will: 'Will', fort: 'Fortitude', ref: 'Reflex' };

function humanizeFormula(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace(/@cl/gi, 'CL').replace(/@sl/gi, 'SL');
}

function describeCastingTime(action) {
  if (!action?.activation?.type) return '';
  const type = action.activation.type;
  const cost = action.activation.cost ?? 1;
  if (type === 'nonaction') return 'None';
  if (type === 'special') return 'Special';
  if (['round', 'minute', 'hour'].includes(type)) {
    return `${cost} ${ACTION_TYPE_LABELS[type]}`;
  }
  const label = ACTION_TYPE_LABELS[type] ?? type;
  return `${cost} ${label}`;
}

function describeComponents(components, materials) {
  if (!components) return '';
  const hasFlags = components.verbal || components.somatic || components.thought || components.emotion
    || components.material || components.focus || components.divineFocus;
  if (!hasFlags) return components.value || '';

  const parts = [];
  if (components.verbal) parts.push('V');
  if (components.somatic) parts.push('S');
  if (components.thought) parts.push('Th');
  if (components.emotion) parts.push('Em');

  switch (components.divineFocus) {
    case 1:
      parts.push('DF');
      break;
    case 2:
      parts.push(materials?.value ? `M/DF (${materials.value})` : 'M/DF');
      break;
    case 3:
      parts.push(materials?.focus ? `F/DF (${materials.focus})` : 'F/DF');
      break;
    default:
      if (components.material) parts.push(materials?.value ? `M (${materials.value})` : 'M');
      if (components.focus) parts.push(materials?.focus ? `F (${materials.focus})` : 'F');
  }

  return parts.join(', ');
}

function describeRange(range) {
  if (!range?.units) return '';
  if (range.units === 'ft') return `${range.value ?? '?'} ft.`;
  if (range.units === 'mi') return `${range.value ?? '?'} mile(s)`;
  return RANGE_LABELS[range.units] ?? range.units;
}

function describeDuration(duration) {
  if (!duration?.units) return '';
  if (DURATION_LABELS[duration.units]) return DURATION_LABELS[duration.units];
  const formula = humanizeFormula(duration.value);
  const unitLabel = ACTION_TYPE_LABELS[duration.units] ?? duration.units;
  return formula ? `${formula} ${unitLabel}` : unitLabel;
}

function describeEffect(action) {
  return action?.area || action?.target?.value || action?.effect || '';
}

function describeSavingThrow(save) {
  if (!save || (!save.type && !save.description)) return 'None';
  if (save.description) return save.description;
  return SAVE_TYPE_LABELS[save.type] ?? save.type;
}

const spells = [];
let droppedNotOnAnyList = 0;
const perClassCount = Object.fromEntries(SUPPORTED_CLASSES.map((c) => [c, 0]));

for (const file of files) {
  const doc = JSON.parse(await fs.readFile(path.join(RAW_DIR, file), 'utf8'));
  if (doc.type !== 'spell') continue;

  const rawClasses = doc.system?.learnedAt?.class ?? {};
  const levels = {};
  for (const classId of SUPPORTED_CLASSES) {
    if (typeof rawClasses[classId] === 'number') {
      levels[classId] = rawClasses[classId];
      perClassCount[classId]++;
    }
  }

  if (Object.keys(levels).length === 0) {
    droppedNotOnAnyList++;
    continue;
  }

  const action = doc.system?.actions?.[0];

  spells.push({
    id: doc._id,
    name: doc.name,
    school: doc.system?.school ?? '',
    subschool: doc.system?.subschool ?? [],
    descriptors: doc.system?.descriptors ?? [],
    levels,
    description: htmlToPlainText(doc.system?.description?.value ?? ''),
    castingTime: describeCastingTime(action),
    components: describeComponents(doc.system?.components, doc.system?.materials),
    range: describeRange(action?.range),
    effect: describeEffect(action),
    duration: describeDuration(action?.duration),
    savingThrow: describeSavingThrow(action?.save),
    spellResistance: doc.system?.sr ? 'Yes' : 'No',
  });
}

spells.sort((a, b) => a.name.localeCompare(b.name));

await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
await fs.writeFile(OUT_FILE, JSON.stringify(spells, null, 2));

console.log(`Kept ${spells.length} spells, dropped ${droppedNotOnAnyList} (not on any of the 12 supported class lists).`);
console.log('Per-class spell counts:');
for (const [classId, count] of Object.entries(perClassCount)) {
  console.log(`  ${classId}: ${count}`);
}
console.log(`Wrote ${OUT_FILE}`);
