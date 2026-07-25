export type BodySlotId =
  | 'head'
  | 'headband'
  | 'eyes'
  | 'neck'
  | 'shoulders'
  | 'hands'
  | 'wrists'
  | 'chest'
  | 'body'
  | 'armor'
  | 'belt'
  | 'feet'
  | 'mainHand'
  | 'offhand'
  | 'ring1'
  | 'ring2'
  | 'leg';

export const BODY_SLOT_IDS: BodySlotId[] = [
  'head',
  'headband',
  'eyes',
  'neck',
  'shoulders',
  'hands',
  'wrists',
  'chest',
  'body',
  'armor',
  'belt',
  'feet',
  'mainHand',
  'offhand',
  'ring1',
  'ring2',
  'leg',
];

export const BODY_SLOT_LABELS: Record<BodySlotId, string> = {
  head: 'Head',
  headband: 'Headband',
  eyes: 'Eyes',
  neck: 'Neck',
  shoulders: 'Shoulder',
  hands: 'Hand',
  wrists: 'Wrist',
  chest: 'Chest',
  body: 'Body',
  armor: 'Armor',
  belt: 'Belt',
  feet: 'Feet',
  mainHand: 'Main Hand',
  offhand: 'Offhand',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  leg: 'Leg',
};

// The Worn Items grid: 3 columns x 10 rows, read left-to-right / top-to-bottom.
// `null` marks a cell that reserves space in the grid but renders nothing.
// A slot id that appears twice (e.g. 'shoulders') is the same underlying
// slot rendered in two places — equipping into either cell affects both.
// 'ring1'/'ring2' are genuinely distinct slots (unlike the other repeats)
// so two different rings can be worn at once.
export const WORN_ITEMS_LAYOUT: (BodySlotId | null)[] = [
  null, 'headband', null,
  null, 'head', null,
  'mainHand', 'eyes', 'offhand',
  'shoulders', 'neck', 'shoulders',
  'wrists', 'chest', 'wrists',
  'hands', 'body', 'hands',
  null, 'armor', null,
  'ring1', 'belt', 'ring2',
  'leg', null, 'leg',
  'feet', null, 'feet',
];
