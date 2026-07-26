import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import { searchBaseArmorItemsForSlot } from '../../data/baseArmor';
import { BaseArmorDetails } from './BaseArmorDetails';

interface BaseArmorPickerModalProps {
  slot: BodySlotId;
  onPick: (itemId: string, itemName: string) => void;
  onClose: () => void;
}

export function BaseArmorPickerModal({ slot, onPick, onClose }: BaseArmorPickerModalProps) {
  const [query, setQuery] = useState('');
  const [searchDescriptions, setSearchDescriptions] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(
    () => searchBaseArmorItemsForSlot(slot, query, searchDescriptions),
    [slot, query, searchDescriptions],
  );

  function toggleExpanded(itemId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  const selectedItem = items.find((i) => i.id === selectedId);

  function handleConfirm() {
    if (!selectedItem) return;
    onPick(selectedItem.id, selectedItem.name);
  }

  return (
    <Modal title={`Fill Slot — ${BODY_SLOT_LABELS[slot]}`} onClose={onClose}>
      <input
        type="search"
        placeholder="Search items..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="spell-picker-search"
        autoFocus
      />

      <div className="spell-picker-options">
        <label className="spell-picker-description-toggle">
          <input
            type="checkbox"
            checked={searchDescriptions}
            onChange={(e) => setSearchDescriptions(e.target.checked)}
          />
          Also search descriptions
        </label>
        <button
          type="button"
          className="spell-picker-show-all"
          aria-pressed={showAllDescriptions}
          onClick={() => setShowAllDescriptions((v) => !v)}
        >
          {showAllDescriptions ? 'Hide descriptions' : 'Show descriptions'}
        </button>
      </div>

      <ul className="spell-picker-list">
        {items.length === 0 && <li className="spell-picker-empty">No items found.</li>}
        {items.map((item) => {
          const expanded = expandedIds.has(item.id);
          const isSelected = selectedId === item.id;
          return (
            <li key={item.id}>
              <div className="spell-picker-row">
                <button
                  type="button"
                  className={`spell-picker-pick${isSelected ? ' spell-picker-pick-selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(isSelected ? null : item.id)}
                >
                  {item.name}
                  <span className="spell-picker-school"> — {item.costRaw || 'no cost'}</span>
                </button>
                <button
                  type="button"
                  className="spell-picker-toggle"
                  aria-expanded={expanded}
                  onClick={() => toggleExpanded(item.id)}
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              </div>
              {expanded ? (
                <BaseArmorDetails item={item} />
              ) : (
                showAllDescriptions && (
                  <p className="spell-picker-description">{item.description || 'No description available.'}</p>
                )
              )}
            </li>
          );
        })}
      </ul>

      <div className="form-actions">
        <button type="button" className="button-primary" onClick={handleConfirm} disabled={!selectedItem}>
          Confirm
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
