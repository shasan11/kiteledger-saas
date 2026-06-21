import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function Barcode({
  value,
  format = 'CODE128',
  width = 1.3,
  height = 40,
  displayValue = false,
  margin = 0,
  fontSize = 10,
  background = '#ffffff',
  lineColor = '#000000',
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (value === undefined || value === null || value === '') return;

    try {
      JsBarcode(ref.current, String(value), {
        format,
        width,
        height,
        displayValue,
        margin,
        fontSize,
        background,
        lineColor,
      });
    } catch (err) {
      // swallow — bad code/value combo
    }
  }, [value, format, width, height, displayValue, margin, fontSize, background, lineColor]);

  if (value === undefined || value === null || value === '') {
    return (
      <span style={{ fontSize: 9, color: '#888' }}>No barcode</span>
    );
  }

  return (
    <svg
      ref={ref}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    />
  );
}
