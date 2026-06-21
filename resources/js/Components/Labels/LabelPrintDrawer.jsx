import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Drawer,
  Form,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PrintableComponent from '@/Components/PrintableComponent';
import LabelSheet from './LabelSheet';

const { Text } = Typography;

const STORAGE_KEY = 'kiteledger.inventoryAdjustment.labelSettings';

export const DEFAULT_LABEL_SETTINGS = {
  sourceDocumentType: 'inventory_adjustment',

  printIncreaseLinesOnly: true,
  productsOnly: true,
  excludeServices: true,
  requireTrackInventory: true,
  allowDecreaseLines: false,

  copiesMode: 'qty',
  fixedCopies: 1,
  qtyRounding: 'ceil',
  maxCopiesPerLine: 500,

  printerMode: 'sheet',
  paperSize: 'A4',
  pageOrientation: 'portrait',
  pageWidthMm: 210,
  pageHeightMm: 297,
  pageMarginTopMm: 8,
  pageMarginRightMm: 8,
  pageMarginBottomMm: 8,
  pageMarginLeftMm: 8,

  labelWidthMm: 50,
  labelHeightMm: 30,
  labelGapXMm: 2,
  labelGapYMm: 2,
  labelPaddingMm: 2,
  labelBorder: true,
  labelBorderStyle: 'dashed',
  labelBorderColor: '#d9d9d9',
  showCutLine: true,

  columns: 3,
  rows: 8,
  autoFitColumns: true,
  startPosition: 1,

  showCompanyName: true,
  showBranchName: false,
  showLogo: false,
  showProductName: true,
  showSku: true,
  showProductCode: true,
  showBarcode: true,
  showBarcodeValue: false,
  showQrCode: true,
  showWarehouse: true,
  showAdjustmentNo: true,
  showAdjustmentDate: true,
  showQty: false,
  showUnit: true,
  showPrice: true,
  showUnitCost: false,
  showRemarks: false,

  barcodeType: 'CODE128',
  barcodeSource: 'sku',
  barcodeHeightMm: 10,
  barcodeWidth: 1.3,
  barcodeMargin: 0,

  qrSource: 'product_id',
  qrSizeMm: 10,
  qrIncludeAppUrl: true,

  fontFamily: 'Arial, sans-serif',
  titleFontSizePx: 10,
  metaFontSizePx: 8,
  smallFontSizePx: 7,
  titleFontWeight: 700,
  textColor: '#111111',
  mutedTextColor: '#555555',
  textAlign: 'left',

  pricePrefix: 'Rs.',
  dateFormat: 'DD-MM-YYYY',
  truncateProductName: true,
  productNameMaxLines: 1,
  skuLabel: 'SKU',
  codeLabel: 'Code',
  warehouseLabel: 'WH',
  adjustmentNoLabel: 'Adj',

  printButtonText: 'Print Labels',
  downloadButtonText: 'Download PDF',
  enablePdfDownload: true,
  enableBrowserPrint: true,
  enableEmail: false,
  printWindowTitle: 'Inventory Adjustment Labels',
};

