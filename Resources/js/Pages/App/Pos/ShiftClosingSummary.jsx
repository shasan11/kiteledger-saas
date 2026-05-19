import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { App, Button, Card, Descriptions, Empty, Result, Space, Spin, Tag, theme, Typography } from 'antd';
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void loadShift();
    }, [id]);

    async function loadShift() {
        setLoading(true);

        try {
            const response = await axios.get(api(`/api/pos-shifts/${id}`));
            setShift(response.data || null);
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
                <Card
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
                    {shift ? (
                        <Descriptions
                            bordered
                            size="middle"
                            column={{ xs: 1, sm: 1, md: 2 }}
                            items={[
                                { key: 'terminal', label: 'Terminal', children: shift.pos_terminal?.name || '-' },
                                { key: 'cashier', label: 'Cashier', children: shift.cashier?.display_name || shift.cashier?.name || '-' },
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
                            ]}
                        />
                    ) : (
                        <Empty />
                    )}
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
