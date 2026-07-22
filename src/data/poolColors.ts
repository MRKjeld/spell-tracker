export type PoolColorId = 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'black' | 'white';

export const POOL_COLOR_PRESETS: { id: PoolColorId; label: string; value: string }[] = [
  { id: 'green', label: 'Green', value: '#22c55e' },
  { id: 'red', label: 'Red', value: '#ef4444' },
  { id: 'blue', label: 'Blue', value: '#3b82f6' },
  { id: 'yellow', label: 'Yellow', value: '#eab308' },
  { id: 'purple', label: 'Purple', value: '#a855f7' },
  { id: 'black', label: 'Black', value: '#18181b' },
  { id: 'white', label: 'White', value: '#f4f4f5' },
];

export const POOL_COLOR_HEX: Record<PoolColorId, string> = Object.fromEntries(
  POOL_COLOR_PRESETS.map((p) => [p.id, p.value]),
) as Record<PoolColorId, string>;