const PRESETS = {
  'a4-50x30': {
    label: 'A4 · 50×30mm',
    settings: {
      printerMode: 'sheet',
      paperSize: 'A4',
      pageOrientation: 'portrait',
      pageWidthMm: 210, pageHeightMm: 297,
      pageMarginTopMm: 8, pageMarginRightMm: 8, pageMarginBottomMm: 8, pageMarginLeftMm: 8,
      labelWidthMm: 50, labelHeightMm: 30,
      labelGapXMm: 2, labelGapYMm: 2,
      columns: 3, rows: 8, autoFitColumns: true,
    },
  },
  'a4-60x40': {
    label: 'A4 · 60×40mm',
    settings: {
      printerMode: 'sheet',
      paperSize: 'A4',
      pageOrientation: 'portrait',
      pageWidthMm: 210, pageHeightMm: 297,
      pageMarginTopMm: 8, pageMarginRightMm: 8, pageMarginBottomMm: 8, pageMarginLeftMm: 8,
      labelWidthMm: 60, labelHeightMm: 40,
      labelGapXMm: 3, labelGapYMm: 3,
      columns: 3, rows: 6, autoFitColumns: true,
    },
  },
  'thermal-50x30': {
    label: 'Thermal · 50×30mm',
    settings: {
      printerMode: 'thermal',
      paperSize: 'THERMAL_50X30',
      pageOrientation: 'portrait',
      pageWidthMm: 50, pageHeightMm: 30,
      pageMarginTopMm: 0, pageMarginRightMm: 0, pageMarginBottomMm: 0, pageMarginLeftMm: 0,
      labelWidthMm: 50, labelHeightMm: 30,
      labelGapXMm: 0, labelGapYMm: 0,
      columns: 1, rows: 1, autoFitColumns: false,
    },
  },
  'thermal-58x40': {
    label: 'Thermal · 58×40mm',
    settings: {
      printerMode: 'thermal',
      paperSize: 'THERMAL_58X40',
      pageOrientation: 'portrait',
      pageWidthMm: 58, pageHeightMm: 40,
      pageMarginTopMm: 0, pageMarginRightMm: 0, pageMarginBottomMm: 0, pageMarginLeftMm: 0,
      labelWidthMm: 58, labelHeightMm: 40,
      labelGapXMm: 0, labelGapYMm: 0,
      columns: 1, rows: 1, autoFitColumns: false,
    },
  },
  'thermal-80x50': {
    label: 'Thermal · 80×50mm',
    settings: {
      printerMode: 'thermal',
      paperSize: 'THERMAL_80X50',
      pageOrientation: 'portrait',
      pageWidthMm: 80, pageHeightMm: 50,
      pageMarginTopMm: 0, pageMarginRightMm: 0, pageMarginBottomMm: 0, pageMarginLeftMm: 0,
      labelWidthMm: 80, labelHeightMm: 50,
      labelGapXMm: 0, labelGapYMm: 0,
      columns: 1, rows: 1, autoFitColumns: false,
    },
  },
};

export function isLabelPrintableAdjustmentLine(row) {
  const product = row?.product || row?.product_detail || row?.product_id_detail;
  if (!product) return false;
  const productType = String(product?.product_type || '').toLowerCase();
  const isService = ['service', 'services'].includes(productType);
  return (
    row?.adjustment_type === 'increase' &&
    !isService &&
    product?.track_inventory === true
  );
}

function getDefaultCopies(row, settings) {
  if (settings.copiesMode === 'fixed') {
    return Math.max(1, Number(settings.fixedCopies || 1));
  }
  const qty = Number(row?.qty || 1);
  if (!Number.isFinite(qty) || qty <= 0) return 1;
  let copies = qty;
  if (settings.qtyRounding === 'floor') copies = Math.floor(qty);
  else if (settings.qtyRounding === 'ceil') copies = Math.ceil(qty);
  else if (settings.qtyRounding === 'round') copies = Math.round(qty);
  else if (settings.qtyRounding === 'exact') copies = Math.ceil(qty);
  copies = Math.max(1, Math.floor(copies));
  copies = Math.min(copies, settings.maxCopiesPerLine || 500);
  return copies;
}

function loadStoredSettings() {
  if (typeof window === 'undefined') return DEFAULT_LABEL_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LABEL_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LABEL_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_LABEL_SETTINGS;
  }
}

function saveStoredSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function buildLabel(row, record) {
  const product = row?.product || row?.product_detail || row?.product_id_detail || {};
  const productName = product.name || product.title || row.name || '-';
  const productCode = product.code || row.product_code || '-';
  const sku = product.sku || product.code || row.product_code || product.id;
  const barcode = product.barcode || product.sku || product.code || product.id;
  const unit =
    product.productUnit?.name ||
    product.product_unit?.name ||
    product.productUnit?.code ||
    product.product_unit?.code ||
    row.unit_code ||
    '-';
  const warehouseName =
    record?.warehouse?.name || record?.warehouse?.code || '-';
  const adjustmentNo = record?.adjustment_no || record?.code || record?.id;
  const adjustmentDate = record?.adjustment_date;
  const sellingPrice = product.selling_price || product.price || null;
  const unitCost = row?.unit_cost || product.purchase_price || null;
  const companyName =
    record?.company?.name || record?.tenant?.name || record?.organization?.name || null;
  const branchName = record?.branch?.name || record?.branch?.code || null;

  return {
    id: row?.id,
    line_id: row?.id,
    product_id: product.id,
    product_name: productName,
    product_code: productCode,
    sku,
    barcode,
    product_type: product.product_type,
    track_inventory: product.track_inventory,
    unit,
    warehouse_name: warehouseName,
    adjustment_no: adjustmentNo,
    adjustment_date: adjustmentDate,
    adjustment_type: row?.adjustment_type,
    qty: row?.qty,
    unit_cost: unitCost,
    selling_price: sellingPrice,
    remarks: row?.remarks,
    branch_name: branchName,
    company_name: companyName,
  };
}

