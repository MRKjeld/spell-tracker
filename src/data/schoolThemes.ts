// Distinct visual theme per spell school, used to colour a spell's own
// view and the school tags shown when picking Spell Focus / Greater Spell
// Focus. Colours are chosen to be mutually distinguishable at a glance.
export const SCHOOL_THEME_HEX: Record<string, string> = {
  abj: '#3b82f6', // Abjuration -- protective blue
  con: '#22c55e', // Conjuration -- summoning green
  div: '#a855f7', // Divination -- mystic purple
  enc: '#ec4899', // Enchantment -- charming pink
  evo: '#f97316', // Evocation -- fiery orange
  ill: '#14b8a6', // Illusion -- shifting teal
  nec: '#52525b', // Necromancy -- ashen slate
  trs: '#eab308', // Transmutation -- changeable gold
  uni: '#71717a', // Universal -- neutral grey
};

// Readable text colour to pair with each theme used as a solid background.
export const SCHOOL_THEME_TEXT: Record<string, string> = {
  abj: '#ffffff',
  con: '#ffffff',
  div: '#ffffff',
  enc: '#ffffff',
  evo: '#ffffff',
  ill: '#ffffff',
  nec: '#ffffff',
  trs: '#18181b',
  uni: '#ffffff',
};

export function schoolThemeColor(school: string): string {
  return SCHOOL_THEME_HEX[school] ?? SCHOOL_THEME_HEX.uni;
}

export function schoolThemeTextColor(school: string): string {
  return SCHOOL_THEME_TEXT[school] ?? SCHOOL_THEME_TEXT.uni;
}
