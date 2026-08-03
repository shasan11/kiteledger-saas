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

const createNumberFormatter = (locale, options = {}) => {
    try {
        return new Intl.NumberFormat(locale, options);
    } catch {
        return new Intl.NumberFormat('en-US', options);
    }
};

const currFmt = createNumberFormatter('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 });
const compactFmt = createNumberFormatter('en-NP', { style: 'currency', currency: 'NPR', notation: 'compact', maximumFractionDigits: 1 });
const numFmt = createNumberFormatter('en-NP');

const fmtMoney = (v, compact) => (v == null || v === '' ? DASH : (compact ? compactFmt : currFmt).format(Number(v || 0)));
const fmtNum = (v) => (v == null || v === '' ? DASH : numFmt.format(Number(v || 0)));
const fmtDate = (v) => (v ? dayjs(v).format('DD MMM YYYY') : DASH);
const toNum = (v) => Number(v || 0);
const visit = (url) => { if (url && url !== '#') router.visit(url); };
const dateOnly = (value) => (value ? dayjs(value).format('YYYY-MM-DD') : undefined);

const initialDashboardPeriod = (context = {}) => {
    const fiscalYear = context.current_fiscal_year || context.currentFiscalYear || {};

    return {
        date_from: dateOnly(fiscalYear.start_date) || dayjs().startOf('month').format('YYYY-MM-DD'),
        date_to: dateOnly(fiscalYear.end_date) || dayjs().format('YYYY-MM-DD'),
    };
};

const periodLabel = (filters = {}) => {
    if (!filters.date_from || !filters.date_to) return 'Selected period';

    return `${dayjs(filters.date_from).format('D MMM YYYY')} – ${dayjs(filters.date_to).format('D MMM YYYY')}`;
};

const profitTone = (value) => (toNum(value) >= 0 ? 'positive' : 'negative');

const compactMoney = (value) => (value == null || value === '' ? DASH : compactFmt.format(Number(value || 0)));

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
    const [filters, setFilters] = useState(() => ({
        branch_id: bc.selectedBranchId || 'all',
        ...initialDashboardPeriod(bc),
    }));

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
                            <section className="kd-signal-grid">
                                {m.signalCards.map((card) => <SignalCard key={card.key} card={card} />)}
                            </section>

                            <section className="kd-focus-grid">
                                <FinancialChart data={m.chartData} summary={m.executive} />
                                <AttentionPanel summary={m.cashPosition} items={m.attentionItems} />
                            </section>

                            {m.bizCards.length > 0 && (
                                <ModuleOverview cards={m.bizCards} />
                            )}

                            <TxnTable transactions={m.transactions} />
                        </>
                    )}
                </div>
            </main>
        </AuthenticatedLayout>
    );
}

function SignalCard({ card }) {
    return (
        <Card className="kd-card kd-signal" style={{ '--kd-accent': card.color }} styles={{ body: { padding: 0 } }}>
            <div className="kd-signal__body">
                <div className="kd-signal__top">
                    <Text type="secondary" className="kd-signal__label">{card.label}</Text>
                </div>
                <div className="kd-signal__value">{fmtMoney(card.value)}</div>
                <Text type="secondary" className="kd-signal__helper">{card.helper}</Text>
            </div>
        </Card>
    );
}