function pageStylesFor(settings) {
  const {
    printerMode, paperSize, pageOrientation,
    pageWidthMm, pageHeightMm,
  } = settings;

  let pageRule = '';
  if (printerMode === 'thermal') {
    pageRule = `@page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }`;
  } else if (paperSize === 'LETTER') {
    pageRule = `@page { size: Letter ${pageOrientation}; margin: 0; }`;
  } else if (paperSize === 'CUSTOM') {
    pageRule = `@page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }`;
  } else {
    pageRule = `@page { size: A4 ${pageOrientation}; margin: 0; }`;
  }

  return `
    ${pageRule}
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    .label-sheet { background: #fff !important; }
    .label-card {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      box-shadow: none !important;
    }
    .label-page--thermal {
      break-after: page !important;
      page-break-after: always !important;
    }
    .label-page--thermal:last-child {
      break-after: auto !important;
      page-break-after: auto !important;
    }
  `;
}

export default function LabelPrintDrawer({
  open,
  onClose,
  record,
  lines = [],
  initialSelectedLineIds,
  documentType = 'inventory_adjustment',
}) {
  const [settings, setSettings] = useState(() => loadStoredSettings());
  const [selectedIds, setSelectedIds] = useState([]);
  const [copiesOverrides, setCopiesOverrides] = useState({});
  const [presetKey, setPresetKey] = useState('');

  const printableLines = useMemo(
    () => lines.filter(isLabelPrintableAdjustmentLine),
    [lines]
  );

  useEffect(() => {
    if (!open) return;
    if (initialSelectedLineIds && initialSelectedLineIds.length) {
      setSelectedIds(initialSelectedLineIds.filter((id) =>
        printableLines.some((l) => l.id === id)
      ));
    } else {
      setSelectedIds(printableLines.map((l) => l.id));
    }
    setCopiesOverrides({});
  }, [open, initialSelectedLineIds, printableLines]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((key) => {
    setPresetKey(key);
    if (!key || !PRESETS[key]) return;
    setSettings((prev) => ({ ...prev, ...PRESETS[key].settings }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_LABEL_SETTINGS);
    setPresetKey('');
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
  }, []);

  const selectedLines = useMemo(
    () => printableLines.filter((l) => selectedIds.includes(l.id)),
    [printableLines, selectedIds]
  );

  const labels = useMemo(() => {
    return selectedLines.map((row) => {
      const copies = copiesOverrides[row.id] != null
        ? Math.min(Math.max(1, Math.floor(copiesOverrides[row.id])), settings.maxCopiesPerLine || 500)
        : getDefaultCopies(row, settings);
      return { ...buildLabel(row, record), copies };
    });
  }, [selectedLines, copiesOverrides, settings, record]);

  const totalLabels = useMemo(
    () => labels.reduce((sum, l) => sum + (l.copies || 1), 0),
    [labels]
  );

  const printStyles = useMemo(() => pageStylesFor(settings), [settings]);

  const tableColumns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, row) => {
        const p = row.product || row.product_detail || {};
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{p.name || p.title || '-'}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {p.sku || p.code || '-'}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Type',
      key: 'type',
      width: 130,
      render: () => <Tag color="blue">Inventory Product</Tag>,
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      width: 80,
      align: 'right',
      render: (v) => Number(v || 0),
    },
    {
      title: 'Copies',
      key: 'copies',
      width: 110,
      render: (_, row) => {
        const dflt = getDefaultCopies(row, settings);
        const value = copiesOverrides[row.id] != null ? copiesOverrides[row.id] : dflt;
        return (
          <InputNumber
            size="small"
            min={1}
            max={settings.maxCopiesPerLine || 500}
            value={value}
            onChange={(v) =>
              setCopiesOverrides((prev) => ({ ...prev, [row.id]: v || 1 }))
            }
            style={{ width: '100%' }}
          />
        );
      },
    },
  ];

  const collapseItems = [
    {
      key: 'preset',
      label: 'Preset',
      children: (
        <Space wrap>
          <Select
            placeholder="Choose preset"
            value={presetKey || undefined}
            onChange={applyPreset}
            style={{ minWidth: 220 }}
            options={Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label }))}
            allowClear
          />
          <Tooltip title="Reset all settings to defaults">
            <Button icon={<ReloadOutlined />} onClick={resetSettings}>Reset Settings</Button>
          </Tooltip>
        </Space>
      ),
    },
    {
      key: 'paper',
      label: 'Paper',
      children: (
        <Space wrap size={8}>
          <Form.Item label="Printer Mode" style={{ marginBottom: 0 }}>
            <Select
              value={settings.printerMode}
              onChange={(v) => updateSetting('printerMode', v)}
              style={{ width: 140 }}
              options={[
                { value: 'sheet', label: 'Sheet' },
                { value: 'thermal', label: 'Thermal' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Paper" style={{ marginBottom: 0 }}>
            <Select
              value={settings.paperSize}
              onChange={(v) => updateSetting('paperSize', v)}
              style={{ width: 160 }}
              options={[
                { value: 'A4', label: 'A4' },
                { value: 'LETTER', label: 'Letter' },
                { value: 'CUSTOM', label: 'Custom' },
                { value: 'THERMAL_50X30', label: 'Thermal 50×30' },
                { value: 'THERMAL_58X40', label: 'Thermal 58×40' },
                { value: 'THERMAL_80X50', label: 'Thermal 80×50' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Orientation" style={{ marginBottom: 0 }}>
            <Select
              value={settings.pageOrientation}
              onChange={(v) => updateSetting('pageOrientation', v)}
              style={{ width: 130 }}
              options={[
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Margin (mm)" style={{ marginBottom: 0 }}>
            <InputNumber min={0} max={50} value={settings.pageMarginTopMm}
              onChange={(v) => {
                updateSetting('pageMarginTopMm', v || 0);
                updateSetting('pageMarginRightMm', v || 0);
                updateSetting('pageMarginBottomMm', v || 0);
                updateSetting('pageMarginLeftMm', v || 0);
              }} />
          </Form.Item>
        </Space>
      ),
    },
    {
      key: 'label-size',
      label: 'Label Size',
      children: (
        <Space wrap size={8}>
          <Form.Item label="Width (mm)" style={{ marginBottom: 0 }}>
            <InputNumber min={10} max={300} value={settings.labelWidthMm} onChange={(v) => updateSetting('labelWidthMm', v || 50)} />
          </Form.Item>
          <Form.Item label="Height (mm)" style={{ marginBottom: 0 }}>
            <InputNumber min={10} max={300} value={settings.labelHeightMm} onChange={(v) => updateSetting('labelHeightMm', v || 30)} />
          </Form.Item>
          <Form.Item label="Gap X" style={{ marginBottom: 0 }}>
            <InputNumber min={0} max={50} value={settings.labelGapXMm} onChange={(v) => updateSetting('labelGapXMm', v ?? 0)} />
          </Form.Item>
          <Form.Item label="Gap Y" style={{ marginBottom: 0 }}>
            <InputNumber min={0} max={50} value={settings.labelGapYMm} onChange={(v) => updateSetting('labelGapYMm', v ?? 0)} />
          </Form.Item>
          <Form.Item label="Padding" style={{ marginBottom: 0 }}>
            <InputNumber min={0} max={20} value={settings.labelPaddingMm} onChange={(v) => updateSetting('labelPaddingMm', v ?? 0)} />
          </Form.Item>
          <Form.Item label="Border" style={{ marginBottom: 0 }}>
            <Select
              value={settings.labelBorderStyle}
              onChange={(v) => {
                updateSetting('labelBorderStyle', v);
                updateSetting('labelBorder', v !== 'none');
              }}
              style={{ width: 110 }}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'none', label: 'None' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Cols" style={{ marginBottom: 0 }}>
            <InputNumber min={1} max={20} value={settings.columns} onChange={(v) => updateSetting('columns', v || 1)} disabled={settings.autoFitColumns} />
          </Form.Item>
          <Form.Item label="Auto-fit" style={{ marginBottom: 0 }}>
            <Switch checked={settings.autoFitColumns} onChange={(v) => updateSetting('autoFitColumns', v)} />
          </Form.Item>
          <Form.Item label="Start Pos" style={{ marginBottom: 0 }}>
            <InputNumber min={1} max={200} value={settings.startPosition} onChange={(v) => updateSetting('startPosition', v || 1)} />
          </Form.Item>
        </Space>
      ),
    },
    {
      key: 'content',
      label: 'Content',
      children: (
        <Space wrap size={[16, 8]}>
          {[
            ['showProductName', 'Product Name'],
            ['showSku', 'SKU'],
            ['showProductCode', 'Code'],
            ['showBarcode', 'Barcode'],
            ['showBarcodeValue', 'Barcode Value'],
            ['showQrCode', 'QR Code'],
            ['showWarehouse', 'Warehouse'],
            ['showAdjustmentNo', 'Adj No'],
            ['showAdjustmentDate', 'Adj Date'],
            ['showUnit', 'Unit'],
            ['showPrice', 'Price'],
            ['showUnitCost', 'Unit Cost'],
            ['showQty', 'Qty'],
            ['showRemarks', 'Remarks'],
            ['showCompanyName', 'Company'],
            ['showBranchName', 'Branch'],
          ].map(([key, label]) => (
            <Checkbox
              key={key}
              checked={settings[key]}
              onChange={(e) => updateSetting(key, e.target.checked)}
            >
              {label}
            </Checkbox>
          ))}
        </Space>
      ),
    },
    {
      key: 'barcode-qr',
      label: 'Barcode / QR',
      children: (
        <Space wrap size={8}>
          <Form.Item label="Barcode Type" style={{ marginBottom: 0 }}>
            <Select
              value={settings.barcodeType}
              onChange={(v) => updateSetting('barcodeType', v)}
              style={{ width: 140 }}
              options={['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF14'].map((c) => ({ value: c, label: c }))}
            />
          </Form.Item>
          <Form.Item label="Barcode Source" style={{ marginBottom: 0 }}>
            <Select
              value={settings.barcodeSource}
              onChange={(v) => updateSetting('barcodeSource', v)}
              style={{ width: 170 }}
              options={[
                { value: 'sku', label: 'SKU' },
                { value: 'barcode', label: 'Product Barcode' },
                { value: 'product_code', label: 'Product Code' },
                { value: 'product_id', label: 'Product ID' },
                { value: 'adjustment_line_id', label: 'Line ID' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Barcode H (mm)" style={{ marginBottom: 0 }}>
            <InputNumber min={3} max={50} value={settings.barcodeHeightMm} onChange={(v) => updateSetting('barcodeHeightMm', v || 10)} />
          </Form.Item>
          <Form.Item label="Bar Width" style={{ marginBottom: 0 }}>
            <InputNumber min={0.5} max={5} step={0.1} value={settings.barcodeWidth} onChange={(v) => updateSetting('barcodeWidth', v || 1)} />
          </Form.Item>
          <Form.Item label="QR Source" style={{ marginBottom: 0 }}>
            <Select
              value={settings.qrSource}
              onChange={(v) => updateSetting('qrSource', v)}
              style={{ width: 160 }}
              options={[
                { value: 'product_id', label: 'Product ID' },
                { value: 'sku', label: 'SKU' },
                { value: 'barcode', label: 'Barcode' },
                { value: 'adjustment_line_id', label: 'Line ID' },
                { value: 'product_url', label: 'Product URL' },
              ]}
            />
          </Form.Item>
          <Form.Item label="QR Size (mm)" style={{ marginBottom: 0 }}>
            <InputNumber min={5} max={50} value={settings.qrSizeMm} onChange={(v) => updateSetting('qrSizeMm', v || 10)} />
          </Form.Item>
        </Space>
      ),
    },
    {
      key: 'copies',
      label: 'Copies',
      children: (
        <Space wrap size={8}>
          <Form.Item label="Mode" style={{ marginBottom: 0 }}>
            <Select
              value={settings.copiesMode}
              onChange={(v) => updateSetting('copiesMode', v)}
              style={{ width: 130 }}
              options={[
                { value: 'qty', label: 'From Qty' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'manual', label: 'Manual' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Fixed Copies" style={{ marginBottom: 0 }}>
            <InputNumber min={1} max={settings.maxCopiesPerLine || 500} value={settings.fixedCopies}
              onChange={(v) => updateSetting('fixedCopies', v || 1)}
              disabled={settings.copiesMode !== 'fixed'} />
          </Form.Item>
          <Form.Item label="Qty Rounding" style={{ marginBottom: 0 }}>
            <Select
              value={settings.qtyRounding}
              onChange={(v) => updateSetting('qtyRounding', v)}
              style={{ width: 120 }}
              options={['ceil', 'floor', 'round', 'exact'].map((c) => ({ value: c, label: c }))}
              disabled={settings.copiesMode === 'fixed'}
            />
          </Form.Item>
          <Form.Item label="Max / Line" style={{ marginBottom: 0 }}>
            <InputNumber min={1} max={5000} value={settings.maxCopiesPerLine}
              onChange={(v) => updateSetting('maxCopiesPerLine', v || 500)} />
          </Form.Item>
        </Space>
      ),
    },
  ];

  const noPrintable = printableLines.length === 0;
  const noSelected = labels.length === 0;

  const fileName = useMemo(() => {
    const code = record?.adjustment_no || record?.code || record?.id || 'labels';
    const date = dayjs().format('YYYYMMDD-HHmm');
    return `labels-${code}-${date}.pdf`;
  }, [record]);

  return (
    <Drawer
      title="Print Labels"
      open={open}
      onClose={onClose}
      width={900}
      destroyOnClose
    >
      {noPrintable ? (
        <Alert
          type="warning"
          showIcon
          message="No inventory product lines available for label printing."
          description="Labels can only be printed for increase adjustment lines where the product has track inventory enabled and is not a service."
        />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            message={`${printableLines.length} printable line${printableLines.length === 1 ? '' : 's'} · ${labels.length} selected · ${totalLabels} label${totalLabels === 1 ? '' : 's'} total`}
            style={{ marginBottom: 12 }}
          />

          <Collapse
            size="small"
            defaultActiveKey={['preset']}
            items={collapseItems}
            style={{ marginBottom: 12 }}
          />

          <Divider orientation="left" plain style={{ margin: '8px 0' }}>Lines</Divider>

          <Table
            size="small"
            rowKey="id"
            columns={tableColumns}
            dataSource={printableLines}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys),
            }}
            scroll={{ y: 220 }}
          />

          <Divider orientation="left" plain style={{ margin: '12px 0 8px' }}>Preview</Divider>

          <PrintableComponent
            title="Inventory Adjustment Labels"
            fileName={fileName}
            printWindowTitle={settings.printWindowTitle}
            printButtonText={settings.printButtonText}
            downloadButtonText={settings.downloadButtonText}
            allowPrint={settings.enableBrowserPrint && !noSelected}
            allowDownload={settings.enablePdfDownload && !noSelected}
            allowEmail={settings.enableEmail}
            disabled={noSelected}
            pageSize={settings.printerMode === 'thermal' ? 'A4' : settings.paperSize}
            pageOrientation={settings.pageOrientation}
            printStyles={printStyles}
            showPageFrame={false}
            previewBackground="#f5f5f5"
          >
            <LabelSheet labels={labels} settings={settings} />
          </PrintableComponent>
        </>
      )}
    </Drawer>
  );
}
