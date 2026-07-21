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
  | 'warpriest';

export const CLASS_IDS: ClassId[] = [
  'adept',
  'alchemist',
  'antipaladin',
  'arcanist',
  'bard',
  'bloodrager',
  'cleric',
  'druid',
  'hunter',
  'inquisitor',
  'investigator',
  'magus',
  'medium',
  'mesmerist',
  'occultist',
  'oracle',
  'paladin',
  'psychic',
  'ranger',
  'shaman',
  'skald',
  'sorcerer',
  'spiritualist',
  'summoner',
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
};

export const CASTING_ABILITY: Record<ClassId, AbilityId> = {
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

export const CASTING_TYPE: Record<ClassId, CastingType> = {
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
export const MAX_SPELL_LEVEL: Record<ClassId, number> = {
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
export const START_LEVEL: Record<ClassId, number> = {
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
