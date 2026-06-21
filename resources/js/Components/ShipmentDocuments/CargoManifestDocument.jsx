import React from 'react';

const v = (val, fallback = '—') => val ?? fallback;

const styles = {
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
  // Header
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid #1a3a5c',
    paddingBottom: '10px',
    marginBottom: '10px',
  },
  companyBlock: { flex: 1, minWidth: 0 },
  companyName: { fontWeight: 'bold', fontSize: '14px', color: '#1a3a5c' },
  companyAddress: { fontSize: '10px', color: '#555', marginTop: '2px', lineHeight: 1.4 },
  titleBlock: { flex: 1, textAlign: 'center' },
  docTitle: { fontSize: '20px', fontWeight: 'bold', color: '#1a3a5c', letterSpacing: '1px' },
  manifestRefBlock: { flex: 1, textAlign: 'right' },
  manifestRefLabel: { fontSize: '10px', color: '#555' },
  manifestRefValue: { fontWeight: 'bold', fontSize: '13px', color: '#1a3a5c' },

  // Badge / Banner
  banner: (color, bg) => ({
    background: bg,
    color: color,
    fontWeight: 'bold',
    fontSize: '11px',
    padding: '5px 10px',
    borderRadius: '3px',
    marginBottom: '8px',
    textAlign: 'center',
    border: `1px solid ${color}`,
  }),
  badge: (bg, color) => ({
    display: 'inline-block',
    background: bg,
    color: color,
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 'bold',
    marginLeft: '6px',
    verticalAlign: 'middle',
  }),

  // Info grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0',
    border: '1px solid #bbb',
    marginBottom: '8px',
  },
  infoCell: {
    border: '1px solid #bbb',
    padding: '4px 7px',
  },
  infoCellLabel: { fontSize: '9px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' },
  infoCellValue: { fontSize: '11px', color: '#222', fontWeight: '600', marginTop: '1px' },

  // Shipper / Consignee
  partyRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  partyBox: {
    flex: 1,
    border: '1px solid #bbb',
    padding: '6px 8px',
    borderRadius: '2px',
  },
  partyLabel: {
    fontSize: '9px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#888',
    borderBottom: '1px solid #eee',
    paddingBottom: '3px',
    marginBottom: '4px',
  },
  partyValue: { fontSize: '11px', color: '#222', lineHeight: 1.5 },

  // Section heading
  sectionHeading: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#1a3a5c',
    borderBottom: '1px solid #1a3a5c',
    paddingBottom: '3px',
    marginTop: '14px',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // Table
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' },
  th: {
    background: '#1a3a5c',
    color: '#fff',
    padding: '5px 5px',
    textAlign: 'left',
    fontWeight: 'bold',
    border: '1px solid #155',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '4px 5px',
    border: '1px solid #ddd',
    verticalAlign: 'top',
  },
  tdCenter: {
    padding: '4px 5px',
    border: '1px solid #ddd',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  tdStrike: {
    padding: '4px 5px',
    border: '1px solid #ddd',
    textDecoration: 'line-through',
    color: '#aaa',
    verticalAlign: 'top',
  },
  trDirect: { background: '#e8f4fd' },
  trInactive: { background: '#f9f9f9' },
  trEven: { background: '#f7f9fc' },
  trTotals: { background: '#eaf0f8', fontWeight: 'bold' },

  // Footer
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '30px',
    borderTop: '1px solid #bbb',
    paddingTop: '14px',
  },
  sigBlock: { width: '200px', textAlign: 'center' },
  sigLine: { borderTop: '1px solid #222', marginTop: '36px', paddingTop: '4px', fontSize: '10px', color: '#555' },
};

function InfoCell({ label, value }) {
  return (
    <div style={styles.infoCell}>
      <div style={styles.infoCellLabel}>{label}</div>
      <div style={styles.infoCellValue}>{v(value)}</div>
    </div>
  );
}

function CheckMark({ value }) {
  if (value) return <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '13px' }}>✓</span>;
  return <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '13px' }}>✗</span>;
}

export default function CargoManifestDocument({ snapshot }) {
  if (!snapshot) return <div style={styles.page}>No data provided.</div>;

  const s = snapshot;
  const branch = s.branch || {};
  const shipper = s.shipper || {};
  const consignee = s.consignee || {};
  const originPort = s.origin_port || {};
  const destPort = s.destination_port || {};
  const hs = s.house_shipment || {};
  const manifestBookings = hs.manifest_bookings || [];
  const houses = hs.houses || [];
  const manifestPackages = s.manifest_packages || [];
  const addInfo = s.additional_information || {};
  const transportLegs = s.transport_info || [];
  const mainLeg = transportLegs.length > 0 ? transportLegs[0] : {};

  const isDirect = hs.is_direct_shipment;

  // Totals
  const totalPkgs = manifestPackages.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const totalGross = manifestPackages.reduce((acc, p) => acc + (Number(p.gross_weight) || 0), 0);
  const totalCBM = manifestPackages.reduce((acc, p) => acc + (Number(p.volume_cbm) || 0), 0);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const carrierInfo = mainLeg.carrier?.name
    || mainLeg.vessel_name
    || mainLeg.flight_no
    || '—';

  return (
    <div style={styles.page}>
      {/* Banners */}
      {s.roro && (
        <div style={styles.banner('#7c3aed', '#ede9fe')}>
          RO-RO SHIPMENT — Roll-on/Roll-off cargo handling applies
        </div>
      )}
      {addInfo.contain_dangerous_goods && (
        <div style={styles.banner('#dc2626', '#fee2e2')}>
          ⚠ DANGEROUS GOODS — This shipment contains hazardous materials
        </div>
      )}

      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.companyBlock}>
          <div style={styles.companyName}>{v(branch.name)}</div>
          <div style={styles.companyAddress}>
            {v(branch.address)}<br />
            {branch.phone && <>Tel: {branch.phone}</>}
            {branch.phone && branch.email && ' | '}
            {branch.email && <>Email: {branch.email}</>}
          </div>
        </div>
        <div style={styles.titleBlock}>
          <div style={styles.docTitle}>CARGO MANIFEST</div>
          {isDirect && (
            <span style={styles.badge('#1d4ed8', '#dbeafe')}>DIRECT SHIPMENT</span>
          )}
          <div style={{ marginTop: '4px' }}>
            <span style={{
              display: 'inline-block',
              background: s.open_operationally ? '#fef3c7' : '#d1fae5',
              color: s.open_operationally ? '#92400e' : '#065f46',
              border: `1px solid ${s.open_operationally ? '#fcd34d' : '#6ee7b7'}`,
              borderRadius: '3px',
              padding: '1px 8px',
              fontSize: '10px',
              fontWeight: 'bold',
            }}>
              {s.open_operationally ? 'OPERATIONALLY OPEN' : 'OPERATIONALLY CLOSED'}
            </span>
          </div>
        </div>
        <div style={styles.manifestRefBlock}>
          <div style={styles.manifestRefLabel}>MANIFEST NO</div>
          <div style={styles.manifestRefValue}>{v(hs.manifest_number)}</div>
          <div style={{ marginTop: '6px' }}>
            <div style={styles.manifestRefLabel}>SI NO</div>
            <div style={styles.manifestRefValue}>{v(hs.manifest_si_number)}</div>
          </div>
        </div>
      </div>

      {/* Info Grid Row 1 */}
      <div style={styles.infoGrid}>
        <InfoCell label="Manifest No" value={hs.manifest_number} />
        <InfoCell label="SI No" value={hs.manifest_si_number} />
        <InfoCell label="Date" value={formatDate(s.created_date)} />
        <InfoCell label="Shipment No" value={s.shipment_number} />
      </div>

      {/* Info Grid Row 2 */}
      <div style={styles.infoGrid}>
        <InfoCell label="Origin Port" value={originPort.name ? `${originPort.name} (${originPort.code})` : null} />
        <InfoCell label="Destination Port" value={destPort.name ? `${destPort.name} (${destPort.code})` : null} />
        <InfoCell label="Direction" value={s.direction} />
        <InfoCell label="Mode" value={s.transportation_mode} />
      </div>

      {/* Info Grid Row 3 */}
      <div style={styles.infoGrid}>
        <InfoCell label="Carrier" value={mainLeg.carrier?.name} />
        <InfoCell label="Vessel / Flight" value={mainLeg.vessel_name || mainLeg.flight_no} />
        <InfoCell label="Voyage No" value={mainLeg.voyage_no} />
        <InfoCell label="Leg Type" value={mainLeg.leg_type} />
      </div>

      {/* ETD / ETA */}
      <div style={styles.infoGrid}>
        <InfoCell label="ETD" value={formatDate(mainLeg.etd)} />
        <InfoCell label="ETA" value={formatDate(mainLeg.eta)} />
        <InfoCell label="Service Type" value={s.service_type} />
        <InfoCell label="Status" value={s.status} />
      </div>

      {/* Shipper / Consignee */}
      <div style={styles.partyRow}>
        <div style={styles.partyBox}>
          <div style={styles.partyLabel}>Shipper</div>
          <div style={styles.partyValue}>
            <strong>{v(shipper.name || shipper.display)}</strong><br />
            {shipper.address && <>{shipper.address}<br /></>}
            {shipper.phone && <>Tel: {shipper.phone}<br /></>}
            {shipper.email && <>Email: {shipper.email}</>}
          </div>
        </div>
        <div style={styles.partyBox}>
          <div style={styles.partyLabel}>Consignee</div>
          <div style={styles.partyValue}>
            <strong>{v(consignee.name || consignee.display)}</strong><br />
            {consignee.address && <>{consignee.address}<br /></>}
            {consignee.phone && <>Tel: {consignee.phone}<br /></>}
            {consignee.email && <>Email: {consignee.email}</>}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div style={styles.sectionHeading}>Manifest Bookings</div>
      {manifestBookings.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '8px' }}>No bookings found.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['#', 'Shipment No', 'Shipper', 'Consignee', 'Origin', 'Dest', 'Pkgs', 'Gross Wt (kg)', 'CBM', 'House No', 'Waybill No', 'Loaded', 'Manifested'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manifestBookings.map((bk, idx) => {
              const shipment = bk.shipment || {};
              const houseShip = bk.house_shipment || {};
              const pkgs = shipment.shipment_packages || [];
              const totalQty = pkgs.reduce((a, p) => a + (Number(p.quantity) || 0), 0);
              const totalGrossW = pkgs.reduce((a, p) => a + (Number(p.gross_weight) || 0), 0);
              const totalCbm = pkgs.reduce((a, p) => a + (Number(p.volume_cbm) || 0), 0);
              const isInactive = bk.active === false;
              const isDirect = bk.is_direct_shipment;

              const rowStyle = isInactive
                ? { ...styles.trInactive }
                : isDirect
                ? { ...styles.trDirect }
                : idx % 2 === 1 ? { ...styles.trEven } : {};

              const cellStyle = isInactive ? styles.tdStrike : styles.td;

              return (
                <tr key={bk.id ?? idx} style={rowStyle}>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>
                    {v(shipment.shipment_number)}
                    {isDirect && <span style={styles.badge('#1d4ed8', '#dbeafe')}>DIRECT</span>}
                    {isInactive && <span style={styles.badge('#ef4444', '#fee2e2')}>INACTIVE</span>}
                  </td>
                  <td style={cellStyle}>{v(shipment.shipper?.name || shipment.shipper?.display)}</td>
                  <td style={cellStyle}>{v(shipment.consignee?.name || shipment.consignee?.display)}</td>
                  <td style={cellStyle}>{shipment.origin_port?.code || shipment.origin_port?.name || '—'}</td>
                  <td style={cellStyle}>{shipment.destination_port?.code || shipment.destination_port?.name || '—'}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{totalQty || '—'}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{totalGrossW ? totalGrossW.toFixed(2) : '—'}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{totalCbm ? totalCbm.toFixed(3) : '—'}</td>
                  <td style={cellStyle}>{v(houseShip.house_number)}</td>
                  <td style={cellStyle}>{v(houseShip.waybill_no)}</td>
                  <td style={styles.tdCenter}><CheckMark value={bk.is_loaded} /></td>
                  <td style={styles.tdCenter}><CheckMark value={bk.is_manifested} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Houses Table */}
      {houses.length > 0 && (
        <>
          <div style={styles.sectionHeading}>Houses</div>
          <table style={styles.table}>
            <thead>
              <tr>
                {['#', 'House No', 'Waybill No', 'Exporter', 'Forwarder', 'Active'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {houses.map((h, idx) => {
                const isInactive = h.active === false;
                const cellStyle = isInactive ? styles.tdStrike : styles.td;
                const rowStyle = isInactive ? styles.trInactive : idx % 2 === 1 ? styles.trEven : {};
                return (
                  <tr key={h.id ?? idx} style={rowStyle}>
                    <td style={cellStyle}>{idx + 1}</td>
                    <td style={cellStyle}>
                      {v(h.house_number)}
                      {isInactive && <span style={styles.badge('#ef4444', '#fee2e2')}>INACTIVE</span>}
                    </td>
                    <td style={cellStyle}>{v(h.waybill_no)}</td>
                    <td style={cellStyle}>
                      {v(h.exporter_name)}
                      {h.exporter_address && <div style={{ fontSize: '9px', color: '#777' }}>{h.exporter_address}</div>}
                    </td>
                    <td style={cellStyle}>
                      {v(h.forwarder_name)}
                      {h.forwarder_address && <div style={{ fontSize: '9px', color: '#777' }}>{h.forwarder_address}</div>}
                    </td>
                    <td style={styles.tdCenter}>
                      <CheckMark value={h.active !== false} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Manifest Packages Table */}
      <div style={styles.sectionHeading}>Manifest Packages</div>
      {manifestPackages.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '8px' }}>No packages found.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['#', 'Shipment No', 'Pkg No', 'Description', 'Qty', 'Gross Wt (kg)', 'Net Wt (kg)', 'CBM', 'Marks & Numbers'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manifestPackages.map((pkg, idx) => (
              <tr key={idx} style={idx % 2 === 1 ? styles.trEven : {}}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>{v(pkg.shipment_number)}</td>
                <td style={styles.td}>{v(pkg.package_number)}</td>
                <td style={styles.td}>{v(pkg.description)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{v(pkg.quantity)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{pkg.gross_weight != null ? Number(pkg.gross_weight).toFixed(2) : '—'}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{pkg.net_weight != null ? Number(pkg.net_weight).toFixed(2) : '—'}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{pkg.volume_cbm != null ? Number(pkg.volume_cbm).toFixed(3) : '—'}</td>
                <td style={styles.td}>{v(pkg.marks_and_numbers)}</td>
              </tr>
            ))}
            {/* Totals */}
            <tr style={styles.trTotals}>
              <td style={styles.td} colSpan={4}><strong>TOTALS</strong></td>
              <td style={{ ...styles.td, textAlign: 'right' }}><strong>{totalPkgs}</strong></td>
              <td style={{ ...styles.td, textAlign: 'right' }}><strong>{totalGross.toFixed(2)}</strong></td>
              <td style={{ ...styles.td, textAlign: 'right' }}>—</td>
              <td style={{ ...styles.td, textAlign: 'right' }}><strong>{totalCBM.toFixed(3)}</strong></td>
              <td style={styles.td}></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={styles.footerRow}>
        <div style={styles.sigBlock}>
          <div style={styles.sigLine}>Prepared By</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#888', alignSelf: 'flex-end' }}>
          Generated: {formatDate(s.created_date)} | {v(branch.name)} | {v(s.shipment_number)}
        </div>
        <div style={styles.sigBlock}>
          <div style={styles.sigLine}>Authorized By</div>
        </div>
      </div>
    </div>
  );
}
