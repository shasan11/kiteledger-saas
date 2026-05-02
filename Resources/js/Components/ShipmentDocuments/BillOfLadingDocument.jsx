import React from 'react';

const v = (val, fallback = '—') => (val !== null && val !== undefined && val !== '') ? val : fallback;

const S = {
  page: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '9px',
    width: '794px',
    minHeight: '1123px',
    padding: '15px',
    backgroundColor: '#fff',
    color: '#000',
    boxSizing: 'border-box',
  },
  row: { display: 'flex', width: '100%' },
  box: { border: '1px solid #000', padding: '4px 6px', boxSizing: 'border-box' },
  sectionTitle: {
    fontSize: '7px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: '#f0f0f0',
    color: '#555',
    padding: '2px 4px',
    borderBottom: '1px solid #000',
    letterSpacing: '0.5px',
    marginLeft: '-6px',
    marginRight: '-6px',
    marginTop: '-4px',
    marginBottom: '4px',
  },
  label: {
    fontSize: '7px',
    color: '#555',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '1px',
  },
  value: { fontSize: '10px', lineHeight: '1.4' },
  badge: {
    display: 'inline-block',
    padding: '1px 5px',
    borderRadius: '2px',
    fontSize: '7px',
    fontWeight: 'bold',
    letterSpacing: '0.4px',
    marginRight: '4px',
  },
  warningBar: (bg) => ({
    backgroundColor: bg,
    color: '#fff',
    textAlign: 'center',
    fontSize: '8px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    padding: '3px 0',
    marginBottom: '3px',
  }),
  thCell: {
    fontSize: '7px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: '#f0f0f0',
    color: '#555',
    padding: '3px 5px',
  },
  tdCell: {
    fontSize: '9px',
    padding: '4px 5px',
    lineHeight: '1.4',
  },
};

function Badge({ children, bg = '#1a5276', fg = '#fff' }) {
  return <span style={{ ...S.badge, backgroundColor: bg, color: fg }}>{children}</span>;
}

function Box({ children, style = {} }) {
  return <div style={{ ...S.box, ...style }}>{children}</div>;
}

function Title({ children }) {
  return <div style={S.sectionTitle}>{children}</div>;
}

function LV({ label, value, vs = {} }) {
  return (
    <div style={{ marginBottom: '3px' }}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.value, ...vs }}>{v(value)}</div>
    </div>
  );
}

