import type { Item } from '../../state/types';
import { ItemChip } from './ItemChip';

interface EquipmentSectionProps {
  items: Item[];
  onAddItem: () => void;
  onItemClick: (item: Item) => void;
}

export function EquipmentSection({ items, onAddItem, onItemClick }: EquipmentSectionProps) {
  return (
    <div className="slot-grid-row equipment-section">
      <div className="slot-grid-row-header">
        <h3>Equipment</h3>
        <span className="slot-grid-row-summary">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
        <button type="button" className="button-secondary equipment-add-button" onClick={onAddItem}>
          + Add Item
        </button>
      </div>
      {items.length === 0 ? (
        <p className="equipment-empty">No items yet.</p>
      ) : (
        <div className="slot-grid-chips">
          {items.map((item) => (
            <ItemChip key={item.id} item={item} onClick={() => onItemClick(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
