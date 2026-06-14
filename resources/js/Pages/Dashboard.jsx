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
    Tabs,
    Tag,
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
import { useTrans } from '@/lib/i18n';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const DASH = '-';

const THEME_COLOURS = {
    primary: 'var(--kd-primary)',
    primaryActive: 'var(--kd-primary-active)',
    success: 'var(--kd-success)',
    warning: 'var(--kd-warning)',
    error: 'var(--kd-error)',
    info: 'var(--kd-info)',
    text: 'var(--kd-text)',
    muted: 'var(--kd-muted)',
};

const PIE_PALETTE = [
    THEME_COLOURS.primary,
    THEME_COLOURS.success,
    THEME_COLOURS.warning,
    THEME_COLOURS.info,
    THEME_COLOURS.primaryActive,
    THEME_COLOURS.error,
    THEME_COLOURS.muted,
];

const currFmt = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', notation: 'compact', maximumFractionDigits: 1 });
const numFmt = new Intl.NumberFormat('en-NP');

const fmtMoney = (v, compact) => (v == null || v === '' ? DASH : (compact ? compactFmt : currFmt).format(Number(v || 0)));
const fmtNum = (v) => (v == null || v === '' ? DASH : numFmt.format(Number(v || 0)));
const fmtDate = (v) => (v ? dayjs(v).format('DD MMM YYYY') : DASH);
const toNum = (v) => Number(v || 0);
const visit = (url) => { if (url && url !== '#') router.visit(url); };

function calcTrend(sparkline) {
    if (!sparkline || sparkline.length < 6) return null;
    const mid = Math.floor(sparkline.length / 2);
    const earlier = sparkline.slice(0, mid);
    const recent = sparkline.slice(mid);
    const sumE = earlier.reduce((s, d) => s + toNum(d.value), 0);
    const sumR = recent.reduce((s, d) => s + toNum(d.value), 0);
    if (sumE === 0) return sumR > 0 ? 100 : null;
    return ((sumR - sumE) / Math.abs(sumE)) * 100;
}

export default function Dashboard() {
    const t = useTrans();
    const { token } = theme.useToken();
    const page = usePage();
    const bc = page.props.branchContext || {};
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({});
    const [filters, setFilters] = useState({
        branch_id: bc.selectedBranchId || 'all',
        date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
        date_to: dayjs().format('YYYY-MM-DD'),
    });

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await axios.get('/dashboard-data', {
                params: {
                    branch_id: filters.branch_id === 'all' ? undefined : filters.branch_id,
                    date_from: filters.date_from,
                    date_to: filters.date_to,
                },
            });
            setData(r.data || {});
        } catch (ex) {
            setError(ex?.response?.data?.message || t('Unable to load dashboard data.'));
        } finally {
            setLoading(false);
        }
    }, [filters, t]);

    useEffect(() => { fetch(); }, [fetch]);

    const m = useMemo(() => buildModel(data), [data]);
    const branches = data.branches || bc.branches || [];

    return (
        <AuthenticatedLayout
            header={<DashHeader branches={branches} filters={filters} loading={loading} onRefresh={fetch} onChange={setFilters} />}
        >
            <Head title={t('Dashboard')} />
            <Styles token={token} />
            <main className="kd">
                <div className="kd-wrap">
                    {error && (
                        <Alert showIcon type="error" message={t('Dashboard could not be loaded')} description={error}
                            action={<Button onClick={fetch}>{t('Retry')}</Button>} />
                    )}
                    {loading ? <DashSkeleton /> : (
                        <>
                            {/* KPI Strip */}
                            <section className="kd-kpis">
                                {m.kpis.map((k) => <KpiCard key={k.key} {...k} />)}
                            </section>

                            {/* Row 2: Financial + Expense Breakdown */}
                            <section className="kd-row-2">
                                <FinancialChart data={m.chartData} />
                                <ExpenseDonut data={m.expenseBreakdown} />
                            </section>

                            {/* Row 3: Cash Flow + Ageing */}
                            <section className="kd-row-3">
                                <CashFlowChart data={m.cashflowChart} />
                                <AgeingChart data={m.ageingData} />
                            </section>

                            {/* Business Cards */}
                            {m.bizCards.length > 0 && (
                                <section className="kd-biz-grid">
                                    {m.bizCards.map((c) => <BizCard key={c.key} card={c} />)}
                                </section>
                            )}

                            <ProjectDeadlines approaching={m.approachingProjects} overdue={m.overdueProjects} />

                            {/* Transactions Table */}
                            <TxnTable transactions={m.transactions} />

                            {/* Bottom: Top Parties + Bank Accounts */}
                            <section className="kd-bottom">
                                {m.topCustomers.length > 0 && <TopPartiesBar title="Top Customers" data={m.topCustomers} color={THEME_COLOURS.primary} />}
                                {m.topSuppliers.length > 0 && <TopPartiesBar title="Top Suppliers" data={m.topSuppliers} color={THEME_COLOURS.warning} />}
                                {m.bankAccounts.length > 0 && <BankList accounts={m.bankAccounts} />}
                            </section>
                        </>
                    )}
                </div>
            </main>
        </AuthenticatedLayout>
    );
}