function AddressBlock({ party = {} }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
        {v(party.name || party.display)}
      </div>
      <div style={{ fontSize: '9px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{v(party.address)}</div>
      <div style={{ fontSize: '9px', marginTop: '3px' }}>
        {party.phone && <span>Tel: {party.phone}</span>}
        {party.email && <span style={{ marginLeft: '8px' }}>Email: {party.email}</span>}
      </div>
    </div>
  );
}

export default function BillOfLadingDocument({ snapshot = {} }) {
  const {
    shipment_number,
    shipment_main_type,
    service_type,
    direction,
    status,
    created_date,
    doc_ref_no,
    roro,
    third_party_booking,
    origin_custom_clearance,
    destination_custom_clearance,
    branch = {},
    shipper = {},
    consignee = {},
    origin_port = {},
    destination_port = {},
    origin_agency = {},
    destination_agency = {},
    transport_info = [],
    shipment_containers = [],
    shipment_packages = [],
    additional_information = {},
    airwaybill_freight_info = {},
    payment_summary = {},
  } = snapshot;

  const add = additional_information;

  // Derive BL type label
  const blType = shipment_main_type === 'Master'
    ? 'MASTER BILL OF LADING'
    : shipment_main_type === 'Direct'
      ? 'DIRECT BILL OF LADING'
      : 'HOUSE BILL OF LADING';

  // Find main transport leg
  const mainLeg =
    transport_info.find(t => t.leg_type === 'main' && t.is_directly_linked_to_shipment) ||
    transport_info.find(t => t.leg_type === 'main') ||
    transport_info[0] || {};

  const carrier = mainLeg.carrier || {};
  const pol = mainLeg.port_of_loading || mainLeg.port_of_departure || origin_port || {};
  const pod = mainLeg.port_of_discharge || mainLeg.port_of_arrival || destination_port || {};
  const pod2 = mainLeg.port_of_delivery || {};

  // BL number
  const blNumber = v(mainLeg.hbl_no, v(mainLeg.mbl_no, v(doc_ref_no, shipment_number)));

  // Freight summary: check payment_summary for prepaid vs collect
  const hasCharges = payment_summary.shipment_charges && payment_summary.shipment_charges.length > 0;
  const totalRevenue = payment_summary.total_revenue;
  const totalCost = payment_summary.total_cost;

  // Totals for package table
  const totalPkgPieces = shipment_packages.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const totalPkgGW = shipment_packages.reduce((s, p) => s + (Number(p.gross_weight) || 0), 0);
  const totalPkgVol = shipment_packages.reduce((s, p) => s + (Number(p.volume_cbm) || 0), 0);

  const containerTableCols = ['Container No.', 'Seal No.', 'Type', 'Pkgs', 'Gross Weight', 'Net Weight', 'Status'];
  const containerColWidths = [1.5, 1, 0.8, 0.7, 1, 1, 1];

  const pkgTableCols = ['Marks & Numbers', 'Description of Goods', 'Pkgs', 'Gross Wt (KG)', 'Net Wt (KG)', 'Vol (CBM)'];
  const pkgColWidths = [1.2, 2.5, 0.6, 0.8, 0.8, 0.8];

  return (
    <div style={S.page}>

      {/* Warning banners */}
      {add.contain_dangerous_goods && (
        <div style={S.warningBar('#c00')}>⚠ DANGEROUS GOODS — SPECIAL HANDLING REQUIRED ⚠</div>
      )}
      {add.has_damaged_items && (
        <div style={S.warningBar('#b45309')}>⚠ DAMAGED ITEMS NOTED — SEE REMARKS ⚠</div>
      )}

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        border: '1px solid #000',
        borderBottom: '2px solid #000',
        marginBottom: '-1px',
      }}>
        {/* Logo / Company */}
        <div style={{ flex: 1, padding: '8px', borderRight: '1px solid #000' }}>
          {branch.logo && (
            <img src={branch.logo} alt="logo" style={{ maxHeight: '40px', display: 'block', marginBottom: '4px' }} />
          )}
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{v(branch.name, 'FREIGHT FORWARDER')}</div>
          <div style={{ fontSize: '8px', color: '#333', lineHeight: '1.4', marginTop: '2px' }}>{v(branch.address)}</div>
          <div style={{ fontSize: '8px', color: '#333' }}>
            {[branch.phone, branch.email].filter(Boolean).join(' | ')}
          </div>
        </div>
        {/* Title block */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRight: '1px solid #000' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '3px', textAlign: 'center' }}>
            BILL OF LADING
          </div>
          <div style={{
            marginTop: '5px',
            fontSize: '9px',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            backgroundColor: '#1a3a5c',
            color: '#fff',
            padding: '2px 12px',
            borderRadius: '2px',
          }}>
            {blType}
          </div>
          {/* Flags row */}
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3px' }}>
            {roro && (
              <span style={{
                backgroundColor: '#7b1fa2',
                color: '#fff',
                padding: '2px 8px',
                fontSize: '8px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                borderRadius: '2px',
              }}>
                ROLL-ON / ROLL-OFF
              </span>
            )}
            {service_type && (
              <Badge bg={service_type === 'fcl' ? '#1a5276' : '#0e6655'}>
                {service_type.toUpperCase()}
              </Badge>
            )}
            {origin_custom_clearance && <Badge bg="#1a6b3c">ORIGIN CC ✓</Badge>}
            {destination_custom_clearance && <Badge bg="#1a6b3c">DEST CC ✓</Badge>}
            {third_party_booking && <Badge bg="#555">THIRD PARTY BOOKING</Badge>}
          </div>
        </div>
        {/* BL Number */}
        <div style={{ flex: 1, padding: '8px', textAlign: 'right' }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555', marginBottom: '3px' }}>
            B/L Number
          </div>
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            border: '2px solid #000',
            padding: '4px 8px',
            display: 'inline-block',
            backgroundColor: '#f8f8f8',
          }}>
            {blNumber}
          </div>
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#555', marginBottom: '1px' }}>Booking Ref.</div>
            <div style={{ fontSize: '9px' }}>{v(doc_ref_no, shipment_number)}</div>
          </div>
          <div style={{ marginTop: '5px', fontSize: '7px', color: '#555' }}>
            {v(direction)} | {v(status)}
          </div>
        </div>
      </div>

      {/* ── ROW: Shipper | Consignee ─────────────────────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none' }}>
          <Title>Shipper / Exporter</Title>
          <AddressBlock party={shipper} />
        </Box>
        <Box style={{ flex: 1 }}>
          <Title>Consignee</Title>
          <AddressBlock party={consignee} />
        </Box>
      </div>

      {/* ── ROW: Notify Party | Also Notify ─────────────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Notify Party</Title>
          <div style={{ fontSize: '9px', lineHeight: '1.5', minHeight: '36px', whiteSpace: 'pre-line' }}>
            {v(add.notify_party)}
          </div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Also Notify</Title>
          <div style={{ fontSize: '9px', lineHeight: '1.5', minHeight: '36px', whiteSpace: 'pre-line' }}>
            {v(add.also_notify)}
          </div>
        </Box>
      </div>

      {/* ── ROW: Carrier | Vessel | Voyage | Service ─────── */}
      <div style={S.row}>
        <Box style={{ flex: 1.5, borderRight: 'none', borderTop: 'none' }}>
          <Title>Ocean Carrier</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>
            {v(carrier.name || carrier.display)}
          </div>
        </Box>
        <Box style={{ flex: 1.5, borderRight: 'none', borderTop: 'none' }}>
          <Title>Vessel Name</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>{v(mainLeg.vessel_name)}</div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Voyage No.</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>{v(mainLeg.voyage_no)}</div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Service Type</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>
            {service_type ? service_type.toUpperCase() : '—'}
          </div>
        </Box>
      </div>

      {/* ── ROW: Port of Loading | Port of Discharge | Place of Delivery ── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Port of Loading</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>
            {v(pol.name)} {pol.code ? `(${pol.code})` : ''}
          </div>
          <div style={{ fontSize: '8px', color: '#444' }}>
            {[pol.city, pol.country].filter(Boolean).join(', ')}
          </div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Port of Discharge</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>
            {v(pod.name)} {pod.code ? `(${pod.code})` : ''}
          </div>
          <div style={{ fontSize: '8px', color: '#444' }}>
            {[pod.city, pod.country].filter(Boolean).join(', ')}
          </div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Place of Delivery</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>
            {v(pod2.name || destination_port.name)} {(pod2.code || destination_port.code) ? `(${pod2.code || destination_port.code})` : ''}
          </div>
          <div style={{ fontSize: '8px', color: '#444' }}>
            {[pod2.city || destination_port.city, pod2.country || destination_port.country].filter(Boolean).join(', ')}
          </div>
        </Box>
      </div>

      {/* ── ROW: ETD | ETA | Incoterms | Country of Origin ── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>ETD</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>{v(mainLeg.etd)}</div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>ETA</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>{v(mainLeg.eta)}</div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Incoterms / Location</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>{v(add.incoterms_location)}</div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Country of Origin</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>{v(add.country_of_origin)}</div>
        </Box>
      </div>

      {/* ── Container Summary Table ──────────────────────── */}
      {shipment_containers.length > 0 && (
        <div style={{ border: '1px solid #000', borderTop: 'none' }}>
          <div style={{ backgroundColor: '#e8e8e8', borderBottom: '1px solid #000', padding: '2px 5px', fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Container Details
          </div>
          {/* Header */}
          <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderBottom: '1px solid #000' }}>
            {containerTableCols.map((h, i) => (
              <div key={i} style={{
                flex: containerColWidths[i],
                ...S.thCell,
                borderRight: i < containerTableCols.length - 1 ? '1px solid #ccc' : 'none',
              }}>
                {h}
              </div>
            ))}
          </div>
          {/* Rows */}
          {shipment_containers.map((c, ri) => {
            const cells = [
              v(c.container_number),
              v(c.seal_number),
              v(c.container_type),
              '—',
              c.gross_weight != null ? `${c.gross_weight} KG` : '—',
              c.net_weight != null ? `${c.net_weight} KG` : '—',
              v(c.status),
            ];
            return (
              <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                {cells.map((cell, ci) => (
                  <div key={ci} style={{
                    flex: containerColWidths[ci],
                    ...S.tdCell,
                    borderRight: ci < cells.length - 1 ? '1px solid #eee' : 'none',
                    fontWeight: ci === 0 ? 'bold' : 'normal',
                  }}>
                    {cell}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Packages / Goods Table ───────────────────────── */}
      <div style={{ border: '1px solid #000', borderTop: 'none' }}>
        <div style={{ backgroundColor: '#e8e8e8', borderBottom: '1px solid #000', padding: '2px 5px', fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Marks &amp; Numbers | Description of Packages &amp; Goods
        </div>
        {/* Header */}
        <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderBottom: '1px solid #000' }}>
          {pkgTableCols.map((h, i) => (
            <div key={i} style={{
              flex: pkgColWidths[i],
              ...S.thCell,
              borderRight: i < pkgTableCols.length - 1 ? '1px solid #ccc' : 'none',
            }}>
              {h}
            </div>
          ))}
        </div>
        {/* Rows */}
        {(shipment_packages.length > 0 ? shipment_packages : [{}]).map((pkg, ri) => {
          const cells = [
            v(pkg.marks_and_numbers),
            v(pkg.description),
            v(pkg.quantity),
            pkg.gross_weight != null ? `${pkg.gross_weight}` : '—',
            pkg.net_weight != null ? `${pkg.net_weight}` : '—',
            pkg.volume_cbm != null ? `${pkg.volume_cbm}` : '—',
          ];
          return (
            <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #eee', minHeight: '24px' }}>
              {cells.map((cell, ci) => (
                <div key={ci} style={{
                  flex: pkgColWidths[ci],
                  ...S.tdCell,
                  borderRight: ci < cells.length - 1 ? '1px solid #eee' : 'none',
                  wordBreak: 'break-word',
                }}>
                  {cell}
                  {/* Fragile badge */}
                  {ci === 1 && pkg.fragile && (
                    <span style={{ ...S.badge, backgroundColor: '#e53935', color: '#fff', marginLeft: '4px', fontSize: '6px' }}>FRAGILE</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {/* Totals row */}
        <div style={{ display: 'flex', backgroundColor: '#f0f0f0', borderTop: '1px solid #000' }}>
          <div style={{ flex: pkgColWidths[0], ...S.tdCell, borderRight: '1px solid #ccc', fontWeight: 'bold', fontSize: '8px' }}>
            TOTAL
          </div>
          <div style={{ flex: pkgColWidths[1], ...S.tdCell, borderRight: '1px solid #ccc' }} />
          <div style={{ flex: pkgColWidths[2], ...S.tdCell, borderRight: '1px solid #ccc', fontWeight: 'bold', fontSize: '8px' }}>
            {totalPkgPieces || '—'}
          </div>
          <div style={{ flex: pkgColWidths[3], ...S.tdCell, borderRight: '1px solid #ccc', fontWeight: 'bold', fontSize: '8px' }}>
            {totalPkgGW ? `${totalPkgGW.toFixed(2)}` : '—'}
          </div>
          <div style={{ flex: pkgColWidths[4], ...S.tdCell, borderRight: '1px solid #ccc' }} />
          <div style={{ flex: pkgColWidths[5], ...S.tdCell, fontWeight: 'bold', fontSize: '8px' }}>
            {totalPkgVol ? `${totalPkgVol.toFixed(3)}` : '—'}
          </div>
        </div>
      </div>

      {/* ── Freight Charges Row ──────────────────────────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Freight &amp; Charges</Title>
          <div style={{ display: 'flex', gap: '16px', paddingTop: '2px' }}>
            <div>
              <div style={S.label}>Prepaid</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                {v(payment_summary.total_receivables)}
              </div>
            </div>
            <div>
              <div style={S.label}>Collect</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                {v(payment_summary.total_payables)}
              </div>
            </div>
          </div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Export Reference</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(add.export_reference)}</div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Import Reference</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(add.import_reference)}</div>
        </Box>
      </div>

      {/* ── Agency Row ───────────────────────────────────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Origin Agency</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>
            {v(origin_agency.name)} {origin_agency.code ? `(${origin_agency.code})` : ''}
          </div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Destination Agency</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>
            {v(destination_agency.name)} {destination_agency.code ? `(${destination_agency.code})` : ''}
          </div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Customs Reference</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(add.customs_reference)}</div>
        </Box>
      </div>

      {/* ── Signature / Issue Block ──────────────────────── */}
      <Box style={{ borderTop: 'none' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          {/* Carrier conditions */}
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: '7px', color: '#555', lineHeight: '1.5', marginBottom: '10px' }}>
              IN WITNESS WHEREOF the number of Original Bills of Lading stated above have been signed, one of which
              being accomplished, the others to stand void. The goods and instructions are accepted and dealt with
              subject to the Standard Conditions printed on the reverse side hereof, the shipper, consignee and the
              owner of the goods expressly accepting and agreeing to all said terms and conditions.
            </div>
            <div style={S.label}>Signed for the Carrier</div>
            <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>
              {v(branch.name, 'AS CARRIER')}
            </div>
            <div style={{
              borderBottom: '1px solid #000',
              minHeight: '36px',
              marginBottom: '4px',
              fontSize: '8px',
              color: '#777',
              paddingTop: '4px',
            }}>
              Authorized Signature
            </div>
          </div>
          {/* Place + Date of Issue */}
          <div style={{ flex: 1 }}>
            <LV label="Place of Issue" value={pol.city || pol.name || branch.address} />
            <div style={{ marginTop: '8px' }}>
              <LV label="Date of Issue" value={created_date} vs={{ fontSize: '11px', fontWeight: 'bold' }} />
            </div>
          </div>
          {/* Number of originals */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={S.label}>Number of Original B/L</div>
            <div style={{
              fontSize: '22px',
              fontWeight: 'bold',
              border: '2px solid #000',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '4px auto',
            }}>
              3
            </div>
            <div style={{ fontSize: '7px', color: '#555' }}>THREE (3) ORIGINALS</div>
          </div>
        </div>
      </Box>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{
        marginTop: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '7px',
        color: '#888',
        borderTop: '1px solid #ddd',
        paddingTop: '4px',
      }}>
        <span>Shipment: {v(shipment_number)}</span>
        <span>{blType} | {v(service_type, '').toUpperCase()} | Status: {v(status)}</span>
        <span>B/L No: {blNumber}</span>
      </div>
    </div>
  );
}
