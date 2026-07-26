import type { BaseArmorItemEntry } from '../../data/baseArmor';

export function BaseArmorDetails({ item }: { item: BaseArmorItemEntry }) {
  const isShield = item.category === 'shield';

  return (
    <div className="spell-picker-details">
      <p>
        <strong>Cost:</strong> {item.costRaw || 'N/A'} <strong>Weight:</strong> {item.weightRaw || 'N/A'}
      </p>
      {item.armorBonusRaw && (
        <p>
          <strong>{isShield ? 'Shield Bonus' : 'Armor Bonus'}:</strong> {item.armorBonusRaw}{' '}
          <strong>Max Dex:</strong> {item.maxDexBonusRaw || 'N/A'} <strong>Check Penalty:</strong>{' '}
          {item.armorCheckPenaltyRaw || 'N/A'}
        </p>
      )}
      {item.arcaneSpellFailureChance != null && (
        <p>
          <strong>Arcane Spell Failure:</strong> {item.arcaneSpellFailureChance}%{' '}
          {(item.speedAt30 || item.speedAt20) && (
            <>
              <strong>Speed:</strong> {item.speedAt30 ?? 'N/A'}/{item.speedAt20 ?? 'N/A'}
            </>
          )}
        </p>
      )}
      <p className="spell-picker-description">{item.description || 'No description available.'}</p>
    </div>
  );
}
