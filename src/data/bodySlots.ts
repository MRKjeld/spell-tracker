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
  | 'belt'
  | 'feet';

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
  'belt',
  'feet',
];

export const BODY_SLOT_LABELS: Record<BodySlotId, string> = {
  head: 'Head',
  headband: 'Headband',
  eyes: 'Eyes',
  neck: 'Neck',
  shoulders: 'Shoulders',
  hands: 'Hands',
  wrists: 'Wrists',
  chest: 'Chest',
  body: 'Body',
  belt: 'Belt',
  feet: 'Feet',
};
