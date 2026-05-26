import { useCallback, useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    DatePicker,
    Divider,
    Row,
    Select,
    Skeleton,
    Space,
    Statistic,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    ArrowRightOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    DollarOutlined,
    FileTextOutlined,
    MinusCircleOutlined,
    PlusCircleOutlined,
    ReloadOutlined,
    SettingOutlined,
    SwapOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const fmtMoney = (v, currency = 'NPR') => {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(v ?? 0);
    } catch {
        return `${currency} ${(v ?? 0).toFixed(2)}`;
    }
};

/* ── Reusable stat card ────────────────────────────────────────────────────── */
function StatCard({ title, value, prefix, color, loading, currency }) {
    return (
        <Card size="small" style={{ height: '100%' }}>
            <Skeleton loading={loading} paragraph={false} active>
                <Statistic
                    title={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {title}
                        </Text>
                    }
                    value={value ?? 0}
                    prefix={prefix}
                    valueStyle={{ color, fontSize: 20, fontWeight: 700 }}
                    formatter={(v) => fmtMoney(v, currency)}
                />
            </Skeleton>
        </Card>
    );
}

/* ── Tax health check row ─────────────────────────────────────────────────── */
function HealthRow({ label, ok, tooltip }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 0',
                borderBottom: '1px solid var(--ant-color-split)',
            }}
        >
            {ok ? (
                <CheckCircleOutlined style={{ color: 'var(--ant-color-success)' }} />
            ) : (
                <CloseCircleOutlined style={{ color: 'var(--ant-color-error)' }} />
            )}
            <Tooltip title={tooltip}>
                <Text style={{ fontSize: 13 }}>{label}</Text>
            </Tooltip>
            {!ok && (
                <Tag color="warning" style={{ marginInlineStart: 'auto', marginInlineEnd: 0 }}>
                    Action needed
                </Tag>
            )}
        </div>
    );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function TaxDashboard({ auth }) {
    const [settings, setSettings]     = useState(null);
    const [summary, setSummary]       = useState(null);
    const [countryOptions, setCountryOptions] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);

    /* date range state — defaults to current calendar month */
    const [dateRange, setDateRange] = useState([
        dayjs().startOf('month'),
        dayjs().endOf('month'),
    ]);
    const [selectedCountry, setSelectedCountry] = useState(null);

    /* Load settings and country options once */
    useEffect(() => {
        Promise.all([
            axios.get(api('/api/tax-settings')),
            axios.get(api('/api/tax-country-options')),
        ])
            .then(([sRes, cRes]) => {
                const s = sRes.data?.data;
                setSettings(s);
                setCountryOptions(cRes.data || []);
                if (s?.country_code) setSelectedCountry(s.country_code);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    /* Fetch dashboard summary whenever filters change */
    const fetchSummary = useCallback(() => {
        if (!dateRange[0] || !dateRange[1]) return;

        setSummaryLoading(true);
        const params = new URLSearchParams({
            date_from:    dateRange[0].format('YYYY-MM-DD'),
            date_to:      dateRange[1].format('YYYY-MM-DD'),
            ...(selectedCountry ? { country_code: selectedCountry } : {}),
        });
        axios
            .get(api(`/api/tax-dashboard-summary?${params}`))
            .then(({ data }) => setSummary(data))
            .catch(() => setSummary(null))
            .finally(() => setSummaryLoading(false));
    }, [dateRange, selectedCountry]);

    useEffect(() => {
        if (!loading) fetchSummary();
    }, [loading, fetchSummary]);

    const isConfigured = settings?.wizard_completed;
    const currency     = summary?.currency || settings?.default_currency || 'NPR';
    const health       = summary?.tax_health ?? {};
    const healthOkCount = Object.values(health).filter(Boolean).length;
    const healthTotal   = Object.keys(health).length;

    const availableReports = summary?.available_reports ?? [];

    /* ── Render ─────────────────────────────────────────────────────────────── */
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Tax Dashboard" />

            <div style={{ padding: '20px 24px 48px' }}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Tax Dashboard</Title>
                        <Text type="secondary">Your tax position for the selected period.</Text>
                    </div>
                    <Space wrap>
                        <Select
                            style={{ minWidth: 160 }}
                            value={selectedCountry}
                            placeholder="All countries"
                            allowClear
                            options={countryOptions.map((c) => ({ value: c.value, label: `${c.value} — ${c.label}` }))}
                            onChange={setSelectedCountry}
                            size="small"
                        />
                        <RangePicker
                            size="small"
                            value={dateRange}
                            onChange={(v) => v && setDateRange(v)}
                            format="DD MMM YYYY"
                            allowClear={false}
                            presets={[
                                { label: 'This Month',  value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                                { label: 'Last Month',  value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                                { label: 'This Year',   value: [dayjs().startOf('year'),  dayjs().endOf('year')] },
                                { label: 'Last Quarter', value: [dayjs().subtract(1, 'quarter').startOf('quarter'), dayjs().subtract(1, 'quarter').endOf('quarter')] },
                            ]}
                        />
                        <Tooltip title="Refresh">
                            <Button size="small" icon={<ReloadOutlined />} onClick={fetchSummary} loading={summaryLoading} />
                        </Tooltip>
                        <Button size="small" icon={<SettingOutlined />} onClick={() => router.visit('/tax/settings')}>
                            Tax Settings
                        </Button>
                    </Space>
                </div>

                {/* ── Setup prompt ────────────────────────────────────────── */}
                {!loading && !isConfigured && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 20 }}
                        message="Tax setup not completed"
                        description="Complete your tax setup wizard to start tracking output tax, input tax, and generate country-specific reports."
                        action={
                            <Button size="small" type="primary" onClick={() => router.visit('/tax/settings')}>
                                Set up tax
                            </Button>
                        }
                    />
                )}

                {/* ── Active tax tags ─────────────────────────────────────── */}
                {!loading && isConfigured && (
                    <Space style={{ marginBottom: 16 }} wrap>
                        {settings.sales_tax_enabled && (
                            <Tag color="green">
                                {settings.sales_tax_name || 'Sales Tax'} {settings.sales_tax_rate_percent}% — Active
                            </Tag>
                        )}
                        {settings.purchase_tax_enabled && (
                            <Tag color="blue">
                                {settings.purchase_tax_name || 'Purchase Tax'} {settings.purchase_tax_rate_percent}% — Active
                            </Tag>
                        )}
                        {!settings.sales_tax_enabled && !settings.purchase_tax_enabled && (
                            <Tag>Tax Disabled</Tag>
                        )}
                        {settings.country_code && (
                            <Tag color="purple">{settings.country_code}</Tag>
                        )}
                    </Space>
                )}

                {/* ── Primary stat cards ──────────────────────────────────── */}
                <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <StatCard
                            title="Output Tax (Tax Collected)"
                            value={summary?.output_tax}
                            prefix={<PlusCircleOutlined style={{ color: 'var(--ant-color-success)' }} />}
                            color="var(--ant-color-success)"
                            loading={summaryLoading}
                            currency={currency}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <StatCard
                            title="Input Tax (Tax Paid)"
                            value={summary?.input_tax}
                            prefix={<MinusCircleOutlined style={{ color: 'var(--ant-color-error)' }} />}
                            color="var(--ant-color-error)"
                            loading={summaryLoading}
                            currency={currency}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card size="small" style={{ height: '100%' }}>
                            <Skeleton loading={summaryLoading} paragraph={false} active>
                                <Statistic
                                    title={
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Net Tax Payable / Recoverable
                                        </Text>
                                    }
                                    value={summary?.net_tax ?? 0}
                                    prefix={<SwapOutlined />}
                                    valueStyle={{
                                        color: (summary?.net_tax ?? 0) >= 0
                                            ? 'var(--ant-color-primary)'
                                            : 'var(--ant-color-warning)',
                                        fontSize: 20,
                                        fontWeight: 700,
                                    }}
                                    formatter={(v) => fmtMoney(v, currency)}
                                />
                                {!summaryLoading && summary && (
                                    <Tag
                                        color={(summary.net_tax ?? 0) >= 0 ? 'blue' : 'orange'}
                                        style={{ marginTop: 4 }}
                                    >
                                        {(summary.net_tax ?? 0) >= 0 ? 'Payable' : 'Recoverable'}
                                    </Tag>
                                )}
                            </Skeleton>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <StatCard
                            title="Taxable Sales"
                            value={summary?.taxable_sales}
                            prefix={<DollarOutlined />}
                            color="var(--ant-color-text)"
                            loading={summaryLoading}
                            currency={currency}
                        />
                    </Col>
                </Row>

                {/* ── Secondary stats ─────────────────────────────────────── */}
                <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <StatCard
                            title="Taxable Purchases"
                            value={summary?.taxable_purchases}
                            color="var(--ant-color-text-secondary)"
                            loading={summaryLoading}
                            currency={currency}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <StatCard
                            title="Exempt / Zero-Rated Sales"
                            value={summary?.exempt_sales}
                            color="var(--ant-color-text-tertiary)"
                            loading={summaryLoading}
                            currency={currency}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card size="small" style={{ height: '100%' }}>
                            <Skeleton loading={loading} paragraph={false} active>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                    Period
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: 600 }}>
                                    {dateRange[0]?.format('D MMM YYYY')} — {dateRange[1]?.format('D MMM YYYY')}
                                </Text>
                                <div style={{ marginTop: 6 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Country: {selectedCountry || settings?.country_code || 'All'}
                                    </Text>
                                </div>
                            </Skeleton>
                        </Card>
                    </Col>
                </Row>

                {/* ── Bottom panel: health + reports ──────────────────────── */}
                <Row gutter={[14, 14]}>

                    {/* Tax Health */}
                    <Col xs={24} lg={12}>
                        <Card
                            size="small"
                            title={
                                <Space>
                                    <Text strong style={{ fontSize: 13 }}>Tax Health</Text>
                                    {!summaryLoading && (
                                        <Badge
                                            count={`${healthOkCount}/${healthTotal}`}
                                            style={{
                                                backgroundColor: healthOkCount === healthTotal
                                                    ? 'var(--ant-color-success)'
                                                    : 'var(--ant-color-warning)',
                                            }}
                                        />
                                    )}
                                </Space>
                            }
                            style={{ height: '100%' }}
                        >
                            <Skeleton loading={summaryLoading} active paragraph={{ rows: 6 }}>
                                {healthTotal > 0 ? (
                                    <>
                                        <HealthRow
                                            label="Tax setup completed"
                                            ok={health.setup_completed}
                                            tooltip="Wizard has been completed at least once."
                                        />
                                        <HealthRow
                                            label="Sales tax enabled"
                                            ok={health.sales_tax_enabled}
                                            tooltip="Sales tax is turned on in Tax Settings."
                                        />
                                        <HealthRow
                                            label="Purchase tax enabled"
                                            ok={health.purchase_tax_enabled}
                                            tooltip="Purchase tax is turned on in Tax Settings."
                                        />
                                        <HealthRow
                                            label="Tax registration present"
                                            ok={health.tax_registration_present}
                                            tooltip="A tax number (VAT/PAN/GST) has been entered."
                                        />
                                        <HealthRow
                                            label="Tax accounts linked"
                                            ok={health.tax_accounts_linked}
                                            tooltip="Output and input tax accounts are mapped in Chart of Accounts."
                                        />
                                        <HealthRow
                                            label="Filing schedule configured"
                                            ok={health.filing_schedule_configured}
                                            tooltip="A filing frequency has been set (monthly, quarterly, annual)."
                                        />
                                        <div style={{ marginTop: 12 }}>
                                            <Button
                                                size="small"
                                                type={healthOkCount < healthTotal ? 'primary' : 'default'}
                                                onClick={() => router.visit('/tax/settings')}
                                            >
                                                {healthOkCount < healthTotal ? 'Fix issues' : 'Review settings'}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        Complete tax setup to see health indicators.
                                    </Text>
                                )}
                            </Skeleton>
                        </Card>
                    </Col>

                    {/* Available Reports */}
                    <Col xs={24} lg={12}>
                        <Card
                            size="small"
                            title={
                                <Space>
                                    <Text strong style={{ fontSize: 13 }}>Available Tax Reports</Text>
                                    {!summaryLoading && availableReports.length > 0 && (
                                        <Badge count={availableReports.length} color="var(--ant-color-primary)" />
                                    )}
                                </Space>
                            }
                            style={{ height: '100%' }}
                        >
                            <Skeleton loading={summaryLoading} active paragraph={{ rows: 6 }}>
                                {availableReports.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {availableReports.map((r) => (
                                            <div
                                                key={r.report_key}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '5px 0',
                                                    borderBottom: '1px solid var(--ant-color-split)',
                                                }}
                                            >
                                                <Space size={6}>
                                                    <FileTextOutlined style={{ color: 'var(--ant-color-primary)', fontSize: 13 }} />
                                                    <Text style={{ fontSize: 13 }}>{r.report_name}</Text>
                                                </Space>
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    style={{ padding: 0 }}
                                                    icon={<ArrowRightOutlined />}
                                                    onClick={() => router.visit('/reports')}
                                                />
                                            </div>
                                        ))}
                                        <div style={{ marginTop: 10 }}>
                                            <Button
                                                size="small"
                                                icon={<FileTextOutlined />}
                                                onClick={() => router.visit('/reports')}
                                            >
                                                Open Reports
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        <WarningOutlined style={{ fontSize: 24, color: 'var(--ant-color-text-tertiary)', marginBottom: 8 }} />
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 13 }}>
                                                No report templates found for{' '}
                                                <strong>{selectedCountry || settings?.country_code || 'this country'}</strong>.
                                            </Text>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Complete tax setup to seed country-specific reports.
                                            </Text>
                                        </div>
                                        <Button
                                            size="small"
                                            style={{ marginTop: 10 }}
                                            onClick={() => router.visit('/tax/settings')}
                                        >
                                            Go to Tax Settings
                                        </Button>
                                    </div>
                                )}
                            </Skeleton>
                        </Card>
                    </Col>
                </Row>

                {/* ── Quick actions ────────────────────────────────────────── */}
                <Divider style={{ margin: '20px 0 16px' }} />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                    QUICK ACTIONS
                </Text>
                <Row gutter={[10, 10]}>
                    {[
                        { label: 'All Reports',      icon: <FileTextOutlined />,      path: '/reports' },
                        { label: 'Tax Rates',        icon: <DollarOutlined />,        path: '/tax/tax-rates' },
                        { label: 'Advanced Setup',   icon: <SettingOutlined />,       path: '/tax/advanced' },
                        { label: 'Tax Settings',     icon: <SettingOutlined />,       path: '/tax/settings' },
                    ].map((action) => (
                        <Col key={action.label} xs={12} sm={6}>
                            <Button
                                block
                                size="small"
                                icon={action.icon}
                                style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                onClick={() => router.visit(action.path)}
                            >
                                {action.label}
                                <ArrowRightOutlined style={{ fontSize: 11 }} />
                            </Button>
                        </Col>
                    ))}
                </Row>
            </div>
        </AuthenticatedLayout>
    );
}