function DashHeader({ branches, filters, loading, onRefresh, onChange }) {
    const opts = [{ value: 'all', label: 'All branches' }, ...(branches || []).map((b) => ({
        value: b.value ?? b.id, label: b.label ?? b.name ?? `Branch #${b.id}`,
    }))];
    return (
        <div className="kd-hdr">
            <div>
                <Title level={5} style={{ margin: '0 0 1px', fontWeight: 650 }}>Dashboard</Title>
                <Text type="secondary" style={{ fontSize: 11 }}>Financial overview for the selected period</Text>
            </div>
            <div className="kd-hdr__ctl">
                <Select value={filters.branch_id} options={opts} style={{ width: 150 }}
                    onChange={(v) => onChange((c) => ({ ...c, branch_id: v || 'all' }))} />
                <RangePicker
                    value={filters.date_from && filters.date_to ? [dayjs(filters.date_from), dayjs(filters.date_to)] : null}
                    style={{ width: 230 }}
                    onChange={(d) => onChange((c) => ({ ...c, date_from: d?.[0]?.format('YYYY-MM-DD'), date_to: d?.[1]?.format('YYYY-MM-DD') }))}
                />
                <Tooltip title="Refresh"><Button size="small" icon={<ReloadOutlined spin={loading} />} onClick={onRefresh} /></Tooltip>
            </div>
        </div>
    );
}

