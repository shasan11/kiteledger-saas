import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Descriptions,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import { ArrowLeftOutlined, BarcodeOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Text, Title } = Typography;
const { useToken } = theme;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const APPROVED_STATUSES = new Set([
  'posted',
  'approved',
  'confirmed',
  'completed',
  'released',
  'in_progress',
  'produced',
  'closed',
]);

const firstPresent = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const pickArray = (...values) => values.find((value) => Array.isArray(value) && value.length >= 0) || [];

export const formatDate = (value, withTime = false) => {
  if (!value) return '-';

  const parsed = dayjs(value);

  return parsed.isValid()
    ? parsed.format(withTime ? 'DD-MM-YYYY HH:mm' : 'DD-MM-YYYY')
    : value;
};

export const formatNumber = (value, decimals = 2) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return '-';

  return number.toLocaleString('en-NP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatQty = (value) => formatNumber(value, 2);
export const formatMoney = (amount) => formatNumber(amount, 2);

export const relationLabel = (value) => {
  if (!value) return '-';
  if (typeof value === 'string' || typeof value === 'number') return String(value);

  return (
    value.label ||
    value.name ||
    value.display_name ||
    value.title ||
    value.code ||
    value.account_name ||
    value.bank_name ||
    '-'
  );
};

export const productLabel = (row) => {
  const product = row?.product || row?.finishedProduct || row?.finished_product || row;

  return relationLabel(product);
};

export const warehouseLabel = (value) => relationLabel(value);

const statusColor = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (APPROVED_STATUSES.has(normalized)) return 'success';
  if (normalized === 'cancelled' || normalized === 'void') return 'error';
  if (normalized === 'draft') return 'default';

  return 'processing';
};

export const statusTag = (status) => (
  <Tag color={statusColor(status)}>
    {String(status || 'draft')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())}
  </Tag>
);

export const approvalTag = (record) => {
  if (record?.approved === true) return <Tag color="success">Approved</Tag>;
  if (record?.approved === false) return <Tag color="warning">Draft</Tag>;
  if (APPROVED_STATUSES.has(String(record?.status || '').toLowerCase())) {
    return <Tag color="success">Approved</Tag>;
  }

  return <Tag>Draft</Tag>;
};

export const lineCost = (row = {}) => {
  const amount = Number(firstPresent(row.line_total, row.total, row.amount, row.line_value));
  if (Number.isFinite(amount) && amount !== 0) return amount;

  const qty = Number(firstPresent(row.qty, row.quantity, row.consumed_qty, row.produced_qty, row.output_quantity));
  const unitCost = Number(firstPresent(row.unit_cost, row.rate, row.cost, row.unit_value, row.unit_price));

  return (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(unitCost) ? unitCost : 0);
};

export const getCostTotal = (lines = []) =>
  lines.reduce((sum, row) => sum + lineCost(row), 0);

export const getLines = (record, documentType) => {
  if (documentType === 'warehouse_transfer') {
    return pickArray(
      record?.warehouseTransferLines,
      record?.warehouse_transfer_lines,
      record?.items,
      record?.lines
    );
  }

  if (documentType === 'inventory_adjustment') {
    return pickArray(
      record?.inventoryAdjustmentLines,
      record?.inventory_adjustment_lines,
      record?.items,
      record?.lines
    );
  }

  if (documentType === 'bom') {
    return pickArray(
      record?.bomLines,
      record?.bom_lines,
      record?.components,
      record?.raw_materials,
      record?.lines,
      record?.items
    );
  }

  return pickArray(record?.lines, record?.items);
};

export const getMaterialLines = (record, documentType) => {
  if (documentType === 'production_order') {
    return pickArray(
      record?.productionOrderLines,
      record?.production_order_lines,
      record?.materialLines,
      record?.material_lines,
      record?.raw_material_lines,
      record?.lines
    );
  }

  if (documentType === 'production_journal') {
    return pickArray(
      record?.inputLines,
      record?.input_lines,
      record?.productionJournalInputLines,
      record?.production_journal_input_lines,
      record?.materialLines,
      record?.material_lines,
      record?.consumptionLines,
      record?.consumption_lines,
      record?.raw_materials,
      record?.lines
    );
  }

  return [];
};

export const getOutputLines = (record, documentType) => {
  if (documentType === 'production_order') {
    return pickArray(
      record?.outputLines,
      record?.output_lines,
      record?.finished_goods_lines
    );
  }

  if (documentType === 'production_journal') {
    return pickArray(
      record?.outputLines,
      record?.output_lines,
      record?.productionJournalOutputLines,
      record?.production_journal_output_lines,
      record?.finishedGoodsLines,
      record?.finished_goods_lines,
      record?.by_products
    );
  }

  if (documentType === 'bom') {
    return pickArray(record?.byproducts, record?.by_products);
  }

  return [];
};

