import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Col,
    DatePicker,
    Drawer,
    Dropdown,
    Empty,
    Row,
    Select,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import {
    AuditOutlined,
    BankOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    FileDoneOutlined,
    FileTextOutlined,
    InboxOutlined,
    PlusOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const money = (value) =>
    new Intl.NumberFormat('en-NP', {
        style: 'currency',
        currency: 'NPR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const number = (value) => new Intl.NumberFormat('en-NP').format(Number(value || 0));

const toNumber = (value) => Number(value || 0);

const statusColor = {
    approved: 'green',
    posted: 'green',
    draft: 'blue',
    pending: 'gold',
    cancelled: 'red',
    void: 'red',
    missing_jv: 'red',
    missing_number: 'orange',
    low_stock: 'orange',
    no_stock: 'red',
    negative: 'red',
    critical: 'red',
    warning: 'gold',
    info: 'blue',
    success: 'green',
};

const alertType = {
    critical: 'error',
    warning: 'warning',
    info: 'info',
    success: 'success',
};

const cardStyle = (token) => ({
    borderRadius: 4,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: 'none',
});

const routeUrl = (name, fallback) => {
    try {
        if (typeof route === 'function' && route().has(name)) {
            return route(name);
        }
    } catch {
        return fallback;
    }

    return fallback;
};

const visit = (url) => {
    if (url && url !== '#') router.visit(url);
};

const pieColors = (token) => [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorError,
    token.colorInfo,
    token.colorTextSecondary,
];

export default function Dashboard() {
    const { token } = theme.useToken();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({});
    const [cashDrawerOpen, setCashDrawerOpen] = useState(false);

    const [filters, setFilters] = useState({
        branch_id: undefined,
        date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
        date_to: dayjs().format('YYYY-MM-DD'),
    });

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data } = await axios.get('/dashboard-data', { params: filters });
            setDashboardData(data || {});
        } catch (exception) {
            setError(exception?.response?.data?.message || 'Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const quickActions = useMemo(
        () => [
            ['New Invoice', 'payment-in.invoices.create', '/payment-in/invoices/create', <FileTextOutlined />],
            ['New Purchase Bill', 'payment-out.purchase-bills.create', '/payment-out/purchase-bills/create', <FileDoneOutlined />],
            ['New Expense', 'payment-out.expenses.create', '/payment-out/expenses/create', <DollarOutlined />],
            ['New Customer Payment', 'payment-in.payments.create', '/payment-in/payments/create', <BankOutlined />],
            ['New Supplier Payment', 'payment-out.payments.create', '/payment-out/payments/create', <BankOutlined />],
            ['New Cash Transfer', 'accounting.cash-transfers.create', '/accounting/cash-transfers/create', <AuditOutlined />],
            ['New Journal Voucher', 'accounting.journal-vouchers.create', '/accounting/journal-vouchers/create', <SafetyCertificateOutlined />],
            ['New Contact', 'crm.contacts.create', '/crm/contacts/create', <TeamOutlined />],
            ['New Lead', 'crm.leads.create', '/crm/leads/create', <ClockCircleOutlined />],
            ['New Product', 'inventory.products.create', '/inventory/products/create', <InboxOutlined />],
        ].map(([label, routeName, fallback, icon]) => ({
            key: label,
            icon,
            label,
            onClick: () => visit(routeUrl(routeName, fallback)),
        })),
        [],
    );

    const summary = dashboardData.summary || {};
    const cashFlow = dashboardData.cash_flow || { summary: {}, chart: [] };
    const inventory = dashboardData.inventory || { summary: {}, warnings: [] };
    const crm = dashboardData.crm || { summary: {}, pipeline: [], followups: [] };

    const cashBankBalances = useMemo(() => {
        if (Array.isArray(dashboardData.cash_bank_balances) && dashboardData.cash_bank_balances.length) {
            return dashboardData.cash_bank_balances;
        }

        return [
            ...(Array.isArray(dashboardData.cash_accounts) ? dashboardData.cash_accounts : []),
            ...(Array.isArray(dashboardData.bank_accounts) ? dashboardData.bank_accounts : []),
        ];
    }, [dashboardData]);

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div style={{ minHeight: '100vh', padding: 18, background: token.colorBgLayout }}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <HeaderArea
                        token={token}
                        filters={filters}
                        setFilters={setFilters}
                        branches={dashboardData.branches || []}
                        refresh={fetchDashboard}
                        quickActions={quickActions}
                        loading={loading}
                    />

                    {error && <Alert type="error" showIcon message={error} />}

                    {!loading && <TopAlerts alerts={dashboardData.alerts || []} />}

                    {loading ? (
                        <Skeleton active paragraph={{ rows: 14 }} />
                    ) : (
                        <>
                            <KpiSummary
                                summary={summary}
                                token={token}
                                onCashBalanceClick={() => setCashDrawerOpen(true)}
                            />


                            <Row gutter={[16, 16]}>
                                <Col xs={24} xl={14}>
                                    <CashFlowChart cashFlow={cashFlow} token={token} />
                                </Col>

                                <Col xs={24} xl={10}>
                                    <SalesPurchaseChart data={dashboardData.sales_purchase || {}} token={token} />
                                </Col>
                            </Row>

                            <Row gutter={[16, 16]}>
                                <Col xs={24} xl={12}>
                                    <InventoryPieChartCard inventory={inventory} token={token} />
                                </Col>

                                <Col xs={24} xl={12}>
                                    <CrmPieChartCard crm={crm} token={token} />
                                </Col>
                            </Row>
                            <ApprovalQueue approvals={dashboardData.approvals || []} token={token} />

                            <RecentActivityTable activity={dashboardData.recent_activity || []} token={token} />
                        </>
                    )}
                </Space>
            </div>

            <CashBankBalanceDrawer
                open={cashDrawerOpen}
                onClose={() => setCashDrawerOpen(false)}
                token={token}
                cashFlow={cashFlow}
                balances={cashBankBalances}
            />
        </AuthenticatedLayout>
    );
}

function HeaderArea({ token, filters, setFilters, branches, refresh, quickActions, loading }) {
    return (
        <Card style={cardStyle(token)} styles={{ body: { padding: 14 } }}>
            <Row gutter={[12, 12]} align="middle" justify="space-between">
                <Col xs={24} lg={10}>
                    <Title level={3} style={{ margin: 0, fontSize: 22 }}>
                        Dashboard
                    </Title>
                    <Text type="secondary">Business overview and approval command center</Text>
                </Col>

                <Col xs={24} lg={14}>
                    <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Select
                            allowClear
                            placeholder="All branches"
                            style={{ width: 180 }}
                            options={branches}
                            value={filters.branch_id}
                            onChange={(branch_id) => setFilters((current) => ({ ...current, branch_id }))}
                        />

                        <RangePicker
                            value={[dayjs(filters.date_from), dayjs(filters.date_to)]}
                            onChange={(dates) =>
                                setFilters((current) => ({
                                    ...current,
                                    date_from: dates?.[0]?.format('YYYY-MM-DD'),
                                    date_to: dates?.[1]?.format('YYYY-MM-DD'),
                                }))
                            }
                        />

                        <Tooltip title="Refresh dashboard">
                            <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh} />
                        </Tooltip>

                        <Dropdown menu={{ items: quickActions }} trigger={['click']}>
                            <Button type="primary" icon={<PlusOutlined />}>
                                Quick Add
                            </Button>
                        </Dropdown>

                        <Button icon={<AuditOutlined />}>Assistant</Button>
                    </Space>
                </Col>
            </Row>
        </Card>
    );
}