function AttentionPanel({ summary, items }) {
    const visibleItems = items.slice(0, 4);
    return (
        <Card className="kd-card kd-attention" styles={{ body: { padding: 0 } }}>
            <div className="kd-section-head">
                <div>
                    <span className="kd-card-hdr__t">Attention</span>
                    <Text type="secondary">Items worth reviewing</Text>
                </div>
                <span className={`kd-status ${visibleItems.length ? 'kd-status--warn' : 'kd-status--good'}`}>
                    {visibleItems.length ? `${visibleItems.length} open` : 'All clear'}
                </span>
            </div>
            <div className="kd-liquidity">
                <div>
                    <Text type="secondary">Net liquidity</Text>
                    <strong>{fmtMoney(summary.netLiquidity)}</strong>
                </div>
                <Text type="secondary">Cash & bank {compactMoney(summary.cashBankBalance)}</Text>
            </div>
            <div className="kd-attention__list">
                {visibleItems.length ? visibleItems.map((item) => (
                    <button type="button" className="kd-attention__item" key={item.key} onClick={() => visit(item.href)}>
                        <span>
                            <b>{item.label}</b>
                            <small>{item.module}</small>
                        </span>
                        <strong>{item.format === 'money' ? fmtMoney(item.value, true) : fmtNum(item.value)}</strong>
                    </button>
                )) : (
                    <div className="kd-attention__empty">
                        <span className="kd-health-dot kd-health-dot--good" />
                        <Text type="secondary">No overdue or exceptional items</Text>
                    </div>
                )}
            </div>
        </Card>
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
                <Text type="secondary" style={{ fontSize: 11 }}>Financial overview for the selected fiscal period</Text>
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


function FinancialChart({ data, summary }) {
    const hasData = data.some((d) => toNum(d.revenue) || toNum(d.expenses) || toNum(d.profit));

    return (
        <Card className="kd-card kd-chart-main kd-performance" styles={{ body: { padding: 0 } }}>
            <div className="kd-performance__head">
                <div>
                    <span className="kd-card-hdr__t">Financial performance</span>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Revenue, expenses & net profit trend</Text>
                </div>
                <div className="kd-performance__stats">
                    <span>Revenue <b>{compactMoney(summary.revenue)}</b></span>
                    <span>Expenses <b>{compactMoney(summary.expenses)}</b></span>
                    <span>Profit <b>{compactMoney(summary.netProfit)}</b></span>
                </div>
            </div>
            {hasData ? (
                <div className="kd-performance__chart">
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
                            <Line type="monotone" dataKey="profit" name="Net Profit" stroke={THEME_COLOURS.text} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
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

function ModuleOverview({ cards }) {
    return (
        <Card className="kd-card kd-modules" styles={{ body: { padding: 0 } }}>
            <div className="kd-section-head">
                <div>
                    <span className="kd-card-hdr__t">Modules</span>
                    <Text type="secondary">Key operating numbers at a glance</Text>
                </div>
            </div>
            <div className="kd-modules__grid">
                {cards.map((card) => {
                    const primary = card.items[0];
                    return (
                        <article className="kd-module" key={card.key}>
                            <div className="kd-module__head">
                                <Text strong>{card.title}</Text>
                                {card.href && (
                                    <Button type="link" size="small" onClick={() => visit(card.href)}>
                                        View
                                    </Button>
                                )}
                            </div>
                            <div className="kd-module__primary">
                                <Text type="secondary">{primary?.label}</Text>
                                <strong>{formatModuleValue(primary)}</strong>
                            </div>
                            <div className="kd-module__facts">
                                {card.items.slice(1, 4).map((item) => (
                                    <span key={item.label}>
                                        <small>{item.label}</small>
                                        <b>{formatModuleValue(item)}</b>
                                    </span>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </div>
        </Card>
    );
}

function formatModuleValue(item) {
    if (!item) return DASH;
    if (item.format === 'money') return fmtMoney(item.value, true);
    if (item.format === 'text') return item.value || DASH;
    return fmtNum(item.value);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--kd-gap)' }}>
            <div className="kd-signal-grid">{[1, 2, 3, 4].map((i) => <Card key={i} className="kd-card" styles={{ body: { padding: 14 } }}><Skeleton active paragraph={{ rows: 2 }} /></Card>)}</div>
            <div className="kd-focus-grid">
                <Card className="kd-card"><Skeleton active paragraph={{ rows: 7 }} /></Card>
                <Card className="kd-card"><Skeleton active paragraph={{ rows: 7 }} /></Card>
            </div>
            <Card className="kd-card"><Skeleton active paragraph={{ rows: 6 }} /></Card>
            <Card className="kd-card"><Skeleton active paragraph={{ rows: 4 }} /></Card>
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

    const executive = {
        revenue: toNum(fin.revenue),
        expenses: toNum(fin.expenses),
        netProfit: toNum(fin.net_profit),
        receivables: toNum(fin.receivables),
        payables: toNum(fin.payables),
        cash: toNum(fin.cash_bank_balance),
        currency: fin.currency || data.currency || 'NPR',
        margin: toNum(fin.revenue) > 0 ? (toNum(fin.net_profit) / toNum(fin.revenue)) * 100 : 0,
        message: toNum(fin.net_profit) >= 0
            ? 'Revenue is covering costs for this period. Keep an eye on receivables so profit turns into cash.'
            : 'Expenses are ahead of revenue for this period. The fastest wins are collecting receivables and reviewing major costs.',
    };

    const signalCards = [
        { key: 'revenue', label: 'Revenue', value: fin.revenue, sparkline: revSparkline, color: THEME_COLOURS.primary, trend: calcTrend(revSparkline), helper: 'Approved invoice value' },
        { key: 'profit', label: 'Net profit', value: fin.net_profit, sparkline: profitSparkline, color: THEME_COLOURS.success, trend: calcTrend(profitSparkline), helper: 'Revenue minus expenses' },
        { key: 'receivables', label: 'Receivables', value: fin.receivables, sparkline: recSparkline, color: THEME_COLOURS.info, helper: 'Customer money to collect' },
        { key: 'payables', label: 'Payables', value: fin.payables, sparkline: paySparkline, color: THEME_COLOURS.warning, helper: 'Supplier and expense dues', invertTrend: true },
    ];

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
    const cashPosition = {
        cashBankBalance: toNum(fin.cash_bank_balance ?? cp.cash_bank_balance),
        receivables: toNum(fin.receivables),
        payables: toNum(fin.payables),
        netLiquidity: toNum(fin.cash_bank_balance ?? cp.cash_bank_balance) + toNum(fin.receivables) - toNum(fin.payables),
    };
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
                { label: 'Overdue', value: sales.overdue_amount, format: 'money' },
                { label: 'Unpaid', value: sales.unpaid_amount, format: 'money' },
                { label: 'Invoices', value: sales.invoice_count },
                { label: 'Paid', value: sales.paid_amount, format: 'money' },
            ],
        });
    }
    const purchase = data.purchase_summary;
    if (purchase) {
        bizCards.push({
            key: 'purchase', title: 'Purchases', href: '/payment-out/purchase-bills', linkText: 'View bills',
            items: [
                { label: 'Total purchases', value: purchase.purchase_total, format: 'money' },
                { label: 'Total payables', value: purchase.total_payables ?? purchase.unpaid_amount, format: 'money' },
                { label: 'Upcoming', value: purchase.upcoming_payables, format: 'money' },
                { label: 'Bills', value: purchase.bill_count },
                { label: 'Paid', value: purchase.paid_amount, format: 'money' },
                { label: 'Expense payables', value: purchase.expense_payables, format: 'money' },
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

    const attentionItems = [
        sales && toNum(sales.overdue_amount) > 0
            ? { key: 'overdue-sales', module: 'Sales', label: 'Overdue invoices', value: sales.overdue_amount, format: 'money', href: '/payment-in/invoices' }
            : null,
        purchase && toNum(purchase.upcoming_payables) > 0
            ? { key: 'upcoming-payables', module: 'Purchases', label: 'Upcoming payables', value: purchase.upcoming_payables, format: 'money', href: '/payment-out/purchase-bills' }
            : null,
        inv && toNum(inv.low_stock_items) > 0
            ? { key: 'low-stock', module: 'Inventory', label: 'Low stock items', value: inv.low_stock_items, href: '/inventory/products' }
            : null,
        proj && toNum(proj.overdue_tasks) > 0
            ? { key: 'overdue-tasks', module: 'Projects', label: 'Overdue tasks', value: proj.overdue_tasks, href: '/hrm/projects' }
            : null,
    ].filter(Boolean);

    return {
        executive, signalCards, cashPosition, attentionItems,
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
                --kd-gap: clamp(9px, .8vw, 12px);
                --kd-pad: clamp(10px, 1vw, 14px);
                min-height: calc(100vh - 96px);
                background: var(--kd-bg);
                padding: clamp(10px, 1.2vw, 16px);
            }
            .kd-wrap {
                width: min(1440px, 100%);
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
                border-radius: 10px !important;
                box-shadow: none !important;
                overflow: hidden;
                transition: border-color 140ms ease;
            }
            .kd-card:hover {
                border-color: var(--kd-border-strong) !important;
                box-shadow: none !important;
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

            .kd-hero {
                position: relative;
                overflow: hidden;
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
                gap: clamp(16px, 2vw, 28px);
                align-items: stretch;
                padding: clamp(18px, 2.2vw, 28px);
                border-radius: 18px;
                border: 1px solid var(--kd-border);
                border-left: 4px solid var(--kd-primary);
                background: var(--kd-card);
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            }
            .kd-hero--negative {
                border-left-color: var(--kd-warning);
            }
            .kd-hero__main,
            .kd-hero__score {
                position: relative;
                z-index: 1;
            }
            .kd-eyebrow {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                width: fit-content;
                color: var(--kd-muted);
                font-size: 11px;
                font-weight: 800;
                letter-spacing: .08em;
                text-transform: uppercase;
            }
            .kd-eyebrow__dot {
                width: 7px;
                height: 7px;
                border-radius: 999px;
                background: var(--kd-success);
            }
            .kd-hero__title {
                color: var(--kd-text) !important;
                margin: 12px 0 8px !important;
                font-size: clamp(25px, 2.5vw, 38px) !important;
                line-height: 1.08 !important;
                letter-spacing: -0.035em;
                max-width: 700px;
            }
            .kd-hero__copy {
                display: block;
                max-width: 680px;
                color: var(--kd-muted) !important;
                font-size: 14px;
                line-height: 1.6;
            }
            .kd-hero__meta {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 18px;
            }
            .kd-hero__meta span {
                display: inline-flex;
                align-items: center;
                min-height: 28px;
                padding: 5px 10px;
                border-radius: 999px;
                background: var(--kd-soft);
                color: var(--kd-muted);
                font-size: 12px;
                font-weight: 650;
            }
            .kd-hero__score {
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: clamp(16px, 2vw, 24px);
                border-radius: 16px;
                background: var(--kd-soft);
                border: 1px solid var(--kd-grid);
            }
            .kd-hero__status {
                width: fit-content;
                padding: 4px 8px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 800;
                line-height: 1;
            }
            .kd-hero__status--positive {
                color: var(--kd-success);
                background: var(--kd-success-bg);
            }
            .kd-hero__status--negative {
                color: var(--kd-warning);
                background: var(--kd-warning-bg);
            }
            .kd-hero__amount {
                margin-top: 12px;
                color: var(--kd-text);
                font-size: clamp(30px, 3.1vw, 48px);
                line-height: 1;
                font-weight: 900;
                letter-spacing: -0.05em;
                overflow-wrap: anywhere;
            }
            .kd-hero__sub {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 16px;
            }
            .kd-hero__sub span {
                color: var(--kd-muted);
                font-size: 12px;
                font-weight: 700;
            }

            .kd-signal-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: var(--kd-gap);
            }
            .kd-signal {
                min-height: 132px;
                position: relative;
            }
            .kd-signal::before {
                content: '';
                position: absolute;
                inset: 0 auto 0 0;
                width: 3px;
                background: var(--kd-accent);
                pointer-events: none;
            }
            .kd-signal__body {
                position: relative;
                z-index: 1;
                min-height: 132px;
                padding: 16px;
                display: flex;
                flex-direction: column;
            }
            .kd-signal__top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .kd-signal__icon {
                width: 26px;
                height: 3px;
                border-radius: 999px;
                background: var(--kd-accent);
            }
            .kd-signal__trend {
                display: inline-flex;
                align-items: center;
                padding: 3px 7px;
                border-radius: 999px;
                color: var(--kd-trend);
                background: transparent;
                border: 1px solid var(--kd-border);
                font-size: 11px;
                font-weight: 800;
            }
            .kd-signal__label {
                margin-top: 12px;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: .07em;
                text-transform: uppercase;
            }
            .kd-signal__value {
                margin-top: 6px;
                color: var(--kd-text);
                font-size: clamp(21px, 1.7vw, 28px);
                line-height: 1.05;
                font-weight: 900;
                letter-spacing: -0.04em;
                overflow-wrap: anywhere;
            }
            .kd-signal__helper {
                display: block;
                margin-top: auto;
                padding-top: 12px;
                font-size: 12px;
            }
            .kd-signal__spark {
                position: absolute;
                right: 0;
                bottom: 0;
                width: 58%;
                height: 42px;
                opacity: .28;
                pointer-events: none;
            }

            .kd-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(140px, 2fr));
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
            .kd-row-3,
            .kd-cash-expense-row {
                display: grid;
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-main-grid {
                display: grid;
                grid-template-columns: minmax(0, 1.45fr) minmax(320px, .75fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-side-stack {
                display: grid;
                grid-template-rows: auto 1fr;
                gap: var(--kd-gap);
                min-width: 0;
            }
            .kd-insight-grid {
                display: grid;
                grid-template-columns: minmax(280px, .7fr) minmax(0, 1fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-row-2,
            .kd-row-3 {
                grid-template-columns: minmax(0, 1fr);
            }
            .kd-cash-expense-row {
                grid-template-columns: minmax(250px, 30%) minmax(0, 70%);
            }
            .kd-chart-main,
            .kd-chart-side {
                min-height: 222px;
            }
            .kd-performance__head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 16px 16px 8px;
            }
            .kd-performance__stats {
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-end;
                gap: 8px;
            }
            .kd-performance__stats span {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 8px;
                border-radius: 999px;
                color: var(--kd-muted);
                border: 1px solid var(--kd-border);
                font-size: 11px;
                white-space: nowrap;
            }
            .kd-performance__stats b {
                color: var(--kd-text);
            }
            .kd-performance__chart {
                height: 300px;
                padding: 4px 12px 16px 6px;
            }
            .kd-cash-card__head {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                padding: 16px 16px 6px;
            }
            .kd-health-dot {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                margin-top: 3px;
                background: var(--kd-health);
            }
            .kd-health-dot--good { --kd-health: var(--kd-success); }
            .kd-health-dot--bad { --kd-health: var(--kd-error); }
            .kd-cash-card__total {
                padding: 4px 16px 14px;
                color: var(--kd-text);
                font-size: clamp(24px, 2.4vw, 36px);
                line-height: 1.05;
                font-weight: 900;
                letter-spacing: -0.05em;
                overflow-wrap: anywhere;
            }
            .kd-cash-card__rows {
                display: grid;
                gap: 1px;
                background: var(--kd-grid);
                border-top: 1px solid var(--kd-grid);
            }
            .kd-cash-card__row {
                display: grid;
                grid-template-columns: 10px 1fr auto;
                align-items: center;
                gap: 9px;
                padding: 9px 16px;
                background: var(--kd-card);
                font-size: 12px;
            }
            .kd-mini-dot {
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: var(--kd-dot);
            }
            .kd-mini-dot--good { --kd-dot: var(--kd-success); }
            .kd-mini-dot--info { --kd-dot: var(--kd-info); }
            .kd-mini-dot--warn { --kd-dot: var(--kd-warning); }
            .kd-mini-dot--bad { --kd-dot: var(--kd-error); }

            .kd-biz-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
                gap: var(--kd-gap);
            }
            .kd-biz-grid--premium {
                align-items: stretch;
            }
            .kd-biz {
                position: relative;
            }
            .kd-biz::before {
                content: '';
                position: absolute;
                inset: 0 auto 0 0;
                width: 3px;
                background: var(--kd-primary);
                opacity: 0.8;
            }
            .kd-biz__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: ${token.marginXXS}px;
                margin-bottom: 10px;
            }
            .kd-biz__rows {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .kd-biz__row {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
                padding: 8px 9px;
                border: 1px solid var(--kd-grid);
                border-radius: 10px;
                background: var(--kd-card);
            }
            .kd-biz__row:first-child {
                grid-column: 1 / -1;
                background: var(--kd-soft);
                border-color: var(--kd-border);
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

            .kd-signal {
                min-height: 104px;
                border-top: 2px solid var(--kd-accent) !important;
            }
            .kd-signal::before,
            .kd-signal__icon,
            .kd-signal__spark {
                display: none;
            }
            .kd-signal__body {
                min-height: 102px;
                padding: 12px 14px;
            }
            .kd-signal__label {
                margin: 0;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0;
                text-transform: none;
            }
            .kd-signal__value {
                margin-top: 7px;
                font-size: clamp(20px, 1.5vw, 25px);
                font-weight: 750;
                letter-spacing: -0.025em;
            }
            .kd-signal__helper {
                padding-top: 6px;
                font-size: 10px;
            }
            .kd-signal__trend {
                padding: 0;
                border: 0;
                border-radius: 0;
                font-size: 10px;
                font-weight: 700;
            }

            .kd-focus-grid {
                display: grid;
                grid-template-columns: minmax(0, 1.75fr) minmax(285px, .75fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-section-head {
                min-height: 52px;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 14px;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-section-head > div {
                display: grid;
                gap: 2px;
            }
            .kd-section-head .ant-typography {
                font-size: 10px;
            }
            .kd-performance__head {
                min-height: 52px;
                align-items: center;
                padding: 11px 14px;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-performance__stats {
                gap: 10px;
            }
            .kd-performance__stats span {
                padding: 0;
                border: 0;
                border-radius: 0;
                font-size: 10px;
            }
            .kd-performance__chart {
                height: 238px;
                padding: 10px 12px 12px 4px;
            }

            .kd-status {
                display: inline-flex;
                align-items: center;
                min-height: 22px;
                padding: 2px 7px;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 650;
                white-space: nowrap;
            }
            .kd-status--warn {
                color: var(--kd-warning);
                background: var(--kd-warning-bg);
            }
            .kd-status--good {
                color: var(--kd-success);
                background: var(--kd-success-bg);
            }
            .kd-liquidity {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: 10px;
                padding: 12px 14px;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-liquidity > div {
                display: grid;
                gap: 3px;
            }
            .kd-liquidity .ant-typography {
                font-size: 10px;
            }
            .kd-liquidity strong {
                color: var(--kd-text);
                font-size: 20px;
                line-height: 1.1;
                letter-spacing: -.025em;
            }
            .kd-attention__list {
                display: grid;
            }
            .kd-attention__item {
                appearance: none;
                width: 100%;
                min-height: 49px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 8px 14px;
                border: 0;
                border-bottom: 1px solid var(--kd-grid);
                background: transparent;
                color: var(--kd-text);
                text-align: left;
                cursor: pointer;
            }
            .kd-attention__item:last-child {
                border-bottom: 0;
            }
            .kd-attention__item:hover {
                background: var(--kd-hover);
            }
            .kd-attention__item > span {
                min-width: 0;
                display: grid;
                gap: 1px;
            }
            .kd-attention__item b,
            .kd-attention__item strong {
                font-size: 11px;
                font-weight: 650;
            }
            .kd-attention__item small {
                color: var(--kd-muted);
                font-size: 10px;
            }
            .kd-attention__item strong {
                white-space: nowrap;
            }
            .kd-attention__empty {
                min-height: 86px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 14px;
            }

            .kd-modules__grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .kd-module {
                min-width: 0;
                padding: 11px 14px 12px;
                border-right: 1px solid var(--kd-grid);
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-module:nth-child(3n) {
                border-right: 0;
            }
            .kd-module:nth-last-child(-n + 3) {
                border-bottom: 0;
            }
            .kd-module__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .kd-module__head > .ant-typography {
                font-size: 12px;
            }
            .kd-module__head .ant-btn {
                height: auto;
                padding: 0;
                font-size: 10px;
            }
            .kd-module__primary {
                display: grid;
                gap: 2px;
                margin-top: 8px;
            }
            .kd-module__primary .ant-typography {
                font-size: 10px;
            }
            .kd-module__primary strong {
                color: var(--kd-text);
                font-size: 18px;
                line-height: 1.15;
                letter-spacing: -.02em;
            }
            .kd-module__facts {
                display: flex;
                flex-wrap: wrap;
                gap: 6px 14px;
                margin-top: 9px;
            }
            .kd-module__facts span {
                display: inline-flex;
                align-items: baseline;
                gap: 4px;
            }
            .kd-module__facts small {
                color: var(--kd-muted);
                font-size: 9px;
            }
            .kd-module__facts b {
                color: var(--kd-text);
                font-size: 10px;
                font-weight: 650;
            }

            .kd .ant-table-small .ant-table-cell {
                padding: 7px 10px !important;
                font-size: 11px;
            }
            .kd .ant-table-wrapper .ant-table-thead > tr > th {
                font-size: 10px;
                font-weight: 650;
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
                .kd-signal-grid,
                .kd-kpis {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .kd-hero,
                .kd-focus-grid,
                .kd-main-grid,
                .kd-insight-grid,
                .kd-row-2,
                .kd-row-3,
                .kd-cash-expense-row {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-performance__chart {
                    height: 238px;
                }
                .kd-modules__grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .kd-module:nth-child(3n) { border-right: 1px solid var(--kd-grid); }
                .kd-module:nth-child(2n) { border-right: 0; }
                .kd-module:nth-last-child(-n + 3) { border-bottom: 1px solid var(--kd-grid); }
                .kd-module:nth-last-child(-n + 2) { border-bottom: 0; }
            }
            @media (max-width: 768px) {
                .kd {
                    padding: ${token.paddingXS}px;
                }
                .kd-hero {
                    border-radius: 22px;
                    padding: 18px;
                }
                .kd-hero__score {
                    padding: 16px;
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
                .kd-signal-grid,
                .kd-biz-grid,
                .kd-bottom {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-modules__grid {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-module,
                .kd-module:nth-child(2n),
                .kd-module:nth-child(3n),
                .kd-module:nth-last-child(-n + 2) {
                    border-right: 0;
                    border-bottom: 1px solid var(--kd-grid);
                }
                .kd-module:last-child {
                    border-bottom: 0;
                }
                .kd-performance__head,
                .kd-performance__stats {
                    align-items: flex-start;
                    justify-content: flex-start;
                }
                .kd-performance__head {
                    flex-direction: column;
                }
                .kd-biz__rows {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            @media (max-width: 520px) {
                .kd-kpis {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-card-hdr__t {
                    font-size: ${token.fontSize}px;
                }
            }
        `}</style>
    );
}
