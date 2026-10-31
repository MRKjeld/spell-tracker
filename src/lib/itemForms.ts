import type { Item } from '../state/types';
import type { WeaponItemEntry } from '../data/weapons';
import type { BaseArmorItemEntry } from '../data/baseArmor';
import { getWeaponItemById } from '../data/weapons';
import { getBaseArmorItemById } from '../data/baseArmor';

/**
 * A single distinct way an item can be used.
 *
 * AoN's equipment tables don't have a "forms" column -- the forms are implied
 * by the columns that are there. A dagger's row carries melee damage *and* a
 * range increment, so it's two different attacks. A quarterstaff's "1d6/1d6"
 * plus its `double` special is a two-handed weapon *and* a pair of ends you
 * can fight with. A bastard sword is an exotic one-hander that anyone
 * proficient in martial weapons can swing two-handed. Spiked armour attacks
 * on its own. Each form here becomes its own Action (see lib/itemActions.ts).
 */
export type ItemFormKind = 'melee' | 'ranged' | 'thrown' | 'use';

export interface ItemForm {
  /** Unique within one item; forms part of the derived action's id. */
  key: string;
  /** Short label appended to the item name, e.g. "Melee", "Off-hand end". */
  label: string;
  kind: ItemFormKind;
  damage: string | null;
  damageTypes: string[];
  /** Threat range and multiplier as one string, e.g. "19-20/x2". */
  critical: string | null;
  rangeFt: number | null;
  proficiency: string | null;
  /** Weapon Finesse may apply, so the form also offers a Dex-based attack. */
  finesse: boolean;
  notes: string[];
}

// Wielded melee categories in the weapon table. Everything else is either
// ranged, ammunition, a siege engine, or an add-on.
const MELEE_CATEGORIES = ['Light', 'One-Handed', 'Two-Handed'];

// Ammunition is fired from something else and 'Modification' entries bolt
// onto another weapon, so neither is an attack a character makes on its own.
const NON_ATTACK_CATEGORIES = ['Ammunition', 'Modification'];

// Weapon Finesse covers light melee weapons plus these three by name.
const NAMED_FINESSE_WEAPONS = ['rapier', 'whip', 'spiked chain'];

// `double` becomes separate forms rather than a note, and `monk`/`see text`
// say nothing actionable on an action card.
const SUPPRESSED_SPECIALS = ['double', 'see text', 'see description'];

function formatCritical(critical: WeaponItemEntry['critical']): string | null {
  if (!critical) return null;
  // A plain 20 threat range is conventionally written as just the multiplier.
  return critical.threat === '20' ? critical.multiplier : `${critical.threat}/${critical.multiplier}`;
}

function weaponNotes(entry: WeaponItemEntry): string[] {
  const seen = new Set<string>();
  for (const special of entry.special) {
    const normalized = special.toLowerCase().trim();
    if (!normalized || SUPPRESSED_SPECIALS.includes(normalized)) continue;
    seen.add(normalized);
  }
  return [...seen];
}

function isFinessable(entry: WeaponItemEntry): boolean {
  if (NAMED_FINESSE_WEAPONS.some((name) => entry.name.toLowerCase().startsWith(name))) return true;
  return entry.category.includes('Light');
}

/** Medium damage is the table's default column; fall back to small. */
function mediumDamage(entry: WeaponItemEntry): string | null {
  return entry.damage?.medium ?? entry.damage?.small ?? null;
}

function isDoubleWeapon(entry: WeaponItemEntry): boolean {
  return entry.special.some((s) => s.toLowerCase().startsWith('double'));
}

/**
 * A weapon usable in two grips with different proficiency requirements --
 * the bastard sword family, whose own description spells the second grip out
 * ("You can use a bastard sword two-handed as a martial weapon"). Only
 * one-handed exotic weapons qualify; the same phrasing on a light or ranged
 * weapon means something else.
 */
function hasMartialTwoHandedGrip(entry: WeaponItemEntry): boolean {
  if (entry.proficiency !== 'exotic' || !entry.category.includes('One-Handed')) return false;
  return /two-handed as a martial weapon/i.test(entry.description);
}

