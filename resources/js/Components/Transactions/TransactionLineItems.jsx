import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Input, InputNumber, Tooltip } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  RightOutlined,
  DownOutlined,
} from '@ant-design/icons';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import {
  calculateLine,
  toNumber,
  getTaxJurisdictionId,
  moneyWithSymbol,
} from './transactionCalculations.js';
import TaxLineSelector from '@/Components/Tax/TaxLineSelector.jsx';
import axios from 'axios';

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
  transactionType,
}) {
  const isPurchase = priceField === 'purchase_price';
  const documentType = transactionType || (isPurchase ? 'purchase' : 'sales');

  const COLUMN_WIDTHS = {
    expand: 36,
    product: 300,
    qty: 80,
    rate: 130,
    discount: 80,
    tax: 140,
    taxAmount: 110,
    amount: 130,
    remove: 40,
  };

  const tableScrollX =
    COLUMN_WIDTHS.expand +
    COLUMN_WIDTHS.product +
    COLUMN_WIDTHS.qty +
    COLUMN_WIDTHS.rate +
    (showDiscount ? COLUMN_WIDTHS.discount : 0) +
    (showTax ? COLUMN_WIDTHS.tax : 0) +
    COLUMN_WIDTHS.taxAmount +
    COLUMN_WIDTHS.amount +
    COLUMN_WIDTHS.remove;

  const productDefaults = quickAddProductDefaults || {
    allow_sale: !isPurchase,
    allow_purchase: isPurchase,
  };

  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [taxDefaults, setTaxDefaults] = useState(null);

  useEffect(() => {
    axios
      .get('/api/tax-settings')
      .then(({ data }) => setTaxDefaults(data?.data || null))
      .catch(() => setTaxDefaults(null));
  }, []);

  const defaultTax = useMemo(() => {
    if (!taxDefaults?.enable_tax) return null;

    return documentType === 'purchase'
      ? taxDefaults.default_purchase_tax_rate ||
          taxDefaults.default_sales_tax_rate ||
          null
      : taxDefaults.default_sales_tax_rate ||
          taxDefaults.default_purchase_tax_rate ||
          null;
  }, [documentType, taxDefaults]);

  const taxOverrideAllowed =
    documentType === 'purchase'
      ? taxDefaults?.allow_purchase_tax_override !== false
      : taxDefaults?.allow_sales_tax_override !== false;

  const rowKeyOf = (row) => row._key || row.id;

  const update = (idx, patch) => {
    const next = items.map((r, i) => (i === idx ? { ...r, ...patch } : r));

    const recalced = next.map((r) => {
      const c = calculateLine(r);

      return {
        ...r,
        tax_amount: c.tax_amount,
        line_total: c.line_total,
        discount_amount: c.discount_amount,
      };
    });

    onChange?.(recalced);
  };

  const emptyRow = () => ({
    _key: Math.random().toString(36).slice(2),
    product_id: null,
    product_detail: null,
    product_name: '',
    description: '',
    qty: 1,
    unit_price: 0,
    discount_percent: 0,
    discount_amount: 0,
    tax_rate_id: defaultTax,
    tax_jurisdiction_id: getTaxJurisdictionId(defaultTax),
    tax_amount: 0,
    line_total: 0,
  });

  const addRow = () => {
    onChange?.([...items, emptyRow()]);
  };

  const removeRow = (idx) => {
    const row = items[idx];

    if (row?.id && typeof onDeleteExistingId === 'function') {
      onDeleteExistingId(row.id);
    }

    const removedKey = rowKeyOf(row);
    const next = items.filter((_, i) => i !== idx);

    if (next.length < minRow) {
      next.push(emptyRow());
    }

    setExpandedRowKeys((keys) => keys.filter((key) => key !== removedKey));
    onChange?.(next);
  };

  const handleProductPick = (idx, val, raw) => {
    if (!raw) {
      update(idx, {
        product_id: val,
        product_detail: null,
      });
      return;
    }

    const price = toNumber(
      raw?.[priceField] ??
        raw?.selling_price ??
        raw?.sale_price ??
        raw?.purchase_price ??
        raw?.price ??
        items[idx]?.unit_price
    );

    const productTax = raw?.default_tax_rate ?? null;
    const selectedTax = productTax || items[idx]?.tax_rate_id || defaultTax;

    update(idx, {
      product_id: val,
      product_detail: raw,
      product_name: raw?.name || raw?.label || '',
      description: items[idx]?.description || raw?.description || '',
      unit_price: price,
      tax_rate_id: selectedTax,
      tax_jurisdiction_id: selectedTax
        ? getTaxJurisdictionId(selectedTax)
        : items[idx]?.tax_jurisdiction_id || null,
    });
  };

  useEffect(() => {
    if (!defaultTax || !items.length) return;

    const needsDefault = items.some((item) => !item.tax_rate_id);
    if (!needsDefault) return;

    onChange?.(
      items.map((item) => {
        if (item.tax_rate_id) return item;

        const c = calculateLine({
          ...item,
          tax_rate_id: defaultTax,
        });

        return {
          ...item,
          tax_rate_id: defaultTax,
          tax_jurisdiction_id: getTaxJurisdictionId(defaultTax),
          tax_amount: c.tax_amount,
          line_total: c.line_total,
          discount_amount: c.discount_amount,
        };
      })
    );
  }, [defaultTax]);

  const cellInput = { background: 'transparent' };
  const numericStyle = { fontVariantNumeric: 'tabular-nums' };

  const columns = [
    {
      title: 'Product / Service',
      dataIndex: 'product_id',
      width: COLUMN_WIDTHS.product,
      fixed: 'left',
      className: 'txn-product-column txn-fixed-cell',
      render: (val, row, idx) => (
        <Tooltip
          title={
            row.product_detail?.label ||
            row.product_detail?.name ||
            row.product_name ||
            ''
          }
        >
          <div className="txn-product-select">
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
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      width: COLUMN_WIDTHS.qty,
      align: 'right',
      className: 'txn-qty-column txn-fixed-cell',
      render: (val, _, idx) => (
        <InputNumber
          variant="borderless"
          value={val}
          min={0}
          style={{ width: '100%', ...numericStyle }}
          onChange={(v) => update(idx, { qty: v ?? 0 })}
        />
      ),
    },
    {
      title: 'Rate',
      dataIndex: 'unit_price',
      width: COLUMN_WIDTHS.rate,
      align: 'right',
      className: 'txn-rate-column txn-fixed-cell',
      render: (val, _, idx) => (
        <InputNumber
          variant="borderless"
          value={val}
          min={0}
          prefix={
            currencySymbol ? (
              <span style={{ color: '#64748b', fontSize: 12 }}>
                {currencySymbol}
              </span>
            ) : null
          }
          style={{ width: '100%', ...numericStyle }}
          onChange={(v) => update(idx, { unit_price: v ?? 0 })}
        />
      ),
    },
    ...(showDiscount
      ? [
          {
            title: 'Disc%',
            dataIndex: 'discount_percent',
            width: COLUMN_WIDTHS.discount,
            align: 'right',
            className: 'txn-discount-column txn-fixed-cell',
            render: (val, _, idx) => (
              <InputNumber
                variant="borderless"
                value={val}
                min={0}
                max={100}
                style={{ width: '100%', ...numericStyle }}
                onChange={(v) => update(idx, { discount_percent: v ?? 0 })}
              />
            ),
          },
        ]
      : []),
    ...(showTax
      ? [
          {
            title: 'Tax',
            dataIndex: 'tax_rate_id',
            width: COLUMN_WIDTHS.tax,
            className: 'txn-tax-column txn-fixed-cell',
            render: (val, row, idx) => {
              const id = val && typeof val === 'object' ? val.id : val;

              return (
                <div className="txn-tax-select">
                  <TaxLineSelector
                    value={id ?? null}
                    detailValue={typeof val === 'object' ? val : null}
                    disabled={!taxOverrideAllowed}
                    style={{ width: '100%', ...cellInput }}
                    onChange={(raw, taxJurisdictionId) =>
                      update(idx, {
                        tax_rate_id: raw,
                        tax_jurisdiction_id: taxJurisdictionId,
                      })
                    }
                  />
                </div>
              );
            },
          },
        ]
      : []),
    {
      title: 'Tax Amt',
      dataIndex: 'tax_amount',
      width: COLUMN_WIDTHS.taxAmount,
      align: 'right',
      className: 'txn-tax-amount-column txn-fixed-cell',
      render: (_, row) => (
        <span className="txn-ellipsis-text" style={numericStyle}>
          {moneyWithSymbol(row.tax_amount, currencySymbol)}
        </span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'line_total',
      width: COLUMN_WIDTHS.amount,
      align: 'right',
      className: 'txn-amount-column txn-fixed-cell',
      render: (_, row) => (
        <span
          className="txn-ellipsis-text"
          style={{ ...numericStyle, fontWeight: 600 }}
        >
          {moneyWithSymbol(row.line_total, currencySymbol)}
        </span>
      ),
    },
    {
      title: '',
      key: 'remove',
      width: COLUMN_WIDTHS.remove,
      className: 'txn-remove-column txn-fixed-cell',
      render: (_, __, idx) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeRow(idx)}
          disabled={items.length <= minRow}
        />
      ),
    },
  ];

  return (
    <div className="txn-line-items">
      <style>{`
        .txn-line-items {
          width: 100%;
          max-width: 100%;
        }

        .txn-line-items .ant-table-wrapper,
        .txn-line-items .ant-spin-nested-loading,
        .txn-line-items .ant-spin-container {
          width: 100%;
          max-width: 100%;
        }

        .txn-line-items .ant-table {
          border: 0;
          table-layout: fixed !important;
        }

        .txn-line-items .ant-table-container table {
          table-layout: fixed !important;
        }

        .txn-line-items .ant-table-thead > tr > th {
          background: #f1f5f9 !important;
          color: #334155;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-table-tbody > tr > td {
          padding: 4px 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-table-tbody > tr:hover > td {
          background: #fafafa !important;
        }

        .txn-line-items .txn-fixed-cell {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .txn-line-items .txn-product-column {
          width: 300px !important;
          min-width: 300px !important;
          max-width: 300px !important;
        }

        .txn-line-items .txn-qty-column {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }

        .txn-line-items .txn-rate-column {
          width: 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
        }

        .txn-line-items .txn-discount-column {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }

        .txn-line-items .txn-tax-column {
          width: 140px !important;
          min-width: 140px !important;
          max-width: 140px !important;
        }

        .txn-line-items .txn-tax-amount-column {
          width: 110px !important;
          min-width: 110px !important;
          max-width: 110px !important;
        }

        .txn-line-items .txn-amount-column {
          width: 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
        }

        .txn-line-items .txn-remove-column {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          text-align: center;
        }

        .txn-line-items .txn-ellipsis-text {
          display: block;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-input,
        .txn-line-items .ant-input-number-input,
        .txn-line-items .ant-select-selector {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .txn-line-items .ant-input-number,
        .txn-line-items .ant-select {
          width: 100% !important;
          max-width: 100% !important;
          border: 0 !important;
          box-shadow: none !important;
          overflow: hidden;
        }

        .txn-line-items .ant-input-number {
          min-width: 0 !important;
        }

        .txn-line-items .ant-input-number-input-wrap,
        .txn-line-items .ant-input-number-input {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-select-selector {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }

        .txn-line-items .ant-select-selection-search {
          max-width: 100% !important;
          overflow: hidden !important;
        }

        .txn-line-items .ant-select-selection-search-input {
          max-width: 100% !important;
        }

        .txn-line-items .ant-select-selection-item,
        .txn-line-items .ant-select-selection-placeholder {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .txn-line-items .txn-product-select,
        .txn-line-items .txn-tax-select {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .txn-line-items .txn-expand-btn {
          width: 24px;
          height: 24px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .txn-line-items .txn-expand-btn:hover {
          color: #0f172a !important;
          background: #f1f5f9 !important;
        }

        .txn-line-items .txn-description-box {
          padding: 8px 12px;
          background: #f8fafc;
          border-left: 3px solid #cbd5e1;
          white-space: normal;
        }

        .txn-line-items .txn-description-box .ant-input {
          background: #ffffff;
          padding: 8px 10px !important;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          white-space: normal;
        }

        .txn-line-items .ant-table-expanded-row > td {
          background: #f8fafc !important;
          padding: 0 8px 8px 48px !important;
          white-space: normal !important;
        }

        .txn-line-items .ant-table-row-expand-icon-cell {
          width: 36px !important;
          min-width: 36px !important;
          max-width: 36px !important;
          padding-left: 8px !important;
          padding-right: 4px !important;
        }
      `}</style>

      <Table
        rowKey={rowKeyOf}
        size="small"
        bordered={false}
        pagination={false}
        columns={columns}
        dataSource={items}
        tableLayout="fixed"
        scroll={{ x: tableScrollX }}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: setExpandedRowKeys,
          expandRowByClick: false,
          showExpandColumn: true,
          expandIconColumnIndex: 0,
          columnWidth: COLUMN_WIDTHS.expand,
          rowExpandable: () => true,
          expandIcon: ({ expanded, onExpand, record }) => (
            <Button
              type="text"
              size="small"
              className="txn-expand-btn"
              icon={expanded ? <DownOutlined /> : <RightOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onExpand(record, e);
              }}
            />
          ),
          expandedRowRender: (row) => {
            const idx = items.findIndex(
              (item) => rowKeyOf(item) === rowKeyOf(row)
            );

            if (idx < 0) return null;

            return (
              <div className="txn-description-box">
                <Input.TextArea
                  value={row.description || ''}
                  rows={2}
                  placeholder="Add line description"
                  onChange={(e) =>
                    update(idx, {
                      description: e.target.value,
                    })
                  }
                />
              </div>
            );
          },
        }}
        footer={() => (
          <Button
            icon={<PlusOutlined />}
            type="dashed"
            size="small"
            onClick={addRow}
          >
            Add Row
          </Button>
        )}
      />
    </div>
  );
}