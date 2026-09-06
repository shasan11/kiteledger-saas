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
import { ArrowRightOutlined, CheckCircleOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Bar,
    Area,
    AreaChart,
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
import { humanizeLabel } from '@/utils/humanizeLabel';

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

const LOCALE = 'en-NP';
let activeCurrency = 'NPR';
let currFmt = createNumberFormatter(LOCALE, { style: 'currency', currency: activeCurrency, maximumFractionDigits: 0 });
let compactFmt = createNumberFormatter(LOCALE, { style: 'currency', currency: activeCurrency, notation: 'compact', maximumFractionDigits: 1 });
const numFmt = createNumberFormatter(LOCALE);

const applyCurrency = (currency) => {
    const next = String(currency || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(next) || next === activeCurrency) return;
    activeCurrency = next;
    currFmt = createNumberFormatter(LOCALE, { style: 'currency', currency: next, maximumFractionDigits: 0 });
    compactFmt = createNumberFormatter(LOCALE, { style: 'currency', currency: next, notation: 'compact', maximumFractionDigits: 1 });
};

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

function compactSeries(rows = [], valueKeys = [], { snapshot = false, maxPoints = 18 } = {}) {
    const today = dayjs().endOf('day');
    const withoutFutureDates = rows.filter((row) => !row?.date || !dayjs(row.date).isAfter(today, 'day'));
    const source = withoutFutureDates.length ? withoutFutureDates : rows;

    // Keep daily detail when monthly grouping would leave just one point.
    const months = new Set(source.map((row) => dayjs(row?.date).format('YYYY-MM')));
    if (source.length <= maxPoints || months.size === 1) return source;

    const monthly = new Map();
    source.forEach((row) => {
        const parsed = dayjs(row?.date);
        const key = parsed.isValid() ? parsed.format('YYYY-MM') : `item-${monthly.size}`;
        const current = monthly.get(key) || { date: row?.date, label: parsed.isValid() ? parsed.format('MMM YY') : '' };

        valueKeys.forEach((valueKey) => {
            current[valueKey] = snapshot
                ? toNum(row?.[valueKey])
                : toNum(current[valueKey]) + toNum(row?.[valueKey]);
        });
        current.date = row?.date || current.date;
        monthly.set(key, current);
    });

    return Array.from(monthly.values());
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
    const firstName = page.props.auth?.user?.name?.split(' ')?.[0];

    return (
        <AuthenticatedLayout
            header={<DashHeader branches={branches} filters={filters} loading={loading} onRefresh={fetch} onChange={setFilters} />}
        >
            <Head title={t('Dashboard')} />
            <Styles token={token} />

            <main className="kd">
                <div className="kd-wrap">
                     

                    {error && (
                        <Alert
                            showIcon
                            type="error"
                            message={t('Dashboard could not be loaded')}
                            description={error}
                            action={<Button onClick={fetch}>{t('Retry')}</Button>}
                        />
                    )}

                    {loading ? <DashSkeleton /> : error ? null : (
                        <>
                            <section className="kd-kpi-grid" aria-label={t('Key financial metrics')}>
                                {m.kpis.map((kpi) => <KpiCard key={kpi.key} {...kpi} />)}
                            </section>

                            <section className="kd-focus-grid" aria-label={t('Financial overview')}>
                                <FinancialChart data={m.chartData} summary={m.executive} />
                                <AttentionPanel items={m.attentionItems} />
                            </section>

                            <FinancialSignals model={m} data={data} />

                            <section className="kd-cash-expense-row">
                                <ExpenseDonut data={m.expenseBreakdown} />
                                <CashFlowChart data={m.cashflowChart} />
                            </section>

                            <section className={m.bankAccounts.length ? 'kd-row-2' : 'kd-row-1'}>
                                <AgeingChart data={m.ageingData} />
                                {m.bankAccounts.length > 0 && <BankList accounts={m.bankAccounts} />}
                            </section>

                            {(m.topCustomers.length > 0 || m.topSuppliers.length > 0) && (
                                <section className="kd-row-2">
                                    {m.topCustomers.length > 0 && (
                                        <TopPartiesBar title={t('Top customers')} subtitle={t('Highest sales contribution')} data={m.topCustomers} color={THEME_COLOURS.primary} />
                                    )}
                                    {m.topSuppliers.length > 0 && (
                                        <TopPartiesBar title={t('Top suppliers')} subtitle={t('Highest purchase contribution')} data={m.topSuppliers} color={THEME_COLOURS.warning} />
                                    )}
                                </section>
                            )}

                            {m.bizCards.length > 0 && <ModuleOverview cards={m.bizCards} />}

                            {(m.approachingProjects.length > 0 || m.overdueProjects.length > 0) && (
                                <ProjectDeadlines approaching={m.approachingProjects} overdue={m.overdueProjects} />
                            )}

                            <TxnTable transactions={m.transactions} />
                        </>
                    )}
                </div>
            </main>
        </AuthenticatedLayout>
    );
}

function CardHeading({ title, subtitle }) {
    return (
        <div className="kd-card-heading">
            <span className="kd-card-heading__title">{title}</span>
            {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
    );
}

function FinancialSignals({ model, data }) {
    const t = useTrans();
    const { executive: s, cashPosition } = model;
    const cf = data.cashflow_summary;
    const signals = [
        { label: 'Net profit margin', value: s.revenue > 0 ? `${s.margin.toFixed(1)}%` : DASH, helper: 'Net profit / revenue', tone: profitTone(s.netProfit) },
        { label: 'Net cash flow', value: cf ? fmtMoney(cf.net_cash_flow) : DASH, helper: 'Cash received less cash paid', tone: profitTone(cf?.net_cash_flow) },
        { label: 'Net liquidity', value: fmtMoney(cashPosition.netLiquidity), helper: 'Cash + receivables − payables', tone: profitTone(cashPosition.netLiquidity) },
        { label: 'Cash coverage', value: s.payables > 0 ? `${(s.cash / s.payables).toFixed(2)}×` : DASH, helper: s.payables > 0 ? 'Cash & bank / outstanding payables' : 'No outstanding payables', tone: 'neutral' },
    ];

    return (
        <section className="kd-signal-grid" aria-label={t('Financial indicators')}>
            {signals.map((item) => (
                <div className="kd-signal" data-tone={item.tone} key={item.label}>
                    <div className="kd-signal__top">
                        <Text type="secondary">{t(item.label)}</Text>
                        <span className="kd-signal__dot" aria-hidden="true" />
                    </div>
                    <strong className="kd-signal__value">{item.value}</strong>
                    <Text type="secondary" className="kd-signal__helper">{t(item.helper)}</Text>
                </div>
            ))}
        </section>
    );
}

function AttentionPanel({ items }) {
    const t = useTrans();
    const visibleItems = items.slice(0, 4);

    return (
        <Card
            size="small"
            className="kd-card kd-attention"
            title={<CardHeading title={t('Needs attention')} subtitle={t('Items that may require action')} />}
            extra={visibleItems.length
                ? <Tag icon={<WarningOutlined />} color="warning">{visibleItems.length} {t('open')}</Tag>
                : <Tag icon={<CheckCircleOutlined />} color="success">{t('All clear')}</Tag>}
        >
            <div className="kd-attention__list">
                {visibleItems.length ? visibleItems.map((item) => (
                    <button type="button" className="kd-attention__item" key={item.key} onClick={() => visit(item.href)}>
                        <span className="kd-attention__copy">
                            <b>{t(item.label)}</b>
                            <small>{t(item.module)}</small>
                        </span>
                        <span className="kd-attention__value">
                            <strong>{item.format === 'money' ? fmtMoney(item.value, true) : fmtNum(item.value)}</strong>
                            <ArrowRightOutlined aria-hidden="true" />
                        </span>
                    </button>
                )) : (
                    <div className="kd-attention__empty">
                        <CheckCircleOutlined />
                        <div>
                            <Text strong>{t('Nothing urgent right now')}</Text>
                            <Text type="secondary">{t('No overdue or exceptional items were found.')}</Text>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

function DashHeader({ branches, filters, loading, onRefresh, onChange }) {
    const t = useTrans();
    const opts = [{ value: 'all', label: t('All branches') }, ...(branches || []).map((b) => ({
        value: b.value ?? b.id,
        label: b.label ?? b.name ?? `${t('Branch')} #${b.id}`,
    }))];

    return (
        <div className="kd-hdr">
            <div className="kd-hdr__copy">
                 
                <Title level={4}>{t('Dashboard')}</Title>
                <Text type="secondary">{t('Financial and operational performance')}</Text>
            </div>

            <div className="kd-hdr__ctl">
                <Select
                    value={filters.branch_id}
                    options={opts}
                    className="kd-hdr__branch"
                    aria-label={t('Branch')}
                    onChange={(v) => onChange((c) => ({ ...c, branch_id: v || 'all' }))}
                />
                <RangePicker
                    allowClear={false}
                    presets={[
                        { label: t('This month'), value: [dayjs().startOf('month'), dayjs()] },
                        { label: t('Last month'), value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                        { label: t('Last 90 days'), value: [dayjs().subtract(89, 'day'), dayjs()] },
                        { label: t('Year to date'), value: [dayjs().startOf('year'), dayjs()] },
                    ]}
                    value={filters.date_from && filters.date_to ? [dayjs(filters.date_from), dayjs(filters.date_to)] : null}
                    className="kd-hdr__range"
                    onChange={(d) => onChange((c) => ({
                        ...c,
                        date_from: d?.[0]?.format('YYYY-MM-DD'),
                        date_to: d?.[1]?.format('YYYY-MM-DD'),
                    }))}
                />
                <Tooltip title={t('Refresh')}>
                    <Button
                        aria-label={t('Refresh dashboard')}
                        disabled={loading}
                        icon={<ReloadOutlined spin={loading} />}
                        onClick={onRefresh}
                    />
                </Tooltip>
            </div>
        </div>
    );
}

function KpiCard({ label, value, helper, sparkline = [], color }) {
    const t = useTrans();

    return (
        <Card size="small" className="kd-card kd-kpi" style={{ '--kd-kpi-accent': color }}>
            <div className="kd-kpi__head">
                <Text type="secondary">{t(label)}</Text>
                <span className="kd-kpi__accent" aria-hidden="true" />
            </div>
            <strong className="kd-kpi__value">{fmtMoney(value)}</strong>
            <div className="kd-kpi__footer">
                <Text type="secondary">{helper ? t(helper) : t('Selected period')}</Text>
                <div className="kd-kpi__trend" role="img" aria-label={t(`${label} trend for the selected period`)}>
                    {sparkline.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkline} margin={{ top: 3, right: 1, bottom: 1, left: 1 }}>
                                <ChartTooltip
                                    labelFormatter={(_, payload) => fmtDate(payload?.[0]?.payload?.date)}
                                    formatter={(amount) => [fmtMoney(amount), t(label)]}
                                    contentStyle={{
                                        background: 'var(--kd-elevated)',
                                        borderColor: 'var(--kd-border)',
                                        borderRadius: 'var(--kd-radius-sm)',
                                        color: 'var(--kd-text)',
                                        boxShadow: 'var(--kd-shadow-strong)',
                                    }}
                                    itemStyle={{ color: 'var(--kd-text)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={0.08}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 3 }}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <span className="kd-kpi__dash">{DASH}</span>}
                </div>
            </div>
        </Card>
    );
}

function FinancialChart({ data, summary }) {
    const t = useTrans();
    const hasData = data.some((row) => toNum(row.revenue) || toNum(row.expenses) || toNum(row.profit));
    const marginLabel = summary.revenue > 0 ? `${summary.margin.toFixed(1)}% ${t('margin')}` : t('No margin data');

    return (
        <Card
            size="small"
            className="kd-card kd-performance"
            title={<CardHeading title={t('Financial performance')} subtitle={t('Revenue, expenses and net profit over time')} />}
            extra={<Tag color={summary.netProfit >= 0 ? 'success' : 'error'}>{marginLabel}</Tag>}
        >
            <div className="kd-performance__stats">
                <div>
                    <Text type="secondary">{t('Revenue')}</Text>
                    <strong>{compactMoney(summary.revenue)}</strong>
                </div>
                <div>
                    <Text type="secondary">{t('Expenses')}</Text>
                    <strong>{compactMoney(summary.expenses)}</strong>
                </div>
                <div>
                    <Text type="secondary">{t('Net profit')}</Text>
                    <strong>{compactMoney(summary.netProfit)}</strong>
                </div>
            </div>

            {hasData ? (
                <div className="kd-performance__chart" role="img" aria-label={t('Revenue, expenses and net profit over time')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 18, right: 10, bottom: 6, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                minTickGap={24}
                                tick={{ fill: 'var(--kd-muted)', fontSize: 'var(--kd-font-sm)' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                width={66}
                                tickFormatter={(value) => compactMoney(value)}
                                tick={{ fill: 'var(--kd-muted)', fontSize: 'var(--kd-font-sm)' }}
                            />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend
                                iconType="plainline"
                                wrapperStyle={{ fontSize: 'var(--kd-font-sm)' }}
                                formatter={(name) => <span style={{ color: 'var(--kd-text)' }}>{name}</span>}
                            />
                            <Line type="monotone" dataKey="revenue" name={t('Revenue')} stroke={THEME_COLOURS.primary} strokeWidth={2.25} dot={data.length <= 2} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="expenses" name={t('Expenses')} stroke={THEME_COLOURS.warning} strokeWidth={2} strokeDasharray="5 3" dot={data.length <= 2} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="profit" name={t('Net profit')} stroke={THEME_COLOURS.success} strokeWidth={2} strokeDasharray="2 3" dot={data.length <= 2} activeDot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title={t('No financial data')} desc={t('Revenue and expense activity will appear here.')} />
            )}

            <div className="kd-performance__insight">
                <span className="kd-performance__insight-dot" aria-hidden="true" />
                <Text type="secondary">{t(summary.message)}</Text>
            </div>
        </Card>
    );
}

function ExpenseDonut({ data }) {
    const t = useTrans();
    const total = data.reduce((s, d) => s + toNum(d.value), 0);

    return (
        <Card
            size="small"
            className="kd-card kd-chart-side"
            title={<CardHeading title={t('Expense breakdown')} subtitle={t('Expenses by category')} />}
            extra={total > 0 ? <Text strong>{compactMoney(total)}</Text> : null}
        >
            {data.length > 0 && total > 0 ? (
                <div className="kd-donut">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="44%"
                                innerRadius="54%"
                                outerRadius="76%"
                                paddingAngle={2}
                                strokeWidth={0}
                            >
                                {data.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                            </Pie>
                            <ChartTooltip content={<PieTip total={total} />} />
                            <Legend
                                iconType="circle"
                                iconSize={7}
                                wrapperStyle={{ fontSize: 'var(--kd-font-sm)', lineHeight: '18px' }}
                                formatter={(val) => <span style={{ color: 'var(--kd-text)', fontSize: 'var(--kd-font-sm)' }}>{val}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title={t('No expense data')} desc={t('Expense categories will appear here.')} compact />
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
    const t = useTrans();
    const hasData = data.some((d) => toNum(d.cash_in) || toNum(d.cash_out));

    return (
        <Card
            size="small"
            className="kd-card kd-chart-main"
            title={<CardHeading title={t('Cash flow')} subtitle={t('Cash inflows, outflows and net movement')} />}
        >
            {hasData ? (
                <div className="kd-chart-standard">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 'var(--kd-font-sm)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 'var(--kd-font-sm)' }} tickFormatter={(v) => compactFmt.format(v)} width={58} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 'var(--kd-font-sm)', paddingTop: 4 }} />
                            <Line type="monotone" dataKey="cash_in" name={t('Cash In')} stroke={THEME_COLOURS.info} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="cash_out" name={t('Cash Out')} stroke={THEME_COLOURS.error} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="net" name={t('Net')} stroke={THEME_COLOURS.primaryActive} strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title={t('No cash flow data')} desc={t('Cash inflows and outflows will appear here.')} />
            )}
        </Card>
    );
}

function AgeingChart({ data }) {
    const t = useTrans();
    const hasData = data.some((d) => toNum(d.receivables) > 0 || toNum(d.payables) > 0);

    return (
        <Card
            size="small"
            className="kd-card kd-chart-side"
            title={<CardHeading title={t('Receivables vs payables')} subtitle={t('Outstanding amounts by age')} />}
        >
            {hasData ? (
                <div className="kd-chart-standard">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke="var(--kd-grid)" vertical={false} />
                            <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 'var(--kd-font-sm)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 'var(--kd-font-sm)' }} tickFormatter={(v) => compactFmt.format(v)} width={52} />
                            <ChartTooltip content={<MoneyTip />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 'var(--kd-font-sm)', paddingTop: 4 }} />
                            <Bar dataKey="receivables" name={t('Receivables')} fill={THEME_COLOURS.info} radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="payables" name={t('Payables')} fill={THEME_COLOURS.warning} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <EmptyState title={t('No ageing data')} desc={t('Receivable and payable ageing will appear here.')} compact />
            )}
        </Card>
    );
}

function MoneyTip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="kd-tip">
            <Text strong className="kd-tip__title">{label}</Text>
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
    const t = useTrans();

    return (
        <section className="kd-section" aria-labelledby="operating-summary-title">
            <div className="kd-section__head">
                <div>
                    <Title id="operating-summary-title" level={5}>{t('Operating summary')}</Title>
                    <Text type="secondary">{t('A quick pulse across the modules you use')}</Text>
                </div>
            </div>

            <div className="kd-modules__grid">
                {cards.map((card) => {
                    const primary = card.items[0];
                    return (
                        <Card size="small" className="kd-card kd-module" key={card.key}>
                            <div className="kd-module__head">
                                <Text strong>{t(card.title)}</Text>
                                {card.href && (
                                    <Button type="link" size="small" onClick={() => visit(card.href)}>
                                        {t(card.linkText || 'View')} <ArrowRightOutlined />
                                    </Button>
                                )}
                            </div>

                            <div className="kd-module__primary">
                                <Text type="secondary">{t(primary?.label)}</Text>
                                <strong>{formatModuleValue(primary)}</strong>
                            </div>

                            <div className="kd-module__facts">
                                {card.items.slice(1).map((item) => (
                                    <span key={item.label}>
                                        <small>{t(item.label)}</small>
                                        <b>{formatModuleValue(item)}</b>
                                    </span>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}

function formatModuleValue(item) {
    if (!item) return DASH;
    if (item.format === 'money') return fmtMoney(item.value, true);
    if (item.format === 'text') return item.value || DASH;
    return fmtNum(item.value);
}

function statusTagColor(status) {
    const value = String(status || '').toLowerCase();
    if (['paid', 'posted', 'approved', 'completed', 'active', 'success'].some((x) => value.includes(x))) return 'success';
    if (['overdue', 'failed', 'rejected', 'cancelled', 'canceled'].some((x) => value.includes(x))) return 'error';
    if (['pending', 'draft', 'processing', 'in_progress', 'in progress'].some((x) => value.includes(x))) return 'processing';
    if (['partial', 'upcoming', 'warning'].some((x) => value.includes(x))) return 'warning';
    return 'default';
}

function TxnTable({ transactions }) {
    const t = useTrans();
    const cols = [
        { title: t('Date'), dataIndex: 'date', render: fmtDate, width: 120 },
        { title: t('Type'), dataIndex: 'type', width: 140 },
        {
            title: t('Number'),
            dataIndex: 'number',
            render: (n, r) => r.action_url
                ? <Button type="link" className="kd-table-link" onClick={(e) => { e.stopPropagation(); visit(r.action_url); }}>{n || DASH}</Button>
                : (n || DASH),
        },
        { title: t('Party'), dataIndex: 'party', ellipsis: true, render: (v) => v || DASH },
        { title: t('Amount'), dataIndex: 'amount', align: 'right', render: (v) => <Text strong>{fmtMoney(v)}</Text> },
        {
            title: t('Status'),
            dataIndex: 'status',
            width: 110,
            render: (s) => <Tag color={statusTagColor(s)}>{humanizeLabel(s || 'posted')}</Tag>,
        },
    ];

    return (
        <Card
            size="small"
            className="kd-card kd-table-card"
            title={<CardHeading title={t('Recent transactions')} subtitle={t('Latest posted financial documents')} />}
        >
            {transactions.length > 0 ? (
                <Table
                    rowKey="key"
                    columns={cols}
                    dataSource={transactions}
                    pagination={false}
                    size="small"
                    scroll={{ x: 760 }}
                    onRow={(r) => ({
                        onClick: () => visit(r.action_url),
                        className: r.action_url ? 'kd-row--click' : '',
                    })}
                />
            ) : (
                <EmptyState title={t('No recent transactions')} desc={t('Posted documents will appear here.')} compact />
            )}
        </Card>
    );
}

function TopPartiesBar({ title, subtitle, data, color }) {
    const chartData = data.slice(0, 5).map((d) => ({ ...d, name: truncate(d.name, 18) }));

    return (
        <Card size="small" className="kd-card" title={<CardHeading title={title} subtitle={subtitle} />}>
            <div className="kd-chart-compact">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 2, right: 16, bottom: 0, left: 4 }}>
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--kd-muted)', fontSize: 'var(--kd-font-sm)' }} tickFormatter={(v) => compactFmt.format(v)} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} tick={{ fill: 'var(--kd-text)', fontSize: 'var(--kd-font-sm)' }} />
                        <ChartTooltip content={<MoneyTip />} />
                        <Bar dataKey="amount" name="Amount" fill={color} radius={[0, 4, 4, 0]} maxBarSize={16} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function BankList({ accounts }) {
    const t = useTrans();

    return (
        <Card
            size="small"
            className="kd-card kd-bank-card"
            title={<CardHeading title={t('Bank accounts')} subtitle={t('Available balances by account')} />}
            extra={<Tag>{accounts.length}</Tag>}
        >
            <div className="kd-bank-list">
                {accounts.map((a) => (
                    <div className="kd-bank-row" key={a.key}>
                        <div className="kd-bank-row__copy">
                            <Text strong ellipsis>{a.bank_name || DASH}</Text>
                            <Text type="secondary" ellipsis>
                                {[a.account_name, a.account_number].filter(Boolean).join(' / ') || DASH}
                            </Text>
                        </div>
                        <div className="kd-bank-row__amount">
                            <Text strong>{fmtMoney(a.balance)}</Text>
                            {a.currency && <Text type="secondary">{a.currency}</Text>}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function EmptyState({ title, desc, compact }) {
    return (
        <div className={`kd-empty${compact ? ' kd-empty--compact' : ''}`}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false}>
                <Title level={5}>{title}</Title>
                <Text type="secondary">{desc}</Text>
            </Empty>
        </div>
    );
}

function DashSkeleton() {
    return (
        <div className="kd-skeleton">
            <div className="kd-kpi-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => <Card key={i} className="kd-card"><Skeleton active paragraph={{ rows: 1 }} /></Card>)}
            </div>
            <div className="kd-focus-grid">
                <Card size="small" className="kd-card"><Skeleton active paragraph={{ rows: 8 }} /></Card>
                <Card size="small" className="kd-card"><Skeleton active paragraph={{ rows: 6 }} /></Card>
            </div>
            <div className="kd-signal-grid">
                {[1, 2, 3, 4].map((i) => <Card key={i} className="kd-card"><Skeleton active paragraph={{ rows: 1 }} /></Card>)}
            </div>
            <div className="kd-cash-expense-row">
                <Card size="small" className="kd-card"><Skeleton active paragraph={{ rows: 6 }} /></Card>
                <Card size="small" className="kd-card"><Skeleton active paragraph={{ rows: 6 }} /></Card>
            </div>
            <Card size="small" className="kd-card"><Skeleton active paragraph={{ rows: 5 }} /></Card>
        </div>
    );
}

function buildModel(data) {
    const fin = data.financial_summary || {};
    applyCurrency(fin.currency || data.currency);
    const sparklines = data.metric_sparklines || {};
    const chartRaw = data.revenue_expense_profit_chart || [];
    const cashflowRaw = data.cashflow_chart || [];

    const chartData = compactSeries(chartRaw.map((d) => ({
        date: d.date,
        label: d.date ? dayjs(d.date).format('DD MMM') : '',
        revenue: toNum(d.revenue),
        expenses: toNum(d.expenses),
        profit: toNum(d.profit),
    })), ['revenue', 'expenses', 'profit']);

    const cashflowChart = compactSeries(cashflowRaw.map((d) => ({
        date: d.date,
        label: d.date ? dayjs(d.date).format('DD MMM') : '',
        cash_in: toNum(d.cash_in),
        cash_out: toNum(d.cash_out),
        net: toNum(d.net),
    })), ['cash_in', 'cash_out', 'net']);

    const revSparkline = compactSeries(chartRaw.map((d) => ({ date: d.date, value: toNum(d.revenue) })), ['value']);
    const expSparkline = compactSeries(chartRaw.map((d) => ({ date: d.date, value: toNum(d.expenses) })), ['value']);
    const profitSparkline = compactSeries((sparklines.net_profit || []).map((d) => ({ date: d.date, value: toNum(d.value) })), ['value']);
    const cashSparkline = compactSeries((sparklines.cash_bank || []).map((d) => ({ date: d.date, value: toNum(d.value) })), ['value'], { snapshot: true });
    const recSparkline = compactSeries((sparklines.receivables || []).map((d) => ({ date: d.date, value: toNum(d.value) })), ['value'], { snapshot: true });
    const paySparkline = compactSeries((sparklines.payables || []).map((d) => ({ date: d.date, value: toNum(d.value) })), ['value'], { snapshot: true });

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

    const kpis = [
        { key: 'revenue', label: 'Revenue', value: fin.revenue, sparkline: revSparkline, color: THEME_COLOURS.primary, helper: 'This period' },
        { key: 'expenses', label: 'Expenses', value: fin.expenses, sparkline: expSparkline, color: THEME_COLOURS.warning, invertTrend: true, helper: 'This period' },
        { key: 'profit', label: 'Net Profit', value: fin.net_profit, sparkline: profitSparkline, color: toNum(fin.net_profit) >= 0 ? THEME_COLOURS.success : THEME_COLOURS.error, helper: toNum(fin.revenue) > 0 ? `${((toNum(fin.net_profit) / toNum(fin.revenue)) * 100).toFixed(1)}% margin` : 'This period' },
        { key: 'cash', label: 'Cash & Bank', value: fin.cash_bank_balance, sparkline: cashSparkline, color: THEME_COLOURS.info, helper: 'Available' },
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
        items.push({ label: 'On leave today', value: hrm.on_leave_today });
        items.push({ label: 'Attendance today', value: hrm.attendance_today });
        items.push({ label: 'Payroll', value: hrm.payroll_this_period, format: 'money' });
        bizCards.push({ key: 'hrm', title: 'HRM', href: '/hrm/users', linkText: 'View', items });
    }
    const proj = data.project_summary;
    if (proj) {
        const items = [
            { label: 'Active', value: proj.active_projects },
            { label: 'Completed', value: proj.completed_this_period },
        ];
        items.push({ label: 'Overdue tasks', value: proj.overdue_tasks });
        items.push({ label: 'Billing', value: proj.billing_value, format: 'money' });
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
        executive, cashPosition, attentionItems,
        kpis, chartData, cashflowChart, expenseBreakdown, ageingData, bizCards,
        transactions, topCustomers, topSuppliers, bankAccounts,
        approachingProjects: Array.isArray(data.approaching_deadline_projects) ? data.approaching_deadline_projects : [],
        overdueProjects: Array.isArray(data.overdue_projects) ? data.overdue_projects : [],
    };
}

function ProjectDeadlines({ approaching, overdue }) {
    const t = useTrans();
    const cols = (bucket) => [
        {
            title: t('Project'),
            dataIndex: 'name',
            render: (v, row) => <Button type="link" className="kd-table-link" onClick={() => visit(row.action_url)}>{v || DASH}</Button>,
        },
        { title: t('Manager'), dataIndex: 'manager', ellipsis: true, render: (v) => v || DASH },
        { title: t('End Date'), dataIndex: 'end_date', width: 120, render: fmtDate },
        {
            title: bucket === 'overdue' ? t('Overdue') : t('Time Left'),
            width: 120,
            render: (_, row) => bucket === 'overdue'
                ? `${row.days_overdue || 0} ${Number(row.days_overdue) === 1 ? t('day') : t('days')}`
                : `${row.days_left || 0} ${Number(row.days_left) === 1 ? t('day') : t('days')}`,
        },
        {
            title: t('Status'),
            dataIndex: 'status',
            width: 120,
            render: (v) => <Tag color={statusTagColor(v)}>{String(v || DASH).replace(/_/g, ' ')}</Tag>,
        },
    ];

    const table = (rows, bucket) => rows.length ? (
        <Table size="small" rowKey="id" pagination={false} dataSource={rows} columns={cols(bucket)} scroll={{ x: 680 }} />
    ) : (
        <EmptyState title={t('No projects')} desc={t('Project deadlines that need attention will appear here.')} compact />
    );

    return (
        <Card
            size="small"
            className="kd-card kd-table-card"
            title={<CardHeading title={t('Project deadlines')} subtitle={t('Approaching and overdue internal project dates')} />}
        >
            <Tabs
                size="small"
                items={[
                    { key: 'approaching', label: `${t('Approaching')} (${approaching.length})`, children: table(approaching, 'approaching') },
                    { key: 'overdue', label: `${t('Overdue')} (${overdue.length})`, children: table(overdue, 'overdue') },
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
    return <style>{`
        .kd, .kd-hdr {
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
            --kd-font-sm: ${token.fontSizeSM}px;
            --kd-font: ${token.fontSize}px;
            --kd-font-lg: ${token.fontSizeLG}px;
            --kd-font-xl: ${token.fontSizeXL}px;
            --kd-metric: ${token.fontSizeHeading3}px;
            --kd-weight: ${token.fontWeightStrong};
            --kd-control: ${token.controlHeight}px;
            font-family: ${token.fontFamily};
            font-size: ${token.fontSize}px;
            line-height: ${token.lineHeight};
        }

        .kd {
            min-height: 100%;
            padding: ${token.paddingLG}px;
            background: var(--kd-bg);
            color: var(--kd-text);
        }

        .kd-wrap {
            width: 100%;
            max-width: 1600px;
            margin-inline: auto;
            display: flex;
            flex-direction: column;
            gap: ${token.marginLG}px;
            min-width: 0;
        }

        .kd-hdr {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${token.margin}px;
            min-width: 0;
        }

        .kd-hdr__copy {
            display: grid;
            gap: ${token.marginXXS}px;
            min-width: 0;
        }

        .kd-hdr__copy .ant-typography {
            margin: 0;
        }

        .kd-eyebrow {
            display: block;
            color: var(--kd-primary);
            font-size: ${token.fontSizeSM}px;
            font-weight: ${token.fontWeightStrong};
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .kd-hdr__ctl {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: ${token.marginSM}px;
            min-width: 0;
        }

        .kd-hdr__branch { width: 170px; }
        .kd-hdr__range { width: 250px; }

        .kd-intro {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: ${token.marginLG}px;
            padding: ${token.paddingLG}px;
            border: ${token.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius);
            background: var(--kd-card);
            box-shadow: var(--kd-shadow);
        }

        .kd-intro__copy {
            display: grid;
            gap: ${token.marginXS}px;
            min-width: 0;
        }

        .kd-intro__title.ant-typography {
            margin: 0;
            color: var(--kd-text);
        }

        .kd-context {
            display: flex;
            align-items: stretch;
            border: ${token.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius-sm);
            overflow: hidden;
            background: var(--kd-soft);
            flex: 0 0 auto;
        }

        .kd-context__item {
            min-width: 150px;
            display: grid;
            gap: ${token.marginXXS}px;
            padding: ${token.paddingSM}px ${token.padding}px;
        }

        .kd-context__item + .kd-context__item {
            border-inline-start: ${token.lineWidth}px solid var(--kd-border);
        }

        .kd-context__item .ant-typography {
            font-size: ${token.fontSizeSM}px;
        }

        .kd-context__item strong {
            color: var(--kd-text);
            font-weight: ${token.fontWeightStrong};
            white-space: nowrap;
        }

        .kd-kpi-grid,
        .kd-signal-grid,
        .kd-focus-grid,
        .kd-cash-expense-row,
        .kd-row-2,
        .kd-row-1,
        .kd-modules__grid {
            display: grid;
            gap: ${token.margin}px;
            min-width: 0;
        }

        .kd-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .kd-signal-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .kd-focus-grid { grid-template-columns: minmax(0, 2fr) minmax(300px, 0.85fr); align-items: stretch; }
        .kd-cash-expense-row { grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.35fr); }
        .kd-row-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .kd-row-1 { grid-template-columns: minmax(0, 1fr); }
        .kd-modules__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

        .kd-card.ant-card {
            min-width: 0;
            overflow: hidden;
            border-color: var(--kd-border);
            background: var(--kd-card);
            box-shadow: var(--kd-shadow);
        }

        .kd-card.ant-card .ant-card-head {
            min-height: auto;
            padding-inline: ${token.paddingLG}px;
            border-bottom-color: var(--kd-grid);
        }

        .kd-card.ant-card .ant-card-head-title,
        .kd-card.ant-card .ant-card-extra {
            padding-block: ${token.padding}px;
        }

        .kd-card.ant-card .ant-card-body {
            padding: ${token.paddingLG}px;
        }

        .kd-card-heading {
            display: grid;
            gap: ${token.marginXXS}px;
            white-space: normal;
        }

        .kd-card-heading__title {
            color: var(--kd-text);
            font-size: ${token.fontSizeLG}px;
            font-weight: ${token.fontWeightStrong};
            line-height: ${token.lineHeightLG};
        }

        .kd-card-heading .ant-typography {
            font-size: ${token.fontSizeSM}px;
        }

        .kd-kpi.ant-card {
            position: relative;
        }

        .kd-kpi.ant-card::before {
            content: '';
            position: absolute;
            inset-inline: 0;
            top: 0;
            height: ${token.lineWidthBold || 2}px;
            background: var(--kd-kpi-accent, var(--kd-primary));
        }

        .kd-kpi__head,
        .kd-kpi__footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${token.marginSM}px;
        }

        .kd-kpi__head .ant-typography,
        .kd-kpi__footer > .ant-typography {
            font-size: ${token.fontSizeSM}px;
        }

        .kd-kpi__accent {
            width: ${token.sizeXXS}px;
            height: ${token.sizeXXS}px;
            border-radius: 999px;
            background: var(--kd-kpi-accent, var(--kd-primary));
            flex: 0 0 auto;
        }

        .kd-kpi__value {
            display: block;
            margin-top: ${token.marginXS}px;
            color: var(--kd-text);
            font-size: var(--kd-metric);
            line-height: 1.2;
            font-weight: ${token.fontWeightStrong};
            letter-spacing: -0.02em;
            overflow-wrap: anywhere;
        }

        .kd-kpi__footer {
            margin-top: ${token.marginSM}px;
        }

        .kd-kpi__trend {
            width: 44%;
            min-width: 72px;
            height: 38px;
        }

        .kd-kpi__dash {
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            color: var(--kd-subtle);
        }

        .kd-performance.ant-card,
        .kd-attention.ant-card {
            height: 100%;
        }

        .kd-performance > .ant-card-body {
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        .kd-performance__stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: ${token.marginSM}px;
            margin-bottom: ${token.marginSM}px;
        }

        .kd-performance__stats > div {
            min-width: 0;
            display: grid;
            gap: ${token.marginXXS}px;
            padding: ${token.paddingSM}px ${token.padding}px;
            border: ${token.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius-sm);
            background: var(--kd-soft);
        }

        .kd-performance__stats .ant-typography {
            font-size: ${token.fontSizeSM}px;
        }

        .kd-performance__stats strong {
            font-size: ${token.fontSizeLG}px;
            font-weight: ${token.fontWeightStrong};
            color: var(--kd-text);
            overflow-wrap: anywhere;
        }

        .kd-performance__chart {
            flex: 0 0 auto;
            height: 310px;
            min-width: 0;
        }

        .kd-performance__insight {
            display: flex;
            align-items: flex-start;
            gap: ${token.marginXS}px;
            margin-top: ${token.marginSM}px;
            padding-top: ${token.paddingSM}px;
            border-top: ${token.lineWidth}px solid var(--kd-grid);
        }

        .kd-performance__insight-dot {
            width: ${token.sizeXXS}px;
            height: ${token.sizeXXS}px;
            margin-top: ${token.marginXXS}px;
            border-radius: 999px;
            background: var(--kd-primary);
            flex: 0 0 auto;
        }

        .kd-signal {
            position: relative;
            display: grid;
            gap: ${token.marginXXS}px;
            min-width: 0;
            padding: ${token.padding}px;
            border: ${token.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius);
            background: var(--kd-card);
            box-shadow: var(--kd-shadow);
        }

        .kd-signal__top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${token.marginXS}px;
        }

        .kd-signal__top .ant-typography,
        .kd-signal__helper.ant-typography {
            font-size: ${token.fontSizeSM}px;
        }

        .kd-signal__dot {
            width: ${token.sizeXXS}px;
            height: ${token.sizeXXS}px;
            border-radius: 999px;
            background: var(--kd-muted);
            flex: 0 0 auto;
        }

        .kd-signal[data-tone='positive'] .kd-signal__dot { background: var(--kd-success); }
        .kd-signal[data-tone='negative'] .kd-signal__dot { background: var(--kd-error); }

        .kd-signal__value {
            color: var(--kd-text);
            font-size: ${token.fontSizeXL}px;
            line-height: ${token.lineHeightLG};
            font-weight: ${token.fontWeightStrong};
            overflow-wrap: anywhere;
        }

        .kd-attention > .ant-card-body {
            padding-top: ${token.paddingXS}px;
        }

        .kd-attention__list {
            display: grid;
        }

        .kd-attention__item {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${token.marginSM}px;
            padding: ${token.padding}px ${token.paddingXS}px;
            border: 0;
            border-bottom: ${token.lineWidth}px solid var(--kd-grid);
            border-radius: var(--kd-radius-xs);
            background: transparent;
            color: var(--kd-text);
            text-align: start;
            font: inherit;
            cursor: pointer;
            transition: background ${token.motionDurationFast};
        }

        .kd-attention__item:last-child { border-bottom-color: transparent; }
        .kd-attention__item:hover { background: var(--kd-hover); }
        .kd-attention__item:focus-visible { outline: ${token.lineWidthFocus}px solid var(--kd-primary); outline-offset: 1px; }

        .kd-attention__copy {
            display: grid;
            gap: ${token.marginXXS}px;
            min-width: 0;
        }

        .kd-attention__copy b {
            font-weight: ${token.fontWeightStrong};
        }

        .kd-attention__copy small {
            color: var(--kd-muted);
            font-size: ${token.fontSizeSM}px;
        }

        .kd-attention__value {
            display: flex;
            align-items: center;
            gap: ${token.marginXS}px;
            flex: 0 0 auto;
        }

        .kd-attention__value strong { font-weight: ${token.fontWeightStrong}; }
        .kd-attention__value .anticon { color: var(--kd-subtle); font-size: ${token.fontSizeSM}px; }

        .kd-attention__empty {
            min-height: 230px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${token.marginSM}px;
            padding: ${token.paddingLG}px;
            text-align: left;
        }

        .kd-attention__empty > .anticon {
            color: var(--kd-success);
            font-size: ${token.fontSizeHeading4}px;
        }

        .kd-attention__empty > div {
            display: grid;
            gap: ${token.marginXXS}px;
        }

        .kd-donut,
        .kd-chart-standard {
            height: 270px;
        }

        .kd-chart-compact {
            height: 220px;
        }

        .kd-section {
            display: grid;
            gap: ${token.marginSM}px;
        }

        .kd-section__head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: ${token.margin}px;
        }

        .kd-section__head > div {
            display: grid;
            gap: ${token.marginXXS}px;
        }

        .kd-section__head .ant-typography { margin: 0; }

        .kd-module.ant-card .ant-card-body {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .kd-module__head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${token.marginXS}px;
            min-height: var(--kd-control);
            padding-bottom: ${token.paddingSM}px;
            border-bottom: ${token.lineWidth}px solid var(--kd-grid);
        }

        .kd-module__head .ant-btn {
            padding-inline: 0;
        }

        .kd-module__primary {
            display: grid;
            gap: ${token.marginXXS}px;
            padding-block: ${token.padding}px;
        }

        .kd-module__primary strong {
            color: var(--kd-text);
            font-size: ${token.fontSizeHeading4}px;
            line-height: ${token.lineHeightHeading4};
            font-weight: ${token.fontWeightStrong};
            overflow-wrap: anywhere;
        }

        .kd-module__facts {
            display: grid;
            gap: ${token.marginXS}px;
            margin-top: auto;
        }

        .kd-module__facts span {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: ${token.marginXS}px;
        }

        .kd-module__facts small {
            color: var(--kd-muted);
            font-size: ${token.fontSizeSM}px;
        }

        .kd-module__facts b {
            color: var(--kd-text);
            font-weight: ${token.fontWeightStrong};
            text-align: end;
        }

        .kd-bank-list {
            display: grid;
        }

        .kd-bank-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${token.marginSM}px;
            padding-block: ${token.padding}px;
            border-bottom: ${token.lineWidth}px solid var(--kd-grid);
        }

        .kd-bank-row:first-child { padding-top: 0; }
        .kd-bank-row:last-child { padding-bottom: 0; border-bottom: 0; }

        .kd-bank-row__copy,
        .kd-bank-row__amount {
            display: grid;
            gap: ${token.marginXXS}px;
            min-width: 0;
        }

        .kd-bank-row__copy .ant-typography,
        .kd-bank-row__amount .ant-typography {
            font-size: ${token.fontSizeSM}px;
        }

        .kd-bank-row__amount {
            flex: 0 0 auto;
            text-align: end;
        }

        .kd-table-card .ant-table-wrapper {
            margin-inline: -${token.paddingLG}px;
            margin-bottom: -${token.paddingLG}px;
        }

        .kd-table-card .ant-table {
            border-top: ${token.lineWidth}px solid var(--kd-grid);
        }

        .kd-table-card .ant-table-thead > tr > th {
            color: var(--kd-muted);
            font-size: ${token.fontSizeSM}px;
            font-weight: ${token.fontWeightStrong};
            background: var(--kd-soft);
        }

        .kd-table-card .ant-table-tbody > tr > td {
            border-bottom-color: var(--kd-grid);
        }

        .kd-table-link.ant-btn {
            height: auto;
            padding: 0;
            font-weight: ${token.fontWeightStrong};
        }

        .kd-row--click { cursor: pointer; }
        .kd-row--click:hover > td { background: var(--kd-hover) !important; }

        .kd-tip {
            min-width: 180px;
            padding: ${token.paddingSM}px;
            border: ${token.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius-sm);
            background: var(--kd-elevated);
            box-shadow: var(--kd-shadow-strong);
        }

        .kd-tip__title.ant-typography {
            font-size: ${token.fontSizeSM}px;
        }

        .kd-tip__row {
            display: grid;
            grid-template-columns: ${token.sizeXXS}px 1fr auto;
            align-items: center;
            gap: ${token.marginXS}px;
            margin-top: ${token.marginXXS}px;
        }

        .kd-tip__row > span:first-child {
            width: ${token.sizeXXS}px;
            height: ${token.sizeXXS}px;
            border-radius: 999px;
        }

        .kd-empty {
            min-height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${token.padding}px;
            text-align: center;
        }

        .kd-empty--compact { min-height: 120px; }

        .kd-empty .ant-empty-description { display: none; }
        .kd-empty .ant-typography { margin: 0; }
        .kd-empty .ant-empty-footer { margin-top: ${token.marginXS}px; }
        .kd-empty .ant-empty-footer .ant-typography { display: block; font-size: ${token.fontSizeSM}px; }

        .kd-skeleton {
            display: flex;
            flex-direction: column;
            gap: ${token.marginLG}px;
        }

        @media (max-width: 1280px) {
            .kd-focus-grid { grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.9fr); }
            .kd-signal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 1050px) {
            .kd { padding: ${token.padding}px; }
            .kd-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .kd-focus-grid,
            .kd-cash-expense-row,
            .kd-row-2 { grid-template-columns: minmax(0, 1fr); }
            .kd-modules__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .kd-intro { align-items: flex-start; flex-direction: column; }
            .kd-context { width: 100%; }
            .kd-context__item { flex: 1 1 0; min-width: 0; }
        }

        @media (max-width: 760px) {
            .kd-hdr {
                align-items: flex-start;
                flex-direction: column;
            }

            .kd-hdr__ctl {
                width: 100%;
                flex-wrap: wrap;
                justify-content: flex-start;
            }

            .kd-hdr__branch,
            .kd-hdr__range {
                flex: 1 1 220px;
                width: auto;
                min-width: 0;
            }

            .kd-kpi-grid,
            .kd-signal-grid,
            .kd-modules__grid {
                grid-template-columns: minmax(0, 1fr);
            }

            .kd-performance__stats {
                grid-template-columns: minmax(0, 1fr);
            }

            .kd-performance__chart { height: 260px; }
            .kd-donut, .kd-chart-standard { height: 240px; }
        }

        @media (max-width: 520px) {
            .kd { padding: ${token.paddingSM}px; }
            .kd-wrap { gap: ${token.margin}px; }
            .kd-intro { padding: ${token.padding}px; }
            .kd-context { flex-direction: column; }
            .kd-context__item + .kd-context__item {
                border-inline-start: 0;
                border-top: ${token.lineWidth}px solid var(--kd-border);
            }
            .kd-card.ant-card .ant-card-head,
            .kd-card.ant-card .ant-card-body { padding-inline: ${token.padding}px; }
            .kd-table-card .ant-table-wrapper {
                margin-inline: -${token.padding}px;
                margin-bottom: -${token.paddingLG}px;
            }
            .kd-kpi__trend { width: 40%; }
        }
    `}</style>;
}
