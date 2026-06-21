import React from 'react';

const v = (val, fallback = '—') => val ?? fallback;

const palette = {
  primary: '#1a3a5c',
  primaryLight: '#e8f1fa',
  border: '#c8d4e0',
  rowEven: '#f7f9fc',
  rowHU: '#f3f4f6',
  orange: '#ea580c',
  orangeLight: '#fff7ed',
  red: '#dc2626',
  redLight: '#fee2e2',
  green: '#16a34a',
  greenLight: '#dcfce7',
};

const s = {
  page: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    color: '#222',
    background: '#fff',
    width: '794px',
    minHeight: '1123px',
    margin: '0 auto',
    padding: '24px 20px',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `2px solid ${palette.primary}`,
    paddingBottom: '10px',
    marginBottom: '10px',
  },
  companyName: { fontWeight: 'bold', fontSize: '14px', color: palette.primary },
  companyAddress: { fontSize: '10px', color: '#555', marginTop: '2px', lineHeight: 1.4 },
  titleBlock: { textAlign: 'right' },
  docTitle: { fontSize: '22px', fontWeight: 'bold', color: palette.primary, letterSpacing: '1px' },
  shipmentMeta: { fontSize: '11px', color: '#444', marginTop: '3px' },

  // Info row
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0',
    border: `1px solid ${palette.border}`,
    marginBottom: '10px',
  },
  infoCell: {
    border: `1px solid ${palette.border}`,
    padding: '5px 8px',
  },
  infoCellLabel: { fontSize: '9px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' },
  infoCellValue: { fontSize: '11px', color: '#222', fontWeight: '600', marginTop: '1px' },

  // Section heading
  sectionHeading: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: palette.primary,
    borderBottom: `1px solid ${palette.primary}`,
    paddingBottom: '3px',
    marginTop: '14px',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // Table
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '8px' },
  th: {
    background: palette.primary,
    color: '#fff',
    padding: '5px 5px',
    textAlign: 'left',
    fontWeight: 'bold',
    border: `1px solid #14325a`,
    whiteSpace: 'nowrap',
  },
  td: { padding: '4px 5px', border: `1px solid ${palette.border}`, verticalAlign: 'top' },
  tdRight: { padding: '4px 5px', border: `1px solid ${palette.border}`, textAlign: 'right', verticalAlign: 'top' },
  tdCenter: { padding: '4px 5px', border: `1px solid ${palette.border}`, textAlign: 'center', verticalAlign: 'middle' },
  trEven: { background: palette.rowEven },
  trHU: { background: palette.rowHU },
  trTotals: { background: palette.primaryLight, fontWeight: 'bold' },

  // Badge
  badge: (bg, color) => ({
    display: 'inline-block',
    background: bg,
    color: color,
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 'bold',
    marginLeft: '4px',
    verticalAlign: 'middle',
  }),

  // Info box
  infoBox: (borderColor, bg, color) => ({
    border: `1px solid ${borderColor}`,
    background: bg,
    color: color,
    borderRadius: '3px',
    padding: '7px 10px',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '11px',
  }),

  // Additional info grid
  addInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    marginBottom: '8px',
  },
  addInfoItem: {
    border: `1px solid ${palette.border}`,
    padding: '5px 8px',
    borderRadius: '2px',
  },
  addInfoLabel: { fontSize: '9px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' },
  addInfoValue: { fontSize: '11px', marginTop: '1px' },

  // Flags row
  flagsRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '10px',
  },
  flagItem: (bg, color, border) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: bg,
    color: color,
    border: `1px solid ${border}`,
    borderRadius: '3px',
    padding: '3px 8px',
    fontSize: '10px',
    fontWeight: 'bold',
  }),

  // Footer
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '30px',
    borderTop: `1px solid ${palette.border}`,
    paddingTop: '14px',
  },
  sigBlock: { width: '200px', textAlign: 'center' },
  sigLine: { borderTop: '1px solid #222', marginTop: '36px', paddingTop: '4px', fontSize: '10px', color: '#555' },
};

