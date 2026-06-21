import React from 'react';

const v = (val, fallback = '—') => val ?? fallback;

const pal = {
  primary: '#1a3a5c',
  primaryLight: '#e8f1fa',
  border: '#c8d4e0',
  rowEven: '#f7f9fc',
  green: '#16a34a',
  greenLight: '#dcfce7',
  greenBorder: '#86efac',
  red: '#dc2626',
  redLight: '#fee2e2',
  redBorder: '#fca5a5',
  yellow: '#ca8a04',
  yellowLight: '#fef9c3',
  yellowBorder: '#fde047',
  blue: '#1d4ed8',
  blueLight: '#dbeafe',
  blueBorder: '#93c5fd',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
};

const st = {
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
  banner: (bg, color, border) => ({
    background: bg,
    color: color,
    border: `1px solid ${border}`,
    borderRadius: '3px',
    padding: '6px 12px',
    fontWeight: 'bold',
    fontSize: '12px',
    textAlign: 'center',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  }),
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: `2px solid ${pal.primary}`,
    paddingBottom: '12px',
    marginBottom: '12px',
  },
  logoBox: {
    width: '60px',
    height: '60px',
    border: `1px solid ${pal.border}`,
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    fontSize: '9px',
    flexShrink: 0,
    marginRight: '10px',
    background: pal.grayLight,
  },
  companyBlock: { display: 'flex', alignItems: 'flex-start' },
  companyText: { flex: 1 },
  companyName: { fontWeight: 'bold', fontSize: '14px', color: pal.primary },
  companyAddress: { fontSize: '10px', color: '#555', marginTop: '3px', lineHeight: 1.5 },
  invoiceBlock: { textAlign: 'right' },
  docTitle: { fontSize: '22px', fontWeight: 'bold', color: pal.primary, letterSpacing: '1px' },
  invoiceNumber: { fontWeight: 'bold', fontSize: '13px', color: '#333', marginTop: '4px' },
  invoiceDate: { fontSize: '10px', color: '#666', marginTop: '2px' },

  // Bill To
  billToBox: {
    border: `1px solid ${pal.border}`,
    padding: '8px 10px',
    borderRadius: '3px',
    marginBottom: '10px',
    background: '#fafbfc',
  },
  billToLabel: {
    fontSize: '9px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: '4px',
  },
  billToValue: { fontSize: '11px', lineHeight: 1.6 },

  // Info grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0',
    border: `1px solid ${pal.border}`,
    marginBottom: '8px',
  },
  infoGrid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0',
    border: `1px solid ${pal.border}`,
    marginBottom: '8px',
  },
  infoCell: {
    border: `1px solid ${pal.border}`,
    padding: '5px 8px',
  },
  infoCellLabel: { fontSize: '9px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' },
  infoCellValue: { fontSize: '11px', color: '#222', fontWeight: '600', marginTop: '1px' },

  // Section heading
  sectionHeading: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: pal.primary,
    borderBottom: `1px solid ${pal.primary}`,
    paddingBottom: '3px',
    marginTop: '16px',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  // Table
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' },
  th: {
    background: pal.primary,
    color: '#fff',
    padding: '5px 6px',
    textAlign: 'left',
    fontWeight: 'bold',
    border: `1px solid #14325a`,
    whiteSpace: 'nowrap',
  },
  thRight: {
    background: pal.primary,
    color: '#fff',
    padding: '5px 6px',
    textAlign: 'right',
    fontWeight: 'bold',
    border: `1px solid #14325a`,
    whiteSpace: 'nowrap',
  },
  td: { padding: '4px 6px', border: `1px solid ${pal.border}`, verticalAlign: 'top' },
  tdRight: { padding: '4px 6px', border: `1px solid ${pal.border}`, textAlign: 'right', verticalAlign: 'top' },
  tdCenter: { padding: '4px 6px', border: `1px solid ${pal.border}`, textAlign: 'center', verticalAlign: 'middle' },
  trEven: { background: pal.rowEven },

  // Badge
  badge: (bg, color) => ({
    display: 'inline-block',
    background: bg,
    color: color,
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  }),

  // Financial summary
  summaryBox: {
    marginTop: '14px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  summaryTable: {
    width: '320px',
    border: `1px solid ${pal.border}`,
    borderRadius: '3px',
    overflow: 'hidden',
  },
  summaryRow: (highlight) => ({
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 10px',
    borderBottom: `1px solid ${pal.border}`,
    background: highlight ? pal.primaryLight : '#fff',
  }),
  summaryLabel: { fontSize: '11px', color: '#555', fontWeight: '600' },
  summaryValue: (color) => ({ fontSize: '11px', fontWeight: 'bold', color: color || '#222' }),

  // Footer
  footerWrapper: {
    marginTop: '30px',
    borderTop: `1px solid ${pal.border}`,
    paddingTop: '12px',
  },
  footerMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#555',
    marginBottom: '10px',
  },
  footerSigRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  sigBlock: { width: '220px', textAlign: 'center' },
  sigLine: { borderTop: '1px solid #222', marginTop: '36px', paddingTop: '4px', fontSize: '10px', color: '#555' },
};

