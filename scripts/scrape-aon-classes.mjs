import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One-off research tool: derives spellcasting metadata (casting ability,
// prepared vs spontaneous, spells-per-day table, max spell level, start
// level, at-will cantrips) for a class directly from its AoN ClassDisplay
// page, instead of transcribing 20x10 tables from memory. Output is reviewed
// by hand and folded into classes.ts / spellsPerDay.ts -- this script does
// not write to those files itself.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-class-pages');
const USER_AGENT = 'pf1e-spell-tracker-data-pipeline/1.0 (personal project; one-time data build)';

const CLASSES = [
  ['adept', 'Adept'],
  ['alchemist', 'Alchemist'],
  ['antipaladin', 'Antipaladin'],
  ['arcanist', 'Arcanist'],
  ['bloodrager', 'Bloodrager'],
  ['hunter', 'Hunter'],
  ['investigator', 'Investigator'],
  ['medium', 'Medium'],
  ['mesmerist', 'Mesmerist'],
  ['occultist', 'Occultist'],
  ['psychic', 'Psychic'],
  ['shaman', 'Shaman'],
  ['skald', 'Skald'],
  ['spiritualist', 'Spiritualist'],
  ['warpriest', 'Warpriest'],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cachedFetch(url, cacheKey) {
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.html`);
  try {
    return await fs.readFile(cachePath, 'utf8');
  } catch {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const html = await res.text();
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, html);
    await sleep(350);
    return html;
  }
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&mdash;/g, '--').replace(/&#8217;/g, "'").trim();
}

function parseCell(text) {
  const clean = text.trim();
  if (clean === '-' || clean === '' || clean === '--' || clean === '—') return 0;
  const n = parseInt(clean, 10);
  return Number.isNaN(n) ? 0 : n;
}

function findSpellsPerDayTable(html) {
  const tables = [...html.matchAll(/<table class="inner">([\s\S]*?)<\/table>/g)].map((m) => m[1]);
  return tables.find((t) => /Spells Per Day/.test(t));
}

// Maps a header label to its spell level (0 for "0", N for "Nst"/"Nnd"/
// "Nrd"/"Nth"), or null if it's not a spell-level column at all.
function spellLevelFromLabel(label) {
  if (label === '0') return 0;
  const m = label.match(/^(\d+)(?:st|nd|rd|th)$/);
  return m ? Number(m[1]) : null;
}

function parseTable(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  // rows[0] = section header (colspans), rows[1] = column headers, rows[2..] = level data.
  // Fixed columns are usually Level, BAB, Fort, Ref, Will, Special (index 0-5), but some
  // classes (e.g. Warpriest) insert an extra non-spell column (Sacred Weapon Damage)
  // before the spell columns -- so identify spell columns by label pattern, not position.
  const headerCells = [...rows[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]));
  const spellColumnIndices = []; // [{ index, spellLevel }] for columns after the fixed prefix
  headerCells.forEach((label, i) => {
    if (i < 6) return;
    const spellLevel = spellLevelFromLabel(label);
    if (spellLevel !== null) spellColumnIndices.push({ index: i, spellLevel });
  });
  const has0Col = spellColumnIndices.some((c) => c.spellLevel === 0);
  const maxSpellLevel = Math.max(...spellColumnIndices.map((c) => c.spellLevel));

  const perDay = []; // [level-1][spellLevel 0-9]
  for (const row of rows.slice(2, 22)) {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]));
    if (cells.length < 6) continue;
    const rowValues = new Array(10).fill(0);
    for (const { index, spellLevel } of spellColumnIndices) {
      rowValues[spellLevel] = parseCell(cells[index]);
    }
    perDay.push(rowValues);
  }

  return { perDay, maxSpellLevel, has0Col };
}

// The at-will 0-level ability is flavored differently per class (cantrips,
// orisons, Medium's "knacks", ...) but the SRD boilerplate mechanic text is
// consistent: "cast like any other spell, but they do not consume ... slots
// and may be used again". Matching that phrase is far more reliable than
// trying to enumerate every class's flavor name for it.
// IMPORTANT: the "these spells are cast like any other spell, but they are
// not expended when cast and may be used again" boilerplate appears for
// EVERY class with any 0-level ability at all -- including Wizard's, whose
// cantrips this app models as a real limited-per-day slot count (see
// SPELLS_PER_DAY.wizard column 0 = [3,4,4,4,...]). So that phrase does NOT
// distinguish "at-will" from "tracked slots"; it's universal noise. What
// actually distinguishes them is purely structural: does the SRD's own
// Spells Per Day table have a numbered "0" column at all? If yes (Wizard,
// Cleric, Druid, Witch, Adept, Shaman, Warpriest), 0-level access is tracked
// like any other level -- this app's existing, deliberate simplification.
// If no "0" column exists AND the class has some cantrip/orison/knack
// feature (Bard, Sorcerer, Arcanist, ...), it's genuinely unlimited. If no
// "0" column AND no such feature (Paladin, Ranger, Antipaladin, Bloodrager,
// Alchemist, Investigator), the class simply never gets 0-level spells.
function detectCantripsAtWill(html, has0Col) {
  if (has0Col) return false;
  return /cantrip|orison|knack/i.test(html);
}

// Raw-table onset can be one level later than the class's actual stated
// onset for "delayed" casters (Paladin/Ranger-style): the base per-day table
// shows 0 at the level the ability is granted because the base allotment
// doesn't kick in until the following level -- only a high-ability bonus
// spell could apply at the granting level itself. The class description
// states the true onset directly ("At Nth level, a X gains the ability to
// cast..."), so prefer that over the raw table when both are available.
function detectStartLevel(html, rawTableStartLevel) {
  const m = html.match(/[Aa]t (\d+)(?:st|nd|rd|th) level,[^.]*gains? the ability to cast/);
  if (m) return Number(m[1]);
  return rawTableStartLevel;
}

function detectCastingAbility(html) {
  // Phrasing varies ("must have an X score equal to at least 10 + the spell's
  // level" vs Investigator's "at least an X score equal to 10 + the
  // extract's level") -- match on the common core instead of the prefix.
  const m = html.match(/(Intelligence|Wisdom|Charisma) score equal to (?:at least )?10/i);
  return m ? m[1].toLowerCase() : null;
}

function detectCastingType(html) {
  // A "Spells Known" table/heading exists on the page only for spontaneous
  // casters (limited known list, cast freely up to per-day slots). It's
  // rendered inconsistently across classes -- sometimes an inline <b> header
  // cell inside the same table as Spells Per Day (Bard, Sorcerer), sometimes
  // its own <h2>-headed table entirely (Bloodrager) -- so match the bare text
  // rather than a specific tag wrapper.
  return /Spells Known/.test(html) ? 'spontaneous' : 'prepared';
}

async function main() {
  const results = {};
  for (const [classId, aonName] of CLASSES) {
    const url = `https://www.aonprd.com/ClassDisplay.aspx?ItemName=${encodeURIComponent(aonName)}`;
    const html = await cachedFetch(url, classId);
    const table = findSpellsPerDayTable(html);
    if (!table) {
      results[classId] = { error: 'no-spells-per-day-table-found' };
      continue;
    }
    const { perDay, maxSpellLevel, has0Col } = parseTable(table);
    const rawTableStartLevel = perDay.findIndex((row) => row.some((v) => v > 0)) + 1 || null;
    const castingAbility = detectCastingAbility(html);
    const castingType = detectCastingType(html);
    const cantripsAtWill = detectCantripsAtWill(html, has0Col);
    const startLevel = detectStartLevel(html, rawTableStartLevel);
    results[classId] = {
      aonName, castingAbility, castingType, maxSpellLevel, cantripsAtWill, startLevel, rawTableStartLevel, perDay,
    };
  }
  console.log(JSON.stringify(results, null, 2));
}

await main();
