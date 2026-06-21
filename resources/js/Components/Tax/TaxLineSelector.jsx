import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import { getTaxJurisdictionId } from '@/Components/Transactions/transactionCalculations.js';

export default function TaxLineSelector({
  value,
  detailValue,
  onChange,
  disabled = false,
  placeholder = 'No tax',
  variant = 'borderless',
  style,
}) {
  const id = value && typeof value === 'object' ? value.id : value;

  return (
    <BackendSelect
      value={id ?? null}
      detailValue={detailValue || (typeof value === 'object' ? value : null)}
      fkUrl="/api/tax-rates/"
      labelKey="name"
      labelFn={(rate) => [rate?.name, rate?.rate_percent ? `${Number(rate.rate_percent)}%` : null].filter(Boolean).join(' - ')}
      placeholder={placeholder}
      variant={variant}
      allowClear
      disabled={disabled}
      style={style}
      onChange={(_v, raw) => onChange?.(raw, getTaxJurisdictionId(raw))}
    />
  );
}
