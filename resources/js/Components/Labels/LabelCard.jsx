import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import Barcode from './Barcode';

const MM = (n) => `${n}mm`;

function fmtDate(value, format = 'DD-MM-YYYY') {
  if (!value) return '';
  const d = dayjs(value);
  return d.isValid() ? d.format(format) : String(value);
}

function getBarcodeValue(label, settings) {
  switch (settings.barcodeSource) {
    case 'barcode': return label.barcode;
    case 'product_code': return label.product_code;
    case 'product_id': return label.product_id;
    case 'adjustment_line_id': return label.line_id;
    case 'sku':
    default:
      return label.sku || label.barcode || label.product_code || label.product_id;
  }
}

function getQrValue(label, settings) {
  switch (settings.qrSource) {
    case 'sku': return label.sku;
    case 'barcode': return label.barcode;
    case 'adjustment_line_id': return label.line_id;
    case 'product_url':
      if (typeof window !== 'undefined') {
        return `${window.location.origin}/products/${label.product_id}`;
      }
      return String(label.product_id || '');
    case 'product_id':
    default:
      return label.product_id;
  }
}

export default function LabelCard({ label, settings, blank = false }) {
  const {
    labelWidthMm,
    labelHeightMm,
    labelPaddingMm,
    labelBorder,
    labelBorderStyle,
    labelBorderColor,
    fontFamily,
    titleFontSizePx,
    metaFontSizePx,
    smallFontSizePx,
    titleFontWeight,
    textColor,
    mutedTextColor,
    textAlign,
    truncateProductName,
    productNameMaxLines,
    skuLabel,
    codeLabel,
    warehouseLabel,
    adjustmentNoLabel,
    pricePrefix,
    dateFormat,
    barcodeType,
    barcodeHeightMm,
    barcodeWidth,
    barcodeMargin,
    showBarcodeValue,
    qrSizeMm,
  } = settings;

  const containerStyle = {
    width: MM(labelWidthMm),
    height: MM(labelHeightMm),
    padding: MM(labelPaddingMm),
    boxSizing: 'border-box',
    border: labelBorder && labelBorderStyle !== 'none'
      ? `1px ${labelBorderStyle} ${labelBorderColor}`
      : 'none',
    fontFamily,
    color: textColor,
    textAlign,
    background: '#ffffff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  };

  if (blank || !label) {
    return <div className="label-card label-card--blank" style={containerStyle} />;
  }

  const titleStyle = {
    fontSize: titleFontSizePx,
    fontWeight: titleFontWeight,
    lineHeight: 1.15,
    overflow: 'hidden',
    ...(truncateProductName
      ? {
          display: '-webkit-box',
          WebkitLineClamp: productNameMaxLines,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
        }
      : {}),
  };

  const metaStyle = {
    fontSize: metaFontSizePx,
    lineHeight: 1.2,
    color: mutedTextColor,
  };

  const smallStyle = {
    fontSize: smallFontSizePx,
    lineHeight: 1.2,
    color: mutedTextColor,
  };

  const barcodeValue = getBarcodeValue(label, settings);
  const qrValue = String(getQrValue(label, settings) ?? '');

  const headerLines = [];

  if (settings.showCompanyName && label.company_name) {
    headerLines.push(
      <div key="cn" style={smallStyle}>{label.company_name}</div>
    );
  }
  if (settings.showBranchName && label.branch_name) {
    headerLines.push(
      <div key="bn" style={smallStyle}>{label.branch_name}</div>
    );
  }

  const middleMetaParts = [];
  if (settings.showSku && label.sku) middleMetaParts.push(`${skuLabel}: ${label.sku}`);
  if (settings.showProductCode && label.product_code) middleMetaParts.push(`${codeLabel}: ${label.product_code}`);

  const footerParts = [];
  if (settings.showWarehouse && label.warehouse_name) footerParts.push(`${warehouseLabel}: ${label.warehouse_name}`);
  if (settings.showAdjustmentNo && label.adjustment_no) footerParts.push(`${adjustmentNoLabel}: ${label.adjustment_no}`);
  if (settings.showAdjustmentDate && label.adjustment_date) footerParts.push(fmtDate(label.adjustment_date, dateFormat));

  const priceParts = [];
  if (settings.showPrice && label.selling_price != null) {
    priceParts.push(`${pricePrefix} ${Number(label.selling_price).toFixed(2)}`);
  }
  if (settings.showUnitCost && label.unit_cost != null) {
    priceParts.push(`Cost ${pricePrefix} ${Number(label.unit_cost).toFixed(2)}`);
  }
  if (settings.showQty && label.qty != null) {
    priceParts.push(`Qty ${label.qty}${settings.showUnit && label.unit ? ' ' + label.unit : ''}`);
  } else if (settings.showUnit && label.unit) {
    priceParts.push(label.unit);
  }

  const hasQr = settings.showQrCode && qrValue;
  const hasBarcode = settings.showBarcode && barcodeValue;

  return (
    <div className="label-card" style={containerStyle}>
      {headerLines.length > 0 && (
        <div style={{ marginBottom: 1 }}>{headerLines}</div>
      )}

      {settings.showProductName && (
        <div style={titleStyle}>{label.product_name}</div>
      )}

      {middleMetaParts.length > 0 && (
        <div style={metaStyle}>{middleMetaParts.join(' · ')}</div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: MM(1),
          flex: 1,
          minHeight: 0,
          marginTop: 1,
        }}
      >
        {hasBarcode && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%' }}>
              <Barcode
                value={barcodeValue}
                format={barcodeType}
                width={barcodeWidth}
                height={barcodeHeightMm * (96 / 25.4)}
                displayValue={showBarcodeValue}
                margin={barcodeMargin}
                fontSize={smallFontSizePx}
              />
            </div>
          </div>
        )}

        {hasQr && (
          <div
            style={{
              width: MM(qrSizeMm),
              height: MM(qrSizeMm),
              flexShrink: 0,
            }}
          >
            <QRCodeSVG
              value={qrValue || ' '}
              size={256}
              style={{ width: '100%', height: '100%' }}
              viewBox="0 0 256 256"
            />
          </div>
        )}
      </div>

      {priceParts.length > 0 && (
        <div style={{ ...metaStyle, color: textColor, fontWeight: 600 }}>
          {priceParts.join(' · ')}
        </div>
      )}

      {footerParts.length > 0 && (
        <div style={smallStyle}>{footerParts.join(' · ')}</div>
      )}

      {settings.showRemarks && label.remarks && (
        <div style={smallStyle}>{label.remarks}</div>
      )}
    </div>
  );
}
