import { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Button, Card, DatePicker, Drawer, Row, Col, Select, Space, Spin, Table, Tag, Typography, App } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import PosLayout from '@/Layouts/PosLayout.jsx';
import PrintablePdfEmailWrapper from '@/Components/PrintableComponent';
import { api, defaultRangeForKey, fetchList, money, rangeParams, saleStatusColor, showApiError } from './Shared/posHelpers';
import PosReturnModal from './Shared/PosReturnModal';

const { Text } = Typography;

const resolveLogoUrl = (path) => {
    if (!path) return null;
    const value = String(path).trim();
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    const base = (import.meta.env.VITE_APP_BACKEND_URL || '').replace(/\/+$/, '');
    let normalized = value.replace(/^\/+/, '');
    if (normalized.startsWith('public/')) normalized = normalized.slice(7);
    if (!normalized.startsWith('storage/') && !normalized.startsWith('images/')) normalized = `storage/${normalized}`;
    return `${base}/${normalized}`;
};

function PosSaleReceipt({ sale, company }) {
    const logoUrl = resolveLogoUrl(
        company?.logo || company?.logo_url || company?.logo_path || company?.company_logo || null
    );
    const companyName = company?.company_name || company?.name || 'Company';
    const companyAddress = [company?.address, company?.city, company?.state, company?.country].filter(Boolean).join(', ');
    const companyContact = [company?.phone, company?.email].filter(Boolean).join(' | ');
    const companyPanVat = company?.pan_vat || company?.pan || company?.vat || company?.tax_id || null;
    const lines = sale.pos_sale_lines || sale.posSaleLines || [];
    const payments = sale.pos_payments || sale.posPayments || [];
    const cashier = sale.pos_shift?.cashier || sale.posShift?.cashier || sale.cashier || {};
    const terminal = sale.pos_terminal || sale.posTerminal || {};
    const customer = sale.customer_name || sale.contact?.name || 'Walk-in';
    const row = (label, value, strong = false) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: strong ? 700 : 400 }}>
            <span>{label}</span>
            <span style={{ textAlign: 'right' }}>{value}</span>
        </div>
    );

    return (
        <div style={{ width: '80mm', padding: '4mm', fontFamily: 'Arial, sans-serif', fontSize: 11, lineHeight: 1.35, color: '#111', background: '#fff' }}>
            <div style={{ textAlign: 'center' }}>
                {logoUrl && <img src={logoUrl} alt="" style={{ maxWidth: 120, maxHeight: 52, objectFit: 'contain', marginBottom: 4 }} />}
                <div style={{ fontSize: 16, fontWeight: 800 }}>{companyName}</div>
                {companyAddress && <div>{companyAddress}</div>}
                {companyContact && <div>{companyContact}</div>}
                {companyPanVat && <div>PAN/VAT: {companyPanVat}</div>}
            </div>

            <div style={{ borderTop: '1px dashed #777', borderBottom: '1px dashed #777', padding: '6px 0', margin: '8px 0' }}>
                {row('Receipt No', sale.sale_no || sale.id)}
                {row('Date', dayjs(sale.sale_date || sale.created_at).format('DD-MM-YYYY HH:mm'))}
                {row('Customer', customer)}
                {sale.customer_phone && row('Phone', sale.customer_phone)}
                {row('Branch', sale.branch?.name || '-')}
                {row('Terminal', terminal.name || terminal.code || '-')}
                {row('Cashier', cashier.display_name || cashier.name || cashier.username || '-')}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #777' }}>
                        <th style={{ textAlign: 'left', padding: '3px 0' }}>Item</th>
                        <th style={{ textAlign: 'right', padding: '3px 0' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '3px 0' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line, index) => (
                        <tr key={line.id || `${line.product_id || 'line'}-${index}`}>
                            <td style={{ padding: '3px 0', verticalAlign: 'top' }}>
                                <div>{line.product_name || line.product?.name || line.description || 'Item'}</div>
                                <div style={{ fontSize: 10, color: '#555' }}>
                                    {money(line.unit_price)} each
                                    {Number(line.discount_amount || line.discount_total || 0) > 0
                                        ? `, discount ${money(line.discount_amount || line.discount_total)}`
                                        : ''}
                                </div>
                            </td>
                            <td style={{ padding: '3px 0', textAlign: 'right', verticalAlign: 'top' }}>{Number(line.qty || 0)}</td>
                            <td style={{ padding: '3px 0', textAlign: 'right', verticalAlign: 'top' }}>{money(line.line_total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #777', paddingTop: 6, marginTop: 4 }}>
                {row('Subtotal', `Rs. ${money(sale.subtotal)}`)}
                {Number(sale.discount_total || 0) > 0 && row('Discount', `Rs. ${money(sale.discount_total)}`)}
                {Number(sale.tax_total || 0) > 0 && row('Tax', `Rs. ${money(sale.tax_total)}`)}
                {row('Grand Total', `Rs. ${money(sale.grand_total)}`, true)}
                {row('Paid', `Rs. ${money(sale.paid_total)}`)}
                {Number(sale.balance_due || 0) > 0
                    ? row('Amount Due', `Rs. ${money(sale.balance_due)}`, true)
                    : row('Change', `Rs. ${money(sale.change_amount)}`)}
            </div>

            {payments.length > 0 && (
                <div style={{ borderTop: '1px dashed #777', paddingTop: 6, marginTop: 6 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Payments</div>
                    {payments.map((payment, index) => (
                        <div key={payment.id || index}>
                            {row(
                                String(payment.payment_method || 'payment').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
                                `Rs. ${money(payment.amount)}`
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ textAlign: 'center', borderTop: '1px dashed #777', marginTop: 8, paddingTop: 8 }}>
                <div>{company?.receipt_footer || company?.invoice_footer || 'Thank you for your business.'}</div>
                <div style={{ fontSize: 9, color: '#666', marginTop: 3 }}>Please keep this receipt for your records.</div>
            </div>
        </div>
    );
}

export default function PosSalesPage() {
    const { message } = App.useApp();
    const { props } = usePage();
    const permissions = props.auth?.permissions || [];
    const can = (permission) => permissions.includes(permission);
    const [loading, setLoading] = useState(true);
    const [rangeKey, setRangeKey] = useState('today');
    const [range, setRange] = useState(defaultRangeForKey('today'));
    const [rows, setRows] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [filters, setFilters] = useState({ status: undefined, pos_terminal_id: undefined });
    const [returnSaleId, setReturnSaleId] = useState(null);
    const [printSale, setPrintSale] = useState(null);
    const [printLoading, setPrintLoading] = useState(false);
    const [company, setCompany] = useState(null);

    useEffect(() => {
        void bootstrap();
    }, []);

    useEffect(() => {
        void loadRows();
    }, [range, filters]);

    async function bootstrap() {
        setLoading(true);
        try {
            const [salesPayload, terminalPayload, companyResponse] = await Promise.all([
                fetchList('/api/pos-sales', { ...rangeParams(range), page_size: 100 }),
                fetchList('/api/pos-terminals', { page_size: 100, active: true }),
                axios.get(api('/api/app-settings/current')).catch(() => ({ data: null })),
            ]);
            setRows(salesPayload.results || []);
            setTerminals(terminalPayload.results || []);
            setCompany(companyResponse.data?.data || companyResponse.data || null);
        } catch (error) {
            showApiError(message, error, 'Failed to load POS sales.');
        } finally {
            setLoading(false);
        }
    }

    async function loadRows() {
        try {
            const payload = await fetchList('/api/pos-sales', {
                ...rangeParams(range),
                ...filters,
                page_size: 100,
            });
            setRows(payload.results || []);
        } catch (error) {
            showApiError(message, error, 'Failed to refresh POS sales.');
        }
    }

    function canReturnSale(record) {
        return can('pos.return.create') && ['completed', 'part_refunded'].includes(record.status);
    }

    async function openPrintSale(record) {
        setPrintLoading(true);

        try {
            const { data } = await axios.get(api(`/api/pos-sales/${record.id}`));
            setPrintSale(data || record);
        } catch (error) {
            setPrintSale(record);
            showApiError(message, error, 'Could not load the complete receipt. Showing available sale details.');
        } finally {
            setPrintLoading(false);
        }
    }

    const columns = useMemo(() => [
        { title: 'Sale No', dataIndex: 'sale_no', key: 'sale_no', render: (value) => <Text strong>{value}</Text> },
        { title: 'Date', dataIndex: 'sale_date', key: 'sale_date', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Customer', key: 'customer', render: (_, record) => record.customer_name || record.contact?.name || 'Walk-in' },
        { title: 'Terminal', key: 'terminal', render: (_, record) => record.pos_terminal?.name || '-' },
        { title: 'Cashier', key: 'cashier', render: (_, record) => record.pos_shift?.cashier?.display_name || record.pos_shift?.cashier?.name || '-' },
        { title: 'Payment', dataIndex: 'payment_status', key: 'payment_status', render: (value) => <Tag>{statusText(value)}</Tag> },
        { title: 'Total', dataIndex: 'grand_total', key: 'grand_total', align: 'right', render: (value) => <Text strong>Rs. {money(value)}</Text> },
        { title: 'Paid', dataIndex: 'paid_total', key: 'paid_total', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Due / Change', key: 'due_change', align: 'right', render: (_, record) => Number(record.balance_due || 0) > 0 ? `Due Rs. ${money(record.balance_due)}` : `Change Rs. ${money(record.change_amount)}` },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={saleStatusColor(value)}>{statusText(value)}</Tag> },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => router.visit(route('pos.sales.show', record.id))}>View</Button>
                    <Button size="small" loading={printLoading} onClick={() => openPrintSale(record)}>Print</Button>
                    {canReturnSale(record) && (
                        <Button size="small" danger onClick={() => setReturnSaleId(record.id)}>Return</Button>
                    )}
                </Space>
            ),
        },
    ], [permissions]);

    const grandTotal = useMemo(() => rows.reduce((sum, r) => sum + Number(r.grand_total || 0), 0), [rows]);
    const completedCount = useMemo(() => rows.filter((r) => ['completed', 'part_refunded', 'refunded'].includes(r.status)).length, [rows]);

    const logoUrl = resolveLogoUrl(
        company?.logo || company?.logo_url || company?.logo_path || company?.company_logo || null
    );
    const companyName = company?.company_name || company?.name || 'Company';
    const companyAddress = [company?.address, company?.city, company?.country].filter(Boolean).join(', ');
    const companyContact = [company?.phone, company?.email].filter(Boolean).join(' | ');
    const companyPanVat = company?.pan_vat || company?.pan || company?.vat || null;

    const selectedTerminalName = filters.pos_terminal_id
        ? terminals.find((t) => t.id === filters.pos_terminal_id)?.name || '-'
        : 'All Terminals';

    const periodLabel = rangeKey === 'custom' && range?.[0] && range?.[1]
        ? `${dayjs(range[0]).format('DD MMM YYYY')} – ${dayjs(range[1]).format('DD MMM YYYY')}`
        : rangeKey === 'today' ? `Today (${dayjs().format('DD MMM YYYY')})`
        : rangeKey === 'week' ? 'This Week'
        : rangeKey === 'month' ? 'This Month'
        : '';

    const statusLabel = filters.status
        ? String(filters.status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'All Statuses';

    function statusText(value) {
        return String(value || '-').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return (
        <PosLayout>
            <Head title="POS Sales" />

            <div style={{ padding: '18px 24px' }}>
                {/* Filter controls — outside printable area */}
                <Card bordered={false} style={{ marginBottom: 16 }}>
                    <Row gutter={12}>
                        <Col xs={24} md={8}>
                            <Select
                                style={{ width: '100%' }}
                                value={rangeKey}
                                onChange={(value) => {
                                    setRangeKey(value);
                                    setRange(defaultRangeForKey(value));
                                }}
                                options={[
                                    { value: 'today', label: 'Today' },
                                    { value: 'week', label: 'This Week' },
                                    { value: 'month', label: 'This Month' },
                                    { value: 'custom', label: 'Custom Range' },
                                ]}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <DatePicker.RangePicker style={{ width: '100%' }} value={range} onChange={setRange} disabled={rangeKey !== 'custom'} />
                        </Col>
                        <Col xs={24} md={8}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Select
                                    allowClear
                                    placeholder="Status"
                                    style={{ width: '40%' }}
                                    value={filters.status}
                                    onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                                    options={[
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'held', label: 'Held' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                        { value: 'refunded', label: 'Refunded' },
                                        { value: 'part_refunded', label: 'Part Refunded' },
                                    ]}
                                />
                                <Select
                                    allowClear
                                    placeholder="Terminal"
                                    style={{ width: '60%' }}
                                    value={filters.pos_terminal_id}
                                    onChange={(value) => setFilters((current) => ({ ...current, pos_terminal_id: value }))}
                                    options={terminals.map((terminal) => ({ value: terminal.id, label: terminal.name }))}
                                />
                            </Space.Compact>
                        </Col>
                    </Row>
                </Card>

                {loading ? (
                    <div style={{ minHeight: 300, display: 'grid', placeItems: 'center' }}>
                        <Spin />
                    </div>
                ) : (
                    <PrintablePdfEmailWrapper
                        title="POS Sales Report"
                        fileName={`pos-sales-report-${dayjs().format('YYYY-MM-DD')}.pdf`}
                        allowEmail={false}
                    >
                        {/* ── Printable document body ── */}
                        <div style={{ padding: '36px 44px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, color: '#111', background: '#fff', minWidth: 720 }}>

                            {/* Company header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, marginBottom: 20, borderBottom: '2px solid #1a1a1a' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {logoUrl && (
                                        <img
                                            src={logoUrl}
                                            alt="Logo"
                                            style={{ height: 60, width: 'auto', maxWidth: 150, objectFit: 'contain' }}
                                            crossOrigin="anonymous"
                                        />
                                    )}
                                    <div>
                                        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{companyName}</div>
                                        {companyAddress && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{companyAddress}</div>}
                                        {companyContact && <div style={{ fontSize: 12, color: '#666' }}>{companyContact}</div>}
                                        {companyPanVat && <div style={{ fontSize: 12, color: '#666' }}>PAN/VAT: {companyPanVat}</div>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 180 }}>
                                    <div style={{ fontSize: 17, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>POS Sales Report</div>
                                    <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Period: {periodLabel}</div>
                                    <div style={{ fontSize: 12, color: '#555' }}>Terminal: {selectedTerminalName}</div>
                                    <div style={{ fontSize: 12, color: '#555' }}>Status: {statusLabel}</div>
                                    <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                                        Printed: {dayjs().format('DD MMM YYYY, HH:mm')}
                                    </div>
                                </div>
                            </div>

                            {/* Summary row */}
                            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                                {[
                                    { label: 'Total Transactions', value: rows.length },
                                    { label: 'Completed / Refunded', value: completedCount },
                                    { label: 'Grand Total', value: `Rs. ${money(grandTotal)}`, highlight: true },
                                ].map(({ label, value, highlight }) => (
                                    <div key={label} style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: 6, padding: '12px 16px', background: highlight ? '#f6ffed' : '#fafafa' }}>
                                        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: highlight ? '#389e0d' : '#111' }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Sales table */}
                            <Table
                                size="small"
                                pagination={false}
                                rowKey="id"
                                dataSource={rows}
                                columns={[
                                    { title: 'Sale No', dataIndex: 'sale_no', key: 'sale_no' },
                                    { title: 'Date', dataIndex: 'sale_date', key: 'sale_date', render: (v) => dayjs(v).format('DD-MM-YYYY HH:mm') },
                                    { title: 'Terminal', key: 'terminal', render: (_, r) => r.pos_terminal?.name || '-' },
                                    { title: 'Customer', key: 'customer', render: (_, r) => r.customer_name || r.contact?.name || 'Walk-in' },
                                    { title: 'Cashier', key: 'cashier', render: (_, r) => r.cashier?.display_name || r.cashier?.name || '-' },
                                    {
                                        title: 'Status',
                                        dataIndex: 'status',
                                        key: 'status',
                                        render: (value) => (
                                            <Tag color={{ completed: 'green', refunded: 'red', part_refunded: 'orange', held: 'default', cancelled: 'default' }[value] || 'default'}>
                                                {value}
                                            </Tag>
                                        ),
                                    },
                                    { title: 'Grand Total', dataIndex: 'grand_total', key: 'grand_total', align: 'right', render: (v) => `Rs. ${money(v)}` },
                                ]}
                                summary={() => (
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={6}>
                                            <Text strong>Total ({rows.length} sales)</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <Text strong>Rs. {money(grandTotal)}</Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                )}
                            />

                            {/* Signature row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, gap: 32 }}>
                                {['Prepared By', 'Verified By', 'Authorized By'].map((label) => (
                                    <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ borderTop: '1px solid #333', paddingTop: 6, fontSize: 11, color: '#555' }}>{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
                                <span>Generated on {dayjs().format('DD MMM YYYY, HH:mm')}</span>
                                <span>{companyName} — POS Sales Report</span>
                            </div>
                        </div>
                    </PrintablePdfEmailWrapper>
                )}
            </div>

            <PosReturnModal
                open={!!returnSaleId}
                saleId={returnSaleId}
                onCancel={() => setReturnSaleId(null)}
                onSuccess={async () => {
                    setReturnSaleId(null);
                    await loadRows();
                }}
            />

            <Drawer open={!!printSale} onClose={() => setPrintSale(null)} title="Receipt / Bill" width={480}>
                {printSale ? (
                    <PrintablePdfEmailWrapper
                        title="POS Receipt"
                        subTitle={printSale.sale_no}
                        fileName={`pos-receipt-${printSale.sale_no || printSale.id}.pdf`}
                        pageSize="80mm"
                        allowDownload={false}
                        allowEmail={false}
                    >
                        <PosSaleReceipt sale={printSale} company={company} />
                    </PrintablePdfEmailWrapper>
                ) : <Spin />}
            </Drawer>
        </PosLayout>
    );
}
