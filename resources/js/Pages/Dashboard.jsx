import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    DatePicker,
    Drawer,
    Empty,
    Flex,
    Progress,
    Row,
    Segmented,
    Select,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
    Timeline,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import {
    AlertOutlined,
    ArrowDownOutlined,
    ArrowUpOutlined,
    BankOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseOutlined,
    ExclamationCircleOutlined,
    FileDoneOutlined,
    FileTextOutlined,
    InboxOutlined,
    ReloadOutlined,
    RightOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;

const money = (value, opts = {}) => {
    const n = Number(value || 0);

    if (opts.compact) {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(n);
    }

    return new Intl.NumberFormat('en-NP', {
        style: 'currency',
        currency: 'NPR',
        maximumFractionDigits: 0,
    }).format(n);
};

const number = (v) => new Intl.NumberFormat('en-NP').format(Number(v || 0));
const toNumber = (v) => Number(v || 0);

const visit = (url) => {
    if (url && url !== '#') {
        router.visit(url);
    }
};

const statusToTone = {
    approved: 'success',
    posted: 'success',
    success: 'success',
    draft: 'default',
    new: 'processing',
    pending: 'warning',
    warning: 'warning',
    info: 'processing',
    cancelled: 'error',
    void: 'error',
    critical: 'error',
    missing_jv: 'error',
    no_stock: 'error',
    negative: 'error',
    low_stock: 'warning',
    part_paid: 'warning',
};

const eyebrowStyle = (token) => ({
    fontSize: 11,
    fontWeight: 600,
    color: token.colorTextTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
});

const PanelHeader = ({ token, eyebrow, title, extra }) => (
    <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={token.marginSM}
        style={{ width: '100%' }}
    >
        <Space direction="vertical" size={2}>
            <Text style={eyebrowStyle(token)}>{eyebrow}</Text>
            <Text strong style={{ fontSize: 16, color: token.colorTextHeading }}>
                {title}
            </Text>
        </Space>

        {extra}
    </Flex>
);

export default function Dashboard() {
    const { token } = theme.useToken();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeView, setActiveView] = useState('Overview');

    const [filters, setFilters] = useState({
        branch_id: undefined,
        date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
        date_to: dayjs().format('YYYY-MM-DD'),
    });

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: res } = await axios.get('/dashboard-data', {
                params: filters,
            });

            setData(res || {});
        } catch (e) {
            setError(e?.response?.data?.message || 'Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const summary = data.summary || {};
    const cashFlow = data.cash_flow || { summary: {}, chart: [] };
    const inventory = data.inventory || { summary: {}, warnings: [] };
    const crm = data.crm || { summary: {}, pipeline: [] };
    const salesPurchase = data.sales_purchase || {};
    const accountingHealth = data.accounting_health || {};

    const cashBankBalances = useMemo(() => {
        if (Array.isArray(data.cash_bank_balances) && data.cash_bank_balances.length) {
            return data.cash_bank_balances;
        }

        return [
            ...(Array.isArray(data.cash_accounts) ? data.cash_accounts : []),
            ...(Array.isArray(data.bank_accounts) ? data.bank_accounts : []),
        ];
    }, [data]);

    const totalApprovalCount =
        (data.approvals?.length || 0) + (data.accounting_issues?.length || 0);

    return (
        <AuthenticatedLayout
            header={
                <TopBar
                    token={token}
                    filters={filters}
                    setFilters={setFilters}
                    branches={data.branches || []}
                    refresh={fetchDashboard}
                    loading={loading}
                />
            }
        >
            <Head title="Dashboard" />

            <div
                style={{
                    minHeight: 'calc(100vh - 110px)',
                    background: token.colorBgLayout,
                    padding: token.paddingLG,
                }}
            >
                <Space direction="vertical" size={token.marginLG} style={{ width: '100%' }}>
                    {error && (
                        <Card
                            size="small"
                            style={{
                                borderColor: token.colorErrorBorder,
                                background: token.colorErrorBg,
                                borderRadius: token.borderRadiusLG,
                            }}
                        >
                            <Space>
                                <ExclamationCircleOutlined style={{ color: token.colorError }} />
                                <Text style={{ color: token.colorError }}>{error}</Text>
                            </Space>
                        </Card>
                    )}

                    {loading ? (
                        <LoadingState />
                    ) : (
                        <>
                            <HeroSection
                                token={token}
                                summary={summary}
                                cashFlow={cashFlow}
                                accountingHealth={accountingHealth}
                                onCashClick={() => setDrawerOpen(true)}
                            />

                            <Flex justify="flex-start">
                                <Segmented
                                    size="large"
                                    value={activeView}
                                    onChange={setActiveView}
                                    options={[
                                        { label: 'Overview', value: 'Overview' },
                                        {
                                            label: (
                                                <Space size={6}>
                                                    Approvals & Issues
                                                    {totalApprovalCount > 0 && (
                                                        <Badge
                                                            count={totalApprovalCount}
                                                            overflowCount={99}
                                                            color={token.colorError}
                                                        />
                                                    )}
                                                </Space>
                                            ),
                                            value: 'Approvals',
                                        },
                                        { label: 'Activity', value: 'Activity' },
                                    ]}
                                />
                            </Flex>

                            {activeView === 'Overview' && (
                                <OverviewTab
                                    token={token}
                                    cashFlow={cashFlow}
                                    salesPurchase={salesPurchase}
                                    inventory={inventory}
                                    crm={crm}
                                    accountingHealth={accountingHealth}
                                    summary={summary}
                                />
                            )}

                            {activeView === 'Approvals' && (
                                <ApprovalsTab
                                    token={token}
                                    approvals={data.approvals || []}
                                    issues={data.accounting_issues || []}
                                />
                            )}

                            {activeView === 'Activity' && (
                                <ActivityTab
                                    token={token}
                                    activity={data.recent_activity || []}
                                    alerts={data.alerts || []}
                                />
                            )}
                        </>
                    )}
                </Space>
            </div>

            <CashDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                token={token}
                cashFlow={cashFlow}
                balances={cashBankBalances}
            />
        </AuthenticatedLayout>
    );
}

function TopBar({ token, filters, setFilters, branches, refresh, loading }) {
    const branchOptions = useMemo(() => {
        if (!Array.isArray(branches)) return [];

        return branches.map((branch) => {
            if (branch?.value !== undefined && branch?.label !== undefined) {
                return branch;
            }

            return {
                value: branch.id,
                label: branch.name || branch.title || branch.branch_name || `Branch #${branch.id}`,
            };
        });
    }, [branches]);

    return (
        <Flex align="center" justify="space-between" wrap="wrap" gap={token.marginSM}>
            <Flex align="center" gap={token.marginMD} wrap="wrap">
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                    Dashboard
                </Title>

                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    {dayjs().format('dddd, MMMM D, YYYY')}
                </Text>
            </Flex>

            <Space wrap size={token.marginXS}>
                <Select
                    allowClear
                    placeholder="All branches"
                    style={{ width: 170 }}
                    options={branchOptions}
                    value={filters.branch_id}
                    onChange={(branch_id) => {
                        setFilters((current) => ({
                            ...current,
                            branch_id,
                        }));
                    }}
                />

                <RangePicker
                    value={
                        filters.date_from && filters.date_to
                            ? [dayjs(filters.date_from), dayjs(filters.date_to)]
                            : null
                    }
                    onChange={(dates) => {
                        setFilters((current) => ({
                            ...current,
                            date_from: dates?.[0] ? dates[0].format('YYYY-MM-DD') : undefined,
                            date_to: dates?.[1] ? dates[1].format('YYYY-MM-DD') : undefined,
                        }));
                    }}
                />

                <Tooltip title="Refresh">
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh} />
                </Tooltip>
            </Space>
        </Flex>
    );
}

