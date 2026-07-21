import { extractPack } from '@foundryvtt/foundryvtt-cli';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read-only source: the Foundry pf1 system's compiled spell compendium.
// We never write into FVTTPF1E; instead we copy the pack into a scratch dir first.
const ORIGINAL_SRC = path.resolve(__dirname, '../../FVTTPF1E/systems/pf1/packs/spells');
const SRC = path.resolve(__dirname, '.tmp/spells-src');
const OUT = path.resolve(__dirname, '.tmp/spells-raw');

async function copyPack() {
  await fs.rm(SRC, { recursive: true, force: true });
  await fs.cp(ORIGINAL_SRC, SRC, { recursive: true });

  // Work around a git-on-Windows core.autocrlf corruption: LevelDB's plain-text
  // CURRENT pointer file gets its LF turned into CRLF on checkout, which breaks
  // the native LevelDB reader's manifest filename parsing ("...\r" is an invalid
  // Windows filename). Rewrite it with a clean LF in our scratch copy only.
  const currentPath = path.join(SRC, 'CURRENT');
  const raw = await fs.readFile(currentPath, 'utf8');
  const fixed = raw.replace(/\r\n/g, '\n');
  if (fixed !== raw) {
    await fs.writeFile(currentPath, fixed);
    console.log('Fixed CRLF corruption in CURRENT file (scratch copy only).');
  }
}

await copyPack();
await fs.rm(OUT, { recursive: true, force: true });
await extractPack(SRC, OUT, { yaml: false, log: true });

console.log(`Unpacked spells from ${ORIGINAL_SRC} -> ${OUT}`);
