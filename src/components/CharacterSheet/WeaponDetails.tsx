import type { WeaponItemEntry } from '../../data/weapons';
import { isTwoHandedWeapon } from '../../data/weapons';

export function WeaponDetails({ item }: { item: WeaponItemEntry }) {
  const damage = item.damage
    ? Object.entries(item.damage)
        .filter(([, dmg]) => dmg)
        .map(([size, dmg]) => `${size} ${dmg}`)
        .join(', ')
    : null;

  return (
    <div className="spell-picker-details">
      <p>
        <strong>Cost:</strong> {item.costRaw || 'N/A'} <strong>Weight:</strong> {item.weightRaw || 'N/A'}
      </p>
      <p>
        <strong>Category:</strong> {item.category.join(', ') || 'N/A'}
        {isTwoHandedWeapon(item) && ' (occupies both hands)'} <strong>Proficiency:</strong> {item.proficiency || 'N/A'}
      </p>
      {damage && (
        <p>
          <strong>Damage:</strong> {damage}
        </p>
      )}
      {item.critical && (
        <p>
          <strong>Critical:</strong> {item.critical.threat}/{item.critical.multiplier}
        </p>
      )}
      {item.rangeRaw && (
        <p>
          <strong>Range:</strong> {item.rangeRaw}
        </p>
      )}
      {item.type.length > 0 && (
        <p>
          <strong>Type:</strong> {item.type.join(', ')}
        </p>
      )}
      {item.special.length > 0 && (
        <p>
          <strong>Special:</strong> {item.special.join(', ')}
        </p>
      )}
      <p className="spell-picker-description">{item.description || 'No description available.'}</p>
    </div>
  );
}
