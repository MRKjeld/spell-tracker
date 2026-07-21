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

  spells.push({
    id: doc._id,
    name: doc.name,
    school: doc.system?.school ?? '',
    subschool: doc.system?.subschool ?? [],
    descriptors: doc.system?.descriptors ?? [],
    levels,
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