function InfoCell({ label, value }) {
  return (
    <div style={s.infoCell}>
      <div style={s.infoCellLabel}>{label}</div>
      <div style={s.infoCellValue}>{v(value)}</div>
    </div>
  );
}

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function PackingListDocument({ snapshot }) {
  if (!snapshot) return <div style={s.page}>No data provided.</div>;

  const snap = snapshot;
  const branch = snap.branch || {};
  const shipper = snap.shipper || {};
  const consignee = snap.consignee || {};
  const originPort = snap.origin_port || {};
  const destPort = snap.destination_port || {};
  const packages = snap.shipment_packages || [];
  const containers = snap.shipment_containers || [];
  const addInfo = snap.additional_information || {};

  const totalPkgs = packages.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const totalGross = packages.reduce((acc, p) => acc + (Number(p.gross_weight) || 0), 0);
  const totalNet = packages.reduce((acc, p) => acc + (Number(p.net_weight) || 0), 0);
  const totalCBM = packages.reduce((acc, p) => acc + (Number(p.volume_cbm) || 0), 0);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.headerRow}>
        <div>
          <div style={s.companyName}>{v(branch.name)}</div>
          <div style={s.companyAddress}>
            {v(branch.address)}<br />
            {branch.phone && <>Tel: {branch.phone}</>}
            {branch.phone && branch.email && ' | '}
            {branch.email && <>Email: {branch.email}</>}
          </div>
        </div>
        <div style={s.titleBlock}>
          <div style={s.docTitle}>PACKING LIST</div>
          <div style={s.shipmentMeta}>
            <strong>Shipment:</strong> {v(snap.shipment_number)} &nbsp;|&nbsp;
            <strong>Date:</strong> {formatDate(snap.created_date)}
          </div>
          {snap.doc_ref_no && (
            <div style={{ fontSize: '10px', color: '#666' }}>Ref: {snap.doc_ref_no}</div>
          )}
        </div>
      </div>

      {/* Flags Row */}
      <div style={s.flagsRow}>
        {snap.roro && (
          <div style={s.flagItem('#ede9fe', '#6d28d9', '#a78bfa')}>RO-RO SHIPMENT</div>
        )}
        {snap.origin_custom_clearance && (
          <div style={s.flagItem(palette.greenLight, '#166534', '#86efac')}>
            ✓ ORIGIN CUSTOMS CLEARANCE
          </div>
        )}
        {snap.destination_custom_clearance && (
          <div style={s.flagItem(palette.greenLight, '#166534', '#86efac')}>
            ✓ DESTINATION CUSTOMS CLEARANCE
          </div>
        )}
        {snap.third_party_booking && (
          <div style={s.flagItem('#fff7ed', '#9a3412', '#fdba74')}>THIRD-PARTY BOOKING</div>
        )}
      </div>

      {/* Info Grid */}
      <div style={s.infoGrid}>
        <InfoCell label="Shipper" value={shipper.name || shipper.display} />
        <InfoCell label="Consignee" value={consignee.name || consignee.display} />
        <InfoCell label="Shipment No" value={snap.shipment_number} />
      </div>
      <div style={s.infoGrid}>
        <InfoCell label="Origin Port" value={originPort.name ? `${originPort.name} (${v(originPort.code)})` : null} />
        <InfoCell label="Destination Port" value={destPort.name ? `${destPort.name} (${v(destPort.code)})` : null} />
        <InfoCell label="Doc Ref No" value={snap.doc_ref_no} />
      </div>
      <div style={s.infoGrid}>
        <InfoCell label="Transportation Mode" value={snap.transportation_mode} />
        <InfoCell label="Direction" value={snap.direction} />
        <InfoCell label="Service Type" value={snap.service_type} />
      </div>

      {/* Packages Table */}
      <div style={s.sectionHeading}>Package Details</div>
      {packages.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '8px' }}>No packages recorded.</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              {['#', 'Pkg No', 'Description', 'Marks & Numbers', 'Qty', 'L×W×H (cm)', 'Gross Wt (kg)', 'Net Wt (kg)', 'Vol (CBM)', 'Flags'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg, idx) => {
              const dims = (pkg.length || pkg.width || pkg.height)
                ? `${v(pkg.length, '?')} × ${v(pkg.width, '?')} × ${v(pkg.height, '?')}`
                : '—';
              const hasHUs = pkg.handling_units && pkg.handling_units.length > 0;

              return (
                <React.Fragment key={idx}>
                  <tr style={idx % 2 === 1 ? s.trEven : {}}>
                    <td style={s.td}>{idx + 1}</td>
                    <td style={s.td}>{v(pkg.package_number)}</td>
                    <td style={s.td}>{v(pkg.description)}</td>
                    <td style={s.td}>{v(pkg.marks_and_numbers)}</td>
                    <td style={s.tdRight}>{v(pkg.quantity)}</td>
                    <td style={s.td}>{dims}</td>
                    <td style={s.tdRight}>{pkg.gross_weight != null ? Number(pkg.gross_weight).toFixed(2) : '—'}</td>
                    <td style={s.tdRight}>{pkg.net_weight != null ? Number(pkg.net_weight).toFixed(2) : '—'}</td>
                    <td style={s.tdRight}>{pkg.volume_cbm != null ? Number(pkg.volume_cbm).toFixed(3) : '—'}</td>
                    <td style={s.tdCenter}>
                      {pkg.fragile && (
                        <span style={s.badge('#ea580c', '#fff7ed')}>FRAGILE</span>
                      )}
                    </td>
                  </tr>
                  {hasHUs && pkg.handling_units.map((hu, huIdx) => (
                    <tr key={`hu-${idx}-${huIdx}`} style={s.trHU}>
                      <td style={{ ...s.td, borderLeft: '3px solid #9ca3af' }}></td>
                      <td style={s.td} colSpan={2}>
                        <span style={{ marginLeft: '14px', color: '#555', fontStyle: 'italic', fontSize: '10px' }}>
                          ↳ HU: <strong>{v(hu.hu_number)}</strong>
                          {hu.description && <> — {hu.description}</>}
                        </span>
                      </td>
                      <td style={s.td} colSpan={7}></td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {/* Totals row */}
            <tr style={s.trTotals}>
              <td style={s.td} colSpan={4}><strong>TOTALS</strong></td>
              <td style={s.tdRight}><strong>{totalPkgs}</strong></td>
              <td style={s.td}>—</td>
              <td style={s.tdRight}><strong>{totalGross.toFixed(2)}</strong></td>
              <td style={s.tdRight}><strong>{totalNet.toFixed(2)}</strong></td>
              <td style={s.tdRight}><strong>{totalCBM.toFixed(3)}</strong></td>
              <td style={s.td}></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Additional Information */}
      <div style={s.sectionHeading}>Additional Information</div>
      <div style={s.addInfoGrid}>
        <div style={s.addInfoItem}>
          <div style={s.addInfoLabel}>Country of Origin</div>
          <div style={s.addInfoValue}>{v(addInfo.country_of_origin)}</div>
        </div>
        <div style={s.addInfoItem}>
          <div style={s.addInfoLabel}>Country of Destination</div>
          <div style={s.addInfoValue}>{v(addInfo.country_of_destination)}</div>
        </div>
        <div style={s.addInfoItem}>
          <div style={s.addInfoLabel}>Customs Reference</div>
          <div style={s.addInfoValue}>{v(addInfo.customs_reference)}</div>
        </div>
        <div style={s.addInfoItem}>
          <div style={s.addInfoLabel}>Export Reference</div>
          <div style={s.addInfoValue}>{v(addInfo.export_reference)}</div>
        </div>
        <div style={s.addInfoItem}>
          <div style={s.addInfoLabel}>Import Reference</div>
          <div style={s.addInfoValue}>{v(addInfo.import_reference)}</div>
        </div>
        <div style={s.addInfoItem}>
          <div style={s.addInfoLabel}>Incoterms Location</div>
          <div style={s.addInfoValue}>{v(addInfo.incoterms_location)}</div>
        </div>
      </div>

      {addInfo.contain_dangerous_goods && (
        <div style={s.infoBox(palette.red, palette.redLight, palette.red)}>
          ⚠ DANGEROUS GOODS DECLARATION — This shipment contains hazardous / dangerous goods.
          All applicable regulations and labeling requirements must be strictly observed.
        </div>
      )}
      {addInfo.has_damaged_items && (
        <div style={s.infoBox(palette.orange, palette.orangeLight, palette.orange)}>
          ⚠ DAMAGED ITEMS NOTED — One or more items in this shipment have been recorded as damaged.
          Please inspect and document all affected packages on receipt.
        </div>
      )}
      {addInfo.extra_packing_list && (
        <div style={{
          border: `1px solid ${palette.border}`,
          background: '#f0f9ff',
          color: '#0369a1',
          borderRadius: '3px',
          padding: '6px 10px',
          marginBottom: '8px',
          fontSize: '11px',
        }}>
          ℹ ADDITIONAL PACKING LIST ATTACHED — Please refer to supplementary packing list document.
        </div>
      )}

      {/* Containers */}
      {containers.length > 0 && (
        <>
          <div style={s.sectionHeading}>Container Details</div>
          <table style={s.table}>
            <thead>
              <tr>
                {['#', 'Container No', 'Seal No', 'Type', 'Status', 'Tare Wt (kg)', 'Gross Wt (kg)', 'Net Wt (kg)'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {containers.map((c, idx) => (
                <tr key={idx} style={idx % 2 === 1 ? s.trEven : {}}>
                  <td style={s.td}>{idx + 1}</td>
                  <td style={{ ...s.td, fontWeight: '600' }}>{v(c.container_number)}</td>
                  <td style={s.td}>{v(c.seal_number)}</td>
                  <td style={s.td}>{v(c.container_type)}</td>
                  <td style={s.tdCenter}>
                    <span style={{
                      background: c.status === 'Active' ? palette.greenLight : '#f3f4f6',
                      color: c.status === 'Active' ? '#166534' : '#374151',
                      borderRadius: '3px',
                      padding: '1px 6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}>{v(c.status)}</span>
                  </td>
                  <td style={s.tdRight}>{c.tare_weight != null ? Number(c.tare_weight).toFixed(2) : '—'}</td>
                  <td style={s.tdRight}>{c.gross_weight != null ? Number(c.gross_weight).toFixed(2) : '—'}</td>
                  <td style={s.tdRight}>{c.net_weight != null ? Number(c.net_weight).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Footer */}
      <div style={s.footerRow}>
        <div style={s.sigBlock}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>Date: {formatDate(snap.created_date)}</div>
          <div style={s.sigLine}>Prepared By</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#888', alignSelf: 'flex-end' }}>
          {v(branch.name)} &nbsp;|&nbsp; {v(snap.shipment_number)}
          {snap.doc_ref_no && <> &nbsp;|&nbsp; Ref: {snap.doc_ref_no}</>}
        </div>
        <div style={s.sigBlock}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>&nbsp;</div>
          <div style={s.sigLine}>Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}