function TopAlerts({ alerts }) {
    if (!alerts?.length) return null;

    return (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {alerts.map((alert, index) => {
                const severity = alert.severity || 'info';

                return (
                    <Alert
                        key={`${alert.title || 'alert'}-${index}`}
                        showIcon
                        type={alertType[severity] || 'info'}
                        message={
                            <Space wrap size={8}>
                                <Text strong>{alert.title || 'Alert'}</Text>
                                {alert.module && <Tag>{alert.module}</Tag>}
                                {severity && <Tag color={statusColor[severity]}>{severity}</Tag>}
                            </Space>
                        }
                        description={alert.description}
                        action={
                            alert.action_url ? (
                                <Button size="small" onClick={() => visit(alert.action_url)}>
                                    Review
                                </Button>
                            ) : null
                        }
                    />
                );
            })}
        </Space>
    );
}

function KpiSummary({ summary, token, onCashBalanceClick }) {
    const items = [
        {
            title: 'Sales Today',
            value: summary.sales_today,
            description: 'Posted sales for today',
            icon: <DollarOutlined />,
            color: token.colorSuccess,
            background: token.colorSuccessBg,
            isMoney: true,
        },
        {
            title: 'Receivables',
            value: summary.receivables,
            description: 'Customers owe us',
            icon: <FileTextOutlined />,
            color: token.colorWarning,
            background: token.colorWarningBg,
            isMoney: true,
        },
        {
            title: 'Payables',
            value: summary.payables,
            description: 'We owe suppliers',
            icon: <FileDoneOutlined />,
            color: token.colorError,
            background: token.colorErrorBg,
            isMoney: true,
        },
        {
            title: 'Cash / Bank Balance',
            value: summary.cash_bank_balance,
            description: 'Click to view account-wise balance',
            icon: <BankOutlined />,
            color: token.colorInfo,
            background: token.colorInfoBg,
            isMoney: true,
            onClick: onCashBalanceClick,
        },
        {
            title: 'Pending Approvals',
            value: summary.pending_approvals,
            description: 'Drafts awaiting action',
            icon: <ClockCircleOutlined />,
            color: token.colorWarning,
            background: token.colorWarningBg,
            isMoney: false,
        },
        {
            title: 'Low Stock Items',
            value: summary.low_stock_items,
            description: 'Below reorder level',
            icon: <InboxOutlined />,
            color: token.colorWarning,
            background: token.colorWarningBg,
            isMoney: false,
        },
    ];

    return (
        <Row gutter={[12, 12]}>
            {items.map((item) => (
                <Col xs={24} sm={12} lg={6} xl={8} key={item.title}>
                    <KpiCard item={item} token={token} />
                </Col>
            ))}
        </Row>
    );
}

