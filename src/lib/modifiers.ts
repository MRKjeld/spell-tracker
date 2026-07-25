export function formatModifierValue(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
