import ApplicationLogo from '@/Components/ApplicationLogo';
import { formatDate, formatMoney } from '@/Components/Central/formatters';
import { DownloadOutlined, LockOutlined, PrinterOutlined } from '@ant-design/icons';
import { Head, Link } from '@inertiajs/react';
import { Alert, Button, Space, Typography } from 'antd';
import axios from 'axios';
import { useState } from 'react';

const number = (value) => Number(value || 0);

function Address({ party }) {
    return <div className="saas-invoice-address">
        {(party.address_lines || []).map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
        {party.email && <span>{party.email}</span>}
        {party.phone && <span>{party.phone}</span>}
        {party.website && <span>{party.website}</span>}
        {party.tax_number && <span>Tax ID: {party.tax_number}</span>}
        {party.registration_number && <span>Registration: {party.registration_number}</span>}
    </div>;
}

export default function PublicInvoice({ invoice, document = {}, compliance = {}, gateways = [], gatewayNotice = null, checkoutUrl, processingUrl, state }) {
    const [loading, setLoading] = useState(null);
    const seller = document.seller || { name: 'KiteLedger', address_lines: [] };
    const buyer = document.buyer || { name: invoice.tenant?.legal_name || invoice.tenant?.company_name || 'Customer', address_lines: [] };
    const lines = invoice.lines?.length ? invoice.lines : (invoice.line_items_snapshot || []);
    const status = invoice.status === 'part_paid' ? 'partially_paid' : invoice.status;
    const statusLabel = ({ paid: 'Paid', issued: 'Unpaid', partially_paid: 'Partially paid', draft: 'Draft' })[status] || String(status || 'Unpaid').replaceAll('_', ' ');
    const taxLabel = compliance.tax_label || document.tax_label || 'Tax';
    const taxCharged = Boolean(compliance.tax_charged);
    const lineTax = compliance.lines || {};
    const breakdown = compliance.breakdown || [];
    const documentType = compliance.document_type || 'Invoice';
    const rate = (value) => `${Number(value || 0).toFixed(2).replace(/\.?0+$/, '')}%`;

    const pay = async (gateway) => {
        setLoading(gateway.slug);
        try {
            const { data } = await axios.post(checkoutUrl, { gateway: gateway.slug });
            if (data.checkout_url) { window.location.assign(data.checkout_url); return; }
            if (gateway.slug === 'razorpay') {
                await loadScript('https://checkout.razorpay.com/v1/checkout.js');
                const checkout = new window.Razorpay({ key: data.public_key, order_id: data.transaction_id, amount: data.amount, currency: data.currency, name: seller.name, description: `Invoice ${data.invoice_number}`, handler: () => window.location.assign(processingUrl), modal: { ondismiss: () => setLoading(null) } });
                checkout.open();
            }
        } catch { setLoading(null); }
    };

    return <div className="saas-invoice-page">
        <Head title={`Invoice ${invoice.invoice_number}`} />
        <div className="saas-invoice-toolbar">
            <Link href="/" className="saas-invoice-toolbar__brand" aria-label="Home"><ApplicationLogo /></Link>
            <Space wrap>
                <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
                <Button type="primary" icon={<DownloadOutlined />} onClick={() => window.print()}>Save as PDF</Button>
            </Space>
        </div>
        {(state === 'success' || state === 'processing' || state === 'cancelled') && <div className="saas-invoice-alerts">
            {state === 'success' && <Alert type="success" showIcon message="Payment received" description="The payment is being reconciled. Refresh this page if the balance has not updated yet." />}
            {state === 'processing' && <Alert type="info" showIcon message="Payment submitted" description="The provider confirmation is being processed." />}
            {state === 'cancelled' && <Alert type="warning" showIcon message="Payment was cancelled" />}
        </div>}

        <div className="saas-invoice-layout">
            <article className="saas-invoice-paper">
                <header className="saas-invoice-head">
                    <div className="saas-invoice-seller">
                        {seller.logo_url && <img className="saas-invoice-seller__logo" src={seller.logo_url} alt={seller.name} />}
                        <h1>{seller.name}</h1>
                        <Address party={seller} />
                    </div>
                    <div className="saas-invoice-title">
                        <span>{documentType}</span>
                        <h2>#{invoice.invoice_number}</h2>
                        <span className={`saas-invoice-status saas-invoice-status--${status}`}>{statusLabel}</span>
                    </div>
                </header>

                <section className="saas-invoice-parties">
                    <div className="saas-invoice-buyer">
                        <span className="saas-invoice-label">Bill to</span>
                        <h3>{buyer.name}</h3>
                        <Address party={buyer} />
                    </div>
                    <dl className="saas-invoice-meta">
                        <div><dt>Issue date</dt><dd>{formatDate(invoice.issue_date)}</dd></div>
                        <div><dt>Due date</dt><dd>{formatDate(invoice.due_date)}</dd></div>
                        {invoice.period_start && <div><dt>Service period</dt><dd>{formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}</dd></div>}
                        <div><dt>Currency</dt><dd>{String(invoice.currency || '').toUpperCase()}</dd></div>
                        {compliance.payment_reference && <div><dt>Payment reference</dt><dd>{compliance.payment_reference}</dd></div>}
                    </dl>
                </section>

                <div className="saas-invoice-table-wrap">
                    <table className="saas-invoice-table">
                        <thead><tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit price</th>
                            {taxCharged && <th>{taxLabel} rate</th>}
                            {taxCharged && <th>{taxLabel}</th>}
                            <th>Amount</th>
                        </tr></thead>
                        <tbody>{lines.length ? lines.map((line, index) => <tr key={line.id || index}>
                            <td>{line.description || 'Subscription service'}</td>
                            <td>{number(line.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                            <td>{formatMoney(line.unit_amount ?? line.unit_price, invoice.currency)}</td>
                            {taxCharged && <td>{rate(lineTax[index]?.rate)}</td>}
                            {taxCharged && <td>{formatMoney(lineTax[index]?.amount, invoice.currency)}</td>}
                            <td>{formatMoney(line.amount ?? line.total, invoice.currency)}</td>
                        </tr>) : <tr>
                            <td>Subscription services</td>
                            <td>1</td>
                            <td>{formatMoney(invoice.subtotal, invoice.currency)}</td>
                            {taxCharged && <td>{rate(compliance.tax_rate)}</td>}
                            {taxCharged && <td>{formatMoney(compliance.tax_amount, invoice.currency)}</td>}
                            <td>{formatMoney(invoice.subtotal, invoice.currency)}</td>
                        </tr>}</tbody>
                    </table>
                </div>

                {/* Taxable base shown separately from the tax charged, per rate:
                    the breakdown a tax authority looks for. */}
                {(breakdown.length > 0 || compliance.exemption_reason) && <div className="saas-invoice-taxbreak">
                    <span className="saas-invoice-label">{taxLabel} summary</span>
                    {breakdown.length > 0 ? <table className="saas-invoice-table saas-invoice-table--compact">
                        <thead><tr><th>{taxLabel} rate</th><th>Taxable amount</th><th>{taxLabel} amount</th></tr></thead>
                        <tbody>{breakdown.map((row, index) => <tr key={row.label || index}>
                            <td>{row.label || rate(row.rate)}</td>
                            <td>{formatMoney(row.taxable, invoice.currency)}</td>
                            <td>{formatMoney(row.amount, invoice.currency)}</td>
                        </tr>)}</tbody>
                    </table> : <p className="saas-invoice-taxbreak__note">{compliance.exemption_reason}</p>}
                    {compliance.prices_include_tax && <p className="saas-invoice-taxbreak__note">All prices shown are inclusive of {taxLabel}.</p>}
                </div>}

                <div className="saas-invoice-totals-wrap"><dl className="saas-invoice-totals">
                    <div><dt>Subtotal</dt><dd>{formatMoney(invoice.subtotal, invoice.currency)}</dd></div>
                    {number(invoice.discount) > 0 && <div><dt>Discount</dt><dd>− {formatMoney(invoice.discount, invoice.currency)}</dd></div>}
                    {number(invoice.tax) > 0 && <div><dt>{taxLabel}</dt><dd>{formatMoney(invoice.tax, invoice.currency)}</dd></div>}
                    {compliance.rounding != null && <div><dt>Rounding</dt><dd>{formatMoney(compliance.rounding, invoice.currency)}</dd></div>}
                    <div className="is-total"><dt>Total</dt><dd>{formatMoney(invoice.total, invoice.currency)}</dd></div>
                    {number(invoice.paid_amount) > 0 && <div><dt>Amount paid</dt><dd>− {formatMoney(invoice.paid_amount, invoice.currency)}</dd></div>}
                    <div className="is-balance"><dt>Amount due</dt><dd>{formatMoney(invoice.balance, invoice.currency)}</dd></div>
                </dl></div>
                {compliance.amount_in_words && <p className="saas-invoice-words"><span className="saas-invoice-label">Total in words</span>{compliance.amount_in_words}</p>}

                <section className="saas-invoice-notes">
                    <div><span className="saas-invoice-label">Notes</span><p>{invoice.notes || 'Thank you for your business.'}</p></div>
                    <div><span className="saas-invoice-label">Payment terms</span><p>{document.payment_terms || `Payment is due by ${formatDate(invoice.due_date)}.`} Please quote reference {compliance.payment_reference || invoice.invoice_number} with your payment.</p></div>
                    {document.bank_details && <div><span className="saas-invoice-label">Bank details</span><p>{document.bank_details}</p></div>}
                    {document.payment_instructions && <div><span className="saas-invoice-label">Payment instructions</span><p>{document.payment_instructions}</p></div>}
                </section>
                <footer className="saas-invoice-foot">{document.footer ? <span dangerouslySetInnerHTML={{ __html: document.footer }} /> : <>Invoice {invoice.invoice_number} · Generated securely by KiteLedger</>}</footer>
            </article>

            <aside className="saas-invoice-payment">
                <h3>Payment summary</h3>
                <Typography.Text type="secondary">Invoice #{invoice.invoice_number}</Typography.Text>
                <div className="saas-invoice-payment__amount"><span>Amount due</span><strong>{formatMoney(invoice.balance, invoice.currency)}</strong></div>
                {invoice.status === 'paid' ? <Alert type="success" showIcon message="This invoice is paid" description={invoice.paid_at ? `Paid on ${formatDate(invoice.paid_at)}` : 'No payment is required.'} /> : gateways.length ? <Space direction="vertical" size={10} style={{ width: '100%' }}>{gateways.map((gateway) => gateway.manual ? <Alert key={gateway.slug} type="info" showIcon message={gateway.name} description={gateway.instructions || 'Contact the billing team for payment instructions.'} /> : <Button key={gateway.slug} block type="primary" loading={loading === gateway.slug} onClick={() => pay(gateway)}>Pay with {gateway.name}</Button>)}</Space> : <Alert type="warning" showIcon message="Online payment unavailable" description={gatewayNotice || 'Contact the billing team to arrange payment.'} />}
                <span className="saas-invoice-payment__secure"><LockOutlined /> Secure payment. Your payment details are handled by the selected provider.</span>
            </aside>
        </div>
    </div>;
}

function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
}