function InfoTable({ rows = [] }) {
  const cleaned = rows.filter(Boolean);

  return (
    <table className="inventory-show__info-table">
      <tbody>
        {cleaned.map((row) => (
          <tr key={row.label}>
            <th>{row.label}</th>
            <td>{row.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RailCard({ rows = [], amount }) {
  return (
    <aside className="inventory-show__rail">
      <div className="inventory-show__amount">
        <Text type="secondary">Document Total</Text>
        <strong>{amount}</strong>
      </div>

      <InfoTable rows={rows} />
    </aside>
  );
}

function sectionTitle(documentType) {
  return {
    warehouse_transfer: 'Transfer Details',
    inventory_adjustment: 'Adjustment Details',
    bom: 'BOM Overview',
    production_order: 'Production Order Overview',
    production_journal: 'Production Journal Overview',
  }[documentType];
}

function getDocumentCode(record, documentType) {
  return firstPresent(
    record?.transfer_no,
    record?.adjustment_no,
    record?.bom_number,
    record?.bom_no,
    record?.code,
    record?.order_no,
    record?.production_order_no,
    record?.journal_no
  ) || `${documentType}`.replace(/_/g, ' ').toUpperCase();
}

function getFinishedProduct(record) {
  return (
    record?.finishedProduct ||
    record?.finished_product ||
    record?.product ||
    record?.finished_product_id_detail ||
    record?.product_id_detail
  );
}

function getBom(record) {
  return record?.bom || record?.billOfMaterials || record?.bill_of_materials;
}

function getProductionOrder(record) {
  return record?.productionOrder || record?.production_order;
}

function buildRailRows(record, documentType) {
  if (documentType === 'warehouse_transfer') {
    const lines = getLines(record, documentType);

    return [
      { label: 'Transfer No', value: getDocumentCode(record, documentType) },
      { label: 'Date', value: formatDate(record?.transfer_date) },
      { label: 'From Warehouse', value: warehouseLabel(record?.fromWarehouse || record?.from_warehouse) },
      { label: 'To Warehouse', value: warehouseLabel(record?.toWarehouse || record?.to_warehouse) },
      { label: 'Status', value: statusTag(record?.status) },
      { label: 'Approval', value: approvalTag(record) },
      { label: 'Total Qty', value: formatQty(lines.reduce((sum, row) => sum + Number(row?.qty || 0), 0)) },
      record?.notes && record.notes.length <= 160 ? { label: 'Notes', value: record.notes } : null,
    ];
  }

  if (documentType === 'inventory_adjustment') {
    const lines = getLines(record, documentType);
    const increased = lines
      .filter((row) => row?.adjustment_type === 'increase')
      .reduce((sum, row) => sum + Number(row?.qty || 0), 0);
    const decreased = lines
      .filter((row) => row?.adjustment_type === 'decrease')
      .reduce((sum, row) => sum + Number(row?.qty || 0), 0);

    return [
      { label: 'Adjustment No', value: getDocumentCode(record, documentType) },
      { label: 'Date', value: formatDate(record?.adjustment_date) },
      { label: 'Warehouse', value: warehouseLabel(record?.warehouse) },
      { label: 'Reason', value: record?.reason || '-' },
      { label: 'Status', value: statusTag(record?.status) },
      { label: 'Approval', value: approvalTag(record) },
      { label: 'Increase Qty', value: formatQty(increased) },
      { label: 'Decrease Qty', value: formatQty(decreased) },
      record?.notes && record.notes.length <= 160 ? { label: 'Notes', value: record.notes } : null,
    ];
  }

  if (documentType === 'bom') {
    const finishedProduct = getFinishedProduct(record);

    return [
      { label: 'BOM No', value: getDocumentCode(record, documentType) },
      { label: 'Finished Product', value: productLabel(finishedProduct) },
      { label: 'Quantity', value: formatQty(firstPresent(record?.output_quantity, record?.quantity)) },
      { label: 'Unit', value: firstPresent(record?.output_unit_code, relationLabel(record?.unit), relationLabel(finishedProduct?.productUnit)) || '-' },
      { label: 'Status', value: statusTag(firstPresent(record?.status, record?.active ? 'approved' : 'draft')) },
      { label: 'Approval', value: approvalTag(record) },
      record?.notes && record.notes.length <= 160 ? { label: 'Notes', value: record.notes } : null,
    ];
  }

  if (documentType === 'production_order') {
    const finishedProduct = getFinishedProduct(record);

    return [
      { label: 'Order No', value: getDocumentCode(record, documentType) },
      { label: 'Order Date', value: formatDate(firstPresent(record?.order_date, record?.date)) },
      { label: 'Finished Product', value: productLabel(finishedProduct) },
      { label: 'Warehouse', value: warehouseLabel(record?.warehouse) },
      { label: 'BOM', value: relationLabel(getBom(record)) },
      { label: 'Status', value: statusTag(record?.status) },
      { label: 'Approval', value: approvalTag(record) },
    ];
  }

  const finishedProduct = getFinishedProduct(record);

  return [
    { label: 'Journal No', value: getDocumentCode(record, documentType) },
    { label: 'Journal Date', value: formatDate(firstPresent(record?.journal_date, record?.date)) },
    { label: 'Production Order', value: relationLabel(getProductionOrder(record)) },
    { label: 'Finished Product', value: productLabel(finishedProduct) },
    { label: 'Warehouse', value: warehouseLabel(record?.warehouse) },
    { label: 'Status', value: statusTag(record?.status) },
    { label: 'Approval', value: approvalTag(record) },
  ];
}

function overviewRows(record, documentType) {
  const lines = getLines(record, documentType);
  const materialLines = getMaterialLines(record, documentType);
  const outputLines = getOutputLines(record, documentType);
  const finishedProduct = getFinishedProduct(record);
  const bom = getBom(record);
  const productionOrder = getProductionOrder(record);

  if (documentType === 'warehouse_transfer') {
    return [
      { label: 'Transfer No', value: getDocumentCode(record, documentType) },
      { label: 'Transfer Date', value: formatDate(record?.transfer_date) },
      { label: 'From Warehouse', value: warehouseLabel(record?.fromWarehouse || record?.from_warehouse) },
      { label: 'To Warehouse', value: warehouseLabel(record?.toWarehouse || record?.to_warehouse) },
      { label: 'Status', value: statusTag(record?.status) },
      { label: 'Approval Status', value: approvalTag(record) },
      { label: 'Total Qty', value: formatQty(lines.reduce((sum, row) => sum + Number(row?.qty || 0), 0)) },
      { label: 'Total', value: <strong>{formatQty(record?.total)}</strong> },
      { label: 'Notes', value: record?.notes || '-' },
    ];
  }

  if (documentType === 'inventory_adjustment') {
    const increased = lines
      .filter((row) => row?.adjustment_type === 'increase')
      .reduce((sum, row) => sum + Number(row?.qty || 0), 0);
    const decreased = lines
      .filter((row) => row?.adjustment_type === 'decrease')
      .reduce((sum, row) => sum + Number(row?.qty || 0), 0);

    return [
      { label: 'Adjustment No', value: getDocumentCode(record, documentType) },
      { label: 'Adjustment Date', value: formatDate(record?.adjustment_date) },
      { label: 'Warehouse', value: warehouseLabel(record?.warehouse) },
      { label: 'Reason', value: record?.reason || '-' },
      { label: 'Status', value: statusTag(record?.status) },
      { label: 'Approval Status', value: approvalTag(record) },
      { label: 'Total Qty Increased', value: formatQty(increased) },
      { label: 'Total Qty Decreased', value: formatQty(decreased) },
      { label: 'Total Cost', value: <strong>{formatMoney(record?.total)}</strong> },
      { label: 'Notes', value: record?.notes || '-' },
    ];
  }

  if (documentType === 'bom') {
    return [
      { label: 'BOM No / Code', value: getDocumentCode(record, documentType) },
      { label: 'BOM Name', value: firstPresent(record?.name, record?.title, record?.product_name) || '-' },
      { label: 'Finished Product', value: productLabel(finishedProduct) },
      { label: 'Version', value: firstPresent(record?.version, record?.revision_no) || '-' },
      { label: 'Quantity', value: formatQty(firstPresent(record?.output_quantity, record?.quantity)) },
      { label: 'Unit', value: firstPresent(record?.output_unit_code, relationLabel(record?.unit)) || '-' },
      { label: 'Status', value: statusTag(firstPresent(record?.status, record?.active ? 'approved' : 'draft')) },
      { label: 'Approval Status', value: approvalTag(record) },
      { label: 'Effective From', value: formatDate(record?.effective_from) },
      { label: 'Effective To', value: formatDate(record?.effective_to) },
      { label: 'Total Material Cost', value: <strong>{formatMoney(firstPresent(record?.total_material_cost, getCostTotal(lines)))}</strong> },
      { label: 'Total Operation Cost', value: <strong>{formatMoney(firstPresent(record?.total_operation_cost, record?.production_expense_amount))}</strong> },
      { label: 'Total Cost', value: <strong>{formatMoney(firstPresent(record?.total_cost, record?.finished_goods_cost, getCostTotal(lines)))}</strong> },
      { label: 'Notes', value: record?.notes || '-' },
    ];
  }

  if (documentType === 'production_order') {
    const producedQty = Number(firstPresent(record?.produced_qty, record?.completed_qty, 0));
    const plannedQty = Number(firstPresent(record?.planned_qty, record?.output_quantity, record?.qty, 0));

    return [
      { label: 'Production Order No', value: getDocumentCode(record, documentType) },
      { label: 'Order Date', value: formatDate(firstPresent(record?.order_date, record?.date)) },
      { label: 'Planned Start Date', value: formatDate(firstPresent(record?.planned_start_date, record?.start_date)) },
      { label: 'Planned End Date', value: formatDate(firstPresent(record?.planned_end_date, record?.end_date)) },
      { label: 'BOM', value: relationLabel(bom) },
      { label: 'Finished Product', value: productLabel(finishedProduct) },
      { label: 'Warehouse', value: warehouseLabel(record?.warehouse) },
      { label: 'Planned Qty', value: formatQty(plannedQty) },
      { label: 'Produced Qty', value: formatQty(producedQty) },
      { label: 'Remaining Qty', value: formatQty(Math.max(plannedQty - producedQty, 0)) },
      { label: 'Status', value: statusTag(record?.status) },
      { label: 'Approval Status', value: approvalTag(record) },
      { label: 'Total Cost', value: <strong>{formatMoney(firstPresent(record?.total_cost, getCostTotal(materialLines)))}</strong> },
      { label: 'Notes', value: record?.notes || '-' },
    ];
  }

  return [
    { label: 'Production Journal No', value: getDocumentCode(record, documentType) },
    { label: 'Journal Date', value: formatDate(firstPresent(record?.journal_date, record?.date)) },
    { label: 'Production Order', value: relationLabel(productionOrder) },
    { label: 'BOM', value: relationLabel(bom) },
    { label: 'Finished Product', value: productLabel(finishedProduct) },
    { label: 'Warehouse', value: warehouseLabel(record?.warehouse) },
    { label: 'Produced Qty', value: formatQty(firstPresent(record?.produced_qty, record?.output_quantity)) },
    { label: 'Rejected Qty', value: formatQty(record?.rejected_qty) },
    { label: 'Wastage Qty', value: formatQty(record?.wastage_qty) },
    { label: 'Status', value: statusTag(record?.status) },
    { label: 'Approval Status', value: approvalTag(record) },
    { label: 'Total Material Cost', value: <strong>{formatMoney(firstPresent(record?.total_material_cost, record?.raw_material_cost, getCostTotal(materialLines)))}</strong> },
    { label: 'Total Labor Cost', value: <strong>{formatMoney(record?.total_labor_cost)}</strong> },
    { label: 'Total Overhead Cost', value: <strong>{formatMoney(firstPresent(record?.total_overhead_cost, record?.production_expense_amount))}</strong> },
    { label: 'Total Cost', value: <strong>{formatMoney(firstPresent(record?.total_cost, record?.total_cost_of_production))}</strong> },
    { label: 'Journal Voucher', value: relationLabel(record?.journalVoucher || record?.journal_voucher) },
    { label: 'Notes', value: record?.notes || '-' },
  ];
}

function tableCard(title, columns, dataSource, summary, emptyText = 'No records') {
  return (
    <Card title={title} className="inventory-show__card" key={title}>
      <Table
        size="small"
        rowKey={(row, index) => row?.id || `${title}-${index}`}
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ x: 960 }}
        locale={{ emptyText: <Empty description={emptyText} /> }}
        summary={summary}
      />
    </Card>
  );
}

function buildLineCards(record, documentType) {
  const lines = getLines(record, documentType);
  const materialLines = getMaterialLines(record, documentType);
  const outputLines = getOutputLines(record, documentType);

  if (documentType === 'warehouse_transfer') {
    const totalQty = lines.reduce((sum, row) => sum + Number(row?.qty || 0), 0);

    return [
      tableCard(
        'Transfer Lines',
        [
          { title: 'Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
          { title: 'Product Code / SKU', key: 'code', render: (_, row) => firstPresent(row?.product?.code, row?.product?.sku, row?.product_code) || '-' },
          { title: 'Qty', key: 'qty', align: 'right', render: (_, row) => formatQty(row?.qty) },
          { title: 'Unit', key: 'unit', render: (_, row) => firstPresent(relationLabel(row?.product?.productUnit), row?.unit_code) || '-' },
          { title: 'Remarks', dataIndex: 'remarks', render: (value) => value || '-' },
        ],
        lines,
        () => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}>Total Qty</Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">{formatQty(totalQty)}</Table.Summary.Cell>
            <Table.Summary.Cell index={3} colSpan={2} />
          </Table.Summary.Row>
        ),
        'No transfer lines'
      ),
    ];
  }

  if (documentType === 'inventory_adjustment') {
    const totalIncrease = lines
      .filter((row) => row?.adjustment_type === 'increase')
      .reduce((sum, row) => sum + Number(row?.qty || 0), 0);
    const totalDecrease = lines
      .filter((row) => row?.adjustment_type === 'decrease')
      .reduce((sum, row) => sum + Number(row?.qty || 0), 0);
    const totalValue = getCostTotal(lines);

    return [
      tableCard(
        'Adjustment Lines',
        [
          { title: 'Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
          { title: 'Product Code / SKU', key: 'code', render: (_, row) => firstPresent(row?.product?.code, row?.product?.sku, row?.product_code) || '-' },
          { title: 'Adjustment Type', dataIndex: 'adjustment_type', render: (value) => value ? value[0].toUpperCase() + value.slice(1) : '-' },
          { title: 'Qty', key: 'qty', align: 'right', render: (_, row) => formatQty(row?.qty) },
          { title: 'Unit Cost', key: 'unit_cost', align: 'right', render: (_, row) => formatMoney(row?.unit_cost) },
          { title: 'Line Value', key: 'line_value', align: 'right', render: (_, row) => formatMoney(lineCost(row)) },
          { title: 'Remarks', dataIndex: 'remarks', render: (value) => value || '-' },
        ],
        lines,
        () => (
          <>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>Total Increase Qty</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">{formatQty(totalIncrease)}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={3} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>Total Decrease Qty</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">{formatQty(totalDecrease)}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={3} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>Total Value</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">{formatMoney(totalValue)}</Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
            </Table.Summary.Row>
          </>
        ),
        'No adjustment lines'
      ),
    ];
  }

  if (documentType === 'bom') {
    const cards = [
      tableCard(
        'Components',
        [
          { title: 'Component Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
          { title: 'Product Code / SKU', key: 'code', render: (_, row) => firstPresent(row?.product?.code, row?.product?.sku, row?.product_code) || '-' },
          { title: 'Description', key: 'description', render: (_, row) => firstPresent(row?.description, row?.notes) || '-' },
          { title: 'Qty', key: 'qty', align: 'right', render: (_, row) => formatQty(firstPresent(row?.qty, row?.quantity)) },
          { title: 'Unit', key: 'unit', render: (_, row) => firstPresent(relationLabel(row?.unit), row?.unit_code, relationLabel(row?.product?.productUnit)) || '-' },
          { title: 'Wastage %', key: 'wastage', align: 'right', render: (_, row) => formatNumber(firstPresent(row?.wastage_percent, row?.wastage, 0), 2) },
          { title: 'Unit Cost', key: 'unit_cost', align: 'right', render: (_, row) => formatMoney(firstPresent(row?.unit_cost, row?.rate)) },
          { title: 'Line Cost', key: 'line_cost', align: 'right', render: (_, row) => formatMoney(lineCost(row)) },
          { title: 'Remarks', key: 'remarks', render: (_, row) => firstPresent(row?.remarks, row?.notes) || '-' },
        ],
        lines,
        null,
        'No BOM components'
      ),
    ];

    const operations = pickArray(record?.operations, record?.operation_lines);
    if (operations.length) {
      cards.push(
        tableCard(
          'Operations',
          [
            { title: 'Operation', key: 'operation', render: (_, row) => relationLabel(row?.operation || row) },
            { title: 'Work Center', key: 'work_center', render: (_, row) => relationLabel(row?.workCenter || row?.work_center) },
            { title: 'Duration', key: 'duration', render: (_, row) => firstPresent(row?.duration, row?.duration_minutes) || '-' },
            { title: 'Cost', key: 'cost', align: 'right', render: (_, row) => formatMoney(firstPresent(row?.cost, row?.amount)) },
            { title: 'Remarks', key: 'remarks', render: (_, row) => firstPresent(row?.remarks, row?.notes) || '-' },
          ],
          operations,
          null,
          'No operations'
        )
      );
    }

    if (outputLines.length) {
      cards.push(
        tableCard(
          'By-products',
          [
            { title: 'Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
            { title: 'Qty', key: 'qty', align: 'right', render: (_, row) => formatQty(firstPresent(row?.qty, row?.quantity)) },
            { title: 'Unit', key: 'unit', render: (_, row) => firstPresent(row?.unit_code, relationLabel(row?.unit), relationLabel(row?.product?.productUnit)) || '-' },
            { title: 'Estimated Value', key: 'value', align: 'right', render: (_, row) => formatMoney(firstPresent(row?.estimated_value, row?.allocated_cost, row?.amount)) },
          ],
          outputLines,
          null,
          'No by-products'
        )
      );
    }

    return cards;
  }

  if (documentType === 'production_order') {
    const journals = pickArray(record?.productionJournals, record?.production_journals);
    const cards = [
      tableCard(
        'Material Requirements',
        [
          { title: 'Material Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
          { title: 'Product Code / SKU', key: 'code', render: (_, row) => firstPresent(row?.product?.code, row?.product?.sku, row?.product_code) || '-' },
          { title: 'Required Qty', key: 'required_qty', align: 'right', render: (_, row) => formatQty(firstPresent(row?.required_qty, row?.qty, row?.quantity)) },
          { title: 'Issued Qty', key: 'issued_qty', align: 'right', render: (_, row) => formatQty(row?.issued_qty) },
          { title: 'Consumed Qty', key: 'consumed_qty', align: 'right', render: (_, row) => formatQty(row?.consumed_qty) },
          { title: 'Unit', key: 'unit', render: (_, row) => firstPresent(row?.unit_code, relationLabel(row?.unit), relationLabel(row?.product?.productUnit)) || '-' },
          { title: 'Unit Cost', key: 'unit_cost', align: 'right', render: (_, row) => formatMoney(firstPresent(row?.unit_cost, row?.rate)) },
          { title: 'Line Cost', key: 'line_cost', align: 'right', render: (_, row) => formatMoney(lineCost(row)) },
          { title: 'Remarks', key: 'remarks', render: (_, row) => firstPresent(row?.remarks, row?.notes) || '-' },
        ],
        materialLines,
        null,
        'No production materials'
      ),
    ];

    if (outputLines.length) {
      cards.push(
        tableCard(
          'Outputs',
          [
            { title: 'Finished Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
            { title: 'Planned Qty', key: 'planned_qty', align: 'right', render: (_, row) => formatQty(firstPresent(row?.planned_qty, row?.qty)) },
            { title: 'Produced Qty', key: 'produced_qty', align: 'right', render: (_, row) => formatQty(row?.produced_qty) },
            { title: 'Accepted Qty', key: 'accepted_qty', align: 'right', render: (_, row) => formatQty(row?.accepted_qty) },
            { title: 'Rejected Qty', key: 'rejected_qty', align: 'right', render: (_, row) => formatQty(row?.rejected_qty) },
            { title: 'Unit', key: 'unit', render: (_, row) => firstPresent(row?.unit_code, relationLabel(row?.unit), relationLabel(row?.product?.productUnit)) || '-' },
            { title: 'Remarks', key: 'remarks', render: (_, row) => firstPresent(row?.remarks, row?.notes) || '-' },
          ],
          outputLines,
          null,
          'No output lines'
        )
      );
    }

    if (journals.length) {
      cards.push(
        tableCard(
          'Production Journals',
          [
            { title: 'Journal No', key: 'journal_no', render: (_, row) => firstPresent(row?.journal_no, row?.code) || '-' },
            { title: 'Journal Date', key: 'journal_date', render: (_, row) => formatDate(firstPresent(row?.journal_date, row?.date)) },
            { title: 'Produced Qty', key: 'produced_qty', align: 'right', render: (_, row) => formatQty(firstPresent(row?.produced_qty, row?.output_quantity)) },
            { title: 'Status', key: 'status', render: (_, row) => statusTag(row?.status) },
            { title: 'Total Cost', key: 'total_cost', align: 'right', render: (_, row) => formatMoney(firstPresent(row?.total_cost, row?.total_cost_of_production)) },
          ],
          journals,
          null,
          'No production journals'
        )
      );
    }

    return cards;
  }

  const costPerUnit = Number(firstPresent(record?.cost_per_unit, 0));

  return [
    tableCard(
      'Raw Material Consumption',
      [
        { title: 'Material Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
        { title: 'Product Code / SKU', key: 'code', render: (_, row) => firstPresent(row?.product?.code, row?.product?.sku, row?.product_code) || '-' },
        { title: 'Consumed Qty', key: 'consumed_qty', align: 'right', render: (_, row) => formatQty(firstPresent(row?.consumed_qty, row?.qty, row?.quantity)) },
        { title: 'Unit', key: 'unit', render: (_, row) => firstPresent(row?.unit_code, relationLabel(row?.unit), relationLabel(row?.product?.productUnit)) || '-' },
        { title: 'Unit Cost', key: 'unit_cost', align: 'right', render: (_, row) => formatMoney(firstPresent(row?.unit_cost, row?.rate)) },
        { title: 'Line Cost', key: 'line_cost', align: 'right', render: (_, row) => formatMoney(lineCost(row)) },
        { title: 'Wastage Qty', key: 'wastage_qty', align: 'right', render: (_, row) => formatQty(row?.wastage_qty) },
        { title: 'Remarks', key: 'remarks', render: (_, row) => firstPresent(row?.remarks, row?.notes) || '-' },
      ],
      materialLines,
      null,
      'No consumption lines'
    ),
    tableCard(
      'Output Lines',
      [
        { title: 'Output Product', key: 'product', render: (_, row) => productLabel(row?.product || row) },
        { title: 'Product Code / SKU', key: 'code', render: (_, row) => firstPresent(row?.product?.code, row?.product?.sku, row?.product_code) || '-' },
        { title: 'Produced Qty', key: 'produced_qty', align: 'right', render: (_, row) => formatQty(firstPresent(row?.produced_qty, row?.quantity)) },
        { title: 'Accepted Qty', key: 'accepted_qty', align: 'right', render: (_, row) => formatQty(row?.accepted_qty) },
        { title: 'Rejected Qty', key: 'rejected_qty', align: 'right', render: (_, row) => formatQty(row?.rejected_qty) },
        { title: 'Unit', key: 'unit', render: (_, row) => firstPresent(row?.unit_code, relationLabel(row?.unit), relationLabel(row?.product?.productUnit)) || '-' },
        { title: 'Unit Cost', key: 'unit_cost', align: 'right', render: (_, row) => formatMoney(firstPresent(row?.unit_cost, row?.rate)) },
        { title: 'Line Value', key: 'line_value', align: 'right', render: (_, row) => formatMoney(lineCost(row)) },
        { title: 'Remarks', key: 'remarks', render: (_, row) => firstPresent(row?.remarks, row?.notes) || '-' },
      ],
      outputLines,
      null,
      'No output lines'
    ),
    <Card title="Cost Breakdown" className="inventory-show__card" key="cost-breakdown">
      <InfoTable
        rows={[
          { label: 'Material Cost', value: formatMoney(firstPresent(record?.total_material_cost, record?.raw_material_cost, getCostTotal(materialLines))) },
          { label: 'Labor Cost', value: formatMoney(record?.total_labor_cost) },
          { label: 'Overhead Cost', value: formatMoney(firstPresent(record?.total_overhead_cost, record?.production_expense_amount)) },
          { label: 'Wastage Cost', value: formatMoney(record?.wastage_cost) },
          { label: 'Total Production Cost', value: formatMoney(firstPresent(record?.total_cost, record?.total_cost_of_production)) },
          { label: 'Cost Per Unit', value: formatMoney(costPerUnit) },
        ]}
      />
    </Card>,
  ];
}

export default function InventoryRecordShow({
  id,
  title,
  endpoint,
  backRoute,
  backLabel,
  documentType,
  editRoute,
}) {
  const { token } = useToken();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printOpen, setPrintOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get(api(`${endpoint}${id}`));

        if (!active) return;

        setRecord(data);
      } catch (err) {
        if (!active) return;

        const status = err?.response?.status;
        setRecord(null);
        setError(
          status === 404
            ? `${title} is not available from the current API resource.`
            : err?.response?.data?.message || `Unable to load ${title.toLowerCase()}.`
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [endpoint, id, title]);

  const documentCode = getDocumentCode(record, documentType);
  const railRows = useMemo(() => buildRailRows(record, documentType), [record, documentType]);
  const overview = useMemo(() => overviewRows(record, documentType), [record, documentType]);
  const cards = useMemo(() => (record ? buildLineCards(record, documentType) : []), [record, documentType]);
  const increasedLines = useMemo(() => getLines(record, documentType).filter((line) => {
    const type = String(line?.adjustment_type || line?.type || '').toLowerCase();
    if (type) return type === 'increase';
    return Number(firstPresent(line?.increase_qty, 0)) > 0;
  }), [record, documentType]);

  const amount = useMemo(() => {
    if (!record) return formatMoney(0);

    if (documentType === 'warehouse_transfer') {
      return formatQty(record?.total);
    }

    return formatMoney(
      firstPresent(
        record?.total,
        record?.total_cost,
        record?.total_cost_of_production,
        record?.finished_goods_cost,
        record?.raw_material_cost
      )
    );
  }, [documentType, record]);

  const uiVars = {
    '--inventory-show-bg': token.colorBgLayout,
    '--inventory-show-surface': token.colorBgContainer,
    '--inventory-show-surface-soft': token.colorFillAlter,
    '--inventory-show-surface-muted': token.colorFillQuaternary,
    '--inventory-show-border': token.colorBorderSecondary,
    '--inventory-show-text': token.colorText,
    '--inventory-show-text-secondary': token.colorTextSecondary,
    '--inventory-show-radius': `${token.borderRadius}px`,
    '--inventory-show-padding': `${token.padding}px`,
    '--inventory-show-padding-sm': `${token.paddingSM}px`,
    '--inventory-show-padding-xs': `${token.paddingXS}px`,
    '--inventory-show-font-size-sm': `${token.fontSizeSM}px`,
    '--inventory-show-font-size': `${token.fontSize}px`,
    '--inventory-show-font-size-lg': `${token.fontSizeLG}px`,
  };

  return (
    <AuthenticatedLayout>
      <Head title={title} />

      <style>{`
        .inventory-show {
          min-height: calc(100vh - 64px);
          background: var(--inventory-show-bg);
          color: var(--inventory-show-text);
        }

        .inventory-show__bar {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--inventory-show-padding-sm);
          padding: 0 var(--inventory-show-padding-sm);
          background: var(--inventory-show-surface);
          border-bottom: 1px solid var(--inventory-show-border);
        }

        .inventory-show__body {
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
          gap: var(--inventory-show-padding-xs);
        }

        .inventory-show__rail {
          min-height: calc(100vh - 108px);
          background: var(--inventory-show-surface);
          border-right: 1px solid var(--inventory-show-border);
          padding: var(--inventory-show-padding-sm);
        }

        .inventory-show__main {
          min-width: 0;
          padding: var(--inventory-show-padding-xs);
          display: flex;
          flex-direction: column;
          gap: var(--inventory-show-padding-sm);
        }

        .inventory-show__card.ant-card {
          border-color: var(--inventory-show-border);
          box-shadow: none;
          border-radius: var(--inventory-show-radius);
        }

        .inventory-show__card .ant-card-head {
          min-height: 40px;
          padding: 0 var(--inventory-show-padding-sm);
          border-bottom: 1px solid var(--inventory-show-border);
        }

        .inventory-show__card .ant-card-head-title {
          font-size: var(--inventory-show-font-size-sm);
          font-weight: 700;
        }

        .inventory-show__card .ant-card-body {
          padding: var(--inventory-show-padding-sm);
          min-width: 0;
        }

        .inventory-show__amount {
          padding-bottom: var(--inventory-show-padding-sm);
          margin-bottom: var(--inventory-show-padding-sm);
          border-bottom: 1px solid var(--inventory-show-border);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .inventory-show__amount strong {
          font-size: var(--inventory-show-font-size-lg);
        }

        .inventory-show__info-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: var(--inventory-show-font-size-sm);
          border: 1px solid var(--inventory-show-border);
        }

        .inventory-show__info-table th,
        .inventory-show__info-table td {
          padding: var(--inventory-show-padding-xs) var(--inventory-show-padding-sm);
          border: 1px solid var(--inventory-show-border);
          vertical-align: top;
          word-break: break-word;
        }

        .inventory-show__info-table th {
          width: 34%;
          background: var(--inventory-show-surface-soft);
          color: var(--inventory-show-text-secondary);
          font-weight: 600;
          text-align: left;
        }

        .inventory-show__info-table td {
          background: var(--inventory-show-surface);
        }

        .inventory-show .ant-table {
          font-size: var(--inventory-show-font-size-sm);
        }

        .inventory-show .ant-table-wrapper .ant-table-thead > tr > th {
          padding: var(--inventory-show-padding-xs) var(--inventory-show-padding-sm) !important;
          background: var(--inventory-show-surface-muted) !important;
          border-color: var(--inventory-show-border) !important;
          font-weight: 700;
        }

        .inventory-show .ant-table-wrapper .ant-table-tbody > tr > td,
        .inventory-show .ant-table-wrapper .ant-table-summary > tr > td {
          padding: var(--inventory-show-padding-xs) var(--inventory-show-padding-sm) !important;
          border-color: var(--inventory-show-border) !important;
        }

        .inventory-show .ant-table-wrapper .ant-table-summary > tr > td {
          background: var(--inventory-show-surface-soft);
          font-weight: 700;
        }

        .inventory-show__state {
          padding: var(--inventory-show-padding);
        }

        @media (max-width: 992px) {
          .inventory-show__body {
            grid-template-columns: 1fr;
          }

          .inventory-show__rail {
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid var(--inventory-show-border);
          }
        }
      `}</style>

      <div className="inventory-show" style={uiVars}>
        <div className="inventory-show__bar">
          <Space size={8}>
            <Link href={route(backRoute)}>
              <Button type="text" size="small" icon={<ArrowLeftOutlined />}>
                {backLabel}
              </Button>
            </Link>

            <Title level={5} style={{ margin: 0 }}>
              {title}
            </Title>

            {!loading && record ? <Text type="secondary">{documentCode}</Text> : null}
            {!loading && record ? statusTag(record?.status) : null}
            {!loading && record ? approvalTag(record) : null}
          </Space>

          <Space size={8}>
            {editRoute && (
              <Link href={route(editRoute, id)}>
                <Button size="small" icon={<EditOutlined />} disabled={loading || !record}>
                  Edit
                </Button>
              </Link>
            )}
            <Button size="small" icon={<PrinterOutlined />} onClick={() => setPrintOpen(true)}>
              Print Preview
            </Button>
            {documentType === 'inventory_adjustment' ? (
              <Button size="small" icon={<BarcodeOutlined />} onClick={() => {
                if (!increasedLines.length) {
                  window.alert('No increased stock lines available for label printing.');
                  return;
                }
                setLabelsOpen(true);
              }}>
                Print Labels
              </Button>
            ) : null}
          </Space>
        </div>

        {loading ? (
          <div className="inventory-show__state">
            <Skeleton active paragraph={{ rows: 10 }} />
          </div>
        ) : error ? (
          <div className="inventory-show__state">
            <Alert
              type="warning"
              showIcon
              message={error}
              description="This page is wired for the customer-facing document layout, but the current backend resource could not be loaded."
            />
          </div>
        ) : !record ? (
          <div className="inventory-show__state">
            <Empty description={`${title} not found`} />
          </div>
        ) : (
          <div className="inventory-show__body">
            <RailCard rows={railRows} amount={amount} />

            <main className="inventory-show__main">
              <Card title={sectionTitle(documentType)} className="inventory-show__card">
                <InfoTable rows={overview} />
              </Card>

              {cards}
            </main>
          </div>
        )}
      </div>

      <Drawer
        title="Print Preview"
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        width="min(820px, 100vw)"
        extra={<Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>}
      >
        <div className="inventory-print-document">
          <style>{`
            .inventory-print-document{font-family:Arial,sans-serif;color:#111827;font-size:12px;background:#fff;padding:24px}
            .inventory-print-header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
            .inventory-print-header h2{margin:0;font-size:22px}
            .inventory-print-meta{text-align:right}
            .inventory-print-table{width:100%;border-collapse:collapse;margin-top:14px}
            .inventory-print-table th,.inventory-print-table td{border:1px solid #d1d5db;padding:7px;vertical-align:top}
            .inventory-print-table th{background:#f3f4f6;text-align:left}
            .num{text-align:right}
            @media print{body *{visibility:hidden}.inventory-print-document,.inventory-print-document *{visibility:visible}.inventory-print-document{position:absolute;inset:0;padding:12mm;box-shadow:none}.ant-drawer,.ant-drawer-content{position:static!important;box-shadow:none!important}}
          `}</style>
          <div className="inventory-print-header">
            <div>
              <h2>{title}</h2>
              <Text>{documentCode}</Text>
            </div>
            <div className="inventory-print-meta">
              <div>{formatDate(firstPresent(record?.transfer_date, record?.adjustment_date, record?.date, record?.created_at))}</div>
              <div>{String(record?.status || 'draft').replace(/_/g, ' ')}</div>
              <div>{warehouseLabel(firstPresent(record?.warehouse, record?.fromWarehouse, record?.from_warehouse))}</div>
            </div>
          </div>
          <Descriptions size="small" bordered column={2} items={overview.map((row) => ({ key: row.label, label: row.label, children: row.value }))} />
          <table className="inventory-print-table">
            <thead>
              <tr><th>Product</th><th className="num">Qty</th><th>Unit</th><th>Type</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {getLines(record, documentType).map((line, index) => (
                <tr key={line.id || index}>
                  <td>{productLabel(line)}</td>
                  <td className="num">{formatQty(firstPresent(line.qty, line.quantity))}</td>
                  <td>{relationLabel(firstPresent(line.unit, line.productUnit, line.product_unit))}</td>
                  <td>{firstPresent(line.adjustment_type, line.type, '-')}</td>
                  <td>{firstPresent(line.remarks, line.description, '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {getMaterialLines(record, documentType).length ? (
            <table className="inventory-print-table">
              <thead>
                <tr><th colSpan={5}>Raw Materials</th></tr>
                <tr><th>Product</th><th className="num">Qty</th><th>Warehouse</th><th className="num">Cost</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {getMaterialLines(record, documentType).map((line, index) => (
                  <tr key={line.id || index}>
                    <td>{productLabel(line)}</td>
                    <td className="num">{formatQty(firstPresent(line.qty, line.quantity, line.required_qty, line.consumed_qty))}</td>
                    <td>{warehouseLabel(firstPresent(line.warehouse, line.warehouse_detail))}</td>
                    <td className="num">{formatMoney(lineCost(line))}</td>
                    <td>{firstPresent(line.remarks, line.description, '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {getOutputLines(record, documentType).length ? (
            <table className="inventory-print-table">
              <thead>
                <tr><th colSpan={5}>Byproducts / Outputs</th></tr>
                <tr><th>Product</th><th className="num">Qty</th><th>Warehouse</th><th className="num">Cost</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {getOutputLines(record, documentType).map((line, index) => (
                  <tr key={line.id || index}>
                    <td>{productLabel(line)}</td>
                    <td className="num">{formatQty(firstPresent(line.qty, line.quantity, line.output_quantity, line.produced_qty))}</td>
                    <td>{warehouseLabel(firstPresent(line.warehouse, line.warehouse_detail))}</td>
                    <td className="num">{formatMoney(lineCost(line))}</td>
                    <td>{firstPresent(line.remarks, line.description, '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </Drawer>

      <Drawer
        title="Product Labels"
        open={labelsOpen}
        onClose={() => setLabelsOpen(false)}
        width="min(760px, 100vw)"
        extra={<Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>}
      >
        <div className="inventory-label-print">
          <style>{`
            .inventory-label-print{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;background:#fff}
            .inventory-label{border:1px solid #111;padding:10px;min-height:120px;break-inside:avoid}
            .inventory-label strong{display:block;font-size:13px}
            .inventory-label .barcode{font-family:monospace;border-top:1px dashed #999;border-bottom:1px dashed #999;margin:8px 0;padding:5px 0;text-align:center}
            @media print{body *{visibility:hidden}.inventory-label-print,.inventory-label-print *{visibility:visible}.inventory-label-print{position:absolute;inset:0;padding:8mm;grid-template-columns:repeat(3,1fr)}}
          `}</style>
          {increasedLines.map((line, index) => (
            <div className="inventory-label" key={line.id || index}>
              <strong>{productLabel(line)}</strong>
              <Text>{firstPresent(line.product?.sku, line.product?.code, line.product?.barcode, '-')}</Text>
              <div className="barcode">{firstPresent(line.product?.barcode, line.product?.sku, line.product?.code, 'BARCODE')}</div>
              <div>Warehouse: {warehouseLabel(firstPresent(record?.warehouse, record?.warehouse_detail))}</div>
              <div>Qty: {formatQty(firstPresent(line.qty, line.quantity))}</div>
              <div>{documentCode} / {formatDate(firstPresent(record?.adjustment_date, record?.date))}</div>
            </div>
          ))}
        </div>
      </Drawer>
    </AuthenticatedLayout>
  );
}
