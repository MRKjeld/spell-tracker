export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type ClassId =
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'paladin'
  | 'ranger'
  | 'sorcerer'
  | 'wizard'
  | 'inquisitor'
  | 'magus'
  | 'oracle'
  | 'summoner'
  | 'witch'
  | 'adept'
  | 'alchemist'
  | 'antipaladin'
  | 'arcanist'
  | 'bloodrager'
  | 'hunter'
  | 'investigator'
  | 'medium'
  | 'mesmerist'
  | 'occultist'
  | 'psychic'
  | 'shaman'
  | 'skald'
  | 'spiritualist'
  | 'warpriest'
  // Non-spellcasting (or purely martial) classes -- these have a Base Attack
  // Bonus progression like every other class (see BAB_PROGRESSION) but no
  // entry in any of the spellcasting-only tables below (CASTING_ABILITY,
  // CASTING_TYPE, CASTER_TYPE, MAX_SPELL_LEVEL, START_LEVEL, SPELLS_PER_DAY).
  | 'barbarian'
  | 'brawler'
  | 'cavalier'
  | 'fighter'
  | 'gunslinger'
  | 'monk'
  | 'ninja'
  | 'rogue'
  | 'samurai'
  | 'swashbuckler';

export const CLASS_IDS: ClassId[] = [
  'adept',
  'alchemist',
  'antipaladin',
  'arcanist',
  'barbarian',
  'bard',
  'bloodrager',
  'brawler',
  'cavalier',
  'cleric',
  'druid',
  'fighter',
  'gunslinger',
  'hunter',
  'inquisitor',
  'investigator',
  'magus',
  'medium',
  'mesmerist',
  'monk',
  'ninja',
  'occultist',
  'oracle',
  'paladin',
  'psychic',
  'ranger',
  'rogue',
  'samurai',
  'shaman',
  'skald',
  'sorcerer',
  'spiritualist',
  'summoner',
  'swashbuckler',
  'warpriest',
  'witch',
  'wizard',
];

export const CLASS_LABELS: Record<ClassId, string> = {
  bard: 'Bard',
  cleric: 'Cleric',
  druid: 'Druid',
  paladin: 'Paladin',
  ranger: 'Ranger',
  sorcerer: 'Sorcerer',
  wizard: 'Wizard',
  inquisitor: 'Inquisitor',
  magus: 'Magus',
  oracle: 'Oracle',
  summoner: 'Summoner',
  witch: 'Witch',
  adept: 'Adept',
  alchemist: 'Alchemist',
  antipaladin: 'Antipaladin',
  arcanist: 'Arcanist',
  bloodrager: 'Bloodrager',
  hunter: 'Hunter',
  investigator: 'Investigator',
  medium: 'Medium',
  mesmerist: 'Mesmerist',
  occultist: 'Occultist',
  psychic: 'Psychic',
  shaman: 'Shaman',
  skald: 'Skald',
  spiritualist: 'Spiritualist',
  warpriest: 'Warpriest',
  barbarian: 'Barbarian',
  brawler: 'Brawler',
  cavalier: 'Cavalier',
  fighter: 'Fighter',
  gunslinger: 'Gunslinger',
  monk: 'Monk',
  ninja: 'Ninja',
  rogue: 'Rogue',
  samurai: 'Samurai',
  swashbuckler: 'Swashbuckler',
};

// Default casting ability per class. A character's actual casting ability
// (Character.castingAbility) defaults to this but can be overridden. Absent
// for non-caster classes -- fall back to a placeholder ability when reading
// (see e.g. CharacterForm's handleClassChange) since it's never surfaced in
// the UI for those classes.
export const CASTING_ABILITY: Partial<Record<ClassId, AbilityId>> = {
  wizard: 'int',
  cleric: 'wis',
  druid: 'wis',
  sorcerer: 'cha',
  bard: 'cha',
  paladin: 'cha',
  ranger: 'wis',
  inquisitor: 'wis',
  magus: 'int',
  oracle: 'cha',
  summoner: 'cha',
  witch: 'int',
  adept: 'wis',
  alchemist: 'int',
  antipaladin: 'cha',
  arcanist: 'int',
  bloodrager: 'cha',
  hunter: 'wis',
  investigator: 'int',
  medium: 'cha',
  mesmerist: 'cha',
  occultist: 'int',
  psychic: 'int',
  shaman: 'wis',
  skald: 'cha',
  spiritualist: 'wis',
  warpriest: 'wis',
};

