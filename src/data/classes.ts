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
  | 'witch';

export const CLASS_IDS: ClassId[] = [
  'bard',
  'cleric',
  'druid',
  'paladin',
  'ranger',
  'sorcerer',
  'wizard',
  'inquisitor',
  'magus',
  'oracle',
  'summoner',
  'witch',
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
};

// Classes whose 0-level spells (cantrips/orisons) are cast at-will/unlimited
// rather than drawn from a limited per-day pool. For these classes spell
// level 0 is not represented as trackable slots at all -- there's nothing to
// "fill" since access is unlimited. Verified per-class from SRD; classes not
// listed here (e.g. Wizard, Cleric, Druid, Witch) prepare a limited number of
// 0-level spells per day just like their other spell levels.
export const CANTRIPS_AT_WILL: Partial<Record<ClassId, true>> = {
  sorcerer: true,
  bard: true,
  inquisitor: true,
  summoner: true,
};

// Character level at which this class first gets any spells at all.
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
};
