import React, { useMemo } from 'react';
import LabelCard from './LabelCard';

const MM = (n) => `${n}mm`;

function expandLabels(labels) {
  const out = [];
  labels.forEach((label) => {
    const copies = Math.max(1, Math.floor(Number(label.copies) || 1));
    for (let i = 0; i < copies; i += 1) {
      out.push(label);
    }
  });
  return out;
}

export default function LabelSheet({ labels = [], settings }) {
  const expanded = useMemo(() => expandLabels(labels), [labels]);

  const {
    printerMode,
    pageMarginTopMm,
    pageMarginRightMm,
    pageMarginBottomMm,
    pageMarginLeftMm,
    labelGapXMm,
    labelGapYMm,
    columns,
    autoFitColumns,
    labelWidthMm,
    labelHeightMm,
    startPosition,
  } = settings;

  if (!expanded.length) {
    return (
      <div style={{ padding: 12, color: '#999', textAlign: 'center' }}>
        No labels to render.
      </div>
    );
  }

  if (printerMode === 'thermal') {
    return (
      <div className="label-sheet label-sheet--thermal" style={{ background: '#fff' }}>
        {expanded.map((label, idx) => (
          <div
            key={`${label.line_id || label.id}-${idx}`}
            className="label-page label-page--thermal"
            style={{
              width: MM(labelWidthMm),
              height: MM(labelHeightMm),
              pageBreakAfter: idx < expanded.length - 1 ? 'always' : 'auto',
              breakAfter: idx < expanded.length - 1 ? 'page' : 'auto',
              display: 'block',
            }}
          >
            <LabelCard label={label} settings={settings} />
          </div>
        ))}
      </div>
    );
  }

  // Sheet mode (A4 / Letter / custom)
  const offset = Math.max(0, Math.min(Number(startPosition || 1) - 1, 200));
  const blanks = Array.from({ length: offset });
  const gridCols = autoFitColumns
    ? `repeat(auto-fit, ${MM(labelWidthMm)})`
    : `repeat(${Math.max(1, columns || 1)}, ${MM(labelWidthMm)})`;

  return (
    <div
      className="label-sheet label-sheet--grid"
      style={{
        background: '#fff',
        paddingTop: MM(pageMarginTopMm),
        paddingRight: MM(pageMarginRightMm),
        paddingBottom: MM(pageMarginBottomMm),
        paddingLeft: MM(pageMarginLeftMm),
        display: 'grid',
        gridTemplateColumns: gridCols,
        columnGap: MM(labelGapXMm),
        rowGap: MM(labelGapYMm),
        justifyContent: 'start',
        alignContent: 'start',
      }}
    >
      {blanks.map((_, i) => (
        <LabelCard key={`blank-${i}`} blank settings={settings} />
      ))}
      {expanded.map((label, idx) => (
        <LabelCard
          key={`${label.line_id || label.id}-${idx}`}
          label={label}
          settings={settings}
        />
      ))}
    </div>
  );
}
