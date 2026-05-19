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
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Line,
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
    if (url && url !== '#') router.visit(url);
};

const routeOr = (routeName, fallback) => {
    try {
        if (typeof route === 'function' && route().has(routeName)) return route(routeName);
    } catch {
        return fallback;
    }
    return fallback;
};

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
        branch_id: branchContext.selectedBranchId || 'all',
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

    const model = useMemo(() => buildDashboardModel(data, permissions), [data, permissions]);
    const gap = token.marginLG;

    return (
        <AuthenticatedLayout
            header={
                <HeroHeader
                    token={token}
                    user={user}
                    branches={data.branches || branchContext.branches || []}
                    filters={filters}
                    setFilters={setFilters}
                    loading={loading}
                    refresh={fetchDashboard}
                    permissions={model.permissions}
                    health={model.health}
                />
            }
        >
            <Head title="Dashboard" />
            <main style={{ minHeight: 'calc(100vh - 100px)', background: '#f7f8fa', padding: gap }}>
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
                        <KpiCards cards={model.kpis} token={token} />

                        <Row gutter={[gap, gap]}>
                            <Col xs={24} xl={16}>
                                <RevenueExpenseChart data={model.revenueExpense} token={token} />
                            </Col>
                            <Col xs={24} xl={8}>
                                <HealthPanel health={model.health} accounting={model.accountingHealth} token={token} />
                            </Col>
                        </Row>

                        <Row gutter={[gap, gap]}>
                            <Col xs={24} xl={12}>
                                <CashForecastChart data={model.cashForecast} token={token} />
                            </Col>
                            <Col xs={24} xl={12}>
                                <AgeingChart data={model.receivableAgeing} token={token} />
                            </Col>
                        </Row>

                        <Row gutter={[gap, gap]}>
                            <Col xs={24} xl={10}>
                                <ActionCenter actions={model.actions} token={token} />
                            </Col>
                            <Col xs={24} xl={14}>
                                <BusinessTabs model={model} token={token} />
                            </Col>
                        </Row>

                        <RecentActivity activity={model.activity} token={token} />
                    </Flex>
                )}
            </main>
        </AuthenticatedLayout>
    );
}

function HeroHeader({ token, user, branches, filters, setFilters, loading, refresh, permissions, health }) {
    const quickActions = [
        permissions.canCreateInvoice && {
            key: 'invoice',
            icon: <FileAddOutlined />,
            label: 'Create invoice',
            onClick: () => visit(routeOr('payment-in.invoices.create', '/payment-in/invoices/create')),
        },
        permissions.canRecordPayment && {
            key: 'payment',
            icon: <DollarOutlined />,
            label: 'Record payment',
            onClick: () => visit(routeOr('payment-in.payments.create', '/payment-in/payments/create')),
        },
        permissions.canAddExpense && {
            key: 'expense',
            icon: <WalletOutlined />,
            label: 'Add expense',
            onClick: () => visit(routeOr('payment-out.expenses.create', '/payment-out/expenses/create')),
        },
        permissions.canCreateBill && {
            key: 'bill',
            icon: <BookOutlined />,
            label: 'Create bill',
            onClick: () => visit(routeOr('payment-out.purchase-bills.create', '/payment-out/purchase-bills/create')),
        },
    ].filter(Boolean);

    return (
        <Flex justify="space-between" align="center" wrap="wrap" gap={token.marginMD}>
            <div style={{ minWidth: 260 }}>
                <Space size={8} align="center" wrap>
                    <Title level={4} style={{ margin: 0, fontWeight: 650, letterSpacing: 0 }}>
                        Good {dayjs().hour() < 12 ? 'morning' : dayjs().hour() < 18 ? 'afternoon' : 'evening'}, {user.name || 'there'}
                    </Title>
                    <Tag color={health.score >= 75 ? 'success' : health.score >= 55 ? 'warning' : 'error'} bordered={false}>
                        {health.status}
                    </Tag>
                </Space>
                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: token.fontSizeSM }}>
                    {health.message}
                </Text>
            </div>

            <Flex wrap="wrap" gap={8} align="center">
                <Select
                    value={filters.branch_id}
                    options={branchOptions(branches)}
                    style={{ minWidth: 168 }}
                    onChange={(branch_id) => setFilters((f) => ({ ...f, branch_id: branch_id || 'all' }))}
                />
                <RangePicker
                    value={filters.date_from && filters.date_to ? [dayjs(filters.date_from), dayjs(filters.date_to)] : null}
                    onChange={(dates) =>
                        setFilters((f) => ({
                            ...f,
                            date_from: dates?.[0]?.format('YYYY-MM-DD'),
                            date_to: dates?.[1]?.format('YYYY-MM-DD'),
                        }))
                    }
                />
                <Tooltip title="Refresh dashboard">
                    <Button icon={<ReloadOutlined spin={loading} />} onClick={refresh} />
                </Tooltip>
                {quickActions.length > 0 && (
                    <Dropdown menu={{ items: quickActions }} trigger={['click']}>
                        <Button type="primary" icon={<PlusOutlined />}>
                            Quick action <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                        </Button>
                    </Dropdown>
                )}
            </Flex>
        </Flex>
    );
}

