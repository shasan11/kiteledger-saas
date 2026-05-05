import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    DatePicker,
    Dropdown,
    Empty,
    Progress,
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
    BarChartOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    FileDoneOutlined,
    FileTextOutlined,
    InboxOutlined,
    PlusOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
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

const money = (value) =>
    new Intl.NumberFormat('en-NP', {
        style: 'currency',
        currency: 'NPR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const number = (value) => new Intl.NumberFormat('en-NP').format(Number(value || 0));

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

export default function Dashboard() {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({});
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

                    {loading ? (
                        <Skeleton active paragraph={{ rows: 14 }} />
                    ) : (
                        <>
                            <KpiSummary summary={summary} token={token} />

                            <Row gutter={[16, 16]}>
                                <Col xs={24} xl={16}>
                                    <ApprovalQueue approvals={dashboardData.approvals || []} token={token} />
                                </Col>
                                <Col xs={24} xl={8}>
                                    <SmartAlerts alerts={dashboardData.alerts || []} token={token} />
                                </Col>
                            </Row>

                           
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
                                    <InventoryWarningsTable inventory={inventory} token={token} />
                                </Col>
                                <Col xs={24} xl={12}>
                                    <CrmPipelineCard crm={crm} token={token} />
                                </Col>
                            </Row>

                            <RecentActivityTable activity={dashboardData.recent_activity || []} token={token} />
                        </>
                    )}
                </Space>
            </div>
        </AuthenticatedLayout>
    );
}

function HeaderArea({ token, filters, setFilters, branches, refresh, quickActions, loading }) {
    return (
        <Card style={cardStyle(token)} styles={{ body: { padding: 14 } }}>
            <Row gutter={[12, 12]} align="middle" justify="space-between">
                <Col xs={24} lg={10}>
                    <Title level={3} style={{ margin: 0, fontSize: 22 }}>Dashboard</Title>
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
                            <Button type="primary" icon={<PlusOutlined />}>Quick Add</Button>
                        </Dropdown>
                        <Button icon={<AuditOutlined />}>Assistant</Button>
                    </Space>
                </Col>
            </Row>
        </Card>
    );
}

function KpiSummary({ summary, token }) {
    const items = [
        ['Sales Today', summary.sales_today, 'Posted sales for today', <DollarOutlined />, token.colorSuccess, true],
        ['Receivables', summary.receivables, 'Customers owe us', <FileTextOutlined />, token.colorWarning, true],
        ['Payables', summary.payables, 'We owe suppliers', <FileDoneOutlined />, token.colorError, true],
        ['Cash / Bank Balance', summary.cash_bank_balance, 'Available balance', <BankOutlined />, token.colorInfo, true],
        ['Pending Approvals', summary.pending_approvals, 'Drafts awaiting action', <ClockCircleOutlined />, token.colorWarning, false],
        ['Low Stock Items', summary.low_stock_items, 'Below reorder level', <InboxOutlined />, token.colorWarning, false],
    ];

    return (
        <Row gutter={[12, 12]}>
            {items.map(([title, value, description, icon, color, isMoney]) => (
                <Col xs={24} sm={12} lg={6} xl={8} key={title}>
                    <KpiCard title={title} value={value} description={description} icon={icon} color={color} isMoney={isMoney} token={token} />
                </Col>
            ))}
        </Row>
    );
}

function KpiCard({ title, value, description, icon, color, isMoney, token }) {
    return (
        <Card hoverable style={cardStyle(token)} styles={{ body: { padding: 12 } }}>
            <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Statistic
                    title={<Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>}
                    value={value || 0}
                    formatter={(current) => (isMoney ? money(current) : number(current))}
                    valueStyle={{ fontSize: 18, fontWeight: 700 }}
                />
                <span style={{ color, fontSize: 18 }}>{icon}</span>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>
        </Card>
    );
}

function ApprovalQueue({ approvals, token }) {
    const columns = [
        { title: 'Type', dataIndex: 'type', width: 150, render: (value) => <Text strong>{value}</Text> },
        { title: 'Draft Ref / Temp ID', dataIndex: 'draft_ref', width: 150 },
        { title: 'Party / Account', dataIndex: 'party', ellipsis: true },
        { title: 'Date', dataIndex: 'date', width: 110 },
        { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: money },
        { title: 'Created By', dataIndex: 'created_by', width: 120 },
        { title: 'Age', dataIndex: 'age', width: 80, render: (value) => (value === null ? '-' : `${value}d`) },
        { title: 'Status', dataIndex: 'status', width: 100, render: (value) => <Tag color={statusColor[value] || 'default'}>{value}</Tag> },
        {
            title: 'Action',
            width: 155,
            render: (_, row) => (
                <Space size={4}>
                    <Button size="small" onClick={() => visit(row.action_url)}>View</Button>
                    <Button size="small" type="primary" ghost>Approve</Button>
                    <Button size="small" danger>Reject</Button>
                </Space>
            ),
        },
    ];

    return <DataCard title="Approval Center" token={token}><Table size="small" columns={columns} dataSource={approvals} locale={{ emptyText: <Empty description="No pending approvals" /> }} pagination={{ pageSize: 8 }} scroll={{ x: 1050 }} /></DataCard>;
}

function AccountingHealthCard({ health, token }) {
    const metrics = [
        ['Approved but JV Missing', health.approved_jv_missing, 'critical'],
        ['Approved but Number Missing', health.approved_number_missing, 'warning'],
        ['Transactions JV Null', health.journal_voucher_id_null, 'warning'],
        ['Auto JV Created Today', health.auto_jv_created_today, 'info'],
        ['Unbalanced JVs', health.unbalanced_jvs, 'critical'],
        ['Voided This Month', health.voided_this_month, 'warning'],
        ['Reversal JVs This Month', health.reversal_jvs_this_month, 'info'],
    ];

    const totalRisk = Number(health.approved_jv_missing || 0) + Number(health.approved_number_missing || 0) + Number(health.unbalanced_jvs || 0);

    return (
        <DataCard title="Accounting Health" token={token}>
            <Alert
                type={totalRisk ? 'warning' : 'success'}
                showIcon
                message={totalRisk ? `${totalRisk} posting or numbering issues need review` : 'No critical accounting issues detected'}
                style={{ marginBottom: 12 }}
            />
            <Row gutter={[10, 10]}>
                {metrics.map(([label, value, severity]) => (
                    <Col xs={12} md={8} key={label}>
                        <div style={{ border: `1px solid ${token.colorBorderSecondary}`, padding: 10, borderRadius: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                            <div><Text strong style={{ fontSize: 20, color: severity === 'critical' ? token.colorError : undefined }}>{number(value)}</Text></div>
                        </div>
                    </Col>
                ))}
            </Row>
        </DataCard>
    );
}

function AccountingIssuesTable({ issues, token }) {
    const columns = [
        { title: 'Issue Type', dataIndex: 'issue_type', ellipsis: true },
        { title: 'Module', dataIndex: 'module', width: 120 },
        { title: 'Record', dataIndex: 'record', width: 150 },
        { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: money },
        { title: 'Date', dataIndex: 'date', width: 110 },
        { title: 'Severity', dataIndex: 'severity', width: 100, render: (value) => <Tag color={statusColor[value]}>{value}</Tag> },
        { title: 'Action', width: 80, render: (_, row) => <Button size="small" onClick={() => visit(row.action_url)}>Open</Button> },
    ];

    return <DataCard title="Accounting Issues" token={token}><Table size="small" columns={columns} dataSource={issues} locale={{ emptyText: <Empty description="No accounting issues" /> }} pagination={{ pageSize: 8 }} scroll={{ x: 850 }} /></DataCard>;
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
                        <Statistic title={label} value={value || 0} formatter={money} valueStyle={{ fontSize: 16 }} />
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
                        <Line type="monotone" dataKey="cash_in" name="Cash In" stroke={token.colorSuccess} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cash_out" name="Cash Out" stroke={token.colorError} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="net" name="Net" stroke={token.colorPrimary} strokeWidth={2} dot={false} />
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
                    { key: 'sales', label: 'Sales', children: <>{line('Quotations', sales.quotations)}{line('Sales Orders', sales.sales_orders)}{line('Invoices', sales.invoices)}{line('Customer Payments', sales.customer_payments)}{line('Sales Returns', sales.sales_returns)}{line('Overdue Invoices', sales.overdue_invoices)}</> },
                    { key: 'purchase', label: 'Purchase', children: <>{line('Purchase Orders', purchase.purchase_orders)}{line('Purchase Bills', purchase.purchase_bills)}{line('Supplier Payments', purchase.supplier_payments)}{line('Expenses', purchase.expenses)}{line('Debit Notes', purchase.debit_notes)}{line('Upcoming Bills', purchase.upcoming_bills)}</> },
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

function InventoryWarningsTable({ inventory, token }) {
    const summary = inventory.summary || {};
    const columns = [
        { title: 'Product', dataIndex: 'product', ellipsis: true },
        { title: 'SKU / Code', dataIndex: 'sku', width: 120 },
        { title: 'Current Stock', dataIndex: 'current_stock', align: 'right', width: 115 },
        { title: 'Reorder Level', dataIndex: 'reorder_level', align: 'right', width: 115 },
        { title: 'Warehouse', dataIndex: 'warehouse', width: 110, render: (value) => value || '-' },
        { title: 'Status', dataIndex: 'status', width: 100, render: (value) => <Tag color={statusColor[value]}>{value?.replace('_', ' ')}</Tag> },
        { title: 'Action', width: 80, render: (_, row) => <Button size="small" onClick={() => visit(row.action_url)}>Open</Button> },
    ];

    return (
        <DataCard title="Inventory Snapshot" token={token}>
            <Row gutter={[10, 10]} style={{ marginBottom: 12 }}>
                {[
                    ['Products', summary.total_products],
                    ['Low Stock', summary.low_stock_products],
                    ['Negative', summary.negative_stock_warnings],
                    ['Inventory Value', summary.inventory_value, true],
                    ['Transfers', summary.pending_warehouse_transfers],
                    ['Adjustments', summary.pending_inventory_adjustments],
                ].map(([label, value, isMoney]) => (
                    <Col xs={8} key={label}><Statistic title={label} value={value || 0} formatter={isMoney ? money : number} valueStyle={{ fontSize: 16 }} /></Col>
                ))}
            </Row>
            <Table size="small" columns={columns} dataSource={inventory.warnings || []} locale={{ emptyText: <Empty description="Stock looks safe" /> }} pagination={{ pageSize: 6 }} scroll={{ x: 760 }} />
        </DataCard>
    );
}

function CrmPipelineCard({ crm, token }) {
    const summary = crm.summary || {};
    const max = Math.max(...(crm.pipeline || []).map((stage) => stage.count || 0), 1);
    const columns = [
        { title: 'Lead/Deal', dataIndex: 'name', ellipsis: true },
        { title: 'Contact', dataIndex: 'contact', width: 130 },
        { title: 'Stage', dataIndex: 'stage', width: 110, render: (value) => <Tag>{value}</Tag> },
        { title: 'Amount', dataIndex: 'amount', align: 'right', width: 110, render: money },
        { title: 'Assigned To', dataIndex: 'assigned_to', width: 120 },
        { title: 'Next Follow Up', dataIndex: 'next_follow_up', width: 150 },
        { title: 'Action', width: 80, render: (_, row) => <Button size="small" onClick={() => visit(row.action_url)}>Open</Button> },
    ];

    return (
        <DataCard title="CRM Pipeline" token={token}>
            <Row gutter={[10, 10]} style={{ marginBottom: 12 }}>
                {[
                    ['New Leads', summary.new_leads],
                    ['Open Deals', summary.open_deals],
                    ['Expected Value', summary.expected_deal_value, true],
                    ['Due Today', summary.followups_due_today],
                    ['Overdue', summary.overdue_activities],
                    ['Won', summary.won_deals_this_month],
                    ['Lost', summary.lost_deals_this_month],
                ].map(([label, value, isMoney]) => (
                    <Col xs={8} key={label}><Statistic title={label} value={value || 0} formatter={isMoney ? money : number} valueStyle={{ fontSize: 16 }} /></Col>
                ))}
            </Row>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
                {(crm.pipeline || []).map((stage) => (
                    <div key={stage.stage}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Text>{stage.stage}</Text>
                            <Text type="secondary">{number(stage.count)} / {money(stage.amount)}</Text>
                        </Space>
                        <Progress percent={Math.round(((stage.count || 0) / max) * 100)} showInfo={false} size="small" />
                    </div>
                ))}
            </Space>
            <Table size="small" columns={columns} dataSource={crm.followups || []} locale={{ emptyText: <Empty description="No follow-ups due" /> }} pagination={{ pageSize: 5 }} scroll={{ x: 900 }} />
        </DataCard>
    );
}

function SmartAlerts({ alerts, token }) {
    return (
        <DataCard title="Smart Alerts" token={token}>
            <Space direction="vertical" style={{ width: '100%' }}>
                {!alerts.length && <Empty description="No alerts right now" />}
                {alerts.map((alert, index) => (
                    <div key={`${alert.title}-${index}`} style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 4, padding: 10 }}>
                        <Space align="start">
                            <Badge status={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'processing'} />
                            <div>
                                <Text strong>{alert.title}</Text>
                                <div><Text type="secondary" style={{ fontSize: 12 }}>{alert.description}</Text></div>
                                <Space style={{ marginTop: 8 }}>
                                    <Tag color={statusColor[alert.severity]}>{alert.severity}</Tag>
                                    <Tag>{alert.module}</Tag>
                                    <Button size="small" onClick={() => visit(alert.action_url)}>Review</Button>
                                </Space>
                            </div>
                        </Space>
                    </div>
                ))}
            </Space>
        </DataCard>
    );
}

function RecentActivityTable({ activity, token }) {
    const columns = [
        { title: 'Time', dataIndex: 'time', width: 165 },
        { title: 'Module', dataIndex: 'module', width: 120 },
        { title: 'Description', dataIndex: 'description', ellipsis: true },
        { title: 'User', dataIndex: 'user', width: 130 },
        { title: 'Status', dataIndex: 'status', width: 110, render: (value) => <Tag color={statusColor[value] || 'default'}>{value}</Tag> },
        { title: 'Action', width: 80, render: (_, row) => <Button size="small" onClick={() => visit(row.action_url)}>Open</Button> },
    ];

    return <DataCard title="Recent Activity" token={token}><Table size="small" columns={columns} dataSource={activity} locale={{ emptyText: <Empty description="No recent activity" /> }} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} /></DataCard>;
}

function DataCard({ title, children, token }) {
    return (
        <Card title={title} style={cardStyle(token)} styles={{ header: { minHeight: 42, padding: '0 14px' }, body: { padding: 14 } }}>
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
