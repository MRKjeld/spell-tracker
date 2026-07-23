import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import { searchWondrousItemsForSlot } from '../../data/wondrousItems';
import { WondrousItemDetails } from './WondrousItemDetails';

interface WondrousItemPickerModalProps {
  slot: BodySlotId;
  onPick: (itemId: string, itemName: string) => void;
  onClose: () => void;
}

export function WondrousItemPickerModal({ slot, onPick, onClose }: WondrousItemPickerModalProps) {
  const [query, setQuery] = useState('');
  const [searchDescriptions, setSearchDescriptions] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const items = useMemo(
    () => searchWondrousItemsForSlot(slot, query, searchDescriptions),
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
          return (
            <li key={item.id}>
              <div className="spell-picker-row">
                <button type="button" className="spell-picker-pick" onClick={() => onPick(item.id, item.name)}>
                  {item.name}
                  <span className="spell-picker-school"> — {item.price}</span>
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
                <WondrousItemDetails item={item} />
              ) : (
                showAllDescriptions && (
                  <p className="spell-picker-description">{item.description || 'No description available.'}</p>
                )
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