const cardStyle = (token) => ({
    height: '100%',
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
});

function KpiCards({ cards, token }) {
    return (
        <Row gutter={[token.marginMD, token.marginMD]}>
            {cards.map((card) => (
                <Col key={card.key} xs={24} sm={12} lg={8} xl={4}>
                    <Card hoverable onClick={() => visit(card.url)} style={cardStyle(token)} styles={{ body: { padding: 18 } }}>
                        <Flex vertical gap={10}>
                            <Flex justify="space-between" align="center" gap={12}>
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                    {card.title}
                                </Text>
                                <span style={{ color: token.colorTextTertiary, fontSize: 16 }}>{card.icon}</span>
                            </Flex>
                            <div style={{ color: token.colorTextHeading, fontSize: 23, fontWeight: 650, lineHeight: 1.15 }}>
                                {card.display}
                            </div>
                            <Text type="secondary" style={{ minHeight: 34, fontSize: token.fontSizeSM - 1 }}>
                                {card.helper}
                            </Text>
                            <Flex justify="space-between" align="center">
                                <Tag color={card.statusColor} bordered={false} style={{ margin: 0 }}>
                                    {card.status}
                                </Tag>
                                <Text style={{ color: card.trendColor, fontSize: token.fontSizeSM }}>
                                    {card.trendIcon} {card.trend}
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                </Col>
            ))}
        </Row>
    );
}

function HealthPanel({ health, accounting, token }) {
    return (
        <Card title="Business health" style={cardStyle(token)}>
            <Flex align="center" gap={20}>
                <Progress type="circle" percent={health.score} size={108} strokeColor={health.score >= 75 ? token.colorSuccess : health.score >= 55 ? token.colorWarning : token.colorError} />
                <Flex vertical gap={10} style={{ flex: 1 }}>
                    <Insight label="Net profit" value={money(health.profit)} tone={health.profit >= 0 ? 'success' : 'error'} />
                    <Insight label="Accounting score" value={`${accounting.score || 0}%`} tone={(accounting.score || 0) >= 80 ? 'success' : 'warning'} />
                    <Insight label="Payables due soon" value={number(health.payables_due_soon)} tone={health.payables_due_soon ? 'warning' : 'success'} />
                    <Insight label="CRM follow-ups" value={number(health.crm_followups)} tone={health.crm_followups ? 'warning' : 'success'} />
                </Flex>
            </Flex>
        </Card>
    );
}

