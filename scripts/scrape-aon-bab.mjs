import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One-off research tool: derives Base Attack Bonus progression (and, as a
// bonus check, arcane/divine flavor text) for every class directly from its
// AoN ClassDisplay page. Output is reviewed by hand and folded into
// classes.ts -- this script does not write to those files itself. Shares the
// same page cache as scrape-aon-classes.mjs.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-class-pages');
const USER_AGENT = 'pf1e-spell-tracker-data-pipeline/1.0 (personal project; one-time data build)';

const CLASSES = [
  ['adept', 'Adept'],
  ['alchemist', 'Alchemist'],
  ['antipaladin', 'Antipaladin'],
  ['arcanist', 'Arcanist'],
  ['barbarian', 'Barbarian'],
  ['bard', 'Bard'],
  ['bloodrager', 'Bloodrager'],
  ['brawler', 'Brawler'],
  ['cavalier', 'Cavalier'],
  ['cleric', 'Cleric'],
  ['druid', 'Druid'],
  ['fighter', 'Fighter'],
  ['gunslinger', 'Gunslinger'],
  ['hunter', 'Hunter'],
  ['investigator', 'Investigator'],
  ['magus', 'Magus'],
  ['medium', 'Medium'],
  ['mesmerist', 'Mesmerist'],
  ['monk', 'Monk'],
  ['ninja', 'Ninja'],
  ['occultist', 'Occultist'],
  ['oracle', 'Oracle'],
  ['paladin', 'Paladin'],
  ['psychic', 'Psychic'],
  ['ranger', 'Ranger'],
  ['rogue', 'Rogue'],
  ['samurai', 'Samurai'],
  ['shaman', 'Shaman'],
  ['skald', 'Skald'],
  ['sorcerer', 'Sorcerer'],
  ['spiritualist', 'Spiritualist'],
  ['summoner', 'Summoner'],
  ['swashbuckler', 'Swashbuckler'],
  ['warpriest', 'Warpriest'],
  ['witch', 'Witch'],
  ['wizard', 'Wizard'],
  ['inquisitor', 'Inquisitor'],
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

// The main class progression table always has a "Base Attack Bonus" header
// cell, whether or not the class casts spells at all -- unlike the
// spells-focused scraper this covers martial classes too.
function findMainTable(html) {
  const tables = [...html.matchAll(/<table class="inner">([\s\S]*?)<\/table>/g)].map((m) => m[1]);
  return tables.find((t) => /Base Attack Bonus/.test(t));
}

function parseBabColumn(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  // Caster classes prefix the table with a colspan-only title row (e.g.
  // "Spells Per Day") before the real "<b>Level</b>" header row; martial
  // classes go straight to the header row. Locate the header row by content
  // instead of assuming a fixed offset, so both layouts parse the same way.
  const headerIndex = rows.findIndex((r) => /<b>Level<\/b>/.test(r));
  const dataRows = headerIndex === -1 ? [] : rows.slice(headerIndex + 1, headerIndex + 21);
  const bab = [];
  for (const row of dataRows) {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]));
    if (cells.length < 2) continue;
    const value = parseInt(cells[1].replace('+', ''), 10);
    bab.push(Number.isNaN(value) ? 0 : value);
  }
  return bab;
}

// Classifies a 20-entry BAB array against the three standard PF1E
// progressions by comparing the level-20 value (full=20, 3/4=15, half=10),
// then verifies every level matches the formula so an unusual table stands
// out as 'irregular' instead of silently mis-tagged.
function classifyProgression(bab) {
  if (bab.length !== 20) return 'incomplete';
  const at20 = bab[19];
  const expected =
    at20 === 20 ? (lvl) => lvl : at20 === 15 ? (lvl) => Math.floor((lvl * 3) / 4) : at20 === 10 ? (lvl) => Math.floor(lvl / 2) : null;
  if (!expected) return `irregular (bab20=${at20})`;
  const label = at20 === 20 ? 'full' : at20 === 15 ? 'threeQuarter' : 'half';
  for (let i = 0; i < 20; i++) {
    if (bab[i] !== expected(i + 1)) return `irregular (mismatch at level ${i + 1}: ${bab[i]} vs expected ${expected(i + 1)})`;
  }
  return label;
}

function detectCasterFlavor(html) {
  const arcaneCount = (html.match(/arcane spell/gi) ?? []).length;
  const divineCount = (html.match(/divine spell/gi) ?? []).length;
  if (arcaneCount === 0 && divineCount === 0) return 'unclear';
  if (arcaneCount >= divineCount * 2) return 'arcane';
  if (divineCount >= arcaneCount * 2) return 'divine';
  return `ambiguous (arcane=${arcaneCount}, divine=${divineCount})`;
}

async function main() {
  const results = {};
  for (const [classId, aonName] of CLASSES) {
    const url = `https://www.aonprd.com/ClassDisplay.aspx?ItemName=${encodeURIComponent(aonName)}`;
    const html = await cachedFetch(url, classId);
    const table = findMainTable(html);
    if (!table) {
      results[classId] = { error: 'no-main-table-found' };
      continue;
    }
    const bab = parseBabColumn(table);
    results[classId] = {
      bab,
      progression: classifyProgression(bab),
      casterFlavor: detectCasterFlavor(html),
    };
  }
  console.log(JSON.stringify(results, null, 2));
}

await main();
