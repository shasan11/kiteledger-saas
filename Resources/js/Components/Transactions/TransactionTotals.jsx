import React from 'react';
import { Row, Col, Card } from 'antd';
import { calculateTotals, moneyWithSymbol } from './transactionCalculations.js';

const Line = ({ label, value, symbol, strong = false }) => (
  <Row justify="space-between" style={{ padding: '4px 0', fontWeight: strong ? 600 : 400, fontSize: strong ? 15 : 13 }}>
    <Col style={{ color: strong ? '#111' : '#555' }}>{label}</Col>
    <Col style={{ fontVariantNumeric: 'tabular-nums' }}>{moneyWithSymbol(value, symbol)}</Col>
  </Row>
);

export default function TransactionTotals({ items = [], currencySymbol = '', extra = null }) {
  const t = calculateTotals(items);
  const sym = currencySymbol || '';
  return (
    <Row justify="end">
      <Col xs={24} sm={16} md={10} lg={8}>
        <Card size="small" styles={{ body: { padding: 12, background: '#f8fafc' } }} style={{ border: '1px solid #e2e8f0' }}>
          <Line label="Subtotal" value={t.subtotal} symbol={sym} />
          {t.discount_total > 0 && <Line label="Discount" value={t.discount_total} symbol={sym} />}
          <Line label="Taxable" value={t.taxable_total} symbol={sym} />
          {t.non_taxable_total > 0 && <Line label="Non-taxable" value={t.non_taxable_total} symbol={sym} />}
          <Line label="Tax / VAT" value={t.tax_total} symbol={sym} />
          {extra}
          <div style={{ borderTop: '1px solid #cbd5e1', margin: '8px 0' }} />
          <Line label="Total" value={t.grand_total} symbol={sym} strong />
        </Card>
      </Col>
    </Row>
  );
}