export type CastingType = 'prepared' | 'spontaneous';

// Present only for classes that cast spells at all -- CASTER_CLASS_IDS is
// derived from this map's keys, and isCasterClass() checks membership in it.
export const CASTING_TYPE: Partial<Record<ClassId, CastingType>> = {
  wizard: 'prepared',
  cleric: 'prepared',
  druid: 'prepared',
  sorcerer: 'spontaneous',
  bard: 'spontaneous',
  paladin: 'prepared',
  ranger: 'prepared',
  inquisitor: 'spontaneous',
  magus: 'prepared',
  oracle: 'spontaneous',
  summoner: 'spontaneous',
  witch: 'prepared',
  adept: 'prepared',
  alchemist: 'prepared',
  antipaladin: 'prepared',
  arcanist: 'prepared',
  bloodrager: 'spontaneous',
  hunter: 'spontaneous',
  investigator: 'prepared',
  medium: 'spontaneous',
  mesmerist: 'spontaneous',
  occultist: 'prepared',
  psychic: 'spontaneous',
  shaman: 'prepared',
  skald: 'spontaneous',
  spiritualist: 'spontaneous',
  warpriest: 'prepared',
};

// Highest spell level (0-9) this class's table ever reaches.
export const MAX_SPELL_LEVEL: Partial<Record<ClassId, number>> = {
  wizard: 9,
  cleric: 9,
  druid: 9,
  sorcerer: 9,
  oracle: 9,
  witch: 9,
  bard: 6,
  inquisitor: 6,
  magus: 6,
  summoner: 6,
  paladin: 4,
  ranger: 4,
  adept: 5,
  alchemist: 6,
  antipaladin: 4,
  arcanist: 9,
  bloodrager: 4,
  hunter: 6,
  investigator: 6,
  medium: 4,
  mesmerist: 6,
  occultist: 6,
  psychic: 9,
  shaman: 9,
  skald: 6,
  spiritualist: 6,
  warpriest: 6,
};

// Classes whose 0-level spells (cantrips/orisons/knacks) are cast at-will/
// unlimited rather than drawn from a limited per-day pool. For these classes
// spell level 0 is not represented as trackable slots at all -- there's
// nothing to "fill" since access is unlimited. Verified per-class from SRD
// (either directly, or via scripts/scrape-aon-classes.mjs against AoN's
// ClassDisplay pages): a class only lands here if its own Spells Per Day
// table has no numbered "0" column AND it has some cantrip/orison/knack
// class feature at all. Classes not listed here either prepare a limited
// number of 0-level spells per day just like their other spell levels
// (Wizard, Cleric, Druid, Witch, Adept, Shaman, Warpriest), or never get
// 0-level spells whatsoever (Paladin, Ranger, Antipaladin, Bloodrager,
// Alchemist, Investigator).
export const CANTRIPS_AT_WILL: Partial<Record<ClassId, true>> = {
  sorcerer: true,
  bard: true,
  inquisitor: true,
  summoner: true,
  arcanist: true,
  hunter: true,
  medium: true,
  mesmerist: true,
  occultist: true,
  psychic: true,
  skald: true,
  spiritualist: true,
};

// Character level at which this class first gets any spells at all. For
// "delayed" casters (Paladin/Ranger-style quarter/half progressions) this is
// the level the class's own description states the ability begins, which is
// one level earlier than the Spells Per Day table's first non-zero base
// allotment -- a bonus spell from a high ability score can apply starting
// that earlier level even though the base table entry is still 0.
export const START_LEVEL: Partial<Record<ClassId, number>> = {
  wizard: 1,
  cleric: 1,
  druid: 1,
  sorcerer: 1,
  oracle: 1,
  witch: 1,
  bard: 1,
  inquisitor: 1,
  magus: 1,
  summoner: 1,
  paladin: 4,
  ranger: 4,
  adept: 1,
  alchemist: 1,
  antipaladin: 4,
  arcanist: 1,
  bloodrager: 4,
  hunter: 1,
  investigator: 1,
  medium: 4,
  mesmerist: 1,
  occultist: 1,
  psychic: 1,
  shaman: 1,
  skald: 1,
  spiritualist: 1,
  warpriest: 1,
};

// Any class with a CASTING_TYPE entry casts spells; every non-caster class
// (Barbarian, Fighter, Monk, ...) simply has no entry there at all.
export function isCasterClass(classId: ClassId): boolean {
  return classId in CASTING_TYPE;
}