function KpiCard({ item, token }) {
    const clickable = typeof item.onClick === 'function';

    return (
        <Card
            hoverable={clickable}
            onClick={item.onClick}
            style={{
                ...cardStyle(token),
                cursor: clickable ? 'pointer' : 'default',
            }}
            styles={{
                body: {
                    padding: 12,
                    minHeight: 112,
                },
            }}
        >
            <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Statistic
                    title={
                        <Text
                            strong
                            style={{
                                fontSize: 12,
                                color: item.color,
                            }}
                        >
                            {item.title}
                        </Text>
                    }
                    value={item.value || 0}
                    formatter={(current) => (item.isMoney ? money(current) : number(current))}
                    valueStyle={{
                        fontSize: 19,
                        fontWeight: 750,
                        color: item.color,
                    }}
                />

                <span style={{ color: item.color, fontSize: 18 }}>
                    {item.icon}
                </span>
            </Space>

            <Text
                style={{
                    fontSize: 12,
                    color: item.color,
                    opacity: 0.82,
                }}
            >
                {item.description}
            </Text>
        </Card>
    );
}

function ApprovalQueue({ approvals, token }) {
    const columns = [
        {
            title: 'Type',
            dataIndex: 'type',
            width: 150,
            render: (value) => <Text strong>{value}</Text>,
        },
        {
            title: 'Draft Ref / Temp ID',
            dataIndex: 'draft_ref',
            width: 150,
        },
        {
            title: 'Party / Account',
            dataIndex: 'party',
            ellipsis: true,
        },
        {
            title: 'Date',
            dataIndex: 'date',
            width: 110,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            align: 'right',
            width: 120,
            render: money,
        },
        {
            title: 'Created By',
            dataIndex: 'created_by',
            width: 120,
        },
        {
            title: 'Age',
            dataIndex: 'age',
            width: 80,
            render: (value) => (value === null ? '-' : `${value}d`),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 100,
            render: (value) => <Tag color={statusColor[value] || 'default'}>{value}</Tag>,
        },
        {
            title: 'Action',
            width: 155,
            render: (_, row) => (
                <Space size={4}>
                    <Button size="small" onClick={() => visit(row.action_url)}>
                        View
                    </Button>
                    <Button size="small" type="primary" ghost>
                        Approve
                    </Button>
                    <Button size="small" danger>
                        Reject
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <DataCard title="Approval Center" token={token}>
            <Table
                size="small"
                columns={columns}
                dataSource={approvals}
                rowKey={(row, index) => row.id || row.uuid || row.draft_ref || index}
                locale={{ emptyText: <Empty description="No pending approvals" /> }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1050 }}
            />
        </DataCard>
    );
}

function CashFlowChart({ cashFlow, token }) {
    const summary = cashFlow.summary || {};

    return (
        <DataCard title="Cash Flow" token={token}>
            <Row gutter={[10, 10]} style={{ marginBottom: 12 }}>
                {[
                    ['Cash In Today', summary.cash_in_today],
                    ['Cash Out Today', summary.cash_out_today],
                    ['Net Cash Flow', summary.net_cash_flow],
                    ['Bank Balance', summary.bank_balance],
                    ['Cash in Hand', summary.cash_in_hand],
                    ['Expected Receivables', summary.expected_receivables],
                    ['Upcoming Payables', summary.upcoming_payables],
                ].map(([label, value]) => (
                    <Col xs={12} md={6} key={label}>
                        <Statistic
                            title={label}
                            value={value || 0}
                            formatter={money}
                            valueStyle={{ fontSize: 16 }}
                        />
                    </Col>
                ))}
            </Row>

            <ChartBox empty={!cashFlow.chart?.length}>
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={cashFlow.chart || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 11 }} />
                        <ChartTooltip formatter={(value) => money(value)} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="cash_in"
                            name="Cash In"
                            stroke={token.colorSuccess}
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="cash_out"
                            name="Cash Out"
                            stroke={token.colorError}
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="net"
                            name="Net"
                            stroke={token.colorPrimary}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </ChartBox>
        </DataCard>
    );
}

