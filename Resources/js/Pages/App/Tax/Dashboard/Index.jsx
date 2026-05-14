import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Col,
    Row,
    Skeleton,
    Space,
    Statistic,
    Tag,
    Typography,
} from 'antd';
import {
    ArrowRightOutlined,
    DollarOutlined,
    FileTextOutlined,
    MinusCircleOutlined,
    PlusCircleOutlined,
    SettingOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const fmtMoney = (v, currency = 'NPR') =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(v ?? 0);

const StatCard = ({ title, value, prefix, suffix, color, loading }) => (
    <Card size="small" style={{ height: '100%' }}>
        <Skeleton loading={loading} paragraph={false} active>
            <Statistic
                title={<Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>}
                value={value ?? 0}
                prefix={prefix}
                suffix={suffix}
                valueStyle={{ color, fontSize: 22, fontWeight: 700 }}
                formatter={(v) => fmtMoney(v)}
            />
        </Skeleton>
    </Card>
);

export default function TaxDashboard({ auth }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get(api('/api/tax-settings'))
            .then(({ data }) => setSettings(data.data))
            .catch(() => setSettings(null))
            .finally(() => setLoading(false));
    }, []);

    const isConfigured = settings?.wizard_completed;
    const currency = settings?.default_currency || 'NPR';

    // Placeholder summary figures — replace with real API when reports are wired up
    const summary = {
        salesTaxCollected: 0,
        purchaseTaxPaid: 0,
        netPayable: 0,
        taxableSales: 0,
        exemptSales: 0,
        taxablePurchases: 0,
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Tax Dashboard" />

            <div style={{ padding: '24px 24px 40px' }}>
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <Title level={4} style={{ margin: 0 }}>Tax Dashboard</Title>
                    <Text type="secondary">Overview of your tax position this month.</Text>
                </div>

                {/* Setup prompt */}
                {!loading && !isConfigured && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 24 }}
                        message="Tax setup not completed"
                        description="Complete your tax setup to start tracking sales tax, purchase tax, and generate reports."
                        action={
                            <Button
                                size="small"
                                type="primary"
                                onClick={() => router.visit('/tax/settings')}
                            >
                                Set up tax
                            </Button>
                        }
                    />
                )}

                {/* Tax enabled indicators */}
                {!loading && isConfigured && (
                    <Space style={{ marginBottom: 20 }} wrap>
                        {settings.sales_tax_enabled && (
                            <Tag color="green">
                                {settings.sales_tax_name || 'Sales Tax'} {settings.sales_tax_rate_percent}% — Active
                            </Tag>
                        )}
                        {settings.purchase_tax_enabled && (
                            <Tag color="blue">
                                Purchase Tax {settings.purchase_tax_rate_percent}% — Active
                            </Tag>
                        )}
                        {!settings.sales_tax_enabled && !settings.purchase_tax_enabled && (
                            <Tag color="default">Tax Disabled</Tag>
                        )}
                    </Space>
                )}

                {/* Summary stats */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <StatCard
                            title="Tax Collected from Customers (This Month)"
                            value={summary.salesTaxCollected}
                            prefix={<PlusCircleOutlined style={{ color: '#16a34a' }} />}
                            color="#16a34a"
                            loading={loading}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <StatCard
                            title="Tax Paid to Suppliers (This Month)"
                            value={summary.purchaseTaxPaid}
                            prefix={<MinusCircleOutlined style={{ color: '#dc2626' }} />}
                            color="#dc2626"
                            loading={loading}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <StatCard
                            title="Net Tax Payable / Recoverable"
                            value={summary.netPayable}
                            prefix={<SwapOutlined />}
                            color={summary.netPayable >= 0 ? '#0369a1' : '#7c3aed'}
                            loading={loading}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <StatCard
                            title="Taxable Sales (This Month)"
                            value={summary.taxableSales}
                            prefix={<DollarOutlined />}
                            color="#0f172a"
                            loading={loading}
                        />
                    </Col>
                </Row>

                {/* Secondary stats */}
                <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <StatCard
                            title="Exempt Sales (This Month)"
                            value={summary.exemptSales}
                            color="#64748b"
                            loading={loading}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <StatCard
                            title="Taxable Purchases (This Month)"
                            value={summary.taxablePurchases}
                            color="#0f172a"
                            loading={loading}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card size="small" style={{ height: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>Upcoming Filing</Text>
                            <div style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: 15, fontWeight: 600 }}>
                                    {isConfigured ? 'Not configured' : '—'}
                                </Text>
                            </div>
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Configure filing dates in Tax Settings
                                </Text>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Quick Actions */}
                <Title level={5} style={{ marginBottom: 12 }}>Quick Actions</Title>
                <Row gutter={[12, 12]}>
                    {[
                        {
                            label: 'View VAT Summary',
                            icon: <FileTextOutlined />,
                            path: '/reports',
                        },
                        {
                            label: 'Sales Register',
                            icon: <PlusCircleOutlined />,
                            path: '/reports',
                        },
                        {
                            label: 'Purchase Register',
                            icon: <MinusCircleOutlined />,
                            path: '/reports',
                        },
                        {
                            label: 'Tax Settings',
                            icon: <SettingOutlined />,
                            path: '/tax/settings',
                        },
                    ].map((action) => (
                        <Col key={action.label} xs={12} sm={6}>
                            <Button
                                block
                                icon={action.icon}
                                style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
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
