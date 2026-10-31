import type { WondrousItemEntry } from '../../data/wondrousItems';
import { auraSchool, schoolThemeColor } from '../../data/schoolThemes';

export function WondrousItemDetails({ item }: { item: WondrousItemEntry }) {
  // Tint the block with the colour of the school the item's aura names.
  const school = auraSchool(item.aura);
  const schoolColor = school ? schoolThemeColor(school) : undefined;
  return (
    <div
      className={schoolColor ? 'spell-picker-details spell-details-themed' : 'spell-picker-details'}
      style={
        schoolColor
          ? {
              borderLeftColor: schoolColor,
              background: `color-mix(in srgb, ${schoolColor} 14%, var(--surface))`,
            }
          : undefined
      }
    >
      <p>
        <strong>Price:</strong> {item.price}
      </p>
      <p>
        <strong>Aura:</strong> <span style={schoolColor ? { color: schoolColor } : undefined}>{item.aura}</span>{' '}
        <strong>CL:</strong> {item.cl}
      </p>
      <p>
        <strong>Weight:</strong> {item.weight}
      </p>
      {item.uses && (
        <p>
          <strong>Uses:</strong> {item.uses.quantity}/{item.uses.per}
          {item.uses.action && ` (${item.uses.action})`}
        </p>
      )}
      {item.construction && (
        <p>
          <strong>Construction:</strong> {item.construction.requirements} ({item.construction.cost})
        </p>
      )}
      <p className="spell-picker-description">{item.description || 'No description available.'}</p>
    </div>
  );
}
