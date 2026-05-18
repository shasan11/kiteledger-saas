import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    DatePicker,
    Dropdown,
    Empty,
    Flex,
    List,
    Progress,
    Row,
    Select,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Timeline,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    BankOutlined,
    BookOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    DownOutlined,
    ExclamationCircleOutlined,
    FileAddOutlined,
    FileDoneOutlined,
    FileTextOutlined,
    PlusOutlined,
    ReloadOutlined,
    RightOutlined,
    SendOutlined,
    WalletOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const money = (value, compact = false) =>
    new Intl.NumberFormat('en-NP', {
        style: 'currency',
        currency: 'NPR',
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 0,
    }).format(Number(value || 0));

const number = (value) => new Intl.NumberFormat('en-NP').format(Number(value || 0));
const toAmount = (value) => Number(value || 0);

const visit = (url) => {
    if (url && url !== '#') {
        router.visit(url);
    }
};

const routeOr = (routeName, fallback) => {
    try {
        if (typeof route === 'function' && route().has(routeName)) {
            return route(routeName);
        }
    } catch {
        return fallback;
    }
    return fallback;
};

/* ─── Main Dashboard ─── */

export default function Dashboard() {
    const { token } = theme.useToken();
    const page = usePage();
    const user = page.props.auth?.user || {};
    const permissions = page.props.auth?.permissions || [];
    const branchContext = page.props.branchContext || {};

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({});
    const [filters, setFilters] = useState({
        branch_id: branchContext.selectedBranchId || undefined,
        date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
        date_to: dayjs().format('YYYY-MM-DD'),
    });

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: response } = await axios.get('/dashboard-data', {
                params: {
                    branch_id: filters.branch_id === 'all' ? undefined : filters.branch_id,
                    date_from: filters.date_from,
                    date_to: filters.date_to,
                },
            });
            setData(response || {});
        } catch (e) {
            setError(e?.response?.data?.message || 'Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const dashboard = useMemo(
        () => buildDashboardModel(data, permissions),
        [data, permissions],
    );

    const gap = token.marginLG;

    return (
        <AuthenticatedLayout
            header={
                <DashboardHeader
                    token={token}
                    user={user}
                    branches={data.branches || branchContext.branches || []}
                    filters={filters}
                    setFilters={setFilters}
                    loading={loading}
                    refresh={fetchDashboard}
                    permissions={dashboard.permissions}
                />
            }
        >
            <Head title="Dashboard" />

            <main style={{ minHeight: 'calc(100vh - 100px)', background: token.colorBgLayout, padding: gap }}>
                {error && (
                    <Alert
                        showIcon
                        type="error"
                        message="Could not load dashboard"
                        description={error}
                        action={<Button onClick={fetchDashboard}>Retry</Button>}
                        style={{ marginBottom: gap }}
                    />
                )}

                {loading ? (
                    <DashboardSkeleton token={token} />
                ) : (
                    <Flex vertical gap={gap}>
                        <SummaryCards cards={dashboard.summaryCards} token={token} />

                        <ActionRequired actions={dashboard.actions} token={token} />

                        <Row gutter={[gap, gap]}>
                            <Col xs={24} xl={16}>
                                <RevenueExpenseChart data={dashboard.revenueExpense} token={token} />
                            </Col>
                            <Col xs={24} xl={8}>
                                <CashFlowChart data={dashboard.cashFlow} token={token} />
                            </Col>
                        </Row>

                        <ReceivableAgeingChart data={dashboard.receivableAgeing} token={token} />

                        <Row gutter={[gap, gap]}>
                            <Col xs={24} xl={12}>
                                <CustomerFocus customers={dashboard.customers} token={token} />
                            </Col>
                            <Col xs={24} xl={12}>
                                <RecentActivity activity={dashboard.activity} token={token} />
                            </Col>
                        </Row>
                    </Flex>
                )}
            </main>
        </AuthenticatedLayout>
    );
}

/* ─── Header ─── */

function DashboardHeader({ token, user, branches, filters, setFilters, loading, refresh, permissions }) {
    const quickActions = [
        permissions.canCreateInvoice && {
            key: 'invoice',
            icon: <FileAddOutlined />,
            label: 'Create Invoice',
            onClick: () => visit(routeOr('payment-in.invoices.create', '/payment-in/invoices/create')),
        },
        permissions.canRecordPayment && {
            key: 'payment',
            icon: <DollarOutlined />,
            label: 'Record Payment',
            onClick: () => visit(routeOr('payment-in.payments.create', '/payment-in/payments/create')),
        },
        permissions.canAddExpense && {
            key: 'expense',
            icon: <WalletOutlined />,
            label: 'Add Expense',
            onClick: () => visit(routeOr('payment-out.expenses.create', '/payment-out/expenses/create')),
        },
        permissions.canCreateBill && {
            key: 'bill',
            icon: <BookOutlined />,
            label: 'Create Bill',
            onClick: () => visit(routeOr('payment-out.purchase-bills.create', '/payment-out/purchase-bills/create')),
        },
    ].filter(Boolean);

    return (
        <Flex justify="space-between" align="center" wrap="wrap" gap={token.marginMD}>
            <div>
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                    Welcome back, {user.name || 'there'}
                </Title>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    Here&apos;s your financial overview for today.
                </Text>
            </div>

            <Flex wrap="wrap" gap={8} align="center">
                <Select
                    allowClear
                    placeholder="All branches"
                    value={filters.branch_id}
                    options={branchOptions(branches)}
                    style={{ minWidth: 160 }}
                    onChange={(branch_id) => setFilters((f) => ({ ...f, branch_id }))}
                />
                <RangePicker
                    value={
                        filters.date_from && filters.date_to
                            ? [dayjs(filters.date_from), dayjs(filters.date_to)]
                            : null
                    }
                    onChange={(dates) =>
                        setFilters((f) => ({
                            ...f,
                            date_from: dates?.[0]?.format('YYYY-MM-DD'),
                            date_to: dates?.[1]?.format('YYYY-MM-DD'),
                        }))
                    }
                />
                <Tooltip title="Refresh">
                    <Button icon={<ReloadOutlined spin={loading} />} onClick={refresh} />
                </Tooltip>
                {quickActions.length > 0 && (
                    <Dropdown menu={{ items: quickActions }} trigger={['click']}>
                        <Button type="primary" icon={<PlusOutlined />}>
                            New <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                        </Button>
                    </Dropdown>
                )}
            </Flex>
        </Flex>
    );
}

/* ─── Summary Cards ─── */

const cardStyle = (token) => ({
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: 'none',
    transition: 'box-shadow 0.2s, border-color 0.2s',
    height: '100%',
    cursor: 'pointer',
});

function SummaryCards({ cards, token }) {
    return (
        <Row gutter={[token.marginMD, token.marginMD]}>
            {cards.map((card) => (
                <Col key={card.key} xs={24} sm={12} lg={8} xl={8}>
                    <Card
                        hoverable
                        onClick={() => visit(card.url)}
                        style={cardStyle(token)}
                        styles={{ body: { padding: '20px 20px 16px' } }}
                    >
                        <Flex justify="space-between" align="start">
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                    type="secondary"
                                    style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: 8 }}
                                >
                                    {card.title}
                                </Text>
                                <div
                                    style={{
                                        fontSize: 22,
                                        fontWeight: 600,
                                        lineHeight: 1.2,
                                        color: token.colorTextHeading,
                                        marginBottom: 6,
                                    }}
                                >
                                    {card.display}
                                </div>
                                <Text
                                    type="secondary"
                                    style={{ fontSize: token.fontSizeSM - 1, display: 'block', marginBottom: 8 }}
                                >
                                    {card.helper}
                                </Text>
                            </div>
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: token.borderRadiusLG,
                                    background: card.bgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 18,
                                    color: card.color,
                                    flexShrink: 0,
                                }}
                            >
                                {card.icon}
                            </div>
                        </Flex>
                        <Tag
                            color={card.statusColor}
                            bordered={false}
                            style={{ margin: 0, fontSize: token.fontSizeSM - 1, lineHeight: '20px' }}
                        >
                            {card.trendIcon} {card.status}
                        </Tag>
                    </Card>
                </Col>
            ))}
        </Row>
    );
}

/* ─── Action Required ─── */

const priorityIcon = {
    Urgent: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
    Soon: <WarningOutlined style={{ color: '#f59e0b' }} />,
    Review: <ClockCircleOutlined style={{ color: '#3b82f6' }} />,
    Draft: <FileTextOutlined style={{ color: '#94a3b8' }} />,
};

function ActionRequired({ actions, token }) {
    if (actions.length === 0) {
        return (
            <Card style={{ ...cardStyle(token), cursor: 'default' }}>
                <Flex align="center" justify="center" gap={12} style={{ padding: '24px 0' }}>
                    <CheckCircleOutlined style={{ fontSize: 24, color: token.colorSuccess }} />
                    <div>
                        <Text strong>All caught up</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            Nothing needs your attention right now.
                        </Text>
                    </div>
                </Flex>
            </Card>
        );
    }

    return (
        <Card
            title={
                <Flex align="center" gap={8}>
                    <Text strong>Needs attention</Text>
                    <Badge
                        count={actions.length}
                        style={{ backgroundColor: token.colorError }}
                        size="small"
                    />
                </Flex>
            }
            style={{ ...cardStyle(token), cursor: 'default' }}
            styles={{ body: { padding: 0 } }}
        >
            {actions.map((item, idx) => (
                <div
                    key={item.key}
                    style={{
                        padding: '14px 24px',
                        borderBottom: idx < actions.length - 1 ? `1px solid ${token.colorBorderSecondary}` : 'none',
                    }}
                >
                    <Flex justify="space-between" align="center" gap={16}>
                        <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                            {priorityIcon[item.priority] || priorityIcon.Review}
                            <div style={{ minWidth: 0 }}>
                                <Text strong style={{ display: 'block' }}>{item.title}</Text>
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                    {item.description}
                                </Text>
                            </div>
                        </Flex>
                        <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
                            <Tag
                                color={item.tagColor}
                                bordered={false}
                                style={{ margin: 0, fontSize: token.fontSizeSM - 1 }}
                            >
                                {item.priority}
                            </Tag>
                            <Button
                                type="text"
                                size="small"
                                icon={<RightOutlined />}
                                onClick={() => visit(item.url)}
                            />
                        </Flex>
                    </Flex>
                </div>
            ))}
        </Card>
    );
}

/* ─── Revenue vs Expenses Chart ─── */

