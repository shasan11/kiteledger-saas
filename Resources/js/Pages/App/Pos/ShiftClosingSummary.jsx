import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { App, Button, Descriptions, Empty, Result, Spin, Table, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import PosLayout from '@/Layouts/PosLayout.jsx';
import PrintablePdfEmailWrapper from '@/Components/PrintableComponent';
import { api, money, showApiError } from './Shared/posHelpers';

const { Text } = Typography;

const resolveLogoUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const base = (import.meta.env.VITE_APP_BACKEND_URL || '').replace(/\/+$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

const humanize = (value) => String(value || '-').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function ShiftClosingSummary({ id }) {
    const { message } = App.useApp();
    const [shift, setShift] = useState(null);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void loadShift();
    }, [id]);

    async function loadShift() {
        setLoading(true);
        try {
            const [response, companyResponse] = await Promise.all([
                axios.get(api(`/api/pos-shifts/${id}`)),
                axios.get(api('/api/app-settings/current')).catch(() => ({ data: null })),
            ]);
            setShift(response.data || null);
            setCompany(companyResponse.data?.data || companyResponse.data || null);
        } catch (error) {
            setShift(null);
            showApiError(message, error, 'Failed to load shift summary.');
        } finally {
            setLoading(false);
        }
    }

    const transactionCount = useMemo(() => {
        return (shift?.pos_sales || []).filter((sale) =>
            ['completed', 'part_refunded', 'refunded'].includes(sale.status)
        ).length;
    }, [shift]);

    const cashInOut = useMemo(() => {
        const movements = shift?.pos_cash_movements || [];
        const cashIn = movements
            .filter((m) => m.type === 'cash_in' && !m.is_system_generated)
            .reduce((sum, m) => sum + Number(m.amount || 0), 0);
        const cashOut = movements
            .filter((m) => ['cash_out', 'drop', 'expense'].includes(m.type) && !m.is_system_generated)
            .reduce((sum, m) => sum + Number(m.amount || 0), 0);
        return cashIn - cashOut;
    }, [shift]);

    const paymentSummary = useMemo(() => {
        return (shift?.pos_sales || []).flatMap((sale) => sale.pos_payments || []).reduce((totals, payment) => {
            const method = payment.payment_method || 'cash';
            totals[method] = (totals[method] || 0) + Number(payment.amount || 0);
            return totals;
        }, {});
    }, [shift]);

    if (loading) {
        return (
            <PosLayout>
                <Head title="Shift Closing Summary" />
                <div style={{ minHeight: 420, display: 'grid', placeItems: 'center' }}>
                    <Spin />
                </div>
            </PosLayout>
        );
    }

    if (!shift) {
        return (
            <PosLayout>
                <Head title="Shift Closing Summary" />
                <div style={{ padding: '18px 24px' }}>
                    <Result
                        status="404"
                        title="Shift not found"
                        extra={<Button onClick={() => router.visit(route('pos.index'))}>Back to Terminals</Button>}
                    />
                </div>
            </PosLayout>
        );
    }

    const logoUrl = resolveLogoUrl(
        company?.logo || company?.logo_url || company?.logo_path || company?.company_logo || null
    );
    const companyName = company?.company_name || company?.name || 'Company';
    const companyAddress = [company?.address, company?.city, company?.country].filter(Boolean).join(', ');
    const companyContact = [company?.phone, company?.email].filter(Boolean).join(' | ');
    const companyPanVat = company?.pan_vat || company?.pan || company?.vat || null;
    const branchName = shift?.branch?.name || shift?.pos_terminal?.branch?.name || '';

    const shiftNo = shift.shift_no || `Shift #${id}`;
    const statusColor = shift.status === 'closed' ? 'default' : 'green';

    return (
        <PosLayout>
            <Head title="Shift Closing Summary" />

            <div style={{ padding: '18px 24px' }}>
                <PrintablePdfEmailWrapper
                    title={`Shift Report — ${shiftNo}`}
                    fileName={`shift-report-${shiftNo}.pdf`}
                    allowEmail={false}
                    toolbarExtra={
                        <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('pos.index'))}>
                            Back to Terminals
                        </Button>
                    }
                >
                    {/* ── Printable document body ── */}
                    <div style={{ padding: '36px 44px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, color: '#111', background: '#fff', minWidth: 680 }}>

                        {/* Company header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, marginBottom: 20, borderBottom: '2px solid #1a1a1a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {logoUrl ? (
                                        <img
                                            src={logoUrl}
                                            alt="Logo"
                                            style={{ height: 60, width: 'auto', maxWidth: 150, objectFit: 'contain' }}
                                            crossOrigin="anonymous"
                                        />
                                    ) : null}
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{companyName}</div>
                                    {branchName && <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginTop: 2 }}>{branchName}</div>}
                                    {companyAddress && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{companyAddress}</div>}
                                    {companyContact && <div style={{ fontSize: 12, color: '#666' }}>{companyContact}</div>}
                                    {companyPanVat && <div style={{ fontSize: 12, color: '#666' }}>PAN/VAT: {companyPanVat}</div>}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 160 }}>
                                <div style={{ fontSize: 17, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shift Closing Report</div>
                                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{shiftNo}</div>
                                <div style={{ marginTop: 4 }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 10px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        background: shift.status === 'closed' ? '#f5f5f5' : '#f6ffed',
                                        color: shift.status === 'closed' ? '#555' : '#389e0d',
                                        border: `1px solid ${shift.status === 'closed' ? '#d9d9d9' : '#b7eb8f'}`,
                                        textTransform: 'uppercase',
                                    }}>
                                        {humanize(shift.status)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                                    Printed: {dayjs().format('DD MMM YYYY, HH:mm')}
                                </div>
                            </div>
                        </div>

                        {/* Shift summary table */}
                        <Descriptions
                            bordered
                            size="small"
                            column={{ xs: 1, sm: 2 }}
                            style={{ marginBottom: 24 }}
                            items={[
                                { key: 'terminal', label: 'Terminal', children: shift.pos_terminal?.name || '-' },
                                { key: 'shift_no', label: 'Shift No', children: shiftNo },
                                { key: 'branch', label: 'Branch', children: shift.branch?.name || shift.pos_terminal?.branch?.name || '-' },
                                { key: 'cashier', label: 'Cashier', children: shift.cashier?.display_name || shift.cashier?.name || '-' },
                                { key: 'closed_by', label: 'Closed By', children: shift.closed_by?.name || shift.closedBy?.name || '-' },
                                { key: 'opened', label: 'Opened At', children: shift.opened_at ? dayjs(shift.opened_at).format('DD MMM YYYY, HH:mm') : '-' },
                                { key: 'closed', label: 'Closed At', children: shift.closed_at ? dayjs(shift.closed_at).format('DD MMM YYYY, HH:mm') : '-' },
                                { key: 'opening', label: 'Opening Cash', children: `Rs. ${money(shift.opening_cash)}` },
                                { key: 'cash_sales', label: 'Cash Sales', children: `Rs. ${money(shift.total_cash_sales)}` },
                                { key: 'card_sales', label: 'Card Sales', children: `Rs. ${money(shift.total_card_sales)}` },
                                { key: 'online_sales', label: 'Online Sales', children: `Rs. ${money(shift.total_online_sales)}` },
                                { key: 'refunds', label: 'Refunds', children: `Rs. ${money(shift.total_refunds)}` },
                                { key: 'cash_in_out', label: 'Cash In / Out', children: `Rs. ${money(cashInOut)}` },
                                {
                                    key: 'expected',
                                    label: 'Expected Cash',
                                    children: <Text strong>Rs. {money(shift.expected_cash)}</Text>,
                                },
                                { key: 'counted', label: 'Counted Cash', children: `Rs. ${money(shift.counted_cash)}` },
                                {
                                    key: 'difference',
                                    label: 'Difference',
                                    children: (
                                        <Text
                                            type={Math.abs(Number(shift.cash_difference || 0)) >= 0.01 ? 'danger' : undefined}
                                            strong
                                        >
                                            Rs. {money(shift.cash_difference)}
                                        </Text>
                                    ),
                                },
                                { key: 'total', label: 'Total Sales', children: <Text strong>Rs. {money(shift.total_sales)}</Text> },
                                { key: 'transactions', label: 'Transactions', children: transactionCount },
                                { key: 'status', label: 'Status', children: humanize(shift.status), span: 1 },
                                { key: 'notes', label: 'Notes', children: shift.notes || '-', span: 2 },
                                { key: 'closing_notes', label: 'Closing Notes', children: shift.closing_notes || '-', span: 2 },
                            ]}
                        />

                        {/* Sales breakdown */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '1px solid #d0d0d0', paddingBottom: 6, marginBottom: 10 }}>
                                Sales Breakdown
                            </div>
                            {(shift.pos_sales || []).length < 1 ? (
                                <Empty description="No sales in this shift" />
                            ) : (
                                <Table
                                    size="small"
                                    pagination={false}
                                    rowKey="id"
                                    dataSource={shift.pos_sales || []}
                                    columns={[
                                        { title: 'Sale No', dataIndex: 'sale_no', key: 'sale_no' },
                                        {
                                            title: 'Customer',
                                            dataIndex: 'customer_name',
                                            key: 'customer',
                                            render: (value) => value || 'Walk-in',
                                        },
                                        {
                                            title: 'Status',
                                            dataIndex: 'status',
                                            key: 'status',
                                            render: (value) => (
                                                    <Tag color={{ completed: 'green', refunded: 'red', part_refunded: 'orange', held: 'default' }[value] || 'default'}>
                                                    {humanize(value)}
                                                </Tag>
                                            ),
                                        },
                                        {
                                            title: 'Total',
                                            dataIndex: 'grand_total',
                                            key: 'grand_total',
                                            align: 'right',
                                            render: (value) => `Rs. ${money(value)}`,
                                        },
                                    ]}
                                    summary={(rows) => {
                                        const total = rows.reduce((sum, row) => sum + Number(row.grand_total || 0), 0);
                                        return (
                                            <Table.Summary.Row>
                                                <Table.Summary.Cell index={0} colSpan={3}>
                                                    <Text strong>Total</Text>
                                                </Table.Summary.Cell>
                                                <Table.Summary.Cell index={1} align="right">
                                                    <Text strong>Rs. {money(total)}</Text>
                                                </Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        );
                                    }}
                                />
                            )}
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '1px solid #d0d0d0', paddingBottom: 6, marginBottom: 10 }}>
                                Payment Summary
                            </div>
                            <Table
                                size="small"
                                pagination={false}
                                rowKey="method"
                                dataSource={Object.entries(paymentSummary).map(([method, amount]) => ({ method, amount }))}
                                columns={[
                                    { title: 'Method', dataIndex: 'method', key: 'method', render: humanize },
                                    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
                                ]}
                            />
                        </div>

                        {/* Cash movements */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '1px solid #d0d0d0', paddingBottom: 6, marginBottom: 10 }}>
                                Cash Movements
                            </div>
                            {(shift.pos_cash_movements || []).length < 1 ? (
                                <Empty description="No cash movements" />
                            ) : (
                                <Table
                                    size="small"
                                    pagination={false}
                                    rowKey="id"
                                    dataSource={shift.pos_cash_movements || []}
                                    columns={[
                                        { title: 'Type', dataIndex: 'type', key: 'type', render: humanize },
                                        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
                                        {
                                            title: 'System',
                                            dataIndex: 'is_system_generated',
                                            key: 'system',
                                            render: (value) => value ? 'System' : 'Manual',
                                        },
                                        {
                                            title: 'Amount',
                                            dataIndex: 'amount',
                                            key: 'amount',
                                            align: 'right',
                                            render: (value) => `Rs. ${money(value)}`,
                                        },
                                    ]}
                                />
                            )}
                        </div>

                        {/* Signature row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, gap: 32 }}>
                            {['Prepared By', 'Verified By', 'Authorized By'].map((label) => (
                                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 6, fontSize: 11, color: '#555' }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
                            <span>Generated on {dayjs().format('DD MMM YYYY, HH:mm')}</span>
                            <span>{companyName} — Shift Closing Report</span>
                        </div>
                    </div>
                </PrintablePdfEmailWrapper>
            </div>
        </PosLayout>
    );
}