// Classes with any spellcasting at all -- a subset of CLASS_IDS. Use this
// (rather than CLASS_IDS) anywhere non-casters would just add noise, e.g. a
// spell-list browser's class filter.
export const CASTER_CLASS_IDS: ClassId[] = CLASS_IDS.filter(isCasterClass);

// Divine casters prepare each day directly from their entire class spell
// list -- there's nothing to "learn" first, so the app's Spell Picker already
// models this correctly by letting any class-list spell fill any slot.
// Arcane casters (and every "psychic magic" class from the Advanced Class
// Guide -- Medium/Mesmerist/Occultist/Psychic/Spiritualist -- which behaves
// the same way here even though it's technically neither arcane nor divine)
// instead draw from a personal list of spells they've learned (a spellbook,
// a formula book, or a fixed "spells known" table) and can only prepare/cast
// from that learned subset -- modeled by the "Learn" button and
// Character.learnedSpells. Classified from each class's own AoN description
// text via scripts/scrape-aon-bab.mjs's casterFlavor detector, with two
// corrections applied by hand: Alchemist/Investigator's page matches
// "divine spell" only incidentally (a rules aside about extracts having no
// divine focus requirement, not a description of their own casting) -- their
// extracts work exactly like a Wizard's spellbook, so they're arcane here.
export type CasterType = 'divine' | 'arcane';

export const CASTER_TYPE: Partial<Record<ClassId, CasterType>> = {
  cleric: 'divine',
  druid: 'divine',
  paladin: 'divine',
  ranger: 'divine',
  antipaladin: 'divine',
  adept: 'divine',
  shaman: 'divine',
  warpriest: 'divine',
  wizard: 'arcane',
  sorcerer: 'arcane',
  bard: 'arcane',
  inquisitor: 'arcane',
  magus: 'arcane',
  oracle: 'arcane',
  summoner: 'arcane',
  witch: 'arcane',
  alchemist: 'arcane',
  arcanist: 'arcane',
  bloodrager: 'arcane',
  hunter: 'arcane',
  investigator: 'arcane',
  medium: 'arcane',
  mesmerist: 'arcane',
  occultist: 'arcane',
  psychic: 'arcane',
  skald: 'arcane',
  spiritualist: 'arcane',
};

// Base Attack Bonus progression -- every class has one, caster or not.
// 'full' = BAB equals level; 'threeQuarter' (aka "medium", e.g. Monk, Cleric)
// = floor(level * 3/4); 'half' (aka "poor", e.g. Wizard, Sorcerer) =
// floor(level / 2). Verified for all 37 classes against each class's own AoN
// table via scripts/scrape-aon-bab.mjs, which parses the actual "Base Attack
// Bonus" column at every level 1-20 and cross-checks it against the formula
// rather than trusting a single data point.
export type BabProgression = 'full' | 'threeQuarter' | 'half';

export const BAB_PROGRESSION: Record<ClassId, BabProgression> = {
  barbarian: 'full',
  cavalier: 'full',
  fighter: 'full',
  gunslinger: 'full',
  paladin: 'full',
  ranger: 'full',
  samurai: 'full',
  antipaladin: 'full',
  bloodrager: 'full',
  brawler: 'full',
  swashbuckler: 'full',
  alchemist: 'threeQuarter',
  bard: 'threeQuarter',
  cleric: 'threeQuarter',
  druid: 'threeQuarter',
  hunter: 'threeQuarter',
  investigator: 'threeQuarter',
  magus: 'threeQuarter',
  medium: 'threeQuarter',
  mesmerist: 'threeQuarter',
  monk: 'threeQuarter',
  ninja: 'threeQuarter',
  occultist: 'threeQuarter',
  oracle: 'threeQuarter',
  rogue: 'threeQuarter',
  shaman: 'threeQuarter',
  skald: 'threeQuarter',
  spiritualist: 'threeQuarter',
  summoner: 'threeQuarter',
  warpriest: 'threeQuarter',
  inquisitor: 'threeQuarter',
  adept: 'half',
  arcanist: 'half',
  psychic: 'half',
  sorcerer: 'half',
  witch: 'half',
  wizard: 'half',
};

export function computeBAB(classId: ClassId, level: number): number {
  switch (BAB_PROGRESSION[classId]) {
    case 'full':
      return level;
    case 'threeQuarter':
      return Math.floor((level * 3) / 4);
    case 'half':
      return Math.floor(level / 2);
  }
}