function SalesPurchaseChart({ data, token }) {
    const sales = data.sales || {};
    const purchase = data.purchase || {};

    const line = (label, value, isMoney = false) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <Text type="secondary">{label}</Text>
            <Text strong>{isMoney ? money(value) : number(value)}</Text>
        </div>
    );

    return (
        <DataCard title="Sales vs Purchase" token={token}>
            <Tabs
                items={[
                    {
                        key: 'sales',
                        label: 'Sales',
                        children: (
                            <>
                                {line('Quotations', sales.quotations)}
                                {line('Sales Orders', sales.sales_orders)}
                                {line('Invoices', sales.invoices)}
                                {line('Customer Payments', sales.customer_payments)}
                                {line('Sales Returns', sales.sales_returns)}
                                {line('Overdue Invoices', sales.overdue_invoices)}
                            </>
                        ),
                    },
                    {
                        key: 'purchase',
                        label: 'Purchase',
                        children: (
                            <>
                                {line('Purchase Orders', purchase.purchase_orders)}
                                {line('Purchase Bills', purchase.purchase_bills)}
                                {line('Supplier Payments', purchase.supplier_payments)}
                                {line('Expenses', purchase.expenses)}
                                {line('Debit Notes', purchase.debit_notes)}
                                {line('Upcoming Bills', purchase.upcoming_bills)}
                            </>
                        ),
                    },
                ]}
            />

            <ChartBox empty={!data.chart?.length}>
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.chart || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
                        <ChartTooltip formatter={(value) => money(value)} />
                        <Bar dataKey="amount" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartBox>
        </DataCard>
    );
}

