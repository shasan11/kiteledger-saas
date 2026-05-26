import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { App, Button, Card, Descriptions, Empty, Result, Space, Spin, Table, Tag, theme, Typography } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, money, showApiError } from './Shared/posHelpers';

const { Text, Title } = Typography;

export default function ShiftClosingSummary({ id }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
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
        return (shift?.pos_sales || []).filter((sale) => ['completed', 'part_refunded', 'refunded'].includes(sale.status)).length;
    }, [shift]);

    const cashInOut = useMemo(() => {
        const movements = shift?.pos_cash_movements || [];
        const cashIn = movements
            .filter((movement) => movement.type === 'cash_in' && !movement.is_system_generated)
            .reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
        const cashOut = movements
            .filter((movement) => ['cash_out', 'drop', 'expense'].includes(movement.type) && !movement.is_system_generated)
            .reduce((sum, movement) => sum + Number(movement.amount || 0), 0);

        return cashIn - cashOut;
    }, [shift]);

    const headerNode = (
        <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
                Shift Closing Summary
            </Title>
            <Text type="secondary">Cashier reconciliation report for the closed POS shift.</Text>
        </Space>
    );

    if (loading) {
        return (
            <AuthenticatedLayout header={headerNode}>
                <Head title="Shift Closing Summary" />
                <div style={{ minHeight: 420, display: 'grid', placeItems: 'center' }}>
                    <Spin />
                </div>
            </AuthenticatedLayout>
        );
    }

    if (!shift) {
        return (
            <AuthenticatedLayout header={headerNode}>
                <Head title="Shift Closing Summary" />
                <Result status="404" title="Shift not found" extra={<Link href={route('pos.index')}>Back to terminals</Link>} />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title="Shift Closing Summary" />

            <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        .pos-shift-print, .pos-shift-print * { visibility: visible; }
                        .pos-shift-print { position: absolute; inset: 0; padding: 12mm; background: #fff; color: #111; }
                        .pos-shift-print .ant-card { box-shadow: none !important; border: 0 !important; }
                        .pos-shift-print .ant-card-head { border-bottom: 2px solid #111 !important; }
                        .pos-shift-print .ant-btn { display: none !important; }
                        .pos-shift-print table { page-break-inside: avoid; }
                    }
                `}</style>
                <Card
                    className="pos-shift-print"
                    bordered={false}
                    style={{
                        maxWidth: 980,
                        borderRadius: token.borderRadius,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        background: token.colorBgContainer,
                    }}
                    title={
                        <Space wrap>
                            <Text strong>{shift.shift_no || 'Closed Shift'}</Text>
                            <Tag color={shift.status === 'closed' ? 'default' : 'green'}>{shift.status}</Tag>
                        </Space>
                    }
                    extra={
                        <Space wrap>
                            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                                Print Shift Report
                            </Button>
                            <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('pos.index'))}>
                                Back to Terminals
                            </Button>
                        </Space>
                    }
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 16 }}>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{company?.company_name || company?.name || 'Company'}</Title>
                            <Text>{[company?.address, company?.phone, company?.email].filter(Boolean).join(' | ')}</Text>
                            <br />
                            <Text>{company?.pan_vat || company?.pan || company?.vat ? `PAN/VAT: ${company?.pan_vat || company?.pan || company?.vat}` : ''}</Text>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <Text strong>Shift Closing Summary</Text>
                            <br />
                            <Text>{shift.shift_no}</Text>
                        </div>
                    </div>
                    {shift ? (
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <Descriptions
                                bordered
                                size="middle"
                                column={{ xs: 1, sm: 1, md: 2 }}
                                items={[
                                { key: 'terminal', label: 'Terminal', children: shift.pos_terminal?.name || '-' },
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
                                { key: 'expected', label: 'Expected Cash', children: <Text strong>Rs. {money(shift.expected_cash)}</Text> },
                                { key: 'counted', label: 'Counted Cash', children: `Rs. ${money(shift.counted_cash)}` },
                                {
                                    key: 'difference',
                                    label: 'Difference',
                                    children: (
                                        <Text type={Math.abs(Number(shift.cash_difference || 0)) >= 0.01 ? 'danger' : undefined} strong>
                                            Rs. {money(shift.cash_difference)}
                                        </Text>
                                    ),
                                },
                                { key: 'total', label: 'Total Sales', children: `Rs. ${money(shift.total_sales)}` },
                                { key: 'transactions', label: 'Number of Transactions', children: transactionCount },
                                { key: 'notes', label: 'Notes', children: shift.notes || '-' },
                            ]}
                            />
                            <Table
                                size="small"
                                title={() => 'Sales Breakdown'}
                                pagination={false}
                                rowKey={(row) => row.id}
                                dataSource={shift.pos_sales || []}
                                columns={[
                                    { title: 'Sale No', dataIndex: 'sale_no' },
                                    { title: 'Customer', dataIndex: 'customer_name' },
                                    { title: 'Status', dataIndex: 'status' },
                                    { title: 'Total', dataIndex: 'grand_total', align: 'right', render: (value) => `Rs. ${money(value)}` },
                                ]}
                            />
                            <Table
                                size="small"
                                title={() => 'Cash Movements'}
                                pagination={false}
                                rowKey={(row) => row.id}
                                dataSource={shift.pos_cash_movements || []}
                                columns={[
                                    { title: 'Type', dataIndex: 'type' },
                                    { title: 'Reason', dataIndex: 'reason' },
                                    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
                                ]}
                            />
                        </Space>
                    ) : (
                        <Empty />
                    )}
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
