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
  | 'ring'
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
  'ring',
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
  ring: 'Ring',
  leg: 'Leg',
};

// The Worn Items grid: 3 columns x 10 rows, read left-to-right / top-to-bottom.
// `null` marks a cell that reserves space in the grid but renders nothing.
// A slot id that appears twice (e.g. 'shoulders') is the same underlying
// slot rendered in two places — equipping into either cell affects both.
export const WORN_ITEMS_LAYOUT: (BodySlotId | null)[] = [
  null, 'headband', null,
  null, 'head', null,
  'mainHand', 'eyes', 'offhand',
  'shoulders', 'neck', 'shoulders',
  'wrists', 'chest', 'wrists',
  'hands', 'body', 'hands',
  null, 'armor', null,
  'ring', 'belt', 'ring',
  'leg', null, 'leg',
  'feet', null, 'feet',
];
