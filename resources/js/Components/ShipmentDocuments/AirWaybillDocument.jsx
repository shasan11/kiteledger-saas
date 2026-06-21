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
    backgroundColor: '#e8e8e8',
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
    color: '#444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '1px',
  },
  value: { fontSize: '10px', lineHeight: '1.3' },
  badge: {
    display: 'inline-block',
    padding: '1px 5px',
    borderRadius: '2px',
    fontSize: '7px',
    fontWeight: 'bold',
    letterSpacing: '0.4px',
    marginLeft: '4px',
  },
  dangerBar: {
    backgroundColor: '#c00',
    color: '#fff',
    textAlign: 'center',
    fontSize: '8px',
    fontWeight: 'bold',
    letterSpacing: '1.5px',
    padding: '3px 0',
    marginBottom: '4px',
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

export default function AirWaybillDocument({ snapshot = {} }) {
  const {
    shipment_number,
    shipment_main_type,
    transportation_mode,
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
    transport_info = [],
    shipment_packages = [],
    additional_information = {},
    airwaybill_freight_info = {},
  } = snapshot;

  const awb = airwaybill_freight_info;
  const add = additional_information;

  const mainLeg =
    transport_info.find(t => t.leg_type === 'main' && t.is_directly_linked_to_shipment) ||
    transport_info.find(t => t.leg_type === 'main') ||
    transport_info[0] || {};
  const postLeg = transport_info.find(t => t.leg_type === 'post') || {};

  const depAirport = mainLeg.departure_airport || origin_port || {};
  const arrAirport = mainLeg.arrival_airport || destination_port || {};

  const rawAwb = v(awb.air_waybill_no, v(mainLeg.air_waybill_number, v(mainLeg.mawb_no, shipment_number)));
  const displayAwb = (() => {
    const clean = String(rawAwb).replace(/[^0-9A-Za-z]/g, '');
    return clean.length >= 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : rawAwb;
  })();

  const totalPieces = shipment_packages.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const totalGW = shipment_packages.reduce((s, p) => s + (Number(p.gross_weight) || 0), 0);

  const routingLegs = [
    { label: 'To', val: v(arrAirport.code, arrAirport.name) },
    { label: 'By', val: v((mainLeg.carrier || {}).name) },
    { label: 'To', val: v((postLeg.port_of_arrival || postLeg.arrival_airport || {}).code) },
    { label: 'By', val: v((postLeg.carrier || {}).name) },
  ];

  const chargeRows = [
    { label: 'Weight Charge', prepaid: awb.prepaid_weight_charge, collect: awb.collect_weight_charge },
    { label: 'Valuation Charge', prepaid: awb.prepaid_valuation_charge, collect: awb.collect_valuation_charge },
    { label: 'Tax', prepaid: awb.prepaid_tax, collect: awb.collect_tax },
    { label: 'Total', prepaid: awb.total_prepaid, collect: awb.total_collect, bold: true },
  ];

  const colWidths = [1, 1, 0.5, 0.8, 1, 1, 1, 2.5];
  const colHeaders = ['Pieces', 'Gross Wt', 'kg/lb', 'Rate Cls', 'Chrgbl Wt', 'Rate/Chg', 'Total', 'Nature of Goods'];

  return (
    <div style={S.page}>

      {/* Dangerous goods banner */}
      {add.contain_dangerous_goods && (
        <div style={S.dangerBar}>⚠ DANGEROUS GOODS — HANDLE WITH CARE ⚠</div>
      )}

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ display: 'flex', border: '1px solid #000', borderBottom: '2px solid #000', marginBottom: '-1px' }}>
        {/* Company */}
        <div style={{ flex: 1, padding: '6px 8px', borderRight: '1px solid #000' }}>
          {branch.logo && (
            <img src={branch.logo} alt="logo" style={{ maxHeight: '36px', display: 'block', marginBottom: '4px' }} />
          )}
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
            {v(branch.name, 'AIR CARGO CARRIER')}
          </div>
          <div style={{ fontSize: '8px', color: '#333', lineHeight: '1.4' }}>{v(branch.address)}</div>
          <div style={{ fontSize: '8px', color: '#333' }}>
            {[branch.phone, branch.email].filter(Boolean).join(' | ')}
          </div>
          <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {roro && <Badge bg="#2e4057">RORO</Badge>}
            {third_party_booking && <Badge bg="#555">3RD PARTY</Badge>}
            {origin_custom_clearance && <Badge bg="#1a6b3c">ORIGIN CC ✓</Badge>}
            {destination_custom_clearance && <Badge bg="#1a6b3c">DEST CC ✓</Badge>}
          </div>
        </div>
        {/* Title */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRight: '1px solid #000' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '3px' }}>AIR WAYBILL</div>
          <div style={{ fontSize: '7px', color: '#666', marginTop: '2px', letterSpacing: '1px' }}>NON-NEGOTIABLE</div>
          <div style={{ fontSize: '7px', color: '#666', letterSpacing: '0.5px' }}>ISSUED BY CARRIER</div>
          <div style={{ marginTop: '6px', fontSize: '8px', color: '#444' }}>
            Ref: {v(doc_ref_no, shipment_number)}
          </div>
        </div>
        {/* AWB Number */}
        <div style={{ flex: 1, padding: '8px', textAlign: 'right' }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555', marginBottom: '4px' }}>
            Air Waybill No.
            {awb.awb_from_stock && <Badge bg="#8a6d3b">FROM STOCK</Badge>}
          </div>
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '20px',
            fontWeight: 'bold',
            letterSpacing: '3px',
            border: '2px solid #000',
            padding: '4px 8px',
            display: 'inline-block',
            backgroundColor: '#f8f8f8',
          }}>
            {displayAwb}
          </div>
          {/* Barcode-style lines */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', gap: '1px', height: '14px', alignItems: 'stretch' }}>
            {Array.from({ length: 28 }, (_, i) => (
              <div key={i} style={{ width: i % 3 === 0 ? '2px' : '1px', backgroundColor: '#000' }} />
            ))}
          </div>
          <div style={{ fontSize: '7px', color: '#555', marginTop: '3px' }}>
            {v(created_date)} | {v(direction)} | {v(transportation_mode)}
          </div>
        </div>
      </div>

      {/* ── ROW: Shipper | Consignee ─────────────────────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none' }}>
          <Title>Shipper's Name and Address</Title>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
            {v(shipper.name || shipper.display)}
          </div>
          <div style={{ fontSize: '9px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{v(shipper.address)}</div>
          <div style={{ fontSize: '9px', marginTop: '3px' }}>
            {shipper.phone && <span>Tel: {shipper.phone}</span>}
            {shipper.email && <span style={{ marginLeft: '8px' }}>Email: {shipper.email}</span>}
          </div>
          <div style={{ marginTop: '6px' }}>
            <div style={S.label}>Shipper's Account No.</div>
            <div style={{ borderBottom: '1px solid #aaa', minHeight: '14px', fontSize: '9px' }}>{v(awb.account_no)}</div>
          </div>
        </Box>
        <Box style={{ flex: 1 }}>
          <Title>Consignee's Name and Address</Title>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
            {v(consignee.name || consignee.display)}
          </div>
          <div style={{ fontSize: '9px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{v(consignee.address)}</div>
          <div style={{ fontSize: '9px', marginTop: '3px' }}>
            {consignee.phone && <span>Tel: {consignee.phone}</span>}
            {consignee.email && <span style={{ marginLeft: '8px' }}>Email: {consignee.email}</span>}
          </div>
        </Box>
      </div>

      {/* ── ROW: Agent | IATA Code | Account No ─────────── */}
      <div style={S.row}>
        <Box style={{ flex: 2, borderRight: 'none', borderTop: 'none' }}>
          <Title>Issuing Carrier's Agent Name and City</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{v(awb.issuing_carrier_agent, branch.name)}</div>
          <div style={{ fontSize: '9px', color: '#444' }}>{v(branch.address)}</div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Agent's IATA Code</Title>
          <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px', paddingTop: '2px' }}>
            {v(awb.agent_iata_code)}
          </div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Account No.</Title>
          <div style={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '2px' }}>{v(awb.account_no)}</div>
        </Box>
      </div>

      {/* ── ROW: Departure Airport | Routing | Destination | Flight ── */}
      <div style={S.row}>
        <Box style={{ flex: 1.8, borderRight: 'none', borderTop: 'none' }}>
          <Title>Airport of Departure</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
            {v(depAirport.name)} {depAirport.code ? `(${depAirport.code})` : ''}
          </div>
          <div style={{ fontSize: '8px', color: '#444' }}>
            {[depAirport.city, depAirport.country].filter(Boolean).join(', ')}
          </div>
        </Box>
        {routingLegs.map((leg, i) => (
          <Box key={i} style={{ flex: 0.9, borderRight: i < 3 ? 'none' : undefined, borderTop: 'none' }}>
            <Title>{leg.label}</Title>
            <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>{v(leg.val)}</div>
          </Box>
        ))}
        <Box style={{ flex: 1.8, borderLeft: 'none', borderTop: 'none' }}>
          <Title>Airport of Destination</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
            {v(arrAirport.name)} {arrAirport.code ? `(${arrAirport.code})` : ''}
          </div>
          <div style={{ fontSize: '8px', color: '#444' }}>
            {[arrAirport.city, arrAirport.country].filter(Boolean).join(', ')}
          </div>
        </Box>
        <Box style={{ flex: 1.2, borderLeft: 'none', borderTop: 'none' }}>
          <Title>Flight / Date</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{v(mainLeg.flight_no)}</div>
          <div style={{ fontSize: '9px' }}>{v(mainLeg.flight_date || mainLeg.etd)}</div>
        </Box>
      </div>

      {/* ── ROW: Currency | Chgs | WT/VAL | Other ───────── */}
      <div style={S.row}>
        <Box style={{ flex: 0.8, borderRight: 'none', borderTop: 'none' }}>
          <Title>Currency</Title>
          <div style={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }}>USD</div>
        </Box>
        <Box style={{ flex: 0.8, borderRight: 'none', borderTop: 'none' }}>
          <Title>CHGS Code</Title>
          <div style={{ fontSize: '10px', paddingTop: '2px' }}>PP</div>
        </Box>
        <Box style={{ flex: 1.2, borderRight: 'none', borderTop: 'none' }}>
          <Title>WT / VAL</Title>
          <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
            <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <input type="checkbox" readOnly defaultChecked={!!awb.prepaid_weight_charge} style={{ margin: 0 }} /> PPD
            </label>
            <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <input type="checkbox" readOnly defaultChecked={!!awb.collect_weight_charge} style={{ margin: 0 }} /> COLL
            </label>
          </div>
        </Box>
        <Box style={{ flex: 1.2, borderTop: 'none' }}>
          <Title>Other</Title>
          <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
            <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <input type="checkbox" readOnly style={{ margin: 0 }} /> PPD
            </label>
            <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <input type="checkbox" readOnly style={{ margin: 0 }} /> COLL
            </label>
          </div>
        </Box>
      </div>

      {/* ── ROW: Declared Values | Insurance | SCI ─────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Declared Value for Carriage</Title>
          <div style={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '2px' }}>
            {awb.is_nvd
              ? <span style={{ color: '#555', letterSpacing: '2px' }}>NVD</span>
              : awb.is_declared
                ? v(awb.declared_value_for_carriage)
                : '—'}
            {awb.as_agreed && (
              <span style={{ fontSize: '8px', color: '#777', fontWeight: 'normal', marginLeft: '6px' }}>(As Agreed)</span>
            )}
          </div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Declared Value for Customs</Title>
          <div style={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '2px' }}>
            {awb.is_ncv
              ? <span style={{ color: '#555', letterSpacing: '2px' }}>NCV</span>
              : awb.is_declared
                ? v(awb.declared_value_for_customs)
                : '—'}
          </div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Amount of Insurance</Title>
          <div style={{ fontSize: '12px', paddingTop: '2px' }}>—</div>
        </Box>
        <Box style={{ flex: 0.6, borderTop: 'none' }}>
          <Title>SCI</Title>
          <div style={{ fontSize: '11px', paddingTop: '2px' }}>{v(awb.sci)}</div>
        </Box>
      </div>

      {/* ── Handling Information ─────────────────────────── */}
      <Box style={{ borderTop: 'none' }}>
        <Title>Handling Information</Title>
        <div style={{ fontSize: '9px', minHeight: '20px', paddingTop: '2px' }}>
          {v(awb.handling_info, '')}
          {add.contain_dangerous_goods && (
            <span style={{ ...S.badge, backgroundColor: '#c00', color: '#fff', marginLeft: '0' }}>DANGEROUS GOODS</span>
          )}
        </div>
      </Box>

      {/* ── Nature and Quantity of Goods Table ──────────── */}
      <div style={{ border: '1px solid #000', borderTop: 'none' }}>
        <div style={{ backgroundColor: '#e8e8e8', borderBottom: '1px solid #000', padding: '2px 4px', fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Nature and Quantity of Goods (incl. Dimensions or Volume)
        </div>
        {/* Header row */}
        <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderBottom: '1px solid #000' }}>
          {colHeaders.map((h, i) => (
            <div key={i} style={{
              flex: colWidths[i],
              fontSize: '7px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              padding: '3px 4px',
              borderRight: i < colHeaders.length - 1 ? '1px solid #bbb' : 'none',
            }}>
              {h}
            </div>
          ))}
        </div>
        {/* Data rows */}
        {(shipment_packages.length > 0 ? shipment_packages : [{}]).map((pkg, ri) => {
          const cells = [
            v(pkg.quantity),
            pkg.gross_weight != null ? `${pkg.gross_weight}` : '—',
            'K',
            v(awb.rate_class),
            v(awb.chargeable_weight),
            v(awb.rate_charge_per_kg),
            v(awb.total_charge),
            v(pkg.description, awb.nature_of_goods),
          ];
          return (
            <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
              {cells.map((cell, ci) => (
                <div key={ci} style={{
                  flex: colWidths[ci],
                  fontSize: '9px',
                  padding: '3px 4px',
                  borderRight: ci < cells.length - 1 ? '1px solid #ddd' : 'none',
                  wordBreak: 'break-word',
                }}>
                  {cell}
                </div>
              ))}
            </div>
          );
        })}
        {/* Totals */}
        <div style={{ display: 'flex', backgroundColor: '#f0f0f0', borderTop: '1px solid #000' }}>
          <div style={{ flex: colWidths[0], fontSize: '8px', fontWeight: 'bold', padding: '3px 4px', borderRight: '1px solid #bbb' }}>
            {totalPieces || '—'}
          </div>
          <div style={{ flex: colWidths[1], fontSize: '8px', fontWeight: 'bold', padding: '3px 4px', borderRight: '1px solid #bbb' }}>
            {totalGW ? `${totalGW.toFixed(2)} KG` : '—'}
          </div>
          <div style={{ flex: colWidths[2], padding: '3px 4px', borderRight: '1px solid #bbb' }} />
          <div style={{ flex: colWidths[3], padding: '3px 4px', borderRight: '1px solid #bbb' }} />
          <div style={{ flex: colWidths[4], fontSize: '8px', fontWeight: 'bold', padding: '3px 4px', borderRight: '1px solid #bbb' }}>
            {v(awb.chargeable_weight)}
          </div>
          <div style={{ flex: colWidths[5], padding: '3px 4px', borderRight: '1px solid #bbb' }} />
          <div style={{ flex: colWidths[6], fontSize: '8px', fontWeight: 'bold', padding: '3px 4px', borderRight: '1px solid #bbb' }}>
            {v(awb.total_charge)}
          </div>
          <div style={{ flex: colWidths[7], padding: '3px 4px' }} />
        </div>
      </div>

      {/* ── Prepaid / Collect Table ──────────────────────── */}
      <div style={{ border: '1px solid #000', borderTop: 'none' }}>
        <div style={{ display: 'flex', backgroundColor: '#e8e8e8', borderBottom: '1px solid #000' }}>
          {['Charge Description', 'Prepaid', 'Collect'].map((h, i) => (
            <div key={i} style={{
              flex: i === 0 ? 2 : 1,
              fontSize: '7px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              padding: '3px 4px',
              borderRight: i < 2 ? '1px solid #bbb' : 'none',
              textAlign: i > 0 ? 'right' : 'left',
            }}>
              {h}
            </div>
          ))}
        </div>
        {chargeRows.map((row, i) => (
          <div key={i} style={{
            display: 'flex',
            borderBottom: i < chargeRows.length - 1 ? '1px solid #eee' : 'none',
            backgroundColor: row.bold ? '#f5f5f5' : '#fff',
          }}>
            <div style={{ flex: 2, fontSize: '9px', fontWeight: row.bold ? 'bold' : 'normal', padding: '3px 4px', borderRight: '1px solid #ddd' }}>
              {row.label}
              {row.bold && awb.as_agreed && <span style={{ fontSize: '7px', color: '#777', marginLeft: '5px' }}>(As Agreed)</span>}
            </div>
            <div style={{ flex: 1, fontSize: '9px', fontWeight: row.bold ? 'bold' : 'normal', padding: '3px 4px', borderRight: '1px solid #ddd', textAlign: 'right' }}>
              {v(row.prepaid)}
            </div>
            <div style={{ flex: 1, fontSize: '9px', fontWeight: row.bold ? 'bold' : 'normal', padding: '3px 4px', textAlign: 'right' }}>
              {v(row.collect)}
            </div>
          </div>
        ))}
      </div>

      {/* ── CC Charges at Destination ───────────────────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Currency Conversion Rate</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(awb.currency_conversion_rate)}</div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>CC Charges in Dest. Currency</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(awb.cc_charges_destination)}</div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Charges at Destination</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(awb.charges_at_destination)}</div>
        </Box>
        <Box style={{ flex: 1, borderTop: 'none' }}>
          <Title>Total Collect Charges</Title>
          <div style={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '2px' }}>{v(awb.total_collect_charges)}</div>
        </Box>
      </div>

      {/* ── Additional Info ─────────────────────────────── */}
      <div style={S.row}>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Country of Origin</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(add.country_of_origin)}</div>
        </Box>
        <Box style={{ flex: 1, borderRight: 'none', borderTop: 'none' }}>
          <Title>Customs Reference</Title>
          <div style={{ fontSize: '9px', paddingTop: '2px' }}>{v(add.customs_reference)}</div>
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

      {/* ── Signature Block ──────────────────────────────── */}
      <Box style={{ borderTop: 'none' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Conditions text */}
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: '7px', color: '#555', lineHeight: '1.5', marginBottom: '8px' }}>
              I/we agree that the goods described herein are accepted in apparent good order and condition
              (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT on the reverse hereof.
              All goods may be carried by any other means including road or any other carrier unless specific
              contrary instructions are given hereon by the shipper, and shipper agrees to all governing
              tariff provisions.
            </div>
            <div style={S.label}>Signature of Issuing Carrier or its Agent</div>
            <div style={{ borderBottom: '1px solid #000', minHeight: '28px', paddingTop: '4px', fontSize: '9px' }}>
              {v(awb.issuing_carrier_agent, branch.name)}
            </div>
          </div>
          {/* Date / Place */}
          <div style={{ flex: 1 }}>
            <LV label="Executed on (Date)" value={created_date} />
            <div style={{ marginTop: '8px' }}>
              <LV label="At (Place)" value={depAirport.city || depAirport.name} />
            </div>
          </div>
          {/* Shipper sig */}
          <div style={{ flex: 1 }}>
            <div style={S.label}>Shipper's Signature</div>
            <div style={{ borderBottom: '1px solid #000', minHeight: '50px' }} />
          </div>
        </div>
      </Box>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#888' }}>
        <span>Shipment: {v(shipment_number)}</span>
        <span>{v(shipment_main_type)} | Status: {v(status)}</span>
        <span>AWB No: {displayAwb}</span>
      </div>
    </div>
  );
}
