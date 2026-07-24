import type { Item } from '../../state/types';
import { getEquippedActions, formatUsesRemaining } from '../../lib/equippedActions';
import { ACTION_TYPE_LABELS } from '../../lib/actionType';

interface ActionsSectionProps {
  items: Item[];
  onUseCharge: (itemId: string) => void;
}

export function ActionsSection({ items, onUseCharge }: ActionsSectionProps) {
  const actions = getEquippedActions(items);

  return (
    <div className="slot-grid-row actions-section">
      <div className="slot-grid-row-header">
        <h3>Actions</h3>
        <span className="slot-grid-row-summary">
          {actions.length} action{actions.length === 1 ? '' : 's'}
        </span>
      </div>

      {actions.length === 0 ? (
        <p className="equipment-empty">
          No actions available yet — equip a worn item with an activated ability to see it here.
        </p>
      ) : (
        <div className="action-card-list">
          {actions.map(({ item, description, actionType }) => {
            const depleted = item.usePeriod !== 'unlimited' && item.usesRemaining <= 0;
            return (
              <div key={item.id} className={`action-card${depleted ? ' action-card-depleted' : ''}`}>
                <div className="action-card-header">
                  <span className="action-card-name">{item.name}</span>
                  <div className="action-card-badges">
                    <span className="action-badge action-badge-type">
                      {actionType ? ACTION_TYPE_LABELS[actionType] : 'Unknown action'}
                    </span>
                    <span className="action-badge action-badge-uses">{formatUsesRemaining(item)}</span>
                  </div>
                </div>
                <p className="action-card-body">{description || 'No description available.'}</p>
                {item.usePeriod !== 'unlimited' && (
                  <button
                    type="button"
                    className="button-primary action-card-use"
                    disabled={depleted}
                    onClick={() => onUseCharge(item.id)}
                  >
                    Use a Charge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
