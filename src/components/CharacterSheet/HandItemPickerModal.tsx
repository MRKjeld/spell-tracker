import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { BodySlotId } from '../../data/bodySlots';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';
import { searchBaseArmorItemsForSlot } from '../../data/baseArmor';
import type { BaseArmorItemEntry } from '../../data/baseArmor';
import { isTwoHandedWeapon, searchWeaponItemsForHandSlot } from '../../data/weapons';
import type { WeaponItemEntry } from '../../data/weapons';
import { BaseArmorDetails } from './BaseArmorDetails';
import { WeaponDetails } from './WeaponDetails';

type HandCatalogEntry =
  | { kind: 'shield'; item: BaseArmorItemEntry }
  | { kind: 'weapon'; item: WeaponItemEntry };

interface HandItemPickerModalProps {
  slot: BodySlotId;
  onPick: (pick: { kind: 'shield' | 'weapon'; itemId: string; itemName: string }) => void;
  onClose: () => void;
}

export function HandItemPickerModal({ slot, onPick, onClose }: HandItemPickerModalProps) {
  const [query, setQuery] = useState('');
  const [searchDescriptions, setSearchDescriptions] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const results = useMemo<HandCatalogEntry[]>(() => {
    const shields = searchBaseArmorItemsForSlot(slot, query, searchDescriptions);
    const weapons = searchWeaponItemsForHandSlot(query, searchDescriptions);
    return [
      ...shields.map((item): HandCatalogEntry => ({ kind: 'shield', item })),
      ...weapons.map((item): HandCatalogEntry => ({ kind: 'weapon', item })),
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
        {results.length === 0 && <li className="spell-picker-empty">No items found.</li>}
        {results.map(({ kind, item }) => {
          const expanded = expandedIds.has(item.id);
          const price = kind === 'shield' ? item.costRaw || 'no cost' : item.costRaw || 'no cost';
          const twoHanded = kind === 'weapon' && isTwoHandedWeapon(item);
          return (
            <li key={`${kind}-${item.id}`}>
              <div className="spell-picker-row">
                <button
                  type="button"
                  className="spell-picker-pick"
                  onClick={() => onPick({ kind, itemId: item.id, itemName: item.name })}
                >
                  {item.name}
                  {twoHanded && <span className="spell-picker-school"> (two-handed)</span>}
                  <span className="spell-picker-school"> — {price}</span>
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
                kind === 'shield' ? <BaseArmorDetails item={item} /> : <WeaponDetails item={item} />
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