function InventoryPieChartCard({ inventory, token }) {
    const chartData = useMemo(() => buildInventoryPieData(inventory), [inventory]);

    return (
        <DataCard title="Inventory Status" token={token}>
            <PieChartView
                data={chartData}
                token={token}
                height={290}
                formatter={(value) => number(value)}
                emptyText="No inventory chart data"
            />
        </DataCard>
    );
}

function CrmPieChartCard({ crm, token }) {
    const chartData = useMemo(() => buildCrmPieData(crm), [crm]);

    return (
        <DataCard title="CRM Pipeline" token={token}>
            <PieChartView
                data={chartData}
                token={token}
                height={290}
                formatter={(value) => number(value)}
                emptyText="No CRM chart data"
            />
        </DataCard>
    );
}

function buildInventoryPieData(inventory) {
    const warnings = inventory?.warnings || [];
    const summary = inventory?.summary || {};

    if (warnings.length) {
        const grouped = warnings.reduce((result, item) => {
            const key = item.status || 'warning';
            result[key] = (result[key] || 0) + 1;
            return result;
        }, {});

        return Object.entries(grouped)
            .map(([name, value]) => ({
                name: name.replaceAll('_', ' '),
                value,
            }))
            .filter((item) => item.value > 0);
    }

    const totalProducts = toNumber(summary.total_products);
    const lowStock = toNumber(summary.low_stock_products);
    const negativeStock = toNumber(summary.negative_stock_warnings);
    const healthyStock = Math.max(totalProducts - lowStock - negativeStock, 0);

    return [
        { name: 'Healthy Stock', value: healthyStock },
        { name: 'Low Stock', value: lowStock },
        { name: 'Negative Stock', value: negativeStock },
    ].filter((item) => item.value > 0);
}

function buildCrmPieData(crm) {
    const pipeline = crm?.pipeline || [];
    const summary = crm?.summary || {};

    if (pipeline.length) {
        return pipeline
            .map((stage) => ({
                name: stage.stage || 'Unknown',
                value: toNumber(stage.count),
            }))
            .filter((item) => item.value > 0);
    }

    return [
        { name: 'New Leads', value: toNumber(summary.new_leads) },
        { name: 'Open Deals', value: toNumber(summary.open_deals) },
        { name: 'Won Deals', value: toNumber(summary.won_deals_this_month) },
        { name: 'Lost Deals', value: toNumber(summary.lost_deals_this_month) },
        { name: 'Due Today', value: toNumber(summary.followups_due_today) },
        { name: 'Overdue', value: toNumber(summary.overdue_activities) },
    ].filter((item) => item.value > 0);
}

function PieChartView({ data, token, height = 280, formatter = number, emptyText = 'No chart data' }) {
    const colors = pieColors(token);

    if (!data?.length) {
        return <Empty description={emptyText} style={{ padding: 45 }} />;
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                </Pie>
                <ChartTooltip formatter={(value) => formatter(value)} />
                <Legend verticalAlign="bottom" height={36} />
            </PieChart>
        </ResponsiveContainer>
    );
}

