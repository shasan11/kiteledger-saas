import React, { useState } from 'react';
import { Table, Button, Input, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import { calculateLine, toNumber, getTaxJurisdictionId, moneyWithSymbol } from './transactionCalculations.js';

/**
 * Reusable line-items table for sales/purchase-style transactions.
 * Each row holds: product_id, product_detail, description, qty, unit_price,
 * discount_percent, tax_rate_id (full object), tax_amount, line_total.
 *
 * Props:
 *   items, onChange(newItems)
 *   onDeleteExistingId(id) — invoked with backend id when an existing row is removed
 *   productSearchUrl — defaults to /api/products/search?transaction=sale
 *   priceField — 'selling_price' or 'purchase_price'
 *   currencySymbol — string prefix shown on rate/tax/amount cells
 *   showDiscount, showTax — default true
 *   minRow — keep at least N rows (default 1)
 */
export default function TransactionLineItems({
  items = [],
  onChange,
  onDeleteExistingId,
  productSearchUrl,
  priceField = 'selling_price',
  currencySymbol = '',
  showDiscount = true,
  showTax = true,
  minRow = 1,
  quickAddProduct = true,
  quickAddProductDefaults,
}) {
  const isPurchase = priceField === 'purchase_price';
  const productDefaults = quickAddProductDefaults || {
    allow_sale: !isPurchase,
    allow_purchase: isPurchase,
  };
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const rowKeyOf = (row) => row._key || row.id;

  const update = (idx, patch) => {
    const next = items.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    const recalced = next.map((r) => {
      const c = calculateLine(r);
      return { ...r, tax_amount: c.tax_amount, line_total: c.line_total, discount_amount: c.discount_amount };
    });
    onChange?.(recalced);
  };

  const addRow = () => {
    onChange?.([
      ...items,
      {
        _key: Math.random().toString(36).slice(2),
        product_id: null, product_detail: null, product_name: '', description: '',
        qty: 1, unit_price: 0, discount_percent: 0, discount_amount: 0,
        tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, line_total: 0,
      },
    ]);
  };

  const removeRow = (idx) => {
    const row = items[idx];
    if (row?.id && typeof onDeleteExistingId === 'function') onDeleteExistingId(row.id);
    const removedKey = rowKeyOf(row);
    const next = items.filter((_, i) => i !== idx);
    if (next.length < minRow) {
      next.push({
        _key: Math.random().toString(36).slice(2),
        product_id: null, product_detail: null, product_name: '', description: '',
        qty: 1, unit_price: 0, discount_percent: 0,
        tax_rate_id: null, tax_amount: 0, line_total: 0,
      });
    }
    setExpandedRowKeys((keys) => keys.filter((key) => key !== removedKey));
    onChange?.(next);
  };

  const handleProductPick = (idx, val, raw) => {
    if (!raw) {
      update(idx, { product_id: val, product_detail: null });
      return;
    }
    const price = toNumber(raw?.[priceField] ?? raw?.selling_price ?? raw?.sale_price ?? raw?.purchase_price ?? raw?.price ?? items[idx]?.unit_price);
    const defaultTax = raw?.default_tax_rate ?? null;
    update(idx, {
      product_id: val,
      product_detail: raw,
      product_name: raw?.name || raw?.label || '',
      description: items[idx]?.description || raw?.description || '',
      unit_price: price,
      tax_rate_id: defaultTax || items[idx]?.tax_rate_id || null,
      tax_jurisdiction_id: defaultTax ? getTaxJurisdictionId(defaultTax) : (items[idx]?.tax_jurisdiction_id || null),
    });
  };

  const cellInput = { background: 'transparent' };
  const numericStyle = { fontVariantNumeric: 'tabular-nums' };

  const columns = [
    {
      title: 'Product / Service',
      dataIndex: 'product_id',
      width: '24%',
      render: (val, row, idx) => (
        <BackendSelect
          value={val}
          detailValue={row.product_detail}
          fkUrl={productSearchUrl || '/api/products/search?transaction=sale'}
          labelKey="label"
          placeholder="Select product"
          variant="borderless"
          style={{ width: '100%', ...cellInput }}
          onChange={(v, raw) => handleProductPick(idx, v, raw)}
          quickAddProduct={quickAddProduct}
          quickAddProductDefaults={productDefaults}
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 130,
      render: (val, row) => {
        const rowKey = rowKeyOf(row);
        const expanded = expandedRowKeys.includes(rowKey);
        const hasDescription = String(val || '').trim().length > 0;

        return (
          <Button
            type={hasDescription ? 'link' : 'text'}
            size="small"
            onClick={() =>
              setExpandedRowKeys((keys) =>
                expanded ? keys.filter((key) => key !== rowKey) : [...keys, rowKey]
              )
            }
          >
            {expanded ? 'Hide' : hasDescription ? 'View/Edit' : 'Add'}
          </Button>
        );
      },
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      width: 80,
      align: 'right',
      render: (val, _, idx) => (
        <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%', ...numericStyle }} onChange={(v) => update(idx, { qty: v ?? 0 })} />
      ),
    },
    {
      title: 'Rate',
      dataIndex: 'unit_price',
      width: 130,
      align: 'right',
      render: (val, _, idx) => (
        <InputNumber
          variant="borderless"
          value={val}
          min={0}
          prefix={currencySymbol ? <span style={{ color: '#64748b', fontSize: 12 }}>{currencySymbol}</span> : null}
          style={{ width: '100%', ...numericStyle }}
          onChange={(v) => update(idx, { unit_price: v ?? 0 })}
        />
      ),
    },
    ...(showDiscount
      ? [{
          title: 'Disc%',
          dataIndex: 'discount_percent',
          width: 80,
          align: 'right',
          render: (val, _, idx) => (
            <InputNumber variant="borderless" value={val} min={0} max={100} style={{ width: '100%', ...numericStyle }} onChange={(v) => update(idx, { discount_percent: v ?? 0 })} />
          ),
        }]
      : []),
    ...(showTax
      ? [{
          title: 'Tax',
          dataIndex: 'tax_rate_id',
          width: 140,
          render: (val, row, idx) => {
            const id = val && typeof val === 'object' ? val.id : val;
            return (
              <BackendSelect
                value={id ?? null}
                detailValue={typeof val === 'object' ? val : null}
                fkUrl="/api/tax-rates/"
                labelKey="name"
                labelFn={(r) => [r?.name, r?.rate_percent ? `${Number(r.rate_percent)}%` : null].filter(Boolean).join(' - ')}
                placeholder="No VAT"
                variant="borderless"
                allowClear
                style={{ width: '100%', ...cellInput }}
                onChange={(_v, raw) => update(idx, { tax_rate_id: raw, tax_jurisdiction_id: getTaxJurisdictionId(raw) })}
              />
            );
          },
        }]
      : []),
    {
      title: 'Tax Amt',
      dataIndex: 'tax_amount',
      width: 110,
      align: 'right',
      render: (_, row) => (
        <span style={numericStyle}>{moneyWithSymbol(row.tax_amount, currencySymbol)}</span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'line_total',
      width: 130,
      align: 'right',
      render: (_, row) => (
        <span style={{ ...numericStyle, fontWeight: 600 }}>{moneyWithSymbol(row.line_total, currencySymbol)}</span>
      ),
    },
    {
      title: '',
      key: 'remove',
      width: 40,
      render: (_, __, idx) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeRow(idx)} disabled={items.length <= minRow} />
      ),
    },
  ];

  return (
    <div className="txn-line-items">
      <style>{`
        .txn-line-items .ant-table { border: 0; }
        .txn-line-items .ant-table-thead > tr > th {
          background: #f1f5f9 !important;
          color: #334155;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .txn-line-items .ant-table-tbody > tr > td {
          padding: 4px 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .txn-line-items .ant-table-tbody > tr:hover > td {
          background: #fafafa !important;
        }
        .txn-line-items .ant-input,
        .txn-line-items .ant-input-number-input,
        .txn-line-items .ant-select-selector {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .txn-line-items .ant-input-number,
        .txn-line-items .ant-select {
          border: 0 !important;
          box-shadow: none !important;
        }
      `}</style>
      <Table
        rowKey={rowKeyOf}
        size="small"
        bordered={false}
        pagination={false}
        columns={columns}
        dataSource={items}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: setExpandedRowKeys,
          expandedRowRender: (row, _index, _indent, expanded) => {
            if (!expanded) return null;
            const idx = items.findIndex((item) => rowKeyOf(item) === rowKeyOf(row));
            if (idx < 0) return null;

            return (
              <Input.TextArea
                value={row.description || ''}
                rows={2}
                placeholder="Line description"
                onChange={(e) => update(idx, { description: e.target.value })}
              />
            );
          },
          rowExpandable: () => true,
        }}
        footer={() => (
          <Button icon={<PlusOutlined />} type="dashed" size="small" onClick={addRow}>
            Add Row
          </Button>
        )}
      />
    </div>
  );
}
