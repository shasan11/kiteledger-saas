import React from 'react';
import TaxSummaryBox from '@/Components/Tax/TaxSummaryBox.jsx';

export default function TransactionTotals({ items = [], currencySymbol = '', extra = null }) {
  return <TaxSummaryBox items={items} currencySymbol={currencySymbol || ''} extra={extra} />;
}
