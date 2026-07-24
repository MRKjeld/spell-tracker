import type { BaseArmorItemEntry } from '../../data/baseArmor';

export function BaseArmorDetails({ item }: { item: BaseArmorItemEntry }) {
  const isShield = item.category === 'shield';

  return (
    <div className="spell-picker-details">
      <p>
        <strong>Cost:</strong> {item.costRaw || '—'} <strong>Weight:</strong> {item.weightRaw || '—'}
      </p>
      {item.armorBonusRaw && (
        <p>
          <strong>{isShield ? 'Shield Bonus' : 'Armor Bonus'}:</strong> {item.armorBonusRaw}{' '}
          <strong>Max Dex:</strong> {item.maxDexBonusRaw || '—'} <strong>Check Penalty:</strong>{' '}
          {item.armorCheckPenaltyRaw || '—'}
        </p>
      )}
      {item.arcaneSpellFailureChance != null && (
        <p>
          <strong>Arcane Spell Failure:</strong> {item.arcaneSpellFailureChance}%{' '}
          {(item.speedAt30 || item.speedAt20) && (
            <>
              <strong>Speed:</strong> {item.speedAt30 ?? '—'}/{item.speedAt20 ?? '—'}
            </>
          )}
        </p>
      )}
      <p className="spell-picker-description">{item.description || 'No description available.'}</p>
    </div>
  );
}