function InfoCell({ label, value }) {
  return (
    <div style={st.infoCell}>
      <div style={st.infoCellLabel}>{label}</div>
      <div style={st.infoCellValue}>{v(value)}</div>
    </div>
  );
}

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const fmtMoney = (amount, symbol) => {
  if (amount == null) return '—';
  const num = Number(amount);
  return `${symbol || ''}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function ApprovalBadge({ approved }) {
  if (approved) return <span style={st.badge(pal.greenLight, pal.green)}>APPROVED</span>;
  return <span style={st.badge(pal.yellowLight, pal.yellow)}>PENDING</span>;
}

export default function ShipmentInvoiceDocument({ snapshot }) {
  if (!snapshot) return <div style={st.page}>No data provided.</div>;

  const snap = snapshot;
  const branch = snap.branch || {};
  const shipper = snap.shipper || {};
  const consignee = snap.consignee || {};
  const originPort = snap.origin_port || {};
  const destPort = snap.destination_port || {};
  const transportLegs = snap.transport_info || [];
  const mainLeg = transportLegs.length > 0 ? transportLegs[0] : {};
  const addInfo = snap.additional_information || {};
  const payment = snap.payment_summary || {};
  const charges = payment.shipment_charges || [];
  const costings = payment.shipment_costings || [];

  // Bill-to party: shipper for export, consignee for import
  const isImport = (snap.direction || '').toLowerCase().includes('import');
  const billTo = isImport ? consignee : shipper;

  const profitPositive = (Number(payment.gross_profit) || 0) >= 0;

  return (
    <div style={st.page}>
      {/* Closure Banners */}
      {snap.open_financially === false && (
        <div style={st.banner(pal.greenLight, '#065f46', pal.greenBorder)}>
          ✓ FINANCIALLY CLOSED
        </div>
      )}
      {snap.open_operationally === false && (
        <div style={st.banner(pal.blueLight, '#1e3a8a', pal.blueBorder)}>
          ✓ OPERATIONALLY CLOSED
        </div>
      )}

      {/* Header */}
      <div style={st.headerRow}>
        <div style={st.companyBlock}>
          <div style={st.logoBox}>LOGO</div>
          <div style={st.companyText}>
            <div style={st.companyName}>{v(branch.name)}</div>
            <div style={st.companyAddress}>
              {v(branch.address)}<br />
              {branch.phone && <>Tel: {branch.phone}</>}
              {branch.phone && branch.email && ' | '}
              {branch.email && <>Email: {branch.email}</>}
              {branch.code && <><br />Branch Code: {branch.code}</>}
            </div>
          </div>
        </div>
        <div style={st.invoiceBlock}>
          <div style={st.docTitle}>FREIGHT INVOICE</div>
          <div style={st.invoiceNumber}>Invoice No: {v(snap.shipment_number)}</div>
          <div style={st.invoiceDate}>Date: {formatDate(snap.created_date)}</div>
          {snap.doc_ref_no && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Ref: {snap.doc_ref_no}</div>
          )}
          <div style={{ marginTop: '6px', display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {addInfo.extra_invoices && (
              <span style={st.badge('#f0f9ff', '#0369a1')}>ADDITIONAL INVOICES ATTACHED</span>
            )}
            {payment.is_tax_exempt && (
              <span style={st.badge(pal.grayLight, pal.gray)}>TAX EXEMPT</span>
            )}
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div style={st.billToBox}>
        <div style={st.billToLabel}>Bill To {isImport ? '(Consignee)' : '(Shipper)'}</div>
        <div style={st.billToValue}>
          <strong>{v(billTo.name || billTo.display)}</strong><br />
          {billTo.address && <>{billTo.address}<br /></>}
          {billTo.phone && <>Tel: {billTo.phone}<br /></>}
          {billTo.email && <>Email: {billTo.email}</>}
        </div>
      </div>

      {/* Shipment Details */}
      <div style={st.sectionHeading}>Shipment Details</div>
      <div style={st.infoGrid}>
        <InfoCell label="Shipment No" value={snap.shipment_number} />
        <InfoCell label="Type" value={snap.shipment_main_type} />
        <InfoCell label="Mode" value={snap.transportation_mode} />
        <InfoCell label="Direction" value={snap.direction} />
      </div>
      <div style={st.infoGrid}>
        <InfoCell label="Origin Port" value={originPort.name ? `${originPort.name} (${v(originPort.code)})` : null} />
        <InfoCell label="Destination Port" value={destPort.name ? `${destPort.name} (${v(destPort.code)})` : null} />
        <InfoCell label="Doc Ref No" value={snap.doc_ref_no} />
        <InfoCell label="Status" value={snap.status} />
      </div>
      <div style={st.infoGrid}>
        <InfoCell label="ETD" value={formatDate(mainLeg.etd)} />
        <InfoCell label="ETA" value={formatDate(mainLeg.eta)} />
        <InfoCell label="Carrier / Vessel" value={mainLeg.carrier?.name || mainLeg.vessel_name || mainLeg.flight_no} />
        <InfoCell label="Incoterms" value={addInfo.incoterms_location} />
      </div>

      {/* Revenue Charges */}
      <div style={st.sectionHeading}>
        Revenue Charges
        <span style={{ fontSize: '10px', color: pal.gray, fontWeight: 'normal', textTransform: 'none' }}>
          ({charges.length} line{charges.length !== 1 ? 's' : ''})
        </span>
      </div>
      {charges.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '8px' }}>No revenue charges recorded.</div>
      ) : (
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>#</th>
              <th style={st.th}>Description</th>
              <th style={st.th}>Account</th>
              <th style={st.thRight}>Qty</th>
              <th style={st.thRight}>Unit Price</th>
              <th style={st.thRight}>Amount</th>
              <th style={st.th}>Currency</th>
              <th style={st.th}>Billable</th>
              <th style={st.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((ch, idx) => {
              const currency = ch.currency || {};
              return (
                <tr key={ch.id ?? idx} style={idx % 2 === 1 ? st.trEven : {}}>
                  <td style={st.td}>{idx + 1}</td>
                  <td style={st.td}>
                    {v(ch.description)}
                    {ch.is_billable === false && (
                      <span style={{ color: pal.gray, fontStyle: 'italic', fontSize: '10px', marginLeft: '4px' }}>
                        (Non-Billable)
                      </span>
                    )}
                  </td>
                  <td style={st.td}>{v(ch.account?.name)}</td>
                  <td style={st.tdRight}>{v(ch.quantity)}</td>
                  <td style={st.tdRight}>{fmtMoney(ch.unit_price, currency.symbol)}</td>
                  <td style={{ ...st.tdRight, fontWeight: '600' }}>{fmtMoney(ch.amount, currency.symbol)}</td>
                  <td style={st.tdCenter}>
                    <span style={{ fontWeight: '600' }}>{v(currency.code)}</span>
                  </td>
                  <td style={st.tdCenter}>
                    {ch.is_billable
                      ? <span style={st.badge(pal.greenLight, pal.green)}>YES</span>
                      : <span style={st.badge(pal.grayLight, pal.gray)}>NO</span>
                    }
                  </td>
                  <td style={st.tdCenter}>
                    <ApprovalBadge approved={ch.approved} />
                  </td>
                </tr>
              );
            })}
            {/* Revenue subtotal */}
            <tr style={{ background: pal.primaryLight }}>
              <td style={st.td} colSpan={5}><strong>Total Revenue</strong></td>
              <td style={{ ...st.tdRight, fontWeight: 'bold', fontSize: '12px' }}>
                {payment.total_revenue != null ? Number(payment.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </td>
              <td style={st.td} colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Cost Summary */}
      <div style={st.sectionHeading}>
        Cost Summary
        <span style={{ fontSize: '10px', color: pal.gray, fontWeight: 'normal', textTransform: 'none' }}>
          ({costings.length} line{costings.length !== 1 ? 's' : ''})
        </span>
      </div>
      {costings.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '8px' }}>No cost entries recorded.</div>
      ) : (
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>#</th>
              <th style={st.th}>Description</th>
              <th style={st.th}>Account</th>
              <th style={st.thRight}>Qty</th>
              <th style={st.thRight}>Unit Price</th>
              <th style={st.thRight}>Amount</th>
              <th style={st.th}>Currency</th>
              <th style={st.th}>Payable</th>
              <th style={st.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {costings.map((ct, idx) => {
              const currency = ct.currency || {};
              return (
                <tr key={ct.id ?? idx} style={idx % 2 === 1 ? st.trEven : {}}>
                  <td style={st.td}>{idx + 1}</td>
                  <td style={st.td}>
                    {v(ct.description)}
                    {ct.is_payable === false && (
                      <span style={{ color: pal.gray, fontStyle: 'italic', fontSize: '10px', marginLeft: '4px' }}>
                        (Non-Payable)
                      </span>
                    )}
                  </td>
                  <td style={st.td}>{v(ct.account?.name)}</td>
                  <td style={st.tdRight}>{v(ct.quantity)}</td>
                  <td style={st.tdRight}>{fmtMoney(ct.unit_price, currency.symbol)}</td>
                  <td style={{ ...st.tdRight, fontWeight: '600' }}>{fmtMoney(ct.amount, currency.symbol)}</td>
                  <td style={st.tdCenter}>
                    <span style={{ fontWeight: '600' }}>{v(currency.code)}</span>
                  </td>
                  <td style={st.tdCenter}>
                    {ct.is_payable
                      ? <span style={st.badge(pal.greenLight, pal.green)}>YES</span>
                      : <span style={st.badge(pal.grayLight, pal.gray)}>NO</span>
                    }
                  </td>
                  <td style={st.tdCenter}>
                    <ApprovalBadge approved={ct.approved} />
                  </td>
                </tr>
              );
            })}
            {/* Total cost row */}
            <tr style={{ background: pal.primaryLight }}>
              <td style={st.td} colSpan={5}><strong>Total Cost</strong></td>
              <td style={{ ...st.tdRight, fontWeight: 'bold', fontSize: '12px' }}>
                {payment.total_cost != null ? Number(payment.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </td>
              <td style={st.td} colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Financial Summary Box */}
      <div style={st.summaryBox}>
        <div style={st.summaryTable}>
          <div style={{
            background: pal.primary,
            color: '#fff',
            padding: '6px 10px',
            fontWeight: 'bold',
            fontSize: '11px',
            letterSpacing: '0.5px',
          }}>
            FINANCIAL SUMMARY
          </div>
          {[
            {
              label: 'Total Revenue',
              value: payment.total_revenue != null
                ? Number(payment.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : '—',
              color: null,
              highlight: false,
            },
            {
              label: 'Total Cost',
              value: payment.total_cost != null
                ? Number(payment.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : '—',
              color: null,
              highlight: false,
            },
            {
              label: 'Gross Profit',
              value: payment.gross_profit != null
                ? Number(payment.gross_profit).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : '—',
              color: profitPositive ? pal.green : pal.red,
              highlight: true,
            },
            {
              label: 'Gross Profit %',
              value: payment.gross_profit_percent != null
                ? `${Number(payment.gross_profit_percent).toFixed(2)}%`
                : '—',
              color: profitPositive ? pal.green : pal.red,
              highlight: false,
            },
            {
              label: 'Total Receivables',
              value: payment.total_receivables != null
                ? Number(payment.total_receivables).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : '—',
              color: null,
              highlight: false,
            },
            {
              label: 'Total Payables',
              value: payment.total_payables != null
                ? Number(payment.total_payables).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : '—',
              color: null,
              highlight: false,
            },
          ].map((row, i) => (
            <div key={i} style={st.summaryRow(row.highlight)}>
              <span style={st.summaryLabel}>{row.label}</span>
              <span style={st.summaryValue(row.color)}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={st.footerWrapper}>
        <div style={st.footerMeta}>
          <div>
            <strong>Payment Terms:</strong> As per agreement &nbsp;|&nbsp;
            <strong>Bank Details:</strong> [Bank details to be provided on request]
          </div>
          <div>
            Generated: {formatDate(snap.created_date)} &nbsp;|&nbsp; {v(branch.name)}
          </div>
        </div>
        <div style={st.footerSigRow}>
          <div style={st.sigBlock}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>Date: {formatDate(snap.created_date)}</div>
            <div style={st.sigLine}>Prepared By</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#888', alignSelf: 'flex-end', paddingBottom: '4px' }}>
            {v(snap.shipment_number)} &nbsp;|&nbsp; {v(snap.status)}
          </div>
          <div style={st.sigBlock}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>&nbsp;</div>
            <div style={st.sigLine}>Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
