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

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const DASH = '-';

const COLORS = {
    indigo: '#4F46E5',
    blue: '#3B82F6',
    emerald: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    cyan: '#06B6D4',
    lime: '#84CC16',
    slate: '#64748B',
};

const PIE_PALETTE = [COLORS.indigo, COLORS.emerald, COLORS.amber, COLORS.blue, COLORS.pink, COLORS.purple, COLORS.cyan, COLORS.lime];

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
            setError(ex?.response?.data?.message || 'Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetch(); }, [fetch]);

    const m = useMemo(() => buildModel(data), [data]);
    const branches = data.branches || bc.branches || [];

    return (
        <AuthenticatedLayout
            header={<DashHeader branches={branches} filters={filters} loading={loading} onRefresh={fetch} onChange={setFilters} />}
        >
            <Head title="Dashboard" />
            <Styles token={token} />
            <main className="kd">
                <div className="kd-wrap">
                    {error && (
                        <Alert showIcon type="error" message="Dashboard could not be loaded" description={error}
                            action={<Button onClick={fetch}>Retry</Button>} />
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
                                {m.topCustomers.length > 0 && <TopPartiesBar title="Top Customers" data={m.topCustomers} color={COLORS.indigo} />}
                                {m.topSuppliers.length > 0 && <TopPartiesBar title="Top Suppliers" data={m.topSuppliers} color={COLORS.amber} />}
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
                <Title level={4} style={{ margin: '0 0 2px', fontWeight: 650 }}>Dashboard</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Financial overview for the selected period</Text>
            </div>
            <div className="kd-hdr__ctl">
                <Select value={filters.branch_id} options={opts} style={{ width: 170 }}
                    onChange={(v) => onChange((c) => ({ ...c, branch_id: v || 'all' }))} />
                <RangePicker
                    value={filters.date_from && filters.date_to ? [dayjs(filters.date_from), dayjs(filters.date_to)] : null}
                    style={{ width: 260 }}
                    onChange={(d) => onChange((c) => ({ ...c, date_from: d?.[0]?.format('YYYY-MM-DD'), date_to: d?.[1]?.format('YYYY-MM-DD') }))}
                />
                <Tooltip title="Refresh"><Button icon={<ReloadOutlined spin={loading} />} onClick={onRefresh} /></Tooltip>
            </div>
        </div>
    );
}

function KpiCard({ label, value, sparkline, color, trend, invertTrend, helper }) {
    const isUp = trend > 0;
    const trendColor = invertTrend ? (isUp ? COLORS.red : COLORS.emerald) : (isUp ? COLORS.emerald : COLORS.red);
    const hasSpark = Array.isArray(sparkline) && sparkline.some((d) => toNum(d.value) !== 0);

    return (
        <Card className="kd-card kd-kpi" styles={{ body: { padding: 10, height: '100%', position: 'relative', overflow: 'hidden' } }}>
            <div className="kd-kpi__body">
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.02em' }}>{label}</Text>
                <div className="kd-kpi__val">{fmtMoney(value)}</div>
                <div className="kd-kpi__foot">
                    {trend != null && (
                        <span style={{ color: trendColor, fontSize: 12, fontWeight: 600 }}>
                            {isUp ? '+' : '-'} {Math.abs(trend).toFixed(1)}%
                        </span>
                    )}
                    {helper && <Text type="secondary" style={{ fontSize: 11 }}>{helper}</Text>}
                </div>
            </div>
            {hasSpark && (
                <div className="kd-kpi__spark" aria-hidden>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkline}>
                            <defs>
                                <linearGradient id={`kpi-g-${label}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
                                fill={`url(#kpi-g-${label})`} dot={false} isAnimationActive={false} />
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
        <Card className="kd-card kd-chart-main" styles={{ body: { padding: 10 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Financial Performance</span>
                <Text type="secondary" style={{ fontSize: 12 }}>Revenue, expenses & net profit trend</Text>
            </div>
            {hasData ? (
                <div style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 11 }}
                                tickFormatter={(v) => compactFmt.format(v)} width={68} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.indigo} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="expenses" name="Expenses" stroke={COLORS.amber} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="profit" name="Net Profit" stroke={COLORS.emerald} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
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
        <Card className="kd-card kd-chart-side" styles={{ body: { padding: 10 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Expense Breakdown</span>
                <Text type="secondary" style={{ fontSize: 12 }}>Where your money goes</Text>
            </div>
            {data.length > 0 && total > 0 ? (
                <div style={{ height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%"
                                innerRadius="52%" outerRadius="78%" paddingAngle={2} strokeWidth={0}>
                                {data.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                            </Pie>
                            <ChartTooltip content={<PieTip total={total} />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, lineHeight: '20px' }}
                                formatter={(val) => <span style={{ color: 'var(--kd-text)', fontSize: 11 }}>{val}</span>} />
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
                <span style={{ background: 'transparent' }} />
                <Text type="secondary">Share</Text>
                <Text>{pct}%</Text>
            </div>
        </div>
    );
}

function CashFlowChart({ data }) {
    const hasData = data.some((d) => toNum(d.cash_in) || toNum(d.cash_out));

    return (
        <Card className="kd-card kd-chart-main" styles={{ body: { padding: 10 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Cash Flow</span>
                <Text type="secondary" style={{ fontSize: 12 }}>Daily cash inflows and outflows</Text>
            </div>
            {hasData ? (
                <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 11 }}
                                tickFormatter={(v) => compactFmt.format(v)} width={68} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            <Line type="monotone" dataKey="cash_in" name="Cash In" stroke={COLORS.blue} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="cash_out" name="Cash Out" stroke={COLORS.red} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="net" name="Net" stroke={COLORS.purple} strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4 }} />
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
        <Card className="kd-card kd-chart-side" styles={{ body: { padding: 10 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Receivables vs Payables Ageing</span>
                <Text type="secondary" style={{ fontSize: 12 }}>Outstanding amounts by age</Text>
            </div>
            {hasData ? (
                <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 10 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 10 }}
                                tickFormatter={(v) => compactFmt.format(v)} width={60} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                            <Bar dataKey="receivables" name="Receivables" fill={COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Bar dataKey="payables" name="Payables" fill={COLORS.amber} radius={[4, 4, 0, 0]} maxBarSize={28} />
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
            <Text strong style={{ fontSize: 12 }}>{label}</Text>
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
        <Card className="kd-card kd-biz" styles={{ body: { padding: 10 } }}>
            <div className="kd-biz__head">
                <Text strong style={{ fontSize: 13, fontWeight: 650 }}>{card.title}</Text>
                {card.href && <Button type="link" size="small" style={{ padding: 0, fontSize: 12, fontWeight: 600 }} onClick={() => visit(card.href)}>{card.linkText || 'View'}</Button>}
            </div>
            <div className="kd-biz__rows">
                {card.items.map((i) => (
                    <div className="kd-biz__row" key={i.label}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{i.label}</Text>
                        <Text strong style={{ fontSize: 12 }}>
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
        <Card className="kd-card" styles={{ body: { padding: transactions.length ? 0 : 10 } }}>
            <div className="kd-card-hdr" style={{ padding: transactions.length ? '10px' : 0, borderBottom: transactions.length ? '1px solid var(--kd-grid)' : 'none' }}>
                <span className="kd-card-hdr__t">Recent Transactions</span>
                <Text type="secondary" style={{ fontSize: 12 }}>Latest financial documents</Text>
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
        <Card className="kd-card" styles={{ body: { padding: 10 } }}>
            <div className="kd-card-hdr" style={{ marginBottom: 10 }}>
                <span className="kd-card-hdr__t">{title}</span>
            </div>
            <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 4 }}>
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 10 }}
                            tickFormatter={(v) => compactFmt.format(v)} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={110}
                            tick={{ fill: 'var(--kd-text)', fontSize: 11 }} />
                        <ChartTooltip content={<MoneyTip />} />
                        <Bar dataKey="amount" name="Amount" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function BankList({ accounts }) {
    return (
        <Card className="kd-card" styles={{ body: { padding: 10 } }}>
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
        <div style={{ minHeight: compact ? 140 : 240, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16 }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false}>
                <Title level={5} style={{ margin: '0 0 4px' }}>{title}</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>{desc}</Text>
            </Empty>
        </div>
    );
}

function DashSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="kd-kpis">{[1, 2, 3, 4, 5, 6].map((i) => <Card key={i} className="kd-card" styles={{ body: { padding: 10 } }}><Skeleton active paragraph={{ rows: 2 }} /></Card>)}</div>
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
        { key: 'revenue', label: 'Revenue', value: fin.revenue, sparkline: revSparkline, color: COLORS.indigo, trend: calcTrend(revSparkline), helper: 'This period' },
        { key: 'expenses', label: 'Expenses', value: fin.expenses, sparkline: expSparkline, color: COLORS.amber, trend: calcTrend(expSparkline), invertTrend: true, helper: 'This period' },
        { key: 'profit', label: 'Net Profit', value: fin.net_profit, sparkline: profitSparkline, color: COLORS.emerald, trend: calcTrend(profitSparkline) },
        { key: 'cash', label: 'Cash & Bank', value: fin.cash_bank_balance, sparkline: cashSparkline, color: COLORS.cyan, trend: calcTrend(cashSparkline), helper: 'Available' },
        { key: 'receivables', label: 'Receivables', value: fin.receivables, sparkline: recSparkline, color: COLORS.blue, helper: 'Outstanding' },
        { key: 'payables', label: 'Payables', value: fin.payables, sparkline: paySparkline, color: COLORS.red, helper: 'Outstanding' },
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
        <Card className="kd-card" styles={{ body: { padding: 10 } }}>
            <div className="kd-card-hdr">
                <span className="kd-card-hdr__t">Project Deadlines</span>
                <Text type="secondary" style={{ fontSize: 12 }}>Approaching and overdue internal project dates</Text>
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
                --kd-card-muted: ${token.colorFillQuaternary || token.colorFillTertiary};
                --kd-border: ${token.colorBorderSecondary};
                --kd-grid: ${token.colorSplit || token.colorBorderSecondary};
                --kd-text: ${token.colorText};
                --kd-muted: ${token.colorTextSecondary};
                --kd-hover: ${token.controlItemBgHover};
                --kd-shadow: ${token.boxShadowTertiary || '0 1px 2px rgba(0,0,0,.04)'};
                --kd-radius: ${Math.min(token.borderRadiusLG || 8, 8)}px;
                --kd-radius-sm: ${Math.min(token.borderRadius || 6, 6)}px;
                --kd-gap: ${Math.max(token.paddingXS || 8, 8)}px;
                --kd-pad: ${Math.max(token.paddingSM || 10, 10)}px;
                min-height: calc(100vh - 96px);
                background: var(--kd-bg);
                padding: clamp(var(--kd-pad), 1.4vw, ${token.paddingLG || 18}px);
            }
            .kd-wrap {
                width: min(1440px, 100%);
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: var(--kd-gap);
            }

            /* Header */
            .kd-hdr { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--kd-gap); }
            .kd-hdr__ctl { display: flex; align-items: center; flex-wrap: wrap; gap: var(--kd-gap); }

            /* Card base */
            .kd-card {
                background: var(--kd-card) !important;
                border: 1px solid var(--kd-border) !important;
                border-radius: var(--kd-radius) !important;
                box-shadow: var(--kd-shadow) !important;
            }
            .kd-card-hdr {
                display: flex;
                flex-direction: column;
                gap: 1px;
                margin-bottom: 8px;
            }
            .kd-card-hdr__t { font-size: 14px; font-weight: 650; color: var(--kd-text); }

            /* KPI Strip */
            .kd-kpis {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: var(--kd-gap);
            }
            .kd-kpi { min-height: 90px; overflow: hidden; }
            .kd-kpi__body {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                min-height: 72px;
            }
            .kd-kpi__val {
                color: var(--kd-text);
                font-size: clamp(18px, 1.45vw, 22px);
                font-weight: 700;
                line-height: 1.15;
                margin-top: 5px;
                overflow-wrap: anywhere;
            }
            .kd-kpi__foot {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: auto;
                padding-top: 5px;
            }
            .kd-kpi__spark {
                position: absolute;
                right: 0; bottom: 0;
                width: 68%; height: 42px;
                opacity: 0.3;
                pointer-events: none;
            }

            /* Chart rows */
            .kd-row-2, .kd-row-3 {
                display: grid;
                grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }

            /* Business cards */
            .kd-biz-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
                gap: var(--kd-gap);
            }
            .kd-biz__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 6px;
            }
            .kd-biz__rows { display: flex; flex-direction: column; gap: 4px; }
            .kd-biz__row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 8px;
            }

            /* Bottom row */
            .kd-bottom {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: var(--kd-gap);
            }

            /* Bank list */
            .kd-bank-list { display: flex; flex-direction: column; }
            .kd-bank-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                padding: 6px 0;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-bank-row:last-child { border-bottom: 0; padding-bottom: 0; }

            /* Table */
            .kd-pill {
                display: inline-flex;
                padding: 1px 8px;
                border: 1px solid var(--kd-border);
                border-radius: var(--kd-radius-sm);
                color: var(--kd-muted);
                background: var(--kd-card-muted);
                font-size: 11px;
                text-transform: capitalize;
            }
            .kd-row--click { cursor: pointer; }
            .kd-row--click:hover td { background: var(--kd-hover) !important; }

            /* Tooltip */
            .kd-tip {
                min-width: 170px;
                padding: 10px;
                background: var(--kd-card);
                border: 1px solid var(--kd-border);
                border-radius: var(--kd-radius);
                box-shadow: var(--kd-shadow);
            }
            .kd-tip__row {
                display: grid;
                grid-template-columns: 8px 1fr auto;
                align-items: center;
                gap: 6px;
                margin-top: 4px;
                font-size: 12px;
            }
            .kd-tip__row span:first-child { width: 8px; height: 8px; border-radius: 50%; }

            /* Responsive */
            @media (max-width: 1180px) {
                .kd-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                .kd-row-2, .kd-row-3 { grid-template-columns: minmax(0, 1fr); }
            }
            @media (max-width: 768px) {
                .kd { padding: 12px; }
                .kd-hdr { flex-direction: column; align-items: flex-start; }
                .kd-hdr__ctl { width: 100%; }
                .kd-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .kd-biz-grid { grid-template-columns: minmax(0, 1fr); }
                .kd-bottom { grid-template-columns: minmax(0, 1fr); }
            }
            @media (max-width: 480px) {
                .kd-kpis { grid-template-columns: minmax(0, 1fr); }
            }
        `}</style>
    );
}
