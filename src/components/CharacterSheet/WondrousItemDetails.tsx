import type { WondrousItemEntry } from '../../data/wondrousItems';

export function WondrousItemDetails({ item }: { item: WondrousItemEntry }) {
  return (
    <div className="spell-picker-details">
      <p>
        <strong>Price:</strong> {item.price}
      </p>
      <p>
        <strong>Aura:</strong> {item.aura} <strong>CL:</strong> {item.cl}
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