export function getWeaponForms(entry: WeaponItemEntry): ItemForm[] {
  if (entry.category.some((c) => NON_ATTACK_CATEGORIES.includes(c))) return [];

  const damage = mediumDamage(entry);
  const critical = formatCritical(entry.critical);
  const notes = weaponNotes(entry);
  const finesse = isFinessable(entry);
  const base = {
    damageTypes: entry.type,
    critical,
    proficiency: entry.proficiency,
    notes,
  };

  // Bows, crossbows, firearms, slings and siege engines: one way to shoot it.
  if (!entry.category.some((c) => MELEE_CATEGORIES.includes(c))) {
    return [
      {
        ...base,
        key: 'ranged',
        label: 'Ranged',
        kind: 'ranged',
        damage,
        rangeFt: entry.range,
        finesse: false,
      },
    ];
  }

  const forms: ItemForm[] = [];

  if (isDoubleWeapon(entry)) {
    // "1d8/1d6" is one end each. Fought as a double weapon that's two
    // attacks at two-weapon-fighting penalties; swung as a normal
    // two-hander it's just the primary end.
    const [primary, offHand] = (damage ?? '').split('/');
    forms.push(
      { ...base, key: 'two-handed', label: 'Two-handed', kind: 'melee', damage: primary || damage, rangeFt: null, finesse },
      { ...base, key: 'double-primary', label: 'Double, primary end', kind: 'melee', damage: primary || damage, rangeFt: null, finesse },
      {
        ...base,
        key: 'double-off',
        label: 'Double, off-hand end',
        kind: 'melee',
        damage: offHand || primary || damage,
        rangeFt: null,
        finesse,
      },
    );
  } else if (hasMartialTwoHandedGrip(entry)) {
    forms.push(
      { ...base, key: 'one-handed', label: 'One-handed (exotic)', kind: 'melee', damage, rangeFt: null, finesse },
      {
        ...base,
        key: 'two-handed',
        label: 'Two-handed (martial)',
        kind: 'melee',
        damage,
        rangeFt: null,
        proficiency: 'martial',
        finesse,
      },
    );
  } else {
    forms.push({ ...base, key: 'melee', label: 'Melee', kind: 'melee', damage, rangeFt: null, finesse });
  }

  // A melee weapon with a range increment can also be thrown.
  if (entry.range) {
    forms.push({
      ...base,
      key: 'thrown',
      label: `Thrown (${entry.range} ft.)`,
      kind: 'thrown',
      damage: isDoubleWeapon(entry) ? (damage ?? '').split('/')[0] || damage : damage,
      rangeFt: entry.range,
      finesse: false,
    });
  }

  return forms;
}

// Shield bash damage for a Medium wielder, from the core rules: a light
// shield deals 1d3 bludgeoning and a heavy shield 1d4, both x2. A tower
// shield bashes as a heavy shield. Shields are identified by their AC bonus
// because the table has no weight-class column: 1 is light, 2 is heavy, 4 is
// a tower shield.
const SHIELD_BASH_BY_ARMOR_BONUS: Record<number, string> = { 1: '1d3', 2: '1d4', 4: '1d4' };

// Shields whose own entry says they bash differently (a bound blade, spikes,
// an added quality). Rather than invent damage for each, the form carries a
// note pointing at the item's own text.
const SPECIAL_WEAPON_SHIELD_IDS = [
  'klar',
  'madu-leather',
  'madu-steel',
  'snarlshield-steel',
  'snarlshield-wooden',
  'war-shield-dwarven',
];

export function getBaseArmorForms(entry: BaseArmorItemEntry): ItemForm[] {
  // Spiked armour is a martial light weapon in its own right (1d6 piercing
  // for a Medium wearer), usable as a normal or off-hand melee attack.
  if (entry.id === 'armor-spikes') {
    return [
      {
        key: 'spikes',
        label: 'Spikes',
        kind: 'melee',
        damage: '1d6',
        damageTypes: ['Piercing'],
        critical: 'x2',
        rangeFt: null,
        proficiency: 'martial',
        finesse: true,
        notes: ['also deals damage on a successful grapple'],
      },
    ];
  }

  if (entry.category !== 'shield' || entry.armorBonus === null) return [];

  const damage = SHIELD_BASH_BY_ARMOR_BONUS[entry.armorBonus] ?? null;
  const notes = SPECIAL_WEAPON_SHIELD_IDS.includes(entry.id)
    ? ['this shield bashes on its own terms -- see its description']
    : [];

  return [
    {
      key: 'bash',
      label: 'Shield bash',
      kind: 'melee',
      damage,
      damageTypes: ['Bludgeoning'],
      critical: 'x2',
      rangeFt: null,
      proficiency: 'martial',
      finesse: false,
      notes,
    },
  ];
}

/**
 * The activated-use form, derived from the stored item rather than a catalog
 * entry so custom items get one too. Any item with a limited pool of uses, or
 * with activation text, can be used as its own action.
 */
function getUseForm(item: Item): ItemForm | null {
  const hasLimitedUses = item.usePeriod !== 'unlimited' && item.maxUses > 0;
  if (!hasLimitedUses && !item.activation.trim()) return null;

  const notes: string[] = [];
  if (hasLimitedUses) {
    const period = item.usePeriod === 'manual' ? 'total' : `per ${item.usePeriod}`;
    notes.push(`${item.maxUses} ${item.maxUses === 1 ? 'use' : 'uses'} ${period}`);
  }

  return {
    key: 'use',
    label: 'Use',
    kind: 'use',
    damage: null,
    damageTypes: [],
    critical: null,
    rangeFt: null,
    proficiency: null,
    finesse: false,
    notes,
  };
}

/**
 * Every distinct way this item can be used. Catalog items contribute their
 * weapon/armour forms; any item with charges or activation text also
 * contributes a use form, so a wand and a sword each end up with the actions
 * that make sense for them.
 */
export function getItemForms(item: Item): ItemForm[] {
  const forms: ItemForm[] = [];

  if (item.weaponItemId) {
    const entry = getWeaponItemById(item.weaponItemId);
    if (entry) forms.push(...getWeaponForms(entry));
  }
  if (item.baseArmorId) {
    const entry = getBaseArmorItemById(item.baseArmorId);
    if (entry) forms.push(...getBaseArmorForms(entry));
  }

  const useForm = getUseForm(item);
  if (useForm) forms.push(useForm);

  return forms;
}