function HeroSection({ token, summary, cashFlow, accountingHealth, onCashClick }) {
    const sales = toNumber(summary.sales_this_month);
    const today = toNumber(summary.sales_today);
    const cashBalance = toNumber(summary.cash_bank_balance);
    const receivables = toNumber(summary.receivables);
    const payables = toNumber(summary.payables);
    const net = receivables - payables;
    const pending = toNumber(summary.pending_approvals);
    const lowStock = toNumber(summary.low_stock_items);
    const jvMissing = toNumber(accountingHealth.approved_jv_missing);

    const sparkData = (cashFlow.chart || []).slice(-14).map((d) => ({
        date: d.date,
        value: toNumber(d.cash_in),
    }));

    return (
        <Row gutter={[token.marginLG, token.marginLG]}>
            <Col xs={24} xl={10}>
                <Card
                    style={{
                        borderRadius: token.borderRadiusLG,
                        background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorPrimaryBg} 100%)`,
                        height: '100%',
                    }}
                    styles={{ body: { padding: token.paddingLG } }}
                >
                    <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                        <Text style={eyebrowStyle(token)}>Month-to-date Revenue</Text>

                        <Statistic
                            value={sales}
                            formatter={(v) => money(v)}
                            valueStyle={{
                                fontSize: 40,
                                fontWeight: 700,
                                color: token.colorTextHeading,
                                lineHeight: 1.1,
                            }}
                        />

                        <Space size={token.marginXS} wrap>
                            <Tag
                                icon={<ArrowUpOutlined />}
                                color="success"
                                style={{
                                    fontWeight: 500,
                                    padding: '2px 8px',
                                    borderRadius: token.borderRadiusSM,
                                }}
                            >
                                {money(today, { compact: true })} today
                            </Tag>

                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                Net position{' '}
                                <Text
                                    strong
                                    style={{
                                        color: net >= 0 ? token.colorSuccess : token.colorError,
                                    }}
                                >
                                    {money(net, { compact: true })}
                                </Text>
                            </Text>
                        </Space>

                        <div style={{ marginTop: token.marginSM, marginLeft: -8 }}>
                            <ResponsiveContainer width="100%" height={70}>
                                <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={token.colorPrimary} stopOpacity={0.32} />
                                            <stop offset="100%" stopColor={token.colorPrimary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>

                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={token.colorPrimary}
                                        strokeWidth={2}
                                        fill="url(#hero-spark)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Space>
                </Card>
            </Col>

            <Col xs={24} xl={14}>
                <Row gutter={[token.marginSM, token.marginSM]} style={{ height: '100%' }}>
                    <Col xs={12} md={8}>
                        <KpiTile
                            token={token}
                            label="Receivables"
                            value={money(receivables, { compact: true })}
                            sub="Customers owe"
                            icon={<FileTextOutlined />}
                            color={token.colorWarning}
                            bg={token.colorWarningBg}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <KpiTile
                            token={token}
                            label="Payables"
                            value={money(payables, { compact: true })}
                            sub="We owe"
                            icon={<FileDoneOutlined />}
                            color={token.colorError}
                            bg={token.colorErrorBg}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <KpiTile
                            token={token}
                            label="Cash & Bank"
                            value={money(cashBalance, { compact: true })}
                            sub="Click to view detail"
                            icon={<BankOutlined />}
                            color={cashBalance < 0 ? token.colorError : token.colorInfo}
                            bg={cashBalance < 0 ? token.colorErrorBg : token.colorInfoBg}
                            onClick={onCashClick}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <KpiTile
                            token={token}
                            label="Pending Approvals"
                            value={number(pending)}
                            sub={jvMissing > 0 ? `${number(jvMissing)} JV gaps` : 'All clear'}
                            icon={<ClockCircleOutlined />}
                            color={pending > 0 ? token.colorWarning : token.colorSuccess}
                            bg={pending > 0 ? token.colorWarningBg : token.colorSuccessBg}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <KpiTile
                            token={token}
                            label="Low Stock"
                            value={number(lowStock)}
                            sub="Below reorder"
                            icon={<InboxOutlined />}
                            color={lowStock > 0 ? token.colorWarning : token.colorSuccess}
                            bg={lowStock > 0 ? token.colorWarningBg : token.colorSuccessBg}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <KpiTile
                            token={token}
                            label="Critical Issues"
                            value={number(jvMissing)}
                            sub="Need review"
                            icon={<AlertOutlined />}
                            color={jvMissing > 0 ? token.colorError : token.colorSuccess}
                            bg={jvMissing > 0 ? token.colorErrorBg : token.colorSuccessBg}
                        />
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

function KpiTile({ token, label, value, sub, icon, color, bg, onClick }) {
    const clickable = typeof onClick === 'function';

    return (
        <Card
            hoverable={clickable}
            onClick={onClick}
            style={{
                height: '100%',
                borderRadius: token.borderRadiusLG,
                cursor: clickable ? 'pointer' : 'default',
            }}
            styles={{ body: { padding: token.paddingSM, height: '100%' } }}
        >
            <Flex vertical justify="space-between" gap={token.marginXXS} style={{ height: '100%' }}>
                <Flex justify="space-between" align="flex-start">
                    <Text style={eyebrowStyle(token)}>{label}</Text>

                    <Avatar
                        size={26}
                        style={{
                            background: bg,
                            color,
                            fontSize: 12,
                        }}
                        icon={icon}
                    />
                </Flex>

                <Text
                    strong
                    style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color,
                        lineHeight: 1.1,
                    }}
                >
                    {value}
                </Text>

                <Text type="secondary" style={{ fontSize: 11 }}>
                    {sub}
                </Text>
            </Flex>
        </Card>
    );
}

function OverviewTab({ token, cashFlow, salesPurchase, inventory, crm, accountingHealth, summary }) {
    return (
        <Row gutter={[token.marginLG, token.marginLG]}>
            <Col xs={24} xl={16}>
                <Space direction="vertical" size={token.marginLG} style={{ width: '100%' }}>
                    <CashFlowCard token={token} cashFlow={cashFlow} />
                    <SalesPurchaseCard token={token} data={salesPurchase} summary={summary} />
                </Space>
            </Col>

            <Col xs={24} xl={8}>
                <Space direction="vertical" size={token.marginLG} style={{ width: '100%' }}>
                    <HealthCard token={token} accountingHealth={accountingHealth} />
                    <TopPartiesCard token={token} data={salesPurchase} />
                    <InventoryCard token={token} inventory={inventory} />
                    <CrmCard token={token} crm={crm} />
                </Space>
            </Col>
        </Row>
    );
}

function CashFlowCard({ token, cashFlow }) {
    const summary = cashFlow.summary || {};
    const chart = (cashFlow.chart || []).filter((d) => d.cash_in || d.cash_out);
    const inToday = toNumber(summary.cash_in_today);
    const outToday = toNumber(summary.cash_out_today);
    const net = toNumber(summary.net_cash_flow);

    return (
        <Card
            style={{ borderRadius: token.borderRadiusLG }}
            title={
                <PanelHeader
                    token={token}
                    eyebrow="Cash Movement"
                    title="Inflows vs. Outflows"
                    extra={
                        <Space size={token.marginSM}>
                            <Space size={4}>
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: token.colorSuccess,
                                        display: 'inline-block',
                                    }}
                                />
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                    In
                                </Text>
                            </Space>

                            <Space size={4}>
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: token.colorError,
                                        display: 'inline-block',
                                    }}
                                />
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                    Out
                                </Text>
                            </Space>
                        </Space>
                    }
                />
            }
        >
            <Row gutter={[token.marginMD, token.marginSM]} style={{ marginBottom: token.marginMD }}>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={<Text style={eyebrowStyle(token)}>In Today</Text>}
                        value={inToday}
                        formatter={(v) => money(v, { compact: true })}
                        valueStyle={{
                            color: token.colorSuccess,
                            fontSize: 20,
                            fontWeight: 700,
                        }}
                        prefix={<ArrowUpOutlined style={{ fontSize: 14 }} />}
                    />
                </Col>

                <Col xs={12} sm={6}>
                    <Statistic
                        title={<Text style={eyebrowStyle(token)}>Out Today</Text>}
                        value={outToday}
                        formatter={(v) => money(v, { compact: true })}
                        valueStyle={{
                            color: token.colorError,
                            fontSize: 20,
                            fontWeight: 700,
                        }}
                        prefix={<ArrowDownOutlined style={{ fontSize: 14 }} />}
                    />
                </Col>

                <Col xs={12} sm={6}>
                    <Statistic
                        title={<Text style={eyebrowStyle(token)}>Net</Text>}
                        value={net}
                        formatter={(v) => money(v, { compact: true })}
                        valueStyle={{
                            color: net >= 0 ? token.colorSuccess : token.colorError,
                            fontSize: 20,
                            fontWeight: 700,
                        }}
                    />
                </Col>

                <Col xs={12} sm={6}>
                    <Statistic
                        title={<Text style={eyebrowStyle(token)}>Expected</Text>}
                        value={summary.expected_receivables}
                        formatter={(v) => money(v, { compact: true })}
                        valueStyle={{
                            color: token.colorTextHeading,
                            fontSize: 20,
                            fontWeight: 700,
                        }}
                    />
                </Col>
            </Row>

            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="cfIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={token.colorSuccess} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={token.colorSuccess} stopOpacity={0} />
                        </linearGradient>

                        <linearGradient id="cfOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={token.colorError} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={token.colorError} stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />

                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: token.colorTextTertiary }}
                        tickFormatter={(v) => dayjs(v).format('MMM D')}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />

                    <YAxis
                        tick={{ fontSize: 10, fill: token.colorTextTertiary }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />

                    <ChartTooltip content={<ThemedTooltip token={token} />} />

                    <Area
                        type="monotone"
                        dataKey="cash_in"
                        stroke={token.colorSuccess}
                        strokeWidth={2}
                        fill="url(#cfIn)"
                        name="In"
                    />

                    <Area
                        type="monotone"
                        dataKey="cash_out"
                        stroke={token.colorError}
                        strokeWidth={2}
                        fill="url(#cfOut)"
                        name="Out"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
    );
}

function SalesPurchaseCard({ token, data, summary }) {
    const sales = data.sales || {};
    const purchase = data.purchase || {};

    const chartData = data.chart || [
        { name: 'Sales', amount: toNumber(summary.sales_this_month) },
        { name: 'Purchase', amount: 0 },
    ];

    return (
        <Card
            style={{ borderRadius: token.borderRadiusLG }}
            title={<PanelHeader token={token} eyebrow="This Period" title="Sales versus Purchase" />}
        >
            <Row gutter={[token.marginLG, token.marginMD]}>
                <Col xs={24} md={10}>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            barSize={56}
                        >
                            <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />

                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fontSize: 12,
                                    fill: token.colorText,
                                    fontWeight: 500,
                                }}
                            />

                            <YAxis
                                tick={{ fontSize: 10, fill: token.colorTextTertiary }}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                axisLine={false}
                                tickLine={false}
                                width={40}
                            />

                            <ChartTooltip content={<ThemedTooltip token={token} />} />

                            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, i) => (
                                    <Cell
                                        key={i}
                                        fill={entry.name === 'Sales' ? token.colorPrimary : token.colorWarning}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Col>

                <Col xs={24} md={14}>
                    <Row gutter={[token.marginMD, token.marginSM]}>
                        <Col xs={12}>
                            <PartyColumn
                                token={token}
                                label="Sales"
                                color={token.colorPrimary}
                                items={[
                                    ['Quotations', sales.quotations],
                                    ['Sales Orders', sales.sales_orders],
                                    ['Invoices', sales.invoices],
                                    ['Payments', sales.customer_payments],
                                    ['Returns', sales.sales_returns],
                                    ['Overdue', sales.overdue_invoices],
                                ]}
                            />
                        </Col>

                        <Col xs={12}>
                            <PartyColumn
                                token={token}
                                label="Purchase"
                                color={token.colorWarning}
                                items={[
                                    ['Purchase Orders', purchase.purchase_orders],
                                    ['Bills', purchase.purchase_bills],
                                    ['Sup. Payments', purchase.supplier_payments],
                                    ['Expenses', purchase.expenses],
                                    ['Debit Notes', purchase.debit_notes],
                                    ['Upcoming', purchase.upcoming_bills],
                                ]}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Card>
    );
}

function PartyColumn({ token, label, color, items }) {
    return (
        <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
            <Flex
                align="center"
                gap={6}
                style={{
                    paddingBottom: token.marginXXS,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                    }}
                />

                <Text
                    strong
                    style={{
                        fontSize: token.fontSizeSM,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}
                >
                    {label}
                </Text>
            </Flex>

            {items.map(([k, v]) => (
                <Flex key={k} justify="space-between" align="center">
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        {k}
                    </Text>

                    <Text
                        strong
                        style={{
                            fontSize: token.fontSizeSM,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {number(v)}
                    </Text>
                </Flex>
            ))}
        </Space>
    );
}

function HealthCard({ token, accountingHealth }) {
    const jvMissing = toNumber(accountingHealth.approved_jv_missing);
    const numberMissing = toNumber(accountingHealth.approved_number_missing);
    const unbalanced = toNumber(accountingHealth.unbalanced_jvs);
    const voided = toNumber(accountingHealth.voided_this_month);
    const reversal = toNumber(accountingHealth.reversal_jvs_this_month);
    const total = jvMissing + numberMissing + unbalanced;

    const status = total === 0 ? 'healthy' : total < 100 ? 'attention' : 'critical';

    const statusConfig = {
        healthy: {
            tagColor: 'success',
            label: 'Healthy',
            icon: <CheckCircleOutlined />,
        },
        attention: {
            tagColor: 'warning',
            label: 'Needs attention',
            icon: <ExclamationCircleOutlined />,
        },
        critical: {
            tagColor: 'error',
            label: 'Critical',
            icon: <AlertOutlined />,
        },
    }[status];

    const items = [
        { label: 'Approved · JV missing', value: jvMissing, critical: jvMissing > 0 },
        { label: 'Number missing', value: numberMissing, critical: numberMissing > 0 },
        { label: 'Unbalanced JVs', value: unbalanced, critical: unbalanced > 0 },
        { label: 'Voided this month', value: voided },
        { label: 'Reversals this month', value: reversal },
    ];

    return (
        <Card
            style={{ borderRadius: token.borderRadiusLG }}
            size="small"
            title={
                <PanelHeader
                    token={token}
                    eyebrow="Integrity"
                    title="Accounting Health"
                    extra={
                        <Tag
                            icon={statusConfig.icon}
                            color={statusConfig.tagColor}
                            style={{
                                borderRadius: token.borderRadiusSM,
                                fontWeight: 500,
                                margin: 0,
                            }}
                        >
                            {statusConfig.label}
                        </Tag>
                    }
                />
            }
        >
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                {items.map((it, i) => (
                    <Flex
                        key={it.label}
                        justify="space-between"
                        align="center"
                        style={{
                            padding: `${token.paddingXS}px 0`,
                            borderBottom:
                                i < items.length - 1
                                    ? `1px solid ${token.colorBorderSecondary}`
                                    : 'none',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: token.fontSizeSM,
                                color: it.critical ? token.colorError : token.colorText,
                            }}
                        >
                            {it.label}
                        </Text>

                        <Text
                            strong
                            style={{
                                color: it.critical ? token.colorError : token.colorTextHeading,
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {number(it.value)}
                        </Text>
                    </Flex>
                ))}
            </Space>
        </Card>
    );
}

function TopPartiesCard({ token, data }) {
    const [tab, setTab] = useState('customers');

    const list =
        tab === 'customers'
            ? (data.sales?.top_customers || []).slice(0, 5)
            : (data.purchase?.top_suppliers || []).slice(0, 5);

    const max = Math.max(...list.map((p) => toNumber(p.amount)), 1);

    return (
        <Card
            style={{ borderRadius: token.borderRadiusLG }}
            size="small"
            title={
                <PanelHeader
                    token={token}
                    eyebrow="Leaders"
                    title="Top Parties"
                    extra={
                        <Segmented
                            size="small"
                            value={tab}
                            onChange={setTab}
                            options={[
                                { label: 'Customers', value: 'customers' },
                                { label: 'Suppliers', value: 'suppliers' },
                            ]}
                        />
                    }
                />
            }
        >
            {list.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
            ) : (
                <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
                    {list.map((p, i) => {
                        const pct = (toNumber(p.amount) / max) * 100;

                        return (
                            <Flex key={i} align="center" gap={token.marginSM}>
                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        width: 18,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {String(i + 1).padStart(2, '0')}
                                </Text>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Flex justify="space-between" align="baseline" style={{ marginBottom: 4 }}>
                                        <Text ellipsis style={{ fontSize: token.fontSizeSM, fontWeight: 500 }}>
                                            {p.name}
                                        </Text>

                                        <Text
                                            strong
                                            style={{
                                                fontSize: token.fontSizeSM,
                                                fontVariantNumeric: 'tabular-nums',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {money(p.amount, { compact: true })}
                                        </Text>
                                    </Flex>

                                    <Progress
                                        percent={pct}
                                        showInfo={false}
                                        strokeColor={tab === 'customers' ? token.colorPrimary : token.colorWarning}
                                        trailColor={token.colorBorderSecondary}
                                        size={['100%', 4]}
                                    />
                                </div>
                            </Flex>
                        );
                    })}
                </Space>
            )}
        </Card>
    );
}

function InventoryCard({ token, inventory }) {
    const summary = inventory.summary || {};
    const warnings = inventory.warnings || [];
    const total = toNumber(summary.total_products);
    const low = toNumber(summary.low_stock_products);
    const negative = toNumber(summary.negative_stock_warnings);
    const healthy = Math.max(total - low - negative, 0);

    const data = [
        { name: 'Healthy', value: healthy, color: token.colorSuccess },
        { name: 'Low Stock', value: low, color: token.colorWarning },
        { name: 'Negative', value: negative, color: token.colorError },
    ].filter((d) => d.value > 0);

    return (
        <Card
            style={{ borderRadius: token.borderRadiusLG }}
            size="small"
            title={
                <PanelHeader
                    token={token}
                    eyebrow="Stock"
                    title="Inventory"
                    extra={
                        warnings.length > 0 ? (
                            <Button
                                type="link"
                                size="small"
                                onClick={() => visit('/inventory/products')}
                                icon={<RightOutlined style={{ fontSize: 10 }} />}
                                iconPosition="end"
                            >
                                {warnings.length} flagged
                            </Button>
                        ) : null
                    }
                />
            }
        >
            {data.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products" />
            ) : (
                <Flex align="center" gap={token.marginMD}>
                    <div
                        style={{
                            position: 'relative',
                            width: 130,
                            height: 130,
                            flexShrink: 0,
                        }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    innerRadius={42}
                                    outerRadius={62}
                                    paddingAngle={2}
                                    strokeWidth={0}
                                >
                                    {data.map((d, i) => (
                                        <Cell key={i} fill={d.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <Flex
                            vertical
                            align="center"
                            justify="center"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                            }}
                        >
                            <Text
                                strong
                                style={{
                                    fontSize: 22,
                                    lineHeight: 1,
                                    color: token.colorTextHeading,
                                }}
                            >
                                {number(total)}
                            </Text>

                            <Text style={{ ...eyebrowStyle(token), fontSize: 10, marginTop: 2 }}>
                                products
                            </Text>
                        </Flex>
                    </div>

                    <Space direction="vertical" size={token.marginXXS} style={{ flex: 1 }}>
                        {data.map((d) => (
                            <Flex
                                key={d.name}
                                justify="space-between"
                                align="center"
                                style={{ padding: '4px 0' }}
                            >
                                <Space size={6}>
                                    <span
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: d.color,
                                        }}
                                    />

                                    <Text style={{ fontSize: token.fontSizeSM }}>
                                        {d.name}
                                    </Text>
                                </Space>

                                <Text
                                    strong
                                    style={{
                                        fontSize: token.fontSizeSM,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {number(d.value)}
                                </Text>
                            </Flex>
                        ))}
                    </Space>
                </Flex>
            )}
        </Card>
    );
}

function CrmCard({ token, crm }) {
    const summary = crm.summary || {};
    const pipeline = (crm.pipeline || []).filter((p) => p.count > 0);

    return (
        <Card
            style={{ borderRadius: token.borderRadiusLG }}
            size="small"
            title={<PanelHeader token={token} eyebrow="Pipeline" title="CRM" />}
        >
            <Row gutter={[token.marginXS, token.marginXS]}>
                <Col span={8}>
                    <CrmTile token={token} label="New leads" value={summary.new_leads} />
                </Col>

                <Col span={8}>
                    <CrmTile token={token} label="Open deals" value={summary.open_deals} />
                </Col>

                <Col span={8}>
                    <CrmTile
                        token={token}
                        label="Won (mo.)"
                        value={summary.won_deals_this_month}
                        color={token.colorSuccess}
                    />
                </Col>

                <Col span={8}>
                    <CrmTile token={token} label="Due today" value={summary.followups_due_today} />
                </Col>

                <Col span={8}>
                    <CrmTile
                        token={token}
                        label="Overdue"
                        value={summary.overdue_activities}
                        color={summary.overdue_activities > 0 ? token.colorError : undefined}
                    />
                </Col>

                <Col span={8}>
                    <CrmTile token={token} label="Lost (mo.)" value={summary.lost_deals_this_month} />
                </Col>
            </Row>

            {pipeline.length > 0 && (
                <Space
                    direction="vertical"
                    size={4}
                    style={{
                        width: '100%',
                        marginTop: token.marginSM,
                        paddingTop: token.marginSM,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    {pipeline.map((p, i) => (
                        <Flex key={i} justify="space-between">
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                {p.stage}
                            </Text>

                            <Text
                                strong
                                style={{
                                    fontSize: token.fontSizeSM,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {number(p.count)}
                            </Text>
                        </Flex>
                    ))}
                </Space>
            )}
        </Card>
    );
}

function CrmTile({ token, label, value, color }) {
    return (
        <div
            style={{
                background: token.colorFillTertiary,
                borderRadius: token.borderRadiusSM,
                padding: `${token.paddingXS}px ${token.paddingSM}px`,
            }}
        >
            <Text
                strong
                style={{
                    fontSize: 18,
                    color: color || token.colorTextHeading,
                    lineHeight: 1.1,
                    display: 'block',
                }}
            >
                {number(value)}
            </Text>

            <Text style={{ ...eyebrowStyle(token), fontSize: 10 }}>
                {label}
            </Text>
        </div>
    );
}

function ApprovalsTab({ token, approvals, issues }) {
    const [scope, setScope] = useState('approvals');

    return (
        <Card
            style={{ borderRadius: token.borderRadiusLG }}
            title={
                <Flex
                    justify="space-between"
                    align="center"
                    wrap="wrap"
                    gap={token.marginSM}
                    style={{ width: '100%' }}
                >
                    <Space direction="vertical" size={2}>
                        <Text style={eyebrowStyle(token)}>Action Required</Text>
                        <Title level={4} style={{ margin: 0 }}>
                            Approval Center
                        </Title>
                    </Space>

                    <Segmented
                        value={scope}
                        onChange={setScope}
                        options={[
                            {
                                label: (
                                    <Space size={6}>
                                        Pending Drafts
                                        <Badge count={approvals.length} overflowCount={99} color={token.colorPrimary} />
                                    </Space>
                                ),
                                value: 'approvals',
                            },
                            {
                                label: (
                                    <Space size={6}>
                                        Integrity Issues
                                        <Badge count={issues.length} overflowCount={99} color={token.colorError} />
                                    </Space>
                                ),
                                value: 'issues',
                            },
                        ]}
                    />
                </Flex>
            }
        >
            {scope === 'approvals' ? (
                <ApprovalsTable token={token} approvals={approvals} />
            ) : (
                <IssuesTable token={token} issues={issues} />
            )}
        </Card>
    );
}

function ApprovalsTable({ token, approvals }) {
    const columns = [
        {
            title: 'Type',
            dataIndex: 'type',
            width: 140,
            render: (v) => (
                <Text strong style={{ fontSize: token.fontSizeSM }}>
                    {v}
                </Text>
            ),
        },
        {
            title: 'Reference',
            dataIndex: 'draft_ref',
            width: 130,
            render: (v) => (
                <Text code style={{ fontSize: 11 }}>
                    {v}
                </Text>
            ),
        },
        {
            title: 'Party',
            dataIndex: 'party',
            ellipsis: true,
        },
        {
            title: 'Date',
            dataIndex: 'date',
            width: 110,
            render: (v) => (
                <Text
                    type="secondary"
                    style={{
                        fontSize: token.fontSizeSM,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {dayjs(v).format('MMM D, YY')}
                </Text>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            align: 'right',
            width: 120,
            render: (v) => (
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money(v)}
                </Text>
            ),
        },
        {
            title: 'Age',
            dataIndex: 'age',
            width: 70,
            align: 'right',
            render: (v) =>
                v == null ? (
                    '—'
                ) : (
                    <Text
                        type="secondary"
                        style={{
                            fontSize: token.fontSizeSM,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {Math.round(v)}d
                    </Text>
                ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 100,
            render: (v) => <ThemedTag status={v} />,
        },
        {
            title: '',
            width: 200,
            render: (_, row) => (
                <Space size={4}>
                    <Button size="small" onClick={() => visit(row.action_url)}>
                        View
                    </Button>

                    <Button size="small" type="primary">
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
        <Table
            size="middle"
            columns={columns}
            dataSource={approvals}
            rowKey={(r, i) => r.id || r.draft_ref || i}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: <Empty description="No pending approvals" /> }}
        />
    );
}

function IssuesTable({ token, issues }) {
    const columns = [
        {
            title: 'Issue',
            dataIndex: 'issue_type',
            width: 200,
            render: (v) => (
                <Text strong style={{ fontSize: token.fontSizeSM }}>
                    {v}
                </Text>
            ),
        },
        {
            title: 'Module',
            dataIndex: 'module',
            width: 120,
        },
        {
            title: 'Record',
            dataIndex: 'record',
            width: 140,
            render: (v) => (
                <Text code style={{ fontSize: 11 }}>
                    {v}
                </Text>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'date',
            width: 130,
            render: (v) => (
                <Text
                    type="secondary"
                    style={{
                        fontSize: token.fontSizeSM,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {dayjs(v).format('MMM D, YY')}
                </Text>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            align: 'right',
            width: 120,
            render: (v) => (
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money(v)}
                </Text>
            ),
        },
        {
            title: 'Severity',
            dataIndex: 'severity',
            width: 110,
            render: (v) => <ThemedTag status={v} />,
        },
        {
            title: '',
            width: 100,
            render: (_, row) => (
                <Button size="small" type="primary" ghost onClick={() => visit(row.action_url)}>
                    Resolve
                </Button>
            ),
        },
    ];

    return (
        <Table
            size="middle"
            columns={columns}
            dataSource={issues}
            rowKey={(r, i) => r.key || i}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 1000 }}
            locale={{ emptyText: <Empty description="No integrity issues" /> }}
        />
    );
}

function ActivityTab({ token, activity, alerts }) {
    return (
        <Row gutter={[token.marginLG, token.marginLG]}>
            {alerts.length > 0 && (
                <Col xs={24}>
                    <Card
                        style={{
                            borderRadius: token.borderRadiusLG,
                            borderColor: token.colorErrorBorder,
                            background: token.colorErrorBg,
                        }}
                        styles={{ body: { padding: token.paddingMD } }}
                    >
                        <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
                            <Space>
                                <AlertOutlined style={{ color: token.colorError }} />

                                <Text
                                    strong
                                    style={{
                                        ...eyebrowStyle(token),
                                        color: token.colorError,
                                    }}
                                >
                                    {alerts.length} alert{alerts.length === 1 ? '' : 's'}
                                </Text>
                            </Space>

                            <Row gutter={[token.marginSM, token.marginSM]}>
                                {alerts.slice(0, 4).map((a, i) => (
                                    <Col key={i} xs={24} md={12}>
                                        <Card
                                            size="small"
                                            style={{ borderRadius: token.borderRadius }}
                                            styles={{ body: { padding: token.paddingSM } }}
                                        >
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: token.fontSizeSM,
                                                    display: 'block',
                                                }}
                                            >
                                                {a.title}
                                            </Text>

                                            <Paragraph
                                                type="secondary"
                                                style={{
                                                    fontSize: token.fontSizeSM,
                                                    margin: 0,
                                                }}
                                                ellipsis={{ rows: 2 }}
                                            >
                                                {a.description}
                                            </Paragraph>

                                            {a.action_url && (
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    style={{
                                                        paddingLeft: 0,
                                                        marginTop: 4,
                                                    }}
                                                    onClick={() => visit(a.action_url)}
                                                    icon={<RightOutlined style={{ fontSize: 9 }} />}
                                                    iconPosition="end"
                                                >
                                                    Review
                                                </Button>
                                            )}
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Space>
                    </Card>
                </Col>
            )}

            <Col xs={24}>
                <Card
                    style={{ borderRadius: token.borderRadiusLG }}
                    title={
                        <Space direction="vertical" size={2}>
                            <Text style={eyebrowStyle(token)}>Live Feed</Text>
                            <Title level={4} style={{ margin: 0 }}>
                                Recent Activity
                            </Title>
                        </Space>
                    }
                >
                    {activity.length === 0 ? (
                        <Empty description="No recent activity" />
                    ) : (
                        <Timeline
                            mode="left"
                            items={activity.map((a) => ({
                                color: getStatusColor(a.status, token),
                                label: (
                                    <Space direction="vertical" size={0}>
                                        <Text
                                            strong
                                            style={{
                                                fontVariantNumeric: 'tabular-nums',
                                                fontSize: token.fontSizeSM,
                                            }}
                                        >
                                            {dayjs(a.time).format('HH:mm')}
                                        </Text>

                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {dayjs(a.time).format('MMM D')}
                                        </Text>
                                    </Space>
                                ),
                                children: (
                                    <Card
                                        size="small"
                                        style={{
                                            borderRadius: token.borderRadius,
                                            marginBottom: token.marginXS,
                                        }}
                                    >
                                        <Flex justify="space-between" align="flex-start" gap={token.marginSM}>
                                            <Space direction="vertical" size={4} style={{ flex: 1, minWidth: 0 }}>
                                                <Space size={6}>
                                                    <Text style={{ ...eyebrowStyle(token), fontSize: 10 }}>
                                                        {a.module}
                                                    </Text>

                                                    <ThemedTag status={a.status} />
                                                </Space>

                                                <Text style={{ fontSize: token.fontSize }}>
                                                    {a.description}
                                                </Text>

                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    by {a.user || 'System'}
                                                </Text>
                                            </Space>

                                            {a.action_url && (
                                                <Button
                                                    size="small"
                                                    onClick={() => visit(a.action_url)}
                                                    icon={<RightOutlined style={{ fontSize: 10 }} />}
                                                    iconPosition="end"
                                                >
                                                    Open
                                                </Button>
                                            )}
                                        </Flex>
                                    </Card>
                                ),
                            }))}
                        />
                    )}
                </Card>
            </Col>
        </Row>
    );
}

function getStatusColor(status, token) {
    const tone = statusToTone[status];

    if (tone === 'success') return token.colorSuccess;
    if (tone === 'error') return token.colorError;
    if (tone === 'warning') return token.colorWarning;
    if (tone === 'processing') return token.colorPrimary;

    return token.colorBorder;
}

function CashDrawer({ open, onClose, token, cashFlow, balances }) {
    const summary = cashFlow?.summary || {};
    const bank = toNumber(summary.bank_balance);
    const cash = toNumber(summary.cash_in_hand);

    const total = balances?.length
        ? balances.reduce((t, r) => t + getBalanceValue(r), 0)
        : bank + cash;

    const columns = [
        {
            title: 'Account',
            dataIndex: 'name',
            ellipsis: true,
            render: (v, row) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: token.fontSizeSM }}>
                        {v || row.account_name || row.title || 'Account'}
                    </Text>

                    {(row.account_number || row.code) && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {row.account_number || row.code}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            width: 100,
            render: (v, row) => (
                <Tag
                    style={{
                        borderRadius: token.borderRadiusSM,
                        fontSize: 10,
                    }}
                >
                    {v || row.account_type || 'Account'}
                </Tag>
            ),
        },
        {
            title: 'Balance',
            align: 'right',
            width: 130,
            render: (_, row) => {
                const v = getBalanceValue(row);

                return (
                    <Text
                        strong
                        style={{
                            color: v < 0 ? token.colorError : token.colorTextHeading,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {money(v)}
                    </Text>
                );
            },
        },
    ];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={580}
            closable={false}
            title={
                <Flex justify="space-between" align="center">
                    <Space direction="vertical" size={2}>
                        <Text style={eyebrowStyle(token)}>Treasury</Text>
                        <Title level={4} style={{ margin: 0 }}>
                            Cash & Bank
                        </Title>
                    </Space>

                    <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
                </Flex>
            }
            styles={{ body: { background: token.colorBgLayout } }}
        >
            <Space direction="vertical" size={token.marginLG} style={{ width: '100%' }}>
                <Card
                    style={{
                        borderRadius: token.borderRadiusLG,
                        background: token.colorTextHeading,
                        border: 'none',
                    }}
                    styles={{ body: { padding: token.paddingLG } }}
                >
                    <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                        <Text
                            style={{
                                ...eyebrowStyle(token),
                                color: 'rgba(255,255,255,0.6)',
                            }}
                        >
                            Total Balance
                        </Text>

                        <Text
                            style={{
                                color: token.colorWhite,
                                fontSize: 32,
                                fontWeight: 700,
                                lineHeight: 1.1,
                                display: 'block',
                            }}
                        >
                            {money(total)}
                        </Text>

                        <Flex
                            gap={token.marginMD}
                            style={{
                                paddingTop: token.marginSM,
                                marginTop: token.marginSM,
                                borderTop: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            <div>
                                <Text
                                    style={{
                                        ...eyebrowStyle(token),
                                        fontSize: 10,
                                        color: 'rgba(255,255,255,0.6)',
                                        display: 'block',
                                    }}
                                >
                                    Bank
                                </Text>

                                <Text
                                    strong
                                    style={{
                                        color: token.colorWhite,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {money(bank, { compact: true })}
                                </Text>
                            </div>

                            <div
                                style={{
                                    width: 1,
                                    background: 'rgba(255,255,255,0.12)',
                                }}
                            />

                            <div>
                                <Text
                                    style={{
                                        ...eyebrowStyle(token),
                                        fontSize: 10,
                                        color: 'rgba(255,255,255,0.6)',
                                        display: 'block',
                                    }}
                                >
                                    Cash
                                </Text>

                                <Text
                                    strong
                                    style={{
                                        color: token.colorWhite,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {money(cash, { compact: true })}
                                </Text>
                            </div>
                        </Flex>
                    </Space>
                </Card>

                <Card
                    title={<Text style={eyebrowStyle(token)}>Account-wise Breakdown</Text>}
                    style={{ borderRadius: token.borderRadiusLG }}
                    styles={{ body: { padding: 0 } }}
                >
                    <Table
                        size="small"
                        columns={columns}
                        dataSource={balances || []}
                        rowKey={(r, i) => r.id || r.uuid || r.code || i}
                        pagination={false}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No accounts found"
                                    style={{ padding: token.paddingMD }}
                                />
                            ),
                        }}
                    />
                </Card>
            </Space>
        </Drawer>
    );
}

function getBalanceValue(row) {
    return toNumber(
        row?.balance ??
            row?.current_balance ??
            row?.closing_balance ??
            row?.available_balance ??
            row?.amount ??
            0,
    );
}

function ThemedTag({ status }) {
    const { token } = theme.useToken();
    const tone = statusToTone[status] || 'default';

    return (
        <Tag
            color={tone}
            style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'capitalize',
                borderRadius: token.borderRadiusSM,
                margin: 0,
            }}
        >
            {status?.replace(/_/g, ' ')}
        </Tag>
    );
}

function ThemedTooltip({ active, payload, label, token }) {
    if (!active || !payload?.length) return null;

    return (
        <div
            style={{
                background: token.colorBgElevated,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                padding: `${token.paddingXS}px ${token.paddingSM}px`,
                boxShadow: token.boxShadowSecondary,
                minWidth: 160,
            }}
        >
            {label && (
                <Text
                    style={{
                        ...eyebrowStyle(token),
                        fontSize: 10,
                        display: 'block',
                        marginBottom: 4,
                    }}
                >
                    {dayjs(label).isValid() ? dayjs(label).format('MMM D, YYYY') : label}
                </Text>
            )}

            {payload.map((p, i) => (
                <Flex
                    key={i}
                    justify="space-between"
                    align="center"
                    gap={token.marginSM}
                    style={{ padding: '2px 0' }}
                >
                    <Space size={6}>
                        <span
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: p.color,
                                display: 'inline-block',
                            }}
                        />

                        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {p.name}
                        </Text>
                    </Space>

                    <Text
                        strong
                        style={{
                            fontSize: token.fontSizeSM,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {money(p.value)}
                    </Text>
                </Flex>
            ))}
        </div>
    );
}

function LoadingState() {
    const { token } = theme.useToken();

    return (
        <Space direction="vertical" size={token.marginLG} style={{ width: '100%' }}>
            <Row gutter={[token.marginLG, token.marginLG]}>
                <Col xs={24} xl={10}>
                    <Card style={{ borderRadius: token.borderRadiusLG }}>
                        <Skeleton active paragraph={{ rows: 4 }} />
                    </Card>
                </Col>

                <Col xs={24} xl={14}>
                    <Row gutter={[token.marginSM, token.marginSM]}>
                        {[...Array(6)].map((_, i) => (
                            <Col key={i} xs={12} md={8}>
                                <Card style={{ borderRadius: token.borderRadiusLG }}>
                                    <Skeleton.Input active block style={{ height: 70 }} />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>
            </Row>

            <Card style={{ borderRadius: token.borderRadiusLG }}>
                <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
        </Space>
    );
}