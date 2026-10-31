import type { Calculation, CharacterAction, Item } from '../state/types';
import type { ItemForm } from './itemForms';
import { getItemForms } from './itemForms';

const ITEM_ACTION_PREFIX = 'item-action:';
const ITEM_CALCULATION_PREFIX = 'item-calc:';

/**
 * Actions and calculations derived from equipped items are not stored on the
 * character -- they're rebuilt from the equipment on every read, so they
 * appear the moment an item is equipped and disappear the moment it isn't,
 * and can never drift out of step with the catalog. They can't be edited or
 * deleted, same as system modifiers and system calculations.
 */
export function isItemActionId(id: string): boolean {
  return id.startsWith(ITEM_ACTION_PREFIX);
}

export function isItemCalculationId(id: string): boolean {
  return id.startsWith(ITEM_CALCULATION_PREFIX);
}

const SYSTEM_MELEE_ATTACK = 'system-calc-melee-attack';
const SYSTEM_RANGED_ATTACK = 'system-calc-ranged-attack';
const SYSTEM_FINESSE_ATTACK = 'system-calc-melee-attack-finesse';

/** Which system attack roll a form is made with. A use form has none. */
function attackCalculationIds(form: ItemForm): string[] {
  switch (form.kind) {
    case 'melee':
      return form.finesse ? [SYSTEM_MELEE_ATTACK, SYSTEM_FINESSE_ATTACK] : [SYSTEM_MELEE_ATTACK];
    case 'thrown':
    case 'ranged':
      return [SYSTEM_RANGED_ATTACK];
    case 'use':
      return [];
  }
}

/**
 * Strength applies to damage in melee and with a thrown weapon, but not to a
 * bow or crossbow, whose damage is the weapon's own.
 */
function damageModifierIds(form: ItemForm): string[] {
  return form.kind === 'melee' || form.kind === 'thrown' ? ['system-str-mod'] : [];
}

function describeForm(form: ItemForm): string {
  const parts: string[] = [];
  if (form.damage) {
    const types = form.damageTypes.length > 0 ? ` ${form.damageTypes.join('/')}` : '';
    parts.push(`${form.damage}${types}`);
  }
  if (form.critical) parts.push(form.critical);
  if (form.rangeFt) parts.push(`${form.rangeFt} ft.`);
  if (form.proficiency) parts.push(form.proficiency);
  const head = parts.join(' · ');
  const notes = form.notes.length > 0 ? form.notes.join(', ') : '';
  return [head, notes].filter(Boolean).join(' — ');
}

export interface DerivedItemActions {
  actions: CharacterAction[];
  calculations: Calculation[];
}

/**
 * One action per usage form of every equipped item. A dagger in hand gives a
 * melee action and a thrown action; a quarterstaff gives its two-handed form
 * and both ends; a wand with charges gives a use action.
 */
export function deriveItemActions(items: Item[]): DerivedItemActions {
  const actions: CharacterAction[] = [];
  const calculations: Calculation[] = [];

  for (const item of items) {
    if (!item.equippedSlot) continue;

    for (const form of getItemForms(item)) {
      const calculationIds = [...attackCalculationIds(form)];

      if (form.damage) {
        const damageCalculation: Calculation = {
          id: `${ITEM_CALCULATION_PREFIX}${item.id}:${form.key}:damage`,
          name: `${item.name} damage`,
          diceRoll: form.damage,
          modifierIds: damageModifierIds(form),
        };
        calculations.push(damageCalculation);
        calculationIds.push(damageCalculation.id);
      }

      actions.push({
        id: `${ITEM_ACTION_PREFIX}${item.id}:${form.key}`,
        name: `${item.name} — ${form.label}`,
        description: describeForm(form),
        calculationIds,
      });
    }
  }

  return { actions, calculations };
}

/**
 * Display order for the Actions tab. `order` is the character's saved list of
 * action ids and may name actions that no longer exist (an item was
 * unequipped) or miss ones that have just appeared (an item was equipped);
 * anything unlisted keeps its natural order at the end.
 */
export function orderActions(actions: CharacterAction[], order: string[]): CharacterAction[] {
  const byId = new Map(actions.map((a) => [a.id, a]));
  const ordered: CharacterAction[] = [];

  for (const id of order) {
    const action = byId.get(id);
    if (action) {
      ordered.push(action);
      byId.delete(id);
    }
  }
  // Whatever the saved order didn't mention, in the order it came in.
  for (const action of actions) {
    if (byId.has(action.id)) ordered.push(action);
  }
  return ordered;
}

/** The saved order after dragging `actionId` to `toIndex` in the shown list. */
export function moveInOrder(shownIds: string[], actionId: string, toIndex: number): string[] {
  const from = shownIds.indexOf(actionId);
  if (from === -1 || toIndex < 0 || toIndex >= shownIds.length || from === toIndex) return shownIds;
  const next = [...shownIds];
  next.splice(from, 1);
  next.splice(toIndex, 0, actionId);
  return next;
}