function KpiCard({ label, value, sparkline, color, trend, invertTrend, helper }) {
    const isUp = trend > 0;
    const trendColor = invertTrend
        ? (isUp ? THEME_COLOURS.error : THEME_COLOURS.success)
        : (isUp ? THEME_COLOURS.success : THEME_COLOURS.error);
    const hasSpark = Array.isArray(sparkline) && sparkline.some((d) => toNum(d.value) !== 0);
    const gradientId = `kpi-g-${String(label || 'metric').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    return (
        <Card
            className="kd-card kd-kpi"
            style={{ '--kd-accent': color }}
            styles={{ body: { padding: 0, height: '100%', position: 'relative', overflow: 'hidden' } }}
        >
            <div className="kd-kpi__accent" />
            <div className="kd-kpi__content">
                <div className="kd-kpi__top">
                    <Text type="secondary" className="kd-kpi__label">{label}</Text>
                    {trend != null && (
                        <span className="kd-kpi__trend" style={{ '--kd-trend': trendColor }}>
                            {isUp ? '+' : '-'}{Math.abs(trend).toFixed(1)}%
                        </span>
                    )}
                </div>
                <div className="kd-kpi__val">{fmtMoney(value)}</div>
                {helper && <Text type="secondary" className="kd-kpi__helper">{helper}</Text>}
            </div>
            {hasSpark && (
                <div className="kd-kpi__spark" aria-hidden>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkline}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.04} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={1.6}
                                fill={`url(#${gradientId})`}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}


function FinancialChart({ data }) {
    const hasData = data.some((d) => toNum(d.revenue) || toNum(d.expenses) || toNum(d.profit));

    return (
        <Card className="kd-card kd-chart-main" styles={{ body: { padding: 8 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Financial Performance</span>
                <Text type="secondary" style={{ fontSize: 11 }}>Revenue, expenses & net profit trend</Text>
            </div>
            {hasData ? (
                <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 9 }}
                                tickFormatter={(v) => compactFmt.format(v)} width={58} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke={THEME_COLOURS.primary} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="expenses" name="Expenses" stroke={THEME_COLOURS.warning} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="profit" name="Net Profit" stroke={THEME_COLOURS.success} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title="No financial data" desc="Revenue and expense activity will appear here." />
            )}
        </Card>
    );
}

function ExpenseDonut({ data }) {
    const total = data.reduce((s, d) => s + toNum(d.value), 0);

    return (
        <Card className="kd-card kd-chart-side" styles={{ body: { padding: 8 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Expense Breakdown</span>
                <Text type="secondary" style={{ fontSize: 11 }}>Where your money goes</Text>
            </div>
            {data.length > 0 && total > 0 ? (
                <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%"
                                innerRadius="52%" outerRadius="78%" paddingAngle={2} strokeWidth={0}>
                                {data.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                            </Pie>
                            <ChartTooltip content={<PieTip total={total} />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, lineHeight: '16px' }}
                                formatter={(val) => <span style={{ color: 'var(--kd-text)', fontSize: 10 }}>{val}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title="No expense data" desc="Expense categories will appear here." compact />
            )}
        </Card>
    );
}

function PieTip({ active, payload, total }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = total > 0 ? ((toNum(d.value) / total) * 100).toFixed(1) : 0;
    return (
        <div className="kd-tip">
            <Text strong>{d.name}</Text>
            <div className="kd-tip__row">
                <span style={{ background: d.payload?.fill }} />
                <Text type="secondary">Amount</Text>
                <Text>{fmtMoney(d.value)}</Text>
            </div>
            <div className="kd-tip__row">
                <span style={{ background: 'var(--kd-border)' }} />
                <Text type="secondary">Share</Text>
                <Text>{pct}%</Text>
            </div>
        </div>
    );
}

function CashFlowChart({ data }) {
    const hasData = data.some((d) => toNum(d.cash_in) || toNum(d.cash_out));

    return (
        <Card className="kd-card kd-chart-main" styles={{ body: { padding: 8 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Cash Flow</span>
                <Text type="secondary" style={{ fontSize: 11 }}>Daily cash inflows and outflows</Text>
            </div>
            {hasData ? (
                <div style={{ height: 170 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 9 }}
                                tickFormatter={(v) => compactFmt.format(v)} width={58} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                            <Line type="monotone" dataKey="cash_in" name="Cash In" stroke={THEME_COLOURS.info} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="cash_out" name="Cash Out" stroke={THEME_COLOURS.error} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="net" name="Net" stroke={THEME_COLOURS.primaryActive} strokeWidth={1.8} strokeDasharray="6 3" dot={false} activeDot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title="No cash flow data" desc="Cash inflows and outflows will appear here." />
            )}
        </Card>
    );
}

function AgeingChart({ data }) {
    const hasData = data.some((d) => toNum(d.receivables) > 0 || toNum(d.payables) > 0);

    return (
        <Card className="kd-card kd-chart-side" styles={{ body: { padding: 8 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Receivables vs Payables Ageing</span>
                <Text type="secondary" style={{ fontSize: 11 }}>Outstanding amounts by age</Text>
            </div>
            {hasData ? (
                <div style={{ height: 170 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 9 }}
                                tickFormatter={(v) => compactFmt.format(v)} width={52} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                            <Bar dataKey="receivables" name="Receivables" fill={THEME_COLOURS.info} radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="payables" name="Payables" fill={THEME_COLOURS.warning} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title="No ageing data" desc="Receivable and payable ageing will appear here." compact />
            )}
        </Card>
    );
}

function MoneyTip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="kd-tip">
            <Text strong style={{ fontSize: 11 }}>{label}</Text>
            {payload.map((p) => (
                <div className="kd-tip__row" key={p.dataKey}>
                    <span style={{ background: p.color || p.fill }} />
                    <Text type="secondary">{p.name}</Text>
                    <Text>{fmtMoney(p.value)}</Text>
                </div>
            ))}
        </div>
    );
}

function BizCard({ card }) {
    return (
        <Card className="kd-card kd-biz" styles={{ body: { padding: 8 } }}>
            <div className="kd-biz__head">
                <Text strong style={{ fontSize: 12, fontWeight: 650 }}>{card.title}</Text>
                {card.href && <Button type="link" size="small" style={{ padding: 0, fontSize: 11, fontWeight: 600 }} onClick={() => visit(card.href)}>{card.linkText || 'View'}</Button>}
            </div>
            <div className="kd-biz__rows">
                {card.items.map((i) => (
                    <div className="kd-biz__row" key={i.label}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{i.label}</Text>
                        <Text strong style={{ fontSize: 11 }}>
                            {i.format === 'money' ? fmtMoney(i.value, true) : i.format === 'text' ? (i.value || DASH) : fmtNum(i.value)}
                        </Text>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function TxnTable({ transactions }) {
    const cols = [
        { title: 'Date', dataIndex: 'date', render: fmtDate, width: 110 },
        { title: 'Type', dataIndex: 'type', width: 140 },
        {
            title: 'Number', dataIndex: 'number',
            render: (n, r) => r.action_url
                ? <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); visit(r.action_url); }}>{n || DASH}</Button>
                : (n || DASH),
        },
        { title: 'Party', dataIndex: 'party', ellipsis: true, render: (v) => v || DASH },
        { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v) => fmtMoney(v) },
        {
            title: 'Status', dataIndex: 'status', width: 100,
            render: (s) => <span className="kd-pill">{s || 'posted'}</span>,
        },
    ];

    return (
        <Card className="kd-card" styles={{ body: { padding: transactions.length ? 0 : 8 } }}>
            <div className="kd-card-hdr" style={{ padding: transactions.length ? '8px' : 0, borderBottom: transactions.length ? '1px solid var(--kd-grid)' : 'none' }}>
                <span className="kd-card-hdr__t">Recent Transactions</span>
                <Text type="secondary" style={{ fontSize: 11 }}>Latest financial documents</Text>
            </div>
            {transactions.length > 0 ? (
                <Table rowKey="key" columns={cols} dataSource={transactions} pagination={false} size="small"
                    scroll={{ x: 700 }} onRow={(r) => ({ onClick: () => visit(r.action_url), className: r.action_url ? 'kd-row--click' : '' })} />
            ) : (
                <EmptyState title="No recent transactions" desc="Posted documents will appear here." compact />
            )}
        </Card>
    );
}

function TopPartiesBar({ title, data, color }) {
    const chartData = data.slice(0, 5).map((d) => ({ ...d, name: truncate(d.name, 18) }));

    return (
        <Card className="kd-card" styles={{ body: { padding: 8 } }}>
            <div className="kd-card-hdr" style={{ marginBottom: 10 }}>
                <span className="kd-card-hdr__t">{title}</span>
            </div>
            <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 4 }}>
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 9 }}
                            tickFormatter={(v) => compactFmt.format(v)} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={96}
                            tick={{ fill: 'var(--kd-text)', fontSize: 10 }} />
                        <ChartTooltip content={<MoneyTip />} />
                        <Bar dataKey="amount" name="Amount" fill={color} radius={[0, 4, 4, 0]} maxBarSize={16} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function BankList({ accounts }) {
    return (
        <Card className="kd-card" styles={{ body: { padding: 8 } }}>
            <div className="kd-card-hdr" style={{ marginBottom: 10 }}>
                <span className="kd-card-hdr__t">Bank Accounts</span>
            </div>
            <div className="kd-bank-list">
                {accounts.map((a) => (
                    <div className="kd-bank-row" key={a.key}>
                        <div style={{ minWidth: 0 }}>
                            <Text style={{ fontWeight: 600, fontSize: 13 }} ellipsis>{a.bank_name || DASH}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis>
                                {[a.account_name, a.account_number].filter(Boolean).join(' / ') || DASH}
                            </Text>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Text style={{ fontWeight: 650, fontSize: 13 }}>{fmtMoney(a.balance)}</Text>
                            {a.currency && <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{a.currency}</Text>}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function EmptyState({ title, desc, compact }) {
    return (
        <div style={{ minHeight: compact ? 105 : 170, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 10 }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false}>
                <Title level={5} style={{ margin: '0 0 4px' }}>{title}</Title>
                <Text type="secondary" style={{ fontSize: 11 }}>{desc}</Text>
            </Empty>
        </div>
    );
}

function DashSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="kd-kpis">{[1, 2, 3, 4, 5, 6].map((i) => <Card key={i} className="kd-card" styles={{ body: { padding: 8 } }}><Skeleton active paragraph={{ rows: 2 }} /></Card>)}</div>
            <div className="kd-row-2">
                <Card className="kd-card"><Skeleton active paragraph={{ rows: 8 }} /></Card>
                <Card className="kd-card"><Skeleton active paragraph={{ rows: 8 }} /></Card>
            </div>
            <Card className="kd-card"><Skeleton active paragraph={{ rows: 5 }} /></Card>
        </div>
    );
}

function buildModel(data) {
    const fin = data.financial_summary || {};
    const sparklines = data.metric_sparklines || {};
    const chartRaw = data.revenue_expense_profit_chart || [];
    const cashflowRaw = data.cashflow_chart || [];

    const chartData = chartRaw.map((d) => ({
        date: d.date,
        label: d.date ? dayjs(d.date).format('DD MMM') : '',
        revenue: toNum(d.revenue),
        expenses: toNum(d.expenses),
        profit: toNum(d.profit),
    }));

    const cashflowChart = cashflowRaw.map((d) => ({
        date: d.date,
        label: d.date ? dayjs(d.date).format('DD MMM') : '',
        cash_in: toNum(d.cash_in),
        cash_out: toNum(d.cash_out),
        net: toNum(d.net),
    }));

    const revSparkline = chartRaw.map((d) => ({ date: d.date, value: toNum(d.revenue) }));
    const expSparkline = chartRaw.map((d) => ({ date: d.date, value: toNum(d.expenses) }));
    const profitSparkline = (sparklines.net_profit || []).map((d) => ({ date: d.date, value: toNum(d.value) }));
    const cashSparkline = (sparklines.cash_bank || []).map((d) => ({ date: d.date, value: toNum(d.value) }));
    const recSparkline = (sparklines.receivables || []).map((d) => ({ date: d.date, value: toNum(d.value) }));
    const paySparkline = (sparklines.payables || []).map((d) => ({ date: d.date, value: toNum(d.value) }));

    const kpis = [
        { key: 'revenue', label: 'Revenue', value: fin.revenue, sparkline: revSparkline, color: THEME_COLOURS.primary, trend: calcTrend(revSparkline), helper: 'This period' },
        { key: 'expenses', label: 'Expenses', value: fin.expenses, sparkline: expSparkline, color: THEME_COLOURS.warning, trend: calcTrend(expSparkline), invertTrend: true, helper: 'This period' },
        { key: 'profit', label: 'Net Profit', value: fin.net_profit, sparkline: profitSparkline, color: THEME_COLOURS.success, trend: calcTrend(profitSparkline) },
        { key: 'cash', label: 'Cash & Bank', value: fin.cash_bank_balance, sparkline: cashSparkline, color: THEME_COLOURS.info, trend: calcTrend(cashSparkline), helper: 'Available' },
        { key: 'receivables', label: 'Receivables', value: fin.receivables, sparkline: recSparkline, color: THEME_COLOURS.info, helper: 'Outstanding' },
        { key: 'payables', label: 'Payables', value: fin.payables, sparkline: paySparkline, color: THEME_COLOURS.error, helper: 'Outstanding' },
    ];

    const expenseBreakdown = data.expense_breakdown || [];

    const ageingData = mergeAgeing(data.receivable_ageing, data.payable_ageing);

    const cp = data.cash_position || {};
    const bankAccounts = Array.isArray(cp.bank_accounts) ? cp.bank_accounts : [];
    const transactions = Array.isArray(data.recent_transactions) ? data.recent_transactions : [];
    const topCustomers = Array.isArray(data.top_customers) ? data.top_customers : [];
    const topSuppliers = Array.isArray(data.top_suppliers) ? data.top_suppliers : [];

    const bizCards = [];
    const sales = data.sales_summary;
    if (sales) {
        bizCards.push({
            key: 'sales', title: 'Sales', href: '/payment-in/invoices', linkText: 'View invoices',
            items: [
                { label: 'Total sales', value: sales.sales_total, format: 'money' },
                { label: 'Invoices', value: sales.invoice_count },
                { label: 'Paid', value: sales.paid_amount, format: 'money' },
                { label: 'Unpaid', value: sales.unpaid_amount, format: 'money' },
                { label: 'Overdue', value: sales.overdue_amount, format: 'money' },
            ],
        });
    }
    const purchase = data.purchase_summary;
    if (purchase) {
        bizCards.push({
            key: 'purchase', title: 'Purchases', href: '/payment-out/purchase-bills', linkText: 'View bills',
            items: [
                { label: 'Total purchases', value: purchase.purchase_total, format: 'money' },
                { label: 'Bills', value: purchase.bill_count },
                { label: 'Paid', value: purchase.paid_amount, format: 'money' },
                { label: 'Unpaid bills', value: purchase.unpaid_amount, format: 'money' },
                { label: 'Expense payables', value: purchase.expense_payables, format: 'money' },
                { label: 'Total payables', value: purchase.total_payables ?? purchase.unpaid_amount, format: 'money' },
                { label: 'Upcoming', value: purchase.upcoming_payables, format: 'money' },
            ],
        });
    }
    const cf = data.cashflow_summary;
    if (cf) {
        const items = [
            { label: 'Cash in', value: cf.cash_in, format: 'money' },
            { label: 'Cash out', value: cf.cash_out, format: 'money' },
            { label: 'Net cash flow', value: cf.net_cash_flow, format: 'money' },
        ];
        if (cf.biggest_inflow) items.push({ label: 'Top inflow', value: cf.biggest_inflow, format: 'text' });
        if (cf.biggest_outflow) items.push({ label: 'Top outflow', value: cf.biggest_outflow, format: 'text' });
        bizCards.push({ key: 'cashflow', title: 'Cash Flow', items });
    }
    const inv = data.inventory_summary;
    if (inv) {
        bizCards.push({
            key: 'inventory', title: 'Inventory', href: '/inventory/products', linkText: 'View',
            items: [
                { label: 'Products', value: inv.total_products },
                { label: 'Low stock', value: inv.low_stock_items },
                { label: 'Value', value: inv.inventory_value, format: 'money' },
                { label: 'Warehouses', value: inv.warehouse_count },
            ],
        });
    }
    const crm = data.crm_summary;
    if (crm) {
        bizCards.push({
            key: 'crm', title: 'CRM', href: '/crm', linkText: 'View',
            items: [
                { label: 'Open leads', value: crm.open_leads },
                { label: 'Open deals', value: crm.open_deals },
                { label: 'Pipeline', value: crm.pipeline_value, format: 'money' },
                { label: 'Won', value: crm.won_value, format: 'money' },
            ],
        });
    }
    const hrm = data.hrm_summary;
    if (hrm) {
        const items = [{ label: 'Employees', value: hrm.active_employees }];
        if (hrm.on_leave_today > 0) items.push({ label: 'On leave', value: hrm.on_leave_today });
        if (hrm.attendance_today > 0) items.push({ label: 'Attendance', value: hrm.attendance_today });
        if (hrm.payroll_this_period > 0) items.push({ label: 'Payroll', value: hrm.payroll_this_period, format: 'money' });
        bizCards.push({ key: 'hrm', title: 'HRM', href: '/hrm/users', linkText: 'View', items });
    }
    const proj = data.project_summary;
    if (proj) {
        const items = [
            { label: 'Active', value: proj.active_projects },
            { label: 'Completed', value: proj.completed_this_period },
        ];
        if (proj.overdue_tasks > 0) items.push({ label: 'Overdue tasks', value: proj.overdue_tasks });
        if (proj.billing_value > 0) items.push({ label: 'Billing', value: proj.billing_value, format: 'money' });
        bizCards.push({ key: 'projects', title: 'Projects', href: '/hrm/projects', linkText: 'View', items });
    }

    return {
        kpis, chartData, cashflowChart, expenseBreakdown, ageingData, bizCards,
        transactions, topCustomers, topSuppliers, bankAccounts,
        approachingProjects: Array.isArray(data.approaching_deadline_projects) ? data.approaching_deadline_projects : [],
        overdueProjects: Array.isArray(data.overdue_projects) ? data.overdue_projects : [],
    };
}

function ProjectDeadlines({ approaching, overdue }) {
    const cols = (bucket) => [
        {
            title: 'Project',
            dataIndex: 'name',
            render: (v, row) => <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => visit(row.action_url)}>{v || DASH}</Button>,
        },
        { title: 'Manager', dataIndex: 'manager', ellipsis: true, render: (v) => v || DASH },
        { title: 'End Date', dataIndex: 'end_date', width: 120, render: fmtDate },
        {
            title: bucket === 'overdue' ? 'Overdue' : 'Time Left',
            width: 115,
            render: (_, row) => bucket === 'overdue'
                ? `${row.days_overdue || 0} day${Number(row.days_overdue) === 1 ? '' : 's'}`
                : `${row.days_left || 0} day${Number(row.days_left) === 1 ? '' : 's'}`,
        },
        { title: 'Status', dataIndex: 'status', width: 120, render: (v) => <Tag>{String(v || DASH).replace(/_/g, ' ')}</Tag> },
    ];

    const table = (rows, bucket) => rows.length ? (
        <Table size="small" rowKey="id" pagination={false} dataSource={rows} columns={cols(bucket)} scroll={{ x: 650 }} />
    ) : (
        <EmptyState title="No projects" desc="Project deadlines that need attention will appear here." compact />
    );

    return (
        <Card className="kd-card" styles={{ body: { padding: 8 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Project Deadlines</span>
                <Text type="secondary" style={{ fontSize: 11 }}>Approaching and overdue internal project dates</Text>
            </div>
            <Tabs
                size="small"
                items={[
                    { key: 'approaching', label: `Approaching Deadline (${approaching.length})`, children: table(approaching, 'approaching') },
                    { key: 'overdue', label: `Overdue (${overdue.length})`, children: table(overdue, 'overdue') },
                ]}
            />
        </Card>
    );
}

function mergeAgeing(receivables = [], payables = []) {
    const map = new Map();
    const order = [];
    (receivables || []).forEach((b) => {
        map.set(b.bucket, { bucket: b.bucket, receivables: toNum(b.amount), payables: 0 });
        order.push(b.bucket);
    });
    (payables || []).forEach((b) => {
        const existing = map.get(b.bucket);
        if (existing) {
            existing.payables = toNum(b.amount);
        } else {
            map.set(b.bucket, { bucket: b.bucket, receivables: 0, payables: toNum(b.amount) });
            order.push(b.bucket);
        }
    });
    return order.filter((v, i, a) => a.indexOf(v) === i).map((k) => map.get(k));
}

function truncate(str, max) {
    if (!str) return DASH;
    return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function Styles({ token }) {
    return (
        <style>{`
            .kd {
                --kd-bg: ${token.colorBgLayout};
                --kd-card: ${token.colorBgContainer};
                --kd-elevated: ${token.colorBgElevated};
                --kd-soft: ${token.colorFillQuaternary};
                --kd-soft-strong: ${token.colorFillTertiary};
                --kd-border: ${token.colorBorderSecondary};
                --kd-border-strong: ${token.colorBorder};
                --kd-grid: ${token.colorSplit};
                --kd-text: ${token.colorText};
                --kd-muted: ${token.colorTextSecondary};
                --kd-subtle: ${token.colorTextTertiary};
                --kd-disabled: ${token.colorTextDisabled};
                --kd-hover: ${token.controlItemBgHover};
                --kd-active: ${token.controlItemBgActive};
                --kd-primary: ${token.colorPrimary};
                --kd-primary-active: ${token.colorPrimaryActive};
                --kd-primary-bg: ${token.colorPrimaryBg};
                --kd-primary-bg-hover: ${token.colorPrimaryBgHover};
                --kd-success: ${token.colorSuccess};
                --kd-success-bg: ${token.colorSuccessBg};
                --kd-warning: ${token.colorWarning};
                --kd-warning-bg: ${token.colorWarningBg};
                --kd-error: ${token.colorError};
                --kd-error-bg: ${token.colorErrorBg};
                --kd-info: ${token.colorInfo || token.colorPrimary};
                --kd-info-bg: ${token.colorInfoBg || token.colorPrimaryBg};
                --kd-shadow: ${token.boxShadowTertiary || token.boxShadowSecondary};
                --kd-shadow-strong: ${token.boxShadowSecondary || token.boxShadow};
                --kd-radius: ${token.borderRadiusLG}px;
                --kd-radius-sm: ${token.borderRadius}px;
                --kd-radius-xs: ${token.borderRadiusSM}px;
                --kd-gap: ${token.paddingXS}px;
                --kd-pad: ${token.paddingSM}px;
                min-height: calc(100vh - 96px);
                background: var(--kd-bg);
                padding: clamp(${token.paddingXS}px, 1vw, ${token.paddingMD}px);
            }
            .kd-wrap {
                width: min(1480px, 100%);
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: var(--kd-gap);
            }

            .kd-hdr {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--kd-gap);
            }
            .kd-hdr__ctl {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--kd-gap);
            }
            .kd-hdr__ctl .ant-select,
            .kd-hdr__ctl .ant-picker,
            .kd-hdr__ctl .ant-btn {
                border-radius: var(--kd-radius-sm);
            }
            .kd-hdr__ctl .ant-select-selector,
            .kd-hdr__ctl .ant-picker,
            .kd-hdr__ctl .ant-btn {
                min-height: 30px !important;
            }
            .kd .ant-card-small > .ant-card-body,
            .kd .ant-table-small .ant-table-cell {
                padding-top: ${token.paddingXXS}px !important;
                padding-bottom: ${token.paddingXXS}px !important;
            }

            .kd-card {
                background: var(--kd-card) !important;
                border: 1px solid var(--kd-border) !important;
                border-radius: var(--kd-radius) !important;
                box-shadow: var(--kd-shadow) !important;
                overflow: hidden;
            }
            .kd-card:hover {
                border-color: var(--kd-border-strong) !important;
                box-shadow: var(--kd-shadow-strong) !important;
            }
            .kd-card-hdr {
                display: flex;
                flex-direction: column;
                gap: ${token.marginXXS}px;
                margin-bottom: ${token.marginXS}px;
            }
            .kd-card-hdr__t {
                font-size: ${token.fontSize}px;
                font-weight: 700;
                line-height: 1.2;
                color: var(--kd-text);
            }

            .kd-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(140px, 1fr));
    gap: var(--kd-gap);
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 2px;
}
    
            .kd-kpi {
                min-height: 86px;
                position: relative;
            }
            .kd-kpi::before {
                content: '';
                position: absolute;
                inset: 0;
                background: var(--kd-soft);
                opacity: 0.35;
                pointer-events: none;
            }
            .kd-kpi__accent {
                position: absolute;
                inset: 0 auto 0 0;
                width: ${Math.max(token.lineWidthBold || 2, 3)}px;
                background: var(--kd-accent);
            }
            .kd-kpi__content {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                min-height: 86px;
                padding: ${token.paddingXS}px ${token.paddingSM}px;
            }
            .kd-kpi__top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: ${token.marginXXS}px;
            }
            .kd-kpi__label {
                font-size: ${token.fontSizeSM}px;
                font-weight: 600;
                letter-spacing: ${token.sizeXXS / 200}px;
                text-transform: uppercase;
            }
            .kd-kpi__trend {
                display: inline-flex;
                align-items: center;
                border: 1px solid var(--kd-border);
                border-radius: ${token.borderRadiusSM}px;
                background: var(--kd-card);
                color: var(--kd-trend);
                font-size: ${token.fontSizeSM}px;
                line-height: 1;
                font-weight: 700;
                padding: 1px ${token.paddingXXS}px;
                white-space: nowrap;
            }
            .kd-kpi__val {
                color: var(--kd-text);
                font-size: clamp(${token.fontSizeLG}px, 1.25vw, ${token.fontSizeHeading5}px);
                font-weight: 800;
                line-height: 1.1;
                margin-top: ${token.marginXS}px;
                overflow-wrap: anywhere;
            }
            .kd-kpi__helper {
                display: block;
                font-size: ${token.fontSizeSM}px;
                margin-top: auto;
                padding-top: ${token.paddingXXS}px;
            }
            .kd-kpi__spark {
                position: absolute;
                right: ${token.paddingXXS}px;
                bottom: ${token.paddingXXS}px;
                width: 58%;
                height: 34px;
                opacity: 0.55;
                pointer-events: none;
            }

            .kd-row-2,
            .kd-row-3 {
                display: grid;
                grid-template-columns: minmax(0, 3fr) minmax(270px, 1.35fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-chart-main,
            .kd-chart-side {
                min-height: 222px;
            }

            .kd-biz-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
                gap: var(--kd-gap);
            }
            .kd-biz {
                position: relative;
            }
            .kd-biz::before {
                content: '';
                position: absolute;
                inset: 0 0 auto 0;
                height: ${Math.max(token.lineWidthBold || 2, 3)}px;
                background: var(--kd-primary);
                opacity: 0.8;
            }
            .kd-biz__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: ${token.marginXXS}px;
                margin-bottom: ${token.marginXS}px;
            }
            .kd-biz__rows {
                display: flex;
                flex-direction: column;
                gap: ${token.marginXXS}px;
            }
            .kd-biz__row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: ${token.marginXXS}px;
                padding: 1px 0;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-biz__row:last-child {
                border-bottom: 0;
            }

            .kd-bottom {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: var(--kd-gap);
            }

            .kd-bank-list {
                display: flex;
                flex-direction: column;
            }
            .kd-bank-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: ${token.marginXS}px;
                padding: ${token.paddingXXS}px 0;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-bank-row:last-child {
                border-bottom: 0;
                padding-bottom: 0;
            }

            .kd-pill {
                display: inline-flex;
                align-items: center;
                padding: 1px ${token.paddingXXS}px;
                border: 1px solid var(--kd-border);
                border-radius: var(--kd-radius-sm);
                color: var(--kd-muted);
                background: var(--kd-soft);
                font-size: ${token.fontSizeSM}px;
                line-height: 1.15;
                text-transform: capitalize;
            }
            .kd-row--click {
                cursor: pointer;
            }
            .kd-row--click:hover td {
                background: var(--kd-hover) !important;
            }
            .kd .ant-table-wrapper .ant-table,
            .kd .ant-table-wrapper .ant-table-container,
            .kd .ant-table-wrapper .ant-table-thead > tr > th {
                background: var(--kd-card) !important;
            }
            .kd .ant-table-wrapper .ant-table-thead > tr > th {
                color: var(--kd-muted) !important;
                font-weight: 700;
            }
            .kd .ant-tabs-nav {
                margin-bottom: ${token.marginXS}px;
            }

            .kd-tip {
                min-width: 160px;
                padding: ${token.paddingXS}px;
                background: var(--kd-elevated);
                border: 1px solid var(--kd-border);
                border-radius: var(--kd-radius);
                box-shadow: var(--kd-shadow-strong);
            }
            .kd-tip__row {
                display: grid;
                grid-template-columns: ${token.sizeXXS}px 1fr auto;
                align-items: center;
                gap: ${token.marginXXS}px;
                margin-top: ${token.marginXXS}px;
                font-size: ${token.fontSizeSM}px;
            }
            .kd-tip__row span:first-child {
                width: ${token.sizeXXS}px;
                height: ${token.sizeXXS}px;
                border-radius: 999px;
            }

            .kd .recharts-default-legend {
                color: var(--kd-muted);
            }
            .kd .recharts-cartesian-axis-tick-value {
                fill: var(--kd-muted);
            }

            @media (max-width: 1280px) {
                .kd-kpis {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                .kd-row-2,
                .kd-row-3 {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            @media (max-width: 768px) {
                .kd {
                    padding: ${token.paddingXS}px;
                }
                .kd-hdr {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .kd-hdr__ctl,
                .kd-hdr__ctl .ant-picker {
                    width: 100% !important;
                }
                .kd-hdr__ctl .ant-select {
                    width: 100% !important;
                }
                .kd-kpis {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .kd-biz-grid,
                .kd-bottom {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            @media (max-width: 520px) {
                .kd-kpis {
                    grid-template-columns: minmax(0, fr);
                }
                .kd-card-hdr__t {
                    font-size: ${token.fontSize}px;
                }
            }
        `}</style>
    );
}
