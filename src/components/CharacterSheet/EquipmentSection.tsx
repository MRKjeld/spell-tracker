import type { Item } from '../../state/types';
import { ItemChip } from './ItemChip';

interface EquipmentSectionProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

export function EquipmentSection({ items, onItemClick }: EquipmentSectionProps) {
  // Worn items sink to the end of the list so unworn (actionable) items stay
  // up front; order within each group is otherwise preserved.
  const sortedItems = [...items].sort((a, b) => Number(!!a.equippedSlot) - Number(!!b.equippedSlot));

  return (
    <div className="slot-grid-row equipment-section">
      <div className="slot-grid-row-header">
        <h3>Equipment</h3>
        <span className="slot-grid-row-summary">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="equipment-empty">No items yet.</p>
      ) : (
        <div className="slot-grid-chips">
          {sortedItems.map((item) => (
            <ItemChip key={item.id} item={item} onClick={() => onItemClick(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
