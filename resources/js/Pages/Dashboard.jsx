import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Empty,
    Select,
    Skeleton,
    Table,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
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
const DASH = '—';

const currencyFormatter = new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    notation: 'compact',
    maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-NP');

const formatMoney = (value, compact = false) => {
    if (value === null || value === undefined || value === '') return DASH;
    return (compact ? compactCurrencyFormatter : currencyFormatter).format(Number(value || 0));
};

const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return DASH;
    return numberFormatter.format(Number(value || 0));
};

const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : DASH);
const toAmount = (value) => Number(value || 0);
const hasValue = (v) => v !== null && v !== undefined && v !== '';
const hasSeriesData = (items) => Array.isArray(items) && items.some((i) => toAmount(i.value) !== 0);

const visit = (url) => {
    if (url && url !== '#') router.visit(url);
};

export default function Dashboard() {
    const { token } = theme.useToken();
    const page = usePage();
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
            const response = await axios.get('/dashboard-data', {
                params: {
                    branch_id: filters.branch_id === 'all' ? undefined : filters.branch_id,
                    date_from: filters.date_from,
                    date_to: filters.date_to,
                },
            });
            setData(response.data || {});
        } catch (ex) {
            setError(ex?.response?.data?.message || 'Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const dashboard = useMemo(() => buildModel(data), [data]);
    const branches = data.branches || branchContext.branches || [];

    return (
        <AuthenticatedLayout
            header={
                <DashboardHeader
                    branches={branches}
                    filters={filters}
                    loading={loading}
                    onRefresh={fetchDashboard}
                    onFiltersChange={setFilters}
                />
            }
        >
            <Head title="Dashboard" />
            <DashboardStyles token={token} />

            <main className="kl-dash">
                <div className="kl-dash__wrap">
                    {error && (
                        <Alert
                            showIcon
                            type="error"
                            message="Dashboard could not be loaded"
                            description={error}
                            action={<Button onClick={fetchDashboard}>Retry</Button>}
                        />
                    )}

                    {loading ? (
                        <DashboardSkeleton />
                    ) : (
                        <>
                            <section className="kl-dash__top">
                                <FinancialPerformanceChart data={dashboard.chartData} />
                                <div className="kl-dash__kpi-grid">
                                    {dashboard.metrics.map((m) => (
                                        <MetricCard key={m.key} {...m} />
                                    ))}
                                </div>
                            </section>

                            <BankCashBalances
                                balances={dashboard.cashPosition}
                                accounts={dashboard.bankAccounts}
                            />

                            {dashboard.businessCards.length > 0 && (
                                <section className="kl-dash__biz-grid">
                                    {dashboard.businessCards.map((card) => (
                                        <BusinessOverviewCard key={card.key} card={card} />
                                    ))}
                                </section>
                            )}

                            <RecentTransactionsTable transactions={dashboard.recentTransactions} />

                            {dashboard.miniCharts.length > 0 && (
                                <section className="kl-dash__mini-row">
                                    {dashboard.miniCharts.map((chart) => (
                                        <MiniChartCard key={chart.key} chart={chart} />
                                    ))}
                                </section>
                            )}
                        </>
                    )}
                </div>
            </main>
        </AuthenticatedLayout>
    );
}

/* ─── Header ─── */

function DashboardHeader({ branches, filters, loading, onRefresh, onFiltersChange }) {
    return (
        <div className="kl-dh">
            <div className="kl-dh__copy">
                <Title level={4} className="kl-dh__title">Dashboard</Title>
                <Text type="secondary">Financial and business overview for the selected period</Text>
            </div>
            <div className="kl-dh__controls">
                <Select
                    value={filters.branch_id}
                    options={branchOptions(branches)}
                    className="kl-dh__branch"
                    onChange={(v) => onFiltersChange((c) => ({ ...c, branch_id: v || 'all' }))}
                />
                <RangePicker
                    value={
                        filters.date_from && filters.date_to
                            ? [dayjs(filters.date_from), dayjs(filters.date_to)]
                            : null
                    }
                    className="kl-dh__range"
                    onChange={(dates) =>
                        onFiltersChange((c) => ({
                            ...c,
                            date_from: dates?.[0]?.format('YYYY-MM-DD'),
                            date_to: dates?.[1]?.format('YYYY-MM-DD'),
                        }))
                    }
                />
                <Tooltip title="Refresh">
                    <Button icon={<ReloadOutlined spin={loading} />} onClick={onRefresh} />
                </Tooltip>
            </div>
        </div>
    );
}

/* ─── Financial Performance Chart ─── */

function FinancialPerformanceChart({ data }) {
    const hasData = data.some(
        (i) => toAmount(i.revenue) !== 0 || toAmount(i.expenses) !== 0 || toAmount(i.profit) !== 0,
    );

    return (
        <Card
            className="kl-card kl-chart-card"
            title={
                <div className="kl-card-title">
                    <span>Financial Performance</span>
                    <Text type="secondary">Revenue, expenses, and net profit trend</Text>
                </div>
            }
            styles={{ body: { padding: 20 } }}
        >
            {hasData ? (
                <div className="kl-chart-card__chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 18, bottom: 4, left: 0 }}>
                            <CartesianGrid stroke="var(--kl-border-soft)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--kl-muted)', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--kl-muted)', fontSize: 12 }}
                                tickFormatter={(v) => compactCurrencyFormatter.format(v)}
                                width={74}
                            />
                            <ChartTooltip content={<MoneyTooltip />} />
                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--kl-revenue)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--kl-expense)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="profit" name="Net Profit" stroke="var(--kl-profit)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <DashboardEmptyState
                    title="No financial movement yet"
                    description="Posted revenue and expense activity will appear here for the selected period."
                />
            )}
        </Card>
    );
}

function MoneyTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="kl-tooltip">
            <Text strong>{label}</Text>
            {payload.map((item) => (
                <div className="kl-tooltip__row" key={item.dataKey}>
                    <span style={{ background: item.color }} />
                    <Text type="secondary">{item.name}</Text>
                    <Text>{formatMoney(item.value)}</Text>
                </div>
            ))}
        </div>
    );
}

/* ─── Metric Card with Sparkline ─── */

function MetricCard({ label, value, helper, sparkline, tone }) {
    return (
        <Card className="kl-card kl-metric" styles={{ body: { padding: 20 } }}>
            <div className="kl-metric__body">
                <Text type="secondary" className="kl-metric__label">{label}</Text>
                <div className="kl-metric__value">{value}</div>
                <Text type="secondary" className="kl-metric__helper">{helper}</Text>
            </div>
            <MetricSparkline data={sparkline} tone={tone} />
        </Card>
    );
}

function MetricSparkline({ data, tone }) {
    if (!hasSeriesData(data)) return null;
    return (
        <div className="kl-spark" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={`var(--kl-${tone || 'primary'})`} stopOpacity={0.18} />
                            <stop offset="100%" stopColor={`var(--kl-${tone || 'primary'})`} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={`var(--kl-${tone || 'primary'})`}
                        strokeWidth={1.8}
                        fill={`url(#spark-${tone})`}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ─── Bank & Cash Balances ─── */

function BankCashBalances({ balances, accounts }) {
    return (
        <Card
            className="kl-card kl-bank"
            title={
                <div className="kl-card-title">
                    <span>Bank & Cash Balances</span>
                    <Text type="secondary">Recorded cash position and near-term balances</Text>
                </div>
            }
            styles={{ body: { padding: 22 } }}
        >
            <div className="kl-bank__tiles">
                {balances.map((b) => (
                    <div className="kl-tile" key={b.label}>
                        <Text type="secondary" className="kl-tile__label">{b.label}</Text>
                        <div className="kl-tile__value">{b.value}</div>
                        <Text type="secondary" className="kl-tile__helper">{b.helper}</Text>
                    </div>
                ))}
            </div>

            {accounts.length > 0 && (
                <div className="kl-bank__list">
                    {accounts.map((a) => (
                        <div className="kl-bank-row" key={a.key}>
                            <div className="kl-bank-row__info">
                                <Text className="kl-bank-row__name">{a.bank_name || DASH}</Text>
                                <Text type="secondary" className="kl-bank-row__meta">
                                    {[a.account_name, a.account_number].filter(Boolean).join(' / ') || DASH}
                                </Text>
                            </div>
                            <div className="kl-bank-row__bal">
                                <Text>{formatMoney(a.balance)}</Text>
                                {a.currency && <Text type="secondary">{a.currency}</Text>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

/* ─── Business Overview Card ─── */

function BusinessOverviewCard({ card }) {
    return (
        <Card className="kl-card kl-biz" styles={{ body: { padding: 20 } }}>
            <div className="kl-biz__head">
                <Title level={5}>{card.title}</Title>
                {card.href && (
                    <Button type="link" size="small" onClick={() => visit(card.href)}>
                        {card.linkText || 'View'}
                    </Button>
                )}
            </div>
            <div className="kl-biz__rows">
                {card.items.map((item) => (
                    <div className="kl-biz__row" key={item.label}>
                        <Text type="secondary">{item.label}</Text>
                        <Text strong>
                            {item.format === 'money'
                                ? formatMoney(item.value, true)
                                : item.format === 'text'
                                  ? (item.value || DASH)
                                  : formatNumber(item.value)}
                        </Text>
                    </div>
                ))}
            </div>
        </Card>
    );
}

/* ─── Recent Transactions Table ─── */

function RecentTransactionsTable({ transactions }) {
    const columns = [
        { title: 'Date', dataIndex: 'date', render: formatDate, width: 120 },
        { title: 'Type', dataIndex: 'type', width: 150 },
        {
            title: 'Number',
            dataIndex: 'number',
            render: (number, row) =>
                row.action_url ? (
                    <Button type="link" className="kl-tbl-link" onClick={(e) => { e.stopPropagation(); visit(row.action_url); }}>
                        {number || DASH}
                    </Button>
                ) : (number || DASH),
        },
        { title: 'Party', dataIndex: 'party', ellipsis: true, render: (v) => v || DASH },
        { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v) => formatMoney(v) },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 110,
            render: (s) => <span className="kl-pill">{s || 'posted'}</span>,
        },
    ];

    return (
        <Card
            className="kl-card kl-txn"
            title={
                <div className="kl-card-title">
                    <span>Recent Transactions</span>
                    <Text type="secondary">Latest financial and business documents</Text>
                </div>
            }
            styles={{ body: { padding: transactions.length > 0 ? 0 : 22 } }}
        >
            {transactions.length > 0 ? (
                <Table
                    rowKey="key"
                    columns={columns}
                    dataSource={transactions}
                    pagination={false}
                    scroll={{ x: 760 }}
                    onRow={(r) => ({
                        onClick: () => visit(r.action_url),
                        className: r.action_url ? 'kl-row--click' : '',
                    })}
                />
            ) : (
                <DashboardEmptyState
                    title="No recent transactions"
                    description="Posted invoices, bills, payments, expenses, journals, and cash transfers will appear here."
                    compact
                />
            )}
        </Card>
    );
}

/* ─── Mini Chart Card ─── */

function MiniChartCard({ chart }) {
    const AGEING_COLORS = ['var(--kl-primary)', '#64748b', '#f59e0b', '#ef4444', '#991b1b'];

    if (chart.type === 'bar') {
        const hasData = chart.data.some((d) => toAmount(d.amount) > 0);
        return (
            <Card className="kl-card kl-mini" styles={{ body: { padding: 20 } }}>
                <div className="kl-mini__head">
                    <Title level={5}>{chart.title}</Title>
                </div>
                {hasData ? (
                    <div className="kl-mini__chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart.data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: 'var(--kl-muted)', fontSize: 11 }} />
                                <YAxis hide />
                                <ChartTooltip content={<MiniBarTooltip />} />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={32}>
                                    {chart.data.map((_, i) => (
                                        <Cell key={i} fill={AGEING_COLORS[i % AGEING_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <DashboardEmptyState title="No data" description="No ageing data for this period." compact />
                )}
            </Card>
        );
    }

    if (chart.type === 'list') {
        return (
            <Card className="kl-card kl-mini" styles={{ body: { padding: 20 } }}>
                <div className="kl-mini__head">
                    <Title level={5}>{chart.title}</Title>
                </div>
                {chart.data.length > 0 ? (
                    <div className="kl-mini__list">
                        {chart.data.map((item, i) => (
                            <div className="kl-mini__list-row" key={i}>
                                <Text type="secondary" ellipsis>{item.name}</Text>
                                <Text strong>{formatMoney(item.amount, true)}</Text>
                            </div>
                        ))}
                    </div>
                ) : (
                    <DashboardEmptyState title="No data" description={`No ${chart.title.toLowerCase()} data.`} compact />
                )}
            </Card>
        );
    }

    return null;
}

function MiniBarTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="kl-tooltip">
            <Text strong>{d.bucket}</Text>
            <div className="kl-tooltip__row">
                <span style={{ background: payload[0].fill }} />
                <Text type="secondary">Amount</Text>
                <Text>{formatMoney(d.amount)}</Text>
            </div>
            {d.count !== undefined && (
                <div className="kl-tooltip__row">
                    <span style={{ background: 'transparent' }} />
                    <Text type="secondary">Count</Text>
                    <Text>{d.count}</Text>
                </div>
            )}
        </div>
    );
}

/* ─── Empty State ─── */

function DashboardEmptyState({ title, description, compact = false }) {
    return (
        <div className={`kl-empty ${compact ? 'kl-empty--sm' : ''}`}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false}>
                <Title level={5}>{title}</Title>
                <Text type="secondary">{description}</Text>
            </Empty>
        </div>
    );
}

/* ─── Skeleton ─── */

function DashboardSkeleton() {
    return (
        <div className="kl-skel">
            <section className="kl-dash__top">
                <Card className="kl-card"><Skeleton active paragraph={{ rows: 9 }} /></Card>
                <div className="kl-dash__kpi-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="kl-card" styles={{ body: { padding: 20 } }}>
                            <Skeleton active paragraph={{ rows: 2 }} />
                        </Card>
                    ))}
                </div>
            </section>
            <Card className="kl-card"><Skeleton active paragraph={{ rows: 4 }} /></Card>
            <Card className="kl-card"><Skeleton active paragraph={{ rows: 6 }} /></Card>
        </div>
    );
}

/* ─── Data Model Builder ─── */

function buildModel(data) {
    const fin = data.financial_summary || data.summary || {};
    const cp = data.cash_position || {};
    const sparklines = data.metric_sparklines || {};
    const chartRaw = data.revenue_expense_profit_chart || data.revenue_expense || [];

    const chartData = normalizeChart(chartRaw);

    const metrics = [
        {
            key: 'cash',
            label: 'Cash & Bank',
            value: formatMoney(fin.cash_bank_balance),
            helper: 'Across bank and cash accounts',
            sparkline: normSparkline(sparklines.cash_bank),
            tone: 'primary',
        },
        {
            key: 'receivables',
            label: 'Receivables',
            value: formatMoney(fin.receivables),
            helper: 'Outstanding customer balances',
            sparkline: normSparkline(sparklines.receivables),
            tone: 'success',
        },
        {
            key: 'payables',
            label: 'Payables',
            value: formatMoney(fin.payables),
            helper: 'Outstanding supplier balances',
            sparkline: normSparkline(sparklines.payables),
            tone: 'warning',
        },
        {
            key: 'profit',
            label: 'Net Profit',
            value: formatMoney(fin.net_profit),
            helper: 'Revenue minus expenses',
            sparkline: normSparkline(sparklines.net_profit),
            tone: 'profit',
        },
    ];

    const cashPosition = [
        { label: 'Bank balance', value: formatMoney(cp.bank_balance), helper: hasValue(cp.bank_balance) ? 'Recorded bank account balance' : 'No reliable bank balance available' },
        { label: 'Cash in hand', value: formatMoney(cp.cash_in_hand), helper: hasValue(cp.cash_in_hand) ? 'Cash accounts currently recorded' : 'No reliable cash balance available' },
        { label: 'Total cash position', value: formatMoney(cp.cash_bank_balance), helper: 'Bank balance plus cash in hand' },
        { label: 'Expected receivables', value: formatMoney(cp.expected_receivables), helper: 'Open customer balances' },
        { label: 'Upcoming payables', value: formatMoney(cp.upcoming_payables), helper: 'Supplier balances due in 14 days' },
    ];

    const bankAccounts = Array.isArray(cp.bank_accounts) ? cp.bank_accounts : [];
    const recentTransactions = Array.isArray(data.recent_transactions) ? data.recent_transactions : [];

    const businessCards = [];
    const sales = data.sales_summary;
    if (sales) {
        businessCards.push({
            key: 'sales', title: 'Sales', href: '/payment-in/invoices', linkText: 'View invoices',
            items: [
                { label: 'Sales this period', value: sales.sales_total, format: 'money' },
                { label: 'Invoices', value: sales.invoice_count },
                { label: 'Paid amount', value: sales.paid_amount, format: 'money' },
                { label: 'Unpaid amount', value: sales.unpaid_amount, format: 'money' },
                { label: 'Overdue amount', value: sales.overdue_amount, format: 'money' },
            ],
        });
    }
    const purchase = data.purchase_summary;
    if (purchase) {
        businessCards.push({
            key: 'purchase', title: 'Purchases', href: '/payment-out/purchase-bills', linkText: 'View purchase bills',
            items: [
                { label: 'Purchases this period', value: purchase.purchase_total, format: 'money' },
                { label: 'Bills', value: purchase.bill_count },
                { label: 'Paid bills', value: purchase.paid_amount, format: 'money' },
                { label: 'Unpaid bills', value: purchase.unpaid_amount, format: 'money' },
                { label: 'Upcoming payables', value: purchase.upcoming_payables, format: 'money' },
            ],
        });
    }
    const cf = data.cashflow_summary;
    if (cf) {
        const cfItems = [
            { label: 'Cash in', value: cf.cash_in, format: 'money' },
            { label: 'Cash out', value: cf.cash_out, format: 'money' },
            { label: 'Net cash flow', value: cf.net_cash_flow, format: 'money' },
        ];
        if (cf.biggest_inflow) cfItems.push({ label: 'Biggest inflow', value: cf.biggest_inflow, format: 'text' });
        if (cf.biggest_outflow) cfItems.push({ label: 'Biggest outflow', value: cf.biggest_outflow, format: 'text' });
        businessCards.push({ key: 'cashflow', title: 'Cash Flow', items: cfItems });
    }
    const inv = data.inventory_summary;
    if (inv) {
        businessCards.push({
            key: 'inventory', title: 'Inventory', href: '/inventory/products', linkText: 'View inventory',
            items: [
                { label: 'Total products', value: inv.total_products },
                { label: 'Low stock items', value: inv.low_stock_items },
                { label: 'Inventory value', value: inv.inventory_value, format: 'money' },
                { label: 'Warehouses', value: inv.warehouse_count },
            ],
        });
    }
    const crm = data.crm_summary;
    if (crm) {
        businessCards.push({
            key: 'crm', title: 'CRM', href: '/crm', linkText: 'View CRM',
            items: [
                { label: 'Open leads', value: crm.open_leads },
                { label: 'Open deals', value: crm.open_deals },
                { label: 'Pipeline value', value: crm.pipeline_value, format: 'money' },
                { label: 'Won this period', value: crm.won_value, format: 'money' },
            ],
        });
    }
    const hrm = data.hrm_summary;
    if (hrm) {
        const hrmItems = [{ label: 'Active employees', value: hrm.active_employees }];
        if (hrm.on_leave_today > 0) hrmItems.push({ label: 'On leave today', value: hrm.on_leave_today });
        if (hrm.attendance_today > 0) hrmItems.push({ label: 'Attendance today', value: hrm.attendance_today });
        if (hrm.payroll_this_period > 0) hrmItems.push({ label: 'Payroll this period', value: hrm.payroll_this_period, format: 'money' });
        businessCards.push({ key: 'hrm', title: 'HRM', href: '/hrm/users', linkText: 'View HRM', items: hrmItems });
    }
    const proj = data.project_summary;
    if (proj) {
        const projItems = [
            { label: 'Active projects', value: proj.active_projects },
            { label: 'Completed this period', value: proj.completed_this_period },
        ];
        if (proj.overdue_tasks > 0) projItems.push({ label: 'Overdue project tasks', value: proj.overdue_tasks });
        if (proj.billing_value > 0) projItems.push({ label: 'Project billing value', value: proj.billing_value, format: 'money' });
        businessCards.push({ key: 'projects', title: 'Projects', href: '/hrm/projects', linkText: 'View projects', items: projItems });
    }

    const miniCharts = [];
    const recAge = data.receivable_ageing;
    if (Array.isArray(recAge) && recAge.some((b) => b.amount > 0)) {
        miniCharts.push({ key: 'rec-age', title: 'Receivables Ageing', type: 'bar', data: recAge });
    }
    const payAge = data.payable_ageing;
    if (Array.isArray(payAge) && payAge.some((b) => b.amount > 0)) {
        miniCharts.push({ key: 'pay-age', title: 'Payables Ageing', type: 'bar', data: payAge });
    }
    const topCust = data.top_customers;
    if (Array.isArray(topCust) && topCust.length > 0) {
        miniCharts.push({ key: 'top-cust', title: 'Top Customers', type: 'list', data: topCust });
    }
    const topSupp = data.top_suppliers;
    if (Array.isArray(topSupp) && topSupp.length > 0) {
        miniCharts.push({ key: 'top-supp', title: 'Top Suppliers', type: 'list', data: topSupp });
    }

    return { chartData, metrics, cashPosition, bankAccounts, recentTransactions, businessCards, miniCharts };
}

function normalizeChart(items) {
    if (!Array.isArray(items)) return [];
    return items.map((i) => ({
        date: i.date,
        label: i.date ? dayjs(i.date).format('DD MMM') : i.bucket || '',
        revenue: toAmount(i.revenue),
        expenses: toAmount(i.expenses),
        profit: toAmount(i.profit),
    }));
}

function normSparkline(items) {
    if (!Array.isArray(items)) return [];
    return items.map((i) => ({ date: i.date, value: toAmount(i.value) }));
}

function branchOptions(branches) {
    const items = Array.isArray(branches) ? branches : [];
    return [
        { value: 'all', label: 'All branches' },
        ...items.map((b) => ({
            value: b.value ?? b.id,
            label: b.label ?? b.name ?? `Branch #${b.id}`,
        })),
    ];
}

/* ─── Styles ─── */

function DashboardStyles({ token }) {
    return (
        <style>{`
            .kl-dash {
                --kl-bg: ${token.colorBgLayout};
                --kl-card: ${token.colorBgContainer};
                --kl-card-muted: ${token.colorFillQuaternary || token.colorFillTertiary};
                --kl-border: ${token.colorBorderSecondary};
                --kl-border-soft: ${token.colorSplit || token.colorBorderSecondary};
                --kl-text: ${token.colorText};
                --kl-muted: ${token.colorTextSecondary};
                --kl-primary: ${token.colorPrimary};
                --kl-success: ${token.colorSuccess};
                --kl-warning: ${token.colorWarningText || token.colorWarning};
                --kl-profit: ${token.colorInfo || token.colorPrimary};
                --kl-revenue: ${token.colorPrimary};
                --kl-expense: ${token.colorWarningText || token.colorWarning};
                --kl-hover: ${token.controlItemBgHover};
                --kl-shadow: ${token.boxShadowTertiary || '0 1px 3px rgba(0,0,0,.04)'};
                min-height: calc(100vh - 96px);
                background: var(--kl-bg);
                padding: clamp(16px, 2.5vw, 32px);
            }

            .kl-dash__wrap {
                width: min(1440px, 100%);
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            /* ─ Header ─ */
            .kl-dh {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
            }
            .kl-dh__copy { min-width: 220px; }
            .kl-dh__title { margin: 0 0 2px !important; font-weight: 650 !important; }
            .kl-dh__controls {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex-wrap: wrap;
                gap: 10px;
            }
            .kl-dh__branch { width: 180px; }
            .kl-dh__range { width: 270px; }

            /* ─ Top Section 60/40 ─ */
            .kl-dash__top {
                display: grid;
                grid-template-columns: minmax(0, 3fr) minmax(340px, 2fr);
                gap: 18px;
                align-items: stretch;
            }
            .kl-dash__kpi-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 14px;
            }

            /* ─ Card base ─ */
            .kl-card {
                background: var(--kl-card) !important;
                border: 1px solid var(--kl-border) !important;
                border-radius: 16px !important;
                box-shadow: var(--kl-shadow) !important;
            }
            .kl-card .ant-card-head {
                min-height: 64px;
                border-bottom-color: var(--kl-border-soft);
                padding: 0 22px;
            }
            .kl-card-title {
                display: flex;
                flex-direction: column;
                gap: 2px;
                line-height: 1.25;
                font-weight: 650;
            }
            .kl-card-title .ant-typography { font-size: 12px; font-weight: 400; }

            /* ─ Financial Chart ─ */
            .kl-chart-card__chart { height: 380px; min-width: 0; }

            /* ─ Tooltip ─ */
            .kl-tooltip {
                min-width: 190px;
                padding: 12px;
                background: var(--kl-card);
                border: 1px solid var(--kl-border);
                border-radius: 12px;
                box-shadow: var(--kl-shadow);
            }
            .kl-tooltip__row {
                display: grid;
                grid-template-columns: 8px 1fr auto;
                align-items: center;
                gap: 8px;
                margin-top: 6px;
            }
            .kl-tooltip__row span:first-child {
                width: 8px; height: 8px; border-radius: 50%;
            }

            /* ─ Metric Card ─ */
            .kl-metric { min-height: 180px; overflow: hidden; }
            .kl-metric .ant-card-body { height: 100%; position: relative; }
            .kl-metric__body {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                min-height: 140px;
            }
            .kl-metric__label { display: block; font-size: 13px; font-weight: 500; }
            .kl-metric__value {
                color: var(--kl-text);
                font-size: clamp(22px, 2vw, 28px);
                font-weight: 680;
                line-height: 1.15;
                margin-top: 10px;
                overflow-wrap: anywhere;
            }
            .kl-metric__helper {
                display: block;
                margin-top: auto;
                padding-top: 10px;
                font-size: 12px;
                line-height: 1.4;
            }

            /* ─ Sparkline ─ */
            .kl-spark {
                position: absolute;
                right: 0; bottom: 0;
                width: 72%; height: 68px;
                opacity: 0.25;
                pointer-events: none;
            }

            /* ─ Bank & Cash ─ */
            .kl-bank__tiles {
                display: grid;
                grid-template-columns: repeat(5, minmax(0, 1fr));
                gap: 12px;
            }
            .kl-tile {
                background: var(--kl-card-muted);
                border: 1px solid var(--kl-border-soft);
                border-radius: 14px;
                padding: 16px;
                min-width: 0;
            }
            .kl-tile__label { display: block; font-size: 12px; font-weight: 500; }
            .kl-tile__value {
                color: var(--kl-text);
                font-size: 19px;
                font-weight: 650;
                line-height: 1.15;
                margin-top: 8px;
                overflow-wrap: anywhere;
            }
            .kl-tile__helper { display: block; font-size: 12px; line-height: 1.4; margin-top: 8px; }

            .kl-bank__list { margin-top: 18px; border-top: 1px solid var(--kl-border-soft); }
            .kl-bank-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 18px;
                padding: 12px 0;
                border-bottom: 1px solid var(--kl-border-soft);
            }
            .kl-bank-row:last-child { border-bottom: 0; padding-bottom: 0; }
            .kl-bank-row__info { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
            .kl-bank-row__name { color: var(--kl-text); font-weight: 600; }
            .kl-bank-row__meta { font-size: 12px; }
            .kl-bank-row__bal { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap; }
            .kl-bank-row__bal .ant-typography:first-child { color: var(--kl-text); font-weight: 650; }

            /* ─ Business Cards Grid ─ */
            .kl-dash__biz-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 14px;
            }
            .kl-biz__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 12px;
            }
            .kl-biz__head h5 { margin: 0 !important; font-weight: 650 !important; font-size: 14px !important; }
            .kl-biz__head .ant-btn { padding: 0; height: auto; font-weight: 600; font-size: 13px; }
            .kl-biz__rows { display: flex; flex-direction: column; gap: 8px; }
            .kl-biz__row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 10px;
                font-size: 13px;
            }

            /* ─ Recent Transactions ─ */
            .kl-tbl-link { height: auto; padding: 0; font-weight: 600; }
            .kl-row--click { cursor: pointer; }
            .kl-row--click:hover td { background: var(--kl-hover) !important; }
            .kl-pill {
                display: inline-flex;
                align-items: center;
                padding: 2px 9px;
                border: 1px solid var(--kl-border);
                border-radius: 999px;
                color: var(--kl-muted);
                background: var(--kl-card-muted);
                font-size: 12px;
                line-height: 1.4;
                text-transform: capitalize;
            }

            /* ─ Mini Charts Row ─ */
            .kl-dash__mini-row {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 14px;
            }
            .kl-mini__head { margin-bottom: 12px; }
            .kl-mini__head h5 { margin: 0 !important; font-weight: 650 !important; font-size: 14px !important; }
            .kl-mini__chart { height: 180px; }
            .kl-mini__list { display: flex; flex-direction: column; gap: 8px; }
            .kl-mini__list-row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 10px;
                font-size: 13px;
            }

            /* ─ Empty State ─ */
            .kl-empty {
                min-height: 280px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 24px 16px;
            }
            .kl-empty--sm { min-height: 160px; }
            .kl-empty .ant-empty { margin: 0; }
            .kl-empty h5 { margin: 0 0 6px !important; }

            /* ─ Skeleton ─ */
            .kl-skel { display: flex; flex-direction: column; gap: 18px; }

            /* ─ Responsive ─ */
            @media (max-width: 1180px) {
                .kl-dash__top { grid-template-columns: minmax(0, 1fr); }
                .kl-bank__tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            }
            @media (max-width: 768px) {
                .kl-dash { padding: 14px; }
                .kl-dh { align-items: flex-start; flex-direction: column; }
                .kl-dh__controls { width: 100%; justify-content: flex-start; }
                .kl-dh__branch, .kl-dh__range { width: 100%; flex: 1 1 220px; }
                .kl-dash__kpi-grid { grid-template-columns: minmax(0, 1fr); }
                .kl-bank__tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .kl-chart-card__chart { height: 300px; }
                .kl-dash__biz-grid { grid-template-columns: minmax(0, 1fr); }
                .kl-dash__mini-row { grid-template-columns: minmax(0, 1fr); }
            }
            @media (max-width: 540px) {
                .kl-bank__tiles { grid-template-columns: minmax(0, 1fr); }
                .kl-bank-row { align-items: flex-start; flex-direction: column; gap: 6px; }
                .kl-bank-row__bal { align-items: flex-start; }
                .kl-metric { min-height: 160px; }
            }
        `}</style>
    );
}