function RevenueExpenseChart({ data, token }) {
    return (
        <Card title="Revenue vs expenses" extra={<Text type="secondary">Selected period</Text>} style={cardStyle(token)}>
            {data.length === 0 ? (
                <Empty description="No revenue or expense activity" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <ResponsiveContainer width="100%" height={310}>
                    <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format('MMM D')} tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickFormatter={(v) => money(v, true)} width={72} tickLine={false} axisLine={false} fontSize={12} />
                        <ChartTooltip content={<MoneyTooltip token={token} />} />
                        <Bar name="Revenue" dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar name="Expenses" dataKey="expenses" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Line name="Net profit" dataKey="profit" stroke="#111827" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}

function CashForecastChart({ data, token }) {
    return (
        <Card title="Cash flow forecast" extra={<Button type="text" size="small" onClick={() => visit('/reports/accounting/cash-flow-summary')}>Report <RightOutlined /></Button>} style={cardStyle(token)}>
            {data.length === 0 ? (
                <Empty description="No due receivables or payables" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format('MMM D')} tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickFormatter={(v) => money(v, true)} width={72} tickLine={false} axisLine={false} fontSize={12} />
                        <ChartTooltip content={<MoneyTooltip token={token} />} />
                        <Bar name="Expected in" dataKey="cash_in" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        <Bar name="Expected out" dataKey="cash_out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Line name="Projected cash" dataKey="projected_cash" stroke="#111827" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}

function AgeingChart({ data, token }) {
    return (
        <Card title="Receivable ageing" extra={<Button type="text" size="small" onClick={() => visit('/reports/receivable/customer-receivable-summary')}>View <RightOutlined /></Button>} style={cardStyle(token)}>
            {data.every((item) => toAmount(item.amount) === 0) ? (
                <Empty description="No outstanding receivables" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
                        <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickFormatter={(v) => money(v, true)} width={72} tickLine={false} axisLine={false} fontSize={12} />
                        <ChartTooltip content={<MoneyTooltip token={token} />} />
                        <Bar name="Outstanding" dataKey="amount" fill="#2563eb" radius={[5, 5, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}

function ActionCenter({ actions, token }) {
    return (
        <Card
            title={<Space><span>Action center</span><Badge count={actions.length} size="small" /></Space>}
            style={cardStyle(token)}
            styles={{ body: { padding: actions.length ? 0 : 24 } }}
        >
            {actions.length === 0 ? (
                <Empty description="Nothing urgent today" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <List
                    dataSource={actions}
                    renderItem={(item) => (
                        <List.Item
                            actions={[<Button key="open" type="text" icon={<RightOutlined />} onClick={() => visit(item.action_url)} />]}
                            style={{ padding: '14px 20px' }}
                        >
                            <List.Item.Meta
                                avatar={item.severity === 'critical' ? <WarningOutlined style={{ color: token.colorError }} /> : <ClockCircleOutlined style={{ color: token.colorWarning }} />}
                                title={<Flex justify="space-between" gap={12}><Text strong>{item.title}</Text><Tag bordered={false} color={severityColor(item.severity)}>{item.module}</Tag></Flex>}
                                description={<Text type="secondary">{item.description}</Text>}
                            />
                        </List.Item>
                    )}
                />
            )}
        </Card>
    );
}

function BusinessTabs({ model, token }) {
    const items = [
        {
            key: 'sales',
            label: 'Sales',
            children: (
                <CompactPanel
                    token={token}
                    stats={[
                        ['Invoices', number(model.sales.invoices)],
                        ['Overdue invoices', number(model.sales.overdue_invoices)],
                        ['Top customer', model.topCustomers[0]?.name || '-'],
                    ]}
                    listTitle="Top customers"
                    list={model.topCustomers.map((item) => ({ title: item.name, value: money(item.amount) }))}
                />
            ),
        },
        {
            key: 'purchase',
            label: 'Purchase',
            children: (
                <CompactPanel
                    token={token}
                    stats={[
                        ['Bills', number(model.purchase.purchase_bills)],
                        ['Due soon', number(model.purchase.upcoming_bills)],
                        ['Top supplier', model.topSuppliers[0]?.name || '-'],
                    ]}
                    listTitle="Payable ageing"
                    list={model.payableAgeing.map((item) => ({ title: item.bucket, value: money(item.amount) }))}
                />
            ),
        },
        {
            key: 'inventory',
            label: 'Inventory',
            children: (
                <CompactPanel
                    token={token}
                    stats={[
                        ['Products', number(model.inventory.summary.total_products)],
                        ['Low stock', number(model.inventory.summary.low_stock_products)],
                        ['Inventory value', money(model.inventory.summary.inventory_value, true)],
                    ]}
                    listTitle="Warnings"
                    list={model.inventory.warnings.map((item) => ({ title: item.product, value: `${number(item.current_stock)} in stock`, url: item.action_url }))}
                />
            ),
        },
        {
            key: 'crm',
            label: 'CRM',
            children: (
                <CompactPanel
                    token={token}
                    stats={[
                        ['Open deals', number(model.crm.summary.open_deals)],
                        ['Forecast', money(model.crm.summary.forecast_this_month, true)],
                        ['Win rate', `${model.crm.summary.win_rate || 0}%`],
                    ]}
                    listTitle="Follow-ups"
                    list={model.crm.followups.map((item) => ({ title: item.name, value: item.assigned_to || 'Unassigned', url: item.action_url }))}
                />
            ),
        },
        {
            key: 'accounting',
            label: 'Accounting',
            children: (
                <CompactPanel
                    token={token}
                    stats={[
                        ['Health score', `${model.accountingHealth.score || 0}%`],
                        ['Missing JV', number(model.accountingHealth.approved_jv_missing)],
                        ['Unbalanced JV', number(model.accountingHealth.unbalanced_jvs)],
                    ]}
                    listTitle="Issues"
                    list={model.accountingIssues.map((item) => ({ title: item.issue_type, value: item.record, url: item.action_url }))}
                />
            ),
        },
    ];

    return (
        <Card title="Business tabs" style={cardStyle(token)}>
            <Tabs items={items} />
        </Card>
    );
}

function CompactPanel({ stats, listTitle, list, token }) {
    return (
        <Row gutter={[token.marginLG, token.marginMD]}>
            <Col xs={24} md={10}>
                <Flex vertical gap={12}>
                    {stats.map(([label, value]) => (
                        <Insight key={label} label={label} value={value} />
                    ))}
                </Flex>
            </Col>
            <Col xs={24} md={14}>
                <Text strong>{listTitle}</Text>
                <div style={{ marginTop: 8 }}>
                    {list.length === 0 ? (
                        <Empty description="No records" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        list.slice(0, 5).map((item) => (
                            <Flex key={`${item.title}-${item.value}`} justify="space-between" align="center" gap={12} style={{ padding: '9px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                                <Text ellipsis style={{ minWidth: 0 }}>{item.title}</Text>
                                <Button type="text" size="small" onClick={() => visit(item.url)} style={{ maxWidth: 180 }}>
                                    <Text ellipsis>{item.value}</Text>
                                </Button>
                            </Flex>
                        ))
                    )}
                </div>
            </Col>
        </Row>
    );
}

function Insight({ label, value, tone }) {
    const color = tone === 'success' ? 'success' : tone === 'error' ? 'danger' : tone === 'warning' ? 'warning' : 'secondary';
    return (
        <Flex justify="space-between" align="center" gap={12}>
            <Text type="secondary">{label}</Text>
            <Text strong type={color === 'secondary' ? undefined : color}>{value}</Text>
        </Flex>
    );
}

function RecentActivity({ activity, token }) {
    return (
        <Card title="Recent activity" style={cardStyle(token)}>
            {activity.length === 0 ? (
                <Empty description="No recent activity" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <Timeline
                    items={activity.slice(0, 8).map((item) => ({
                        color: activityColor(item.status, token),
                        children: (
                            <Flex justify="space-between" align="start" gap={16}>
                                <div style={{ minWidth: 0 }}>
                                    <Text strong>{item.description}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                        {item.module || 'Business'} · {item.user || 'System'} · {dayjs(item.time).isValid() ? dayjs(item.time).format('MMM D, HH:mm') : 'Recent'}
                                    </Text>
                                </div>
                                {item.action_url && <Button type="text" size="small" icon={<RightOutlined />} onClick={() => visit(item.action_url)} />}
                            </Flex>
                        ),
                    }))}
                />
            )}
        </Card>
    );
}

function MoneyTooltip({ active, payload, label, token }) {
    if (!active || !payload?.length) return null;

    return (
        <div style={{ background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, boxShadow: token.boxShadowSecondary, padding: '10px 12px', minWidth: 160 }}>
            {label && (
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                    {dayjs(label).isValid() ? dayjs(label).format('MMM D, YYYY') : label}
                </Text>
            )}
            <Flex vertical gap={4}>
                {payload.map((item) => (
                    <Flex key={`${item.name}-${item.dataKey}`} justify="space-between" gap={16}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.name}</Text>
                        <Text strong style={{ fontSize: 12 }}>{money(item.value)}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function DashboardSkeleton({ token }) {
    return (
        <Flex vertical gap={token.marginLG}>
            <Row gutter={[token.marginMD, token.marginMD]}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Col key={i} xs={24} sm={12} lg={8} xl={4}>
                        <Card style={cardStyle(token)}><Skeleton active paragraph={{ rows: 2 }} /></Card>
                    </Col>
                ))}
            </Row>
            <Row gutter={[token.marginLG, token.marginLG]}>
                <Col xs={24} xl={16}><Card style={cardStyle(token)}><Skeleton active paragraph={{ rows: 8 }} /></Card></Col>
                <Col xs={24} xl={8}><Card style={cardStyle(token)}><Skeleton active paragraph={{ rows: 8 }} /></Card></Col>
            </Row>
            <Row gutter={[token.marginLG, token.marginLG]}>
                <Col xs={24} xl={12}><Card style={cardStyle(token)}><Skeleton active paragraph={{ rows: 7 }} /></Card></Col>
                <Col xs={24} xl={12}><Card style={cardStyle(token)}><Skeleton active paragraph={{ rows: 7 }} /></Card></Col>
            </Row>
        </Flex>
    );
}

function buildDashboardModel(data, permissions) {
    const summary = data.summary || {};
    const sales = data.sales_purchase?.sales || {};
    const purchase = data.sales_purchase?.purchase || {};
    const inventory = data.inventory || { summary: {}, warnings: [] };
    const crm = data.crm || { summary: {}, pipeline: [], followups: [] };
    const accountingHealth = data.accounting_health || {};
    const health = data.business_health || {};

    const revenue = toAmount(summary.sales_this_month);
    const expenses = sumSeries(data.revenue_expense, 'expenses') || toAmount(data.sales_purchase?.chart?.find((item) => item.name === 'Purchase')?.amount);
    const profit = health.profit ?? revenue - expenses;
    const cash = toAmount(summary.cash_bank_balance);
    const receivables = toAmount(summary.receivables);
    const payables = toAmount(summary.payables);
    const overdueReceivables = sumSeries((data.receivable_ageing || []).filter((item) => item.bucket !== 'Current'), 'amount');

    return {
        permissions: dashboardPermissions(permissions),
        health: {
            score: toAmount(health.score || 0),
            status: health.status || 'Review',
            message: health.message || 'Review cash, collections, payables, and operational exceptions.',
            profit,
            payables_due_soon: toAmount(health.payables_due_soon || purchase.upcoming_bills),
            crm_followups: toAmount(health.crm_followups || crm.followups?.length),
        },
        accountingHealth: { score: 100, ...accountingHealth },
        kpis: [
            kpi('cash', 'Cash & Bank', cash, 'Total cash and bank balance', cash >= 0 ? 'Healthy' : 'Negative', cash >= 0 ? 'success' : 'error', cash >= 0 ? 'Stable' : 'Review', <BankOutlined />, '/accounting/bank-accounts'),
            kpi('revenue', 'Revenue', revenue, 'Approved sales in the selected period', revenue >= expenses ? 'On track' : 'Below cost', revenue >= expenses ? 'success' : 'warning', revenue >= expenses ? 'Up' : 'Watch', <DollarOutlined />, '/reports/sales/sales-summary'),
            kpi('expenses', 'Expenses', expenses, 'Bills and expenses in the selected period', expenses > revenue ? 'High' : 'Controlled', expenses > revenue ? 'error' : 'default', expenses > revenue ? 'Up' : 'Normal', <WalletOutlined />, '/payment-out/expenses'),
            kpi('profit', 'Net Profit', profit, 'Revenue minus expenses', profit >= 0 ? 'Profit' : 'Loss', profit >= 0 ? 'success' : 'error', profit >= 0 ? 'Positive' : 'Negative', <FileDoneOutlined />, '/reports/accounting/income-statement'),
            kpi('receivables', 'Receivables', receivables, `${money(overdueReceivables, true)} overdue`, overdueReceivables ? 'Collect' : 'Current', overdueReceivables ? 'warning' : 'success', `${number(sales.overdue_invoices)} overdue`, <FileTextOutlined />, '/reports/receivable/customer-receivable-summary'),
            kpi('payables', 'Payables', payables, 'Supplier balances and due bills', purchase.upcoming_bills ? 'Due soon' : 'Clear', purchase.upcoming_bills ? 'warning' : 'success', `${number(purchase.upcoming_bills)} due`, <BookOutlined />, '/reports/payable/supplier-payable-summary'),
        ],
        revenueExpense: normalizeSeries(data.revenue_expense),
        cashForecast: normalizeSeries(data.cash_flow?.forecast || []),
        receivableAgeing: normalizeAgeing(data.receivable_ageing),
        payableAgeing: normalizeAgeing(data.payable_ageing),
        actions: buildActions(data, sales, purchase),
        sales,
        purchase,
        inventory: { summary: inventory.summary || {}, warnings: inventory.warnings || [] },
        crm: { summary: crm.summary || {}, pipeline: crm.pipeline || [], followups: crm.followups || [] },
        accountingIssues: data.accounting_issues || [],
        topCustomers: normalizeParties(data.top_customers || sales.top_customers),
        topSuppliers: normalizeParties(data.top_suppliers || purchase.top_suppliers),
        activity: Array.isArray(data.recent_activity) ? data.recent_activity : [],
    };
}

function kpi(key, title, value, helper, status, statusColor, trend, icon, url) {
    const positive = ['cash', 'revenue', 'profit'].includes(key) ? value >= 0 : true;
    return {
        key,
        title,
        value,
        display: money(value),
        helper,
        status,
        statusColor,
        trend,
        trendIcon: positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
        trendColor: positive ? '#15803d' : '#b91c1c',
        icon,
        url,
    };
}

function buildActions(data, sales, purchase) {
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    const base = [
        toAmount(sales.overdue_invoices) > 0 && {
            severity: 'critical',
            module: 'Sales',
            title: `${number(sales.overdue_invoices)} overdue invoices`,
            description: 'Collections need follow-up today.',
            action_url: '/payment-in/invoices?status=overdue',
        },
        toAmount(purchase.upcoming_bills) > 0 && {
            severity: 'warning',
            module: 'Purchase',
            title: `${number(purchase.upcoming_bills)} bills due soon`,
            description: 'Review supplier payment timing.',
            action_url: '/payment-out/purchase-bills',
        },
        toAmount(data.summary?.pending_approvals) > 0 && {
            severity: 'info',
            module: 'Approval',
            title: `${number(data.summary.pending_approvals)} pending approvals`,
            description: 'Documents are waiting to be posted.',
            action_url: '/workflow',
        },
    ].filter(Boolean);

    return [...base, ...alerts].slice(0, 8);
}

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
        ...items.map((b) => ({ value: b.value ?? b.id, label: b.label ?? b.name ?? `Branch #${b.id}` })),
    ];
}

function normalizeSeries(items) {
    return Array.isArray(items) ? items.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, key === 'date' || key === 'bucket' ? value : toAmount(value)]))) : [];
}

function normalizeAgeing(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({ ...item, amount: toAmount(item.amount), count: toAmount(item.count) }));
}

function normalizeParties(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => ({
        key: item.key || item.id || `${item.name}-${index}`,
        name: item.name || item.customer || item.supplier || 'Unknown',
        amount: toAmount(item.amount || item.total || item.balance),
    })).filter((item) => item.amount > 0);
}

function sumSeries(items, key) {
    return Array.isArray(items) ? items.reduce((sum, item) => sum + toAmount(item[key]), 0) : 0;
}

function severityColor(severity) {
    if (severity === 'critical') return 'error';
    if (severity === 'warning') return 'warning';
    return 'processing';
}

function activityColor(status, token) {
    if (['approved', 'posted', 'paid', 'success'].includes(status)) return token.colorSuccess;
    if (['pending', 'draft', 'warning'].includes(status)) return token.colorWarning;
    if (['failed', 'void', 'cancelled', 'error'].includes(status)) return token.colorError;
    return token.colorPrimary;
}