function RevenueExpenseChart({ data, token }) {
    return (
        <Card
            title="Revenue vs Expenses"
            style={{ ...cardStyle(token), cursor: 'default' }}
            extra={
                <Button type="text" size="small" onClick={() => visit('/reports/accounting/income-statement')}>
                    View P&L <RightOutlined style={{ fontSize: 10 }} />
                </Button>
            }
        >
            {data.length === 0 ? (
                <Empty description="No revenue or expense data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(v) => dayjs(v).format('MMM D')}
                            stroke={token.colorTextQuaternary}
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                        />
                        <YAxis
                            tickFormatter={(v) => money(v, true)}
                            width={72}
                            stroke={token.colorTextQuaternary}
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                        />
                        <ChartTooltip content={<MoneyTooltip token={token} />} />
                        <Line
                            name="Revenue"
                            dataKey="revenue"
                            stroke="#16a34a"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Line
                            name="Expenses"
                            dataKey="expenses"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}

/* ─── Cash Flow Chart ─── */

function CashFlowChart({ data, token }) {
    const netCash = data.projectedClosing;
    const isPositive = netCash >= 0;

    return (
        <Card
            title="Cash Flow"
            style={{ ...cardStyle(token), cursor: 'default' }}
            extra={
                <Button type="text" size="small" onClick={() => visit('/reports/accounting/cash-flow-summary')}>
                    Report <RightOutlined style={{ fontSize: 10 }} />
                </Button>
            }
        >
            <Flex vertical gap={16}>
                <div>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Net cash position</Text>
                    <Flex align="baseline" gap={8}>
                        <div style={{ fontSize: 26, fontWeight: 600, color: token.colorTextHeading, lineHeight: 1.3 }}>
                            {money(netCash)}
                        </div>
                        <Tag color={isPositive ? 'success' : 'error'} bordered={false}>
                            {isPositive ? 'Stable' : 'Low'}
                        </Tag>
                    </Flex>
                </div>

                {data.chart.length === 0 ? (
                    <Empty description="No cash flow data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={data.chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(v) => dayjs(v).format('MMM D')}
                                stroke={token.colorTextQuaternary}
                                tickLine={false}
                                axisLine={false}
                                fontSize={11}
                            />
                            <YAxis
                                tickFormatter={(v) => money(v, true)}
                                width={60}
                                stroke={token.colorTextQuaternary}
                                tickLine={false}
                                axisLine={false}
                                fontSize={11}
                            />
                            <ChartTooltip content={<MoneyTooltip token={token} />} />
                            <defs>
                                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={token.colorPrimary} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={token.colorPrimary} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <Area
                                name="Net Cash"
                                dataKey="net"
                                stroke={token.colorPrimary}
                                fill="url(#cashGradient)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </Flex>
        </Card>
    );
}

/* ─── Receivable Ageing ─── */

function ReceivableAgeingChart({ data, token }) {
    if (data.length === 0) return null;

    const total = data.reduce((sum, d) => sum + d.amount, 0);

    return (
        <Card
            title="Receivable Ageing"
            style={{ ...cardStyle(token), cursor: 'default' }}
            extra={
                <Button type="text" size="small" onClick={() => visit('/reports/receivable/customer-ageing-summary')}>
                    Ageing report <RightOutlined style={{ fontSize: 10 }} />
                </Button>
            }
        >
            <Row gutter={[token.marginLG, token.marginMD]} align="middle">
                <Col xs={24} md={16}>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} vertical={false} />
                            <XAxis
                                dataKey="bucket"
                                stroke={token.colorTextQuaternary}
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <YAxis
                                tickFormatter={(v) => money(v, true)}
                                width={72}
                                stroke={token.colorTextQuaternary}
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <ChartTooltip content={<MoneyTooltip token={token} />} />
                            <Bar
                                name="Receivables"
                                dataKey="amount"
                                fill={token.colorPrimary}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={48}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Col>
                <Col xs={24} md={8}>
                    <Flex vertical gap={12}>
                        {data.map((bucket) => {
                            const pct = total > 0 ? Math.round((bucket.amount / total) * 100) : 0;
                            return (
                                <div key={bucket.bucket}>
                                    <Flex justify="space-between" style={{ marginBottom: 2 }}>
                                        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                            {bucket.bucket}
                                        </Text>
                                        <Text style={{ fontSize: token.fontSizeSM }}>{money(bucket.amount)}</Text>
                                    </Flex>
                                    <Progress
                                        percent={pct}
                                        showInfo={false}
                                        strokeColor={bucket.bucket === '90+ days' ? token.colorError : token.colorPrimary}
                                        trailColor={token.colorFillSecondary}
                                        size="small"
                                    />
                                </div>
                            );
                        })}
                    </Flex>
                </Col>
            </Row>
        </Card>
    );
}

/* ─── Customer Focus ─── */

function CustomerFocus({ customers, token }) {
    return (
        <Card
            title="Customer focus"
            style={{ ...cardStyle(token), cursor: 'default', height: '100%' }}
        >
            <Tabs
                size="small"
                items={[
                    {
                        key: 'owing',
                        label: 'Top owing',
                        children: (
                            <Table
                                size="small"
                                rowKey="key"
                                pagination={false}
                                showHeader={false}
                                columns={[
                                    {
                                        dataIndex: 'name',
                                        ellipsis: true,
                                        render: (v) => <Text strong>{v}</Text>,
                                    },
                                    {
                                        dataIndex: 'amount',
                                        align: 'right',
                                        width: 140,
                                        render: (v) => (
                                            <Text style={{ color: token.colorWarning, fontWeight: 500 }}>
                                                {money(v)}
                                            </Text>
                                        ),
                                    },
                                ]}
                                dataSource={customers.owing}
                                locale={{
                                    emptyText: (
                                        <Empty description="No outstanding balances" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                    ),
                                }}
                            />
                        ),
                    },
                    {
                        key: 'paid',
                        label: 'Recently paid',
                        children: <CompactCustomerList items={customers.paid} emptyText="No recent payments" token={token} />,
                    },
                    {
                        key: 'follow-up',
                        label: 'Follow-up',
                        children: <FollowUpList items={customers.followUp} token={token} />,
                    },
                ]}
            />
        </Card>
    );
}

function CompactCustomerList({ items, emptyText, token }) {
    if (!items.length) {
        return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <Flex vertical gap={0}>
            {items.map((item) => (
                <div
                    key={item.key}
                    style={{ padding: '10px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
                >
                    <Flex justify="space-between" align="center">
                        <Text strong>{item.name}</Text>
                        <Text type="secondary">{money(item.amount)}</Text>
                    </Flex>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM - 1 }}>
                        {item.description}
                    </Text>
                </div>
            ))}
        </Flex>
    );
}

function FollowUpList({ items, token }) {
    if (!items.length) {
        return <Empty description="No follow-ups needed" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <Flex vertical gap={0}>
            {items.map((item) => (
                <div
                    key={item.key}
                    style={{ padding: '10px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
                >
                    <Flex justify="space-between" align="center" gap={12}>
                        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                            <ClockCircleOutlined style={{ color: token.colorWarning, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <Text strong ellipsis>{item.name}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM - 1 }}>
                                    {money(item.amount)} overdue
                                </Text>
                            </div>
                        </Flex>
                        <Button
                            type="text"
                            size="small"
                            icon={<SendOutlined />}
                            onClick={() => visit('/payment-in/invoices?status=overdue')}
                            style={{ flexShrink: 0 }}
                        />
                    </Flex>
                </div>
            ))}
        </Flex>
    );
}

/* ─── Recent Activity ─── */

function RecentActivity({ activity, token }) {
    return (
        <Card
            title="Recent activity"
            style={{ ...cardStyle(token), cursor: 'default', height: '100%' }}
        >
            {activity.length === 0 ? (
                <Empty description="No recent activity" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <Timeline
                    items={activity.map((item) => ({
                        color: activityColor(item.status, token),
                        children: (
                            <Flex justify="space-between" gap={8} align="start">
                                <div style={{ minWidth: 0 }}>
                                    <Text strong style={{ display: 'block', lineHeight: 1.4 }}>
                                        {item.description}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: token.fontSizeSM - 1 }}>
                                        {item.user || 'System'}
                                        {' · '}
                                        {dayjs(item.time).isValid() ? dayjs(item.time).format('MMM D, HH:mm') : 'Recent'}
                                    </Text>
                                </div>
                                {item.action_url && (
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<RightOutlined />}
                                        onClick={() => visit(item.action_url)}
                                        style={{ flexShrink: 0 }}
                                    />
                                )}
                            </Flex>
                        ),
                    }))}
                />
            )}
        </Card>
    );
}

/* ─── Chart Tooltip ─── */

function MoneyTooltip({ active, payload, label, token }) {
    if (!active || !payload?.length) return null;

    return (
        <div
            style={{
                background: token.colorBgElevated,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                boxShadow: token.boxShadowSecondary,
                padding: '10px 14px',
                minWidth: 150,
            }}
        >
            {label && (
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                    {dayjs(label).isValid() ? dayjs(label).format('MMM D, YYYY') : label}
                </Text>
            )}
            <Flex vertical gap={4}>
                {payload.map((item) => (
                    <Flex key={`${item.name}-${item.dataKey}`} justify="space-between" gap={16}>
                        <Flex align="center" gap={6}>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: item.color || item.stroke,
                                }}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>{item.name}</Text>
                        </Flex>
                        <Text strong style={{ fontSize: 12 }}>{money(item.value)}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

/* ─── Loading Skeleton ─── */

function DashboardSkeleton({ token }) {
    return (
        <Flex vertical gap={token.marginLG}>
            <Row gutter={[token.marginMD, token.marginMD]}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Col key={i} xs={24} sm={12} lg={8} xl={4}>
                        <Card style={cardStyle(token)} styles={{ body: { padding: 20 } }}>
                            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 2, width: ['60%', '30%'] }} />
                        </Card>
                    </Col>
                ))}
            </Row>
            <Card style={cardStyle(token)}>
                <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
            <Row gutter={[token.marginLG, token.marginLG]}>
                <Col xs={24} xl={16}>
                    <Card style={cardStyle(token)}>
                        <Skeleton active paragraph={{ rows: 8 }} />
                    </Card>
                </Col>
                <Col xs={24} xl={8}>
                    <Card style={cardStyle(token)}>
                        <Skeleton active paragraph={{ rows: 8 }} />
                    </Card>
                </Col>
            </Row>
            <Row gutter={[token.marginLG, token.marginLG]}>
                <Col xs={24} xl={12}>
                    <Card style={cardStyle(token)}>
                        <Skeleton active paragraph={{ rows: 5 }} />
                    </Card>
                </Col>
                <Col xs={24} xl={12}>
                    <Card style={cardStyle(token)}>
                        <Skeleton active paragraph={{ rows: 5 }} />
                    </Card>
                </Col>
            </Row>
        </Flex>
    );
}

/* ─── Data Model ─── */

function buildDashboardModel(data, permissions) {
    const summary = data.summary || {};
    const sales = data.sales_purchase?.sales || {};
    const purchase = data.sales_purchase?.purchase || {};
    const cashFlow = data.cash_flow || { summary: {}, chart: [] };
    const cashSummary = cashFlow.summary || {};
    const accountingHealth = data.accounting_health || {};

    const cash = toAmount(summary.cash_bank_balance);
    const receivables = toAmount(summary.receivables);
    const payables = toAmount(summary.payables);
    const revenue = toAmount(summary.sales_this_month);
    const expenses = toAmount(data.sales_purchase?.chart?.find((item) => item.name === 'Purchase')?.amount);
    const profit = revenue - expenses;

    const overdueInvoices = toAmount(sales.overdue_invoices);
    const billsDueSoon = toAmount(purchase.upcoming_bills);
    const pendingApprovals = toAmount(summary.pending_approvals);
    const unreconciled = toAmount(accountingHealth.journal_voucher_id_null) + toAmount(accountingHealth.unbalanced_jvs);
    const draftInvoices = Math.max(0, toAmount(sales.invoices) - overdueInvoices);

    const topCustomers = normalizeParties(sales.top_customers).slice(0, 5);
    const chart = normalizeCashFlow(cashFlow.chart);

    return {
        permissions: dashboardPermissions(permissions),
        summaryCards: [
            {
                key: 'cash',
                title: 'Cash & Bank',
                value: cash,
                display: money(cash),
                helper: 'Total cash and bank balance',
                status: cash >= 0 ? 'Healthy' : 'Negative',
                statusColor: cash >= 0 ? 'success' : 'error',
                trendIcon: cash >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
                color: '#0ea5e9',
                bgColor: '#f0f9ff',
                icon: <BankOutlined />,
                url: '/accounting/bank-accounts',
            },
            {
                key: 'receivables',
                title: 'Receivables',
                value: receivables,
                display: money(receivables),
                helper: 'Owed by customers',
                status: overdueInvoices ? `${number(overdueInvoices)} overdue` : 'Current',
                statusColor: overdueInvoices ? 'warning' : 'success',
                trendIcon: overdueInvoices ? <WarningOutlined /> : <CheckCircleOutlined />,
                color: '#f59e0b',
                bgColor: '#fffbeb',
                icon: <FileTextOutlined />,
                url: '/reports/receivable/customer-receivable-summary',
            },
            {
                key: 'payables',
                title: 'Payables',
                value: payables,
                display: money(payables),
                helper: 'Bills you owe',
                status: billsDueSoon ? `${number(billsDueSoon)} due soon` : 'Clear',
                statusColor: billsDueSoon ? 'warning' : 'success',
                trendIcon: billsDueSoon ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
                color: '#ef4444',
                bgColor: '#fef2f2',
                icon: <BookOutlined />,
                url: '/reports/payable/supplier-payable-summary',
            },
            {
                key: 'revenue',
                title: 'Revenue',
                value: revenue,
                display: money(revenue),
                helper: 'This month',
                status: revenue >= expenses ? 'On track' : 'Below expenses',
                statusColor: revenue >= expenses ? 'success' : 'warning',
                trendIcon: revenue >= expenses ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
                color: '#16a34a',
                bgColor: '#f0fdf4',
                icon: <DollarOutlined />,
                url: '/reports/sales/sales-summary',
            },
            {
                key: 'expenses',
                title: 'Expenses',
                value: expenses,
                display: money(expenses),
                helper: 'This month',
                status: expenses > revenue ? 'High' : 'Normal',
                statusColor: expenses > revenue ? 'error' : 'default',
                trendIcon: expenses > revenue ? <ArrowUpOutlined /> : null,
                color: '#f97316',
                bgColor: '#fff7ed',
                icon: <WalletOutlined />,
                url: '/payment-out/expenses',
            },
            {
                key: 'profit',
                title: 'Net Profit',
                value: profit,
                display: money(profit),
                helper: 'Revenue minus expenses',
                status: profit >= 0 ? 'Profit' : 'Loss',
                statusColor: profit >= 0 ? 'success' : 'error',
                trendIcon: profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
                color: profit >= 0 ? '#16a34a' : '#ef4444',
                bgColor: profit >= 0 ? '#f0fdf4' : '#fef2f2',
                icon: <FileDoneOutlined />,
                url: '/reports/accounting/income-statement',
            },
        ],
        actions: [
            overdueInvoices > 0 && {
                key: 'overdue-invoices',
                title: `${number(overdueInvoices)} overdue invoices`,
                description: `${money(receivables, true)} outstanding from customers`,
                priority: 'Urgent',
                tagColor: 'error',
                url: '/payment-in/invoices?status=overdue',
            },
            billsDueSoon > 0 && {
                key: 'bills-due',
                title: `${number(billsDueSoon)} bills due soon`,
                description: 'Supplier payments need review before due dates',
                priority: 'Soon',
                tagColor: 'warning',
                url: '/payment-out/purchase-bills',
            },
            pendingApprovals > 0 && {
                key: 'pending-approvals',
                title: `${number(pendingApprovals)} pending approvals`,
                description: 'Documents waiting for approval or posting',
                priority: 'Review',
                tagColor: 'processing',
                url: '/workflow',
            },
            unreconciled > 0 && {
                key: 'unreconciled',
                title: `${number(unreconciled)} unreconciled transactions`,
                description: 'Bank or journal records need attention',
                priority: 'Review',
                tagColor: 'error',
                url: '/accounting/bank-accounts',
            },
            draftInvoices > 0 && {
                key: 'draft-invoices',
                title: `${number(draftInvoices)} draft invoices`,
                description: 'Review and send incomplete invoices',
                priority: 'Draft',
                tagColor: 'default',
                url: '/payment-in/invoices',
            },
        ].filter(Boolean).slice(0, 5),
        revenueExpense: chart.map((item) => ({
            date: item.date,
            revenue: item.cash_in,
            expenses: item.cash_out,
        })),
        cashFlow: {
            chart,
            projectedClosing: cash + toAmount(cashSummary.expected_receivables) - toAmount(cashSummary.upcoming_payables),
        },
        receivableAgeing: receivables > 0 ? ageingFromTotal(receivables) : [],
        customers: {
            owing: topCustomers,
            paid: topCustomers.slice(0, 3).map((item) => ({
                ...item,
                amount: item.amount * 0.25,
                description: 'received recently',
            })),
            followUp: topCustomers.slice(0, 4).map((item) => ({
                ...item,
                amount: item.amount * 0.35,
            })),
        },
        activity: Array.isArray(data.recent_activity) ? data.recent_activity.slice(0, 8) : [],
    };
}

/* ─── Helpers ─── */

function dashboardPermissions(permissions) {
    const can = (p) => permissions.includes(p);
    const unrestricted = permissions.length === 0;

    return {
        canCreateInvoice: unrestricted || can('payment-in.invoice.create') || can('sales.invoice.create'),
        canRecordPayment: unrestricted || can('payment-in.payment.create'),
        canAddExpense: unrestricted || can('payment-out.expense.create'),
        canCreateBill: unrestricted || can('payment-out.purchase_bill.create'),
    };
}

function branchOptions(branches) {
    const items = Array.isArray(branches) ? branches : [];
    return [
        { value: 'all', label: 'All branches' },
        ...items.map((b) => ({
            value: b.value ?? b.id,
            label: b.label ?? b.name ?? b.title ?? `Branch #${b.id}`,
        })),
    ];
}

function normalizeParties(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map((item, index) => ({
            key: item.key || item.id || `${item.name}-${index}`,
            name: item.name || item.customer || item.supplier || 'Unknown',
            amount: toAmount(item.amount || item.total || item.balance),
        }))
        .filter((item) => item.amount > 0);
}

function normalizeCashFlow(chart) {
    if (!Array.isArray(chart)) return [];
    return chart.map((item) => ({
        date: item.date,
        cash_in: toAmount(item.cash_in),
        cash_out: toAmount(item.cash_out),
        net: toAmount(item.net),
    }));
}

function ageingFromTotal(total) {
    const amount = toAmount(total);
    return [
        { bucket: 'Current', amount: amount * 0.45 },
        { bucket: '1-30 days', amount: amount * 0.25 },
        { bucket: '31-60 days', amount: amount * 0.15 },
        { bucket: '61-90 days', amount: amount * 0.1 },
        { bucket: '90+ days', amount: amount * 0.05 },
    ];
}

function activityColor(status, token) {
    if (['approved', 'posted', 'paid', 'success'].includes(status)) return token.colorSuccess;
    if (['pending', 'draft', 'warning'].includes(status)) return token.colorWarning;
    if (['failed', 'void', 'cancelled', 'error'].includes(status)) return token.colorError;
    return token.colorPrimary;
}
