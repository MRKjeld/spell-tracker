import { describe, expect, it } from 'vitest';
import { getBaseArmorForms, getWeaponForms } from './itemForms';
import { deriveItemActions, moveInOrder, orderActions } from './itemActions';
import { getAllWeaponItems, getWeaponItemById } from '../data/weapons';
import { getBaseArmorItemById } from '../data/baseArmor';
import type { Item } from '../state/types';

function weapon(id: string) {
  const entry = getWeaponItemById(id);
  if (!entry) throw new Error(`missing weapon fixture: ${id}`);
  return entry;
}

function armor(id: string) {
  const entry = getBaseArmorItemById(id);
  if (!entry) throw new Error(`missing armor fixture: ${id}`);
  return entry;
}

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: 'item-1',
    name: 'Test Item',
    description: '',
    activation: '',
    usePeriod: 'unlimited',
    maxUses: 0,
    usesRemaining: 0,
    lastReset: '',
    wondrousItemId: null,
    baseArmorId: null,
    weaponItemId: null,
    ringItemId: null,
    slot: null,
    category: null,
    equippedSlot: null,
    price: '',
    aura: '',
    cl: '',
    weight: '',
    construction: '',
    ...overrides,
  };
}

describe('getWeaponForms', () => {
  it('splits a thrown melee weapon into a melee form and a thrown form', () => {
    const forms = getWeaponForms(weapon('dagger'));
    expect(forms.map((f) => f.key)).toEqual(['melee', 'thrown']);
    expect(forms[0]).toMatchObject({ kind: 'melee', damage: '1d4', critical: '19-20/x2', rangeFt: null });
    expect(forms[1]).toMatchObject({ kind: 'thrown', damage: '1d4', rangeFt: 10, label: 'Thrown (10 ft.)' });
  });

  it('treats a light weapon as finessable and a two-hander as not', () => {
    expect(getWeaponForms(weapon('dagger'))[0].finesse).toBe(true);
    expect(getWeaponForms(weapon('greatsword'))[0].finesse).toBe(false);
  });

  it('gives a double weapon a two-handed form plus one form per end', () => {
    const forms = getWeaponForms(weapon('quarterstaff'));
    expect(forms.map((f) => f.key)).toEqual(['two-handed', 'double-primary', 'double-off']);
    // "1d6/1d6" is one end each, never the whole string.
    expect(forms.map((f) => f.damage)).toEqual(['1d6', '1d6', '1d6']);
  });

  it('splits uneven double damage across the two ends', () => {
    const forms = getWeaponForms(weapon('gnome-hooked-hammer'));
    expect(forms.find((f) => f.key === 'double-primary')?.damage).toBe('1d8');
    expect(forms.find((f) => f.key === 'double-off')?.damage).toBe('1d6');
  });

  it('gives a bastard sword both grips, the two-handed one as martial', () => {
    const forms = getWeaponForms(weapon('bastard-sword'));
    expect(forms.map((f) => f.key)).toEqual(['one-handed', 'two-handed']);
    expect(forms[0].proficiency).toBe('exotic');
    expect(forms[1].proficiency).toBe('martial');
  });

  it('gives a bow a single ranged form', () => {
    const forms = getWeaponForms(weapon('longbow'));
    expect(forms).toHaveLength(1);
    expect(forms[0]).toMatchObject({ kind: 'ranged', rangeFt: 100 });
  });

  it('gives ammunition no form of its own', () => {
    expect(getWeaponForms(weapon('arrows-20'))).toEqual([]);
  });

  it('keeps actionable specials as notes but drops double, which is already a form', () => {
    const forms = getWeaponForms(weapon('quarterstaff'));
    expect(forms[0].notes).toContain('monk');
    expect(forms[0].notes).not.toContain('double');
  });

  it('writes a plain 20 threat range as just the multiplier', () => {
    expect(getWeaponForms(weapon('quarterstaff'))[0].critical).toBe('x2');
  });
});

describe('the whole weapon catalog', () => {
  it('derives forms for every entry without producing an unlabelled or empty-damage attack', () => {
    const attackForms = getAllWeaponItems()
      .flatMap((entry) => getWeaponForms(entry))
      .filter((form) => form.kind !== 'use');

    expect(attackForms.length).toBeGreaterThan(400);
    for (const form of attackForms) {
      expect(form.label).not.toBe('');
      // A split that went wrong would leave the whole "1d8/1d6" in one form.
      expect(form.damage ?? '').not.toContain('/');
    }
  });

  it('gives every melee weapon with a range increment a thrown form', () => {
    const thrownCapable = getAllWeaponItems().filter(
      (entry) => entry.range && entry.category.some((c) => ['Light', 'One-Handed', 'Two-Handed'].includes(c)),
    );
    expect(thrownCapable.length).toBeGreaterThan(50);
    for (const entry of thrownCapable) {
      expect(getWeaponForms(entry).some((f) => f.kind === 'thrown')).toBe(true);
    }
  });
});

