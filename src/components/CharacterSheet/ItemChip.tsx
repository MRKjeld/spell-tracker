import type { Item } from '../../state/types';
import { BODY_SLOT_LABELS } from '../../data/bodySlots';

interface ItemChipProps {
  item: Item;
  onClick: () => void;
}

const USE_PERIOD_SHORT_LABELS: Record<Item['usePeriod'], string> = {
  unlimited: 'Unlimited',
  rest: 'per rest',
  day: 'per day',
  week: 'per week',
  month: 'per month',
  manual: 'manual recharge',
};

export function ItemChip({ item, onClick }: ItemChipProps) {
  const depleted = item.usePeriod !== 'unlimited' && item.usesRemaining <= 0;
  const usesLabel =
    item.usePeriod === 'unlimited' ? 'Unlimited' : `${item.usesRemaining}/${item.maxUses} ${USE_PERIOD_SHORT_LABELS[item.usePeriod]}`;
  const wornClass = item.equippedSlot ? 'item-chip-worn' : 'item-chip-unworn';

  return (
    <button
      type="button"
      className={`item-chip ${wornClass}${depleted ? ' item-chip-depleted' : ''}`}
      onClick={onClick}
    >
      <span className="item-chip-name">{item.name}</span>
      {item.equippedSlot ? (
        <span className="item-chip-equipped">Worn — {BODY_SLOT_LABELS[item.equippedSlot]}</span>
      ) : null}
      <span className="item-chip-uses">{usesLabel}</span>
    </button>
  );
}
