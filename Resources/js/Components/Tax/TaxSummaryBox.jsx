import React from 'react';
import { Card, Col, Row, Space, Tag } from 'antd';
import { calculateTotals, calculateLine, moneyWithSymbol, asId, getTaxLabel, getTaxPercent } from '@/Components/Transactions/transactionCalculations.js';

const Line = ({ label, value, symbol, strong = false }) => (
  <Row justify="space-between" style={{ padding: '4px 0', fontWeight: strong ? 600 : 400, fontSize: strong ? 15 : 13 }}>
    <Col style={{ color: strong ? '#111827' : '#4b5563' }}>{label}</Col>
    <Col style={{ fontVariantNumeric: 'tabular-nums' }}>{moneyWithSymbol(value, symbol)}</Col>
  </Row>
);

export default function TaxSummaryBox({ items = [], currencySymbol = '', extra = null }) {
  const totals = calculateTotals(items);
  const breakdown = new Map();

  items.forEach((item) => {
    const tax = typeof item.tax_rate_id === 'object' ? item.tax_rate_id : (item.taxRate || item.tax_rate || null);
    const calc = calculateLine(item);
    const key = asId(tax) || 'no_tax';
    const label = tax ? `${getTaxLabel(tax) || 'Tax'} ${getTaxPercent(tax)}%` : 'No tax';
    const prev = breakdown.get(key) || { label, amount: 0 };
    prev.amount += calc.tax_amount;
    breakdown.set(key, prev);
  });

  return (
    <Row justify="end">
      <Col xs={24} sm={16} md={10} lg={8}>
        <Card size="small" styles={{ body: { padding: 12, background: '#f8fafc' } }} style={{ border: '1px solid #e2e8f0' }}>
          <Line label="Subtotal" value={totals.subtotal} symbol={currencySymbol} />
          {totals.discount_total > 0 && <Line label="Discount" value={totals.discount_total} symbol={currencySymbol} />}
          <Line label="Taxable Amount" value={totals.taxable_total} symbol={currencySymbol} />
          <Line label="Tax Amount" value={totals.tax_total} symbol={currencySymbol} />
          {[...breakdown.values()].filter((row) => row.amount > 0).length > 1 && (
            <Space wrap size={[4, 4]} style={{ marginTop: 4 }}>
              {[...breakdown.values()].filter((row) => row.amount > 0).map((row) => (
                <Tag key={row.label} style={{ marginInlineEnd: 0 }}>
                  {row.label}: {moneyWithSymbol(row.amount, currencySymbol)}
                </Tag>
              ))}
            </Space>
          )}
          {extra}
          <div style={{ borderTop: '1px solid #cbd5e1', margin: '8px 0' }} />
          <Line label="Grand Total" value={totals.grand_total} symbol={currencySymbol} strong />
        </Card>
      </Col>
    </Row>
  );
}
