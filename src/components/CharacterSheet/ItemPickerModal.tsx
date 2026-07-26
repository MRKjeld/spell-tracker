import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_IDS, BODY_SLOT_LABELS } from '../../data/bodySlots';
import { searchWondrousItems, searchWondrousItemsForSlot } from '../../data/wondrousItems';
import type { WondrousItemEntry } from '../../data/wondrousItems';
import {
  getBaseArmorCategoriesForSlot,
  searchBaseArmorItems,
  searchBaseArmorItemsForSlot,
} from '../../data/baseArmor';
import type { BaseArmorItemEntry } from '../../data/baseArmor';
import { searchWeaponItems, searchWeaponItemsForHandSlot } from '../../data/weapons';
import type { WeaponItemEntry } from '../../data/weapons';
import { searchRingItems } from '../../data/rings';
import type { RingItemEntry } from '../../data/rings';
import { WondrousItemDetails } from './WondrousItemDetails';
import { BaseArmorDetails } from './BaseArmorDetails';
import { WeaponDetails } from './WeaponDetails';

type CatalogEntry =
  | { kind: 'wondrous'; item: WondrousItemEntry }
  | { kind: 'baseArmor'; item: BaseArmorItemEntry }
  | { kind: 'weapon'; item: WeaponItemEntry }
  | { kind: 'ring'; item: RingItemEntry };

interface ItemPickerModalProps {
  onPick: (pick: { kind: 'wondrous' | 'baseArmor' | 'weapon' | 'ring'; itemId: string; itemName: string }) => void;
  onClose: () => void;
}

export function ItemPickerModal({ onPick, onClose }: ItemPickerModalProps) {
  const [query, setQuery] = useState('');
  const [slot, setSlot] = useState<BodySlotId | 'all'>('all');
  const [searchDescriptions, setSearchDescriptions] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const results = useMemo<CatalogEntry[]>(() => {
    const wondrous =
      slot === 'all' ? searchWondrousItems(query, searchDescriptions) : searchWondrousItemsForSlot(slot, query, searchDescriptions);
    const baseArmor =
      slot === 'all'
        ? searchBaseArmorItems(query, searchDescriptions)
        : getBaseArmorCategoriesForSlot(slot).length > 0
          ? searchBaseArmorItemsForSlot(slot, query, searchDescriptions)
          : [];
    const weapons =
      slot === 'all' || slot === 'mainHand' || slot === 'offhand'
        ? slot === 'all'
          ? searchWeaponItems(query, searchDescriptions)
          : searchWeaponItemsForHandSlot(query, searchDescriptions)
        : [];
    const rings = slot === 'all' || slot === 'ring1' || slot === 'ring2' ? searchRingItems(query, searchDescriptions) : [];
    return [
      ...wondrous.map((item): CatalogEntry => ({ kind: 'wondrous', item })),
      ...baseArmor.map((item): CatalogEntry => ({ kind: 'baseArmor', item })),
      ...weapons.map((item): CatalogEntry => ({ kind: 'weapon', item })),
      ...rings.map((item): CatalogEntry => ({ kind: 'ring', item })),
    ];
  }, [slot, query, searchDescriptions]);

  function toggleExpanded(itemId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  const selectedEntry = results.find((r) => `${r.kind}-${r.item.id}` === selectedKey);

  function handleConfirm() {
    if (!selectedEntry) return;
    onPick({ kind: selectedEntry.kind, itemId: selectedEntry.item.id, itemName: selectedEntry.item.name });
  }

  return (
    <Modal title="Add Item" onClose={onClose}>
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

      <label className="spell-picker-class-filter">
        Slot
        <select value={slot} onChange={(e) => setSlot(e.target.value as BodySlotId | 'all')}>
          <option value="all">All Slots</option>
          {BODY_SLOT_IDS.map((id) => (
            <option key={id} value={id}>
              {BODY_SLOT_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      <ul className="spell-picker-list">
        {results.length === 0 && <li className="spell-picker-empty">No items found.</li>}
        {results.map((result) => {
          const { kind, item } = result;
          const key = `${kind}-${item.id}`;
          const expanded = expandedIds.has(item.id);
          const isSelected = selectedKey === key;
          const price = kind === 'wondrous' || kind === 'ring' ? item.price : item.costRaw || 'no cost';
          return (
            <li key={key}>
              <div className="spell-picker-row">
                <button
                  type="button"
                  className={`spell-picker-pick${isSelected ? ' spell-picker-pick-selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedKey(isSelected ? null : key)}
                >
                  {item.name}
                  <span className="spell-picker-school"> · {price}</span>
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
                kind === 'wondrous' || kind === 'ring' ? (
                  <WondrousItemDetails item={item} />
                ) : kind === 'weapon' ? (
                  <WeaponDetails item={item} />
                ) : (
                  <BaseArmorDetails item={item} />
                )
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
        <button type="button" className="button-primary" onClick={handleConfirm} disabled={!selectedEntry}>
          Confirm
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