describe('getBaseArmorForms', () => {
  it('bashes with a light shield for 1d3 and a heavy shield for 1d4', () => {
    expect(getBaseArmorForms(armor('light-steel'))[0]).toMatchObject({ key: 'bash', damage: '1d3' });
    expect(getBaseArmorForms(armor('heavy-steel'))[0]).toMatchObject({ key: 'bash', damage: '1d4' });
  });

  it('points a shield that bashes on its own terms at its description', () => {
    expect(getBaseArmorForms(armor('klar'))[0].notes).toHaveLength(1);
    expect(getBaseArmorForms(armor('light-steel'))[0].notes).toEqual([]);
  });

  it('makes armor spikes their own light piercing weapon', () => {
    const forms = getBaseArmorForms(armor('armor-spikes'));
    expect(forms[0]).toMatchObject({ damage: '1d6', damageTypes: ['Piercing'], finesse: true });
  });

  it('gives body armor no attack form', () => {
    expect(getBaseArmorForms(armor('full-plate'))).toEqual([]);
  });
});

describe('deriveItemActions', () => {
  it('ignores items that are not equipped', () => {
    const carried = makeItem({ weaponItemId: 'dagger', equippedSlot: null });
    expect(deriveItemActions([carried]).actions).toEqual([]);
  });

  it('builds one action per form of an equipped weapon', () => {
    const dagger = makeItem({ id: 'd1', name: 'Dagger', weaponItemId: 'dagger', equippedSlot: 'mainHand' });
    const { actions } = deriveItemActions([dagger]);
    expect(actions.map((a) => a.name)).toEqual(['Dagger — Melee', 'Dagger — Thrown (10 ft.)']);
    expect(actions[0].description).toContain('1d4 Piercing/Slashing');
  });

  it('offers a finesse attack alongside the strength attack on a light weapon', () => {
    const dagger = makeItem({ id: 'd1', name: 'Dagger', weaponItemId: 'dagger', equippedSlot: 'mainHand' });
    const [melee] = deriveItemActions([dagger]).actions;
    expect(melee.calculationIds).toContain('system-calc-melee-attack');
    expect(melee.calculationIds).toContain('system-calc-melee-attack-finesse');
  });

  it('adds strength to melee and thrown damage but not to a bow', () => {
    const dagger = makeItem({ id: 'd1', name: 'Dagger', weaponItemId: 'dagger', equippedSlot: 'mainHand' });
    const bow = makeItem({ id: 'b1', name: 'Longbow', weaponItemId: 'longbow', equippedSlot: 'mainHand' });
    const damageOf = (item: Item) =>
      deriveItemActions([item]).calculations.map((c) => c.modifierIds);
    expect(damageOf(dagger)).toEqual([['system-str-mod'], ['system-str-mod']]);
    expect(damageOf(bow)).toEqual([[]]);
  });

  it('gives an item with charges a use action and no attack roll', () => {
    const wand = makeItem({
      id: 'w1',
      name: 'Wand of Shield',
      usePeriod: 'manual',
      maxUses: 50,
      equippedSlot: 'belt',
    });
    const { actions } = deriveItemActions([wand]);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ name: 'Wand of Shield — Use', calculationIds: [] });
    expect(actions[0].description).toContain('50 uses total');
  });

  it('keeps ids stable so a redraw does not shuffle the list', () => {
    const dagger = makeItem({ id: 'd1', name: 'Dagger', weaponItemId: 'dagger', equippedSlot: 'mainHand' });
    expect(deriveItemActions([dagger]).actions.map((a) => a.id)).toEqual(
      deriveItemActions([dagger]).actions.map((a) => a.id),
    );
  });
});

describe('orderActions', () => {
  const a = { id: 'a', name: 'A', description: '', calculationIds: [] };
  const b = { id: 'b', name: 'B', description: '', calculationIds: [] };
  const c = { id: 'c', name: 'C', description: '', calculationIds: [] };

  it('follows the saved order', () => {
    expect(orderActions([a, b, c], ['c', 'a', 'b']).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('appends actions the saved order has never seen', () => {
    expect(orderActions([a, b, c], ['c']).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('ignores saved ids whose action is gone', () => {
    expect(orderActions([a, b], ['b', 'gone', 'a']).map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('moveInOrder', () => {
  it('moves an id down the list', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an id up the list', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
  });

  it('leaves the list alone for an out-of-range or unknown move', () => {
    expect(moveInOrder(['a', 'b'], 'a', 5)).toEqual(['a', 'b']);
    expect(moveInOrder(['a', 'b'], 'z', 0)).toEqual(['a', 'b']);
  });
});