function CashBankBalanceDrawer({ open, onClose, token, cashFlow, balances }) {
    const summary = cashFlow?.summary || {};

    const bankBalance = toNumber(summary.bank_balance);
    const cashInHand = toNumber(summary.cash_in_hand);
    const totalBalance = balances?.length
        ? balances.reduce((total, row) => total + getBalanceValue(row), 0)
        : bankBalance + cashInHand;

    const columns = [
        {
            title: 'Account',
            dataIndex: 'name',
            ellipsis: true,
            render: (value, row) => (
                <div>
                    <Text strong>{value || row.account_name || row.title || '-'}</Text>

                    {(row.account_number || row.code) && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {row.account_number || row.code}
                            </Text>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            width: 115,
            render: (value, row) => <Tag>{value || row.account_type || 'Account'}</Tag>,
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            align: 'right',
            width: 155,
            render: (_, row) => (
                <Text strong style={{ color: getBalanceValue(row) < 0 ? token.colorError : token.colorText }}>
                    {money(getBalanceValue(row))}
                </Text>
            ),
        },
    ];

    return (
        <Drawer
            title="Cash / Bank Balance"
            open={open}
            onClose={onClose}
            width={620}
            styles={{
                body: {
                    background: token.colorBgLayout,
                    padding: 16,
                },
            }}
        >
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                    <Col xs={24} md={8}>
                        <MiniBalanceCard
                            title="Total Balance"
                            value={totalBalance}
                            color={token.colorPrimary}
                            token={token}
                        />
                    </Col>

                    <Col xs={24} md={8}>
                        <MiniBalanceCard
                            title="Bank Balance"
                            value={bankBalance}
                            color={token.colorInfo}
                            token={token}
                        />
                    </Col>

                    <Col xs={24} md={8}>
                        <MiniBalanceCard
                            title="Cash In Hand"
                            value={cashInHand}
                            color={token.colorSuccess}
                            token={token}
                        />
                    </Col>
                </Row>

                <Card
                    title="Account-wise Balance"
                    style={cardStyle(token)}
                    styles={{
                        header: {
                            minHeight: 42,
                            padding: '0 14px',
                        },
                        body: {
                            padding: 0,
                        },
                    }}
                >
                    <Table
                        size="small"
                        columns={columns}
                        dataSource={balances || []}
                        rowKey={(row, index) => row.id || row.uuid || row.code || index}
                        pagination={false}
                        locale={{
                            emptyText: <Empty description="No account-wise balance found" />,
                        }}
                    />
                </Card>
            </Space>
        </Drawer>
    );
}

function MiniBalanceCard({ title, value, color, token }) {
    return (
        <Card style={cardStyle(token)} styles={{ body: { padding: 12 } }}>
            <Statistic
                title={title}
                value={value}
                formatter={money}
                valueStyle={{
                    fontSize: 18,
                    fontWeight: 750,
                    color,
                }}
            />
        </Card>
    );
}

function getBalanceValue(row) {
    return toNumber(
        row?.balance ??
        row?.current_balance ??
        row?.closing_balance ??
        row?.available_balance ??
        row?.amount ??
        0
    );
}

function RecentActivityTable({ activity, token }) {
    const columns = [
        {
            title: 'Time',
            dataIndex: 'time',
            width: 165,
        },
        {
            title: 'Module',
            dataIndex: 'module',
            width: 120,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            ellipsis: true,
        },
        {
            title: 'User',
            dataIndex: 'user',
            width: 130,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 110,
            render: (value) => <Tag color={statusColor[value] || 'default'}>{value}</Tag>,
        },
        {
            title: 'Action',
            width: 80,
            render: (_, row) => (
                <Button size="small" onClick={() => visit(row.action_url)}>
                    Open
                </Button>
            ),
        },
    ];

    return (
        <DataCard title="Recent Activity" token={token}>
            <Table
                size="small"
                columns={columns}
                dataSource={activity}
                rowKey={(row, index) => row.id || row.uuid || row.time || index}
                locale={{ emptyText: <Empty description="No recent activity" /> }}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 900 }}
            />
        </DataCard>
    );
}

function DataCard({ title, children, token }) {
    return (
        <Card
            title={title}
            style={cardStyle(token)}
            styles={{
                header: {
                    minHeight: 42,
                    padding: '0 14px',
                },
                body: {
                    padding: 14,
                },
            }}
        >
            {children}
        </Card>
    );
}

function ChartBox({ empty, children }) {
    if (empty) {
        return <Empty description="No chart data" style={{ padding: 35 }} />;
    }

    return children;
}