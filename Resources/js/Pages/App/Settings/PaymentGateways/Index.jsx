import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Alert, Badge, Button, Card, Col, Collapse, Descriptions, Divider,
    Empty, Form, Input, InputNumber, message, notification, Popconfirm,
    Row, Select, Skeleton, Space, Spin, Statistic, Steps, Switch,
    Table, Tag, Tooltip, Typography
} from 'antd';
import {
    ApiOutlined,
    BankOutlined,
    CheckCircleFilled,
    CheckCircleOutlined,
    CloseCircleFilled,
    CopyOutlined,
    CreditCardOutlined,
    DollarOutlined,
    EyeInvisibleOutlined,
    EyeTwoTone,
    GlobalOutlined,
    GoogleOutlined,
    InfoCircleOutlined,
    KeyOutlined,
    LockOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    SafetyOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    WalletOutlined,
    WarningFilled,
    WarningOutlined,
    LinkOutlined,
    FileTextOutlined,
    BellOutlined,
    HistoryOutlined,
} from '@ant-design/icons';
import { theme } from 'antd';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

const { Title, Text, Paragraph, Link } = Typography;

/* ─────────────────── CONSTANTS ─────────────────── */

const PROVIDERS = [
    {
        key: 'stripe',
        label: 'Stripe',
        color: '#635BFF',
        bgColor: '#F5F4FF',
        description: 'Accept cards, wallets, and local payment methods globally.',
        currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'INR', 'JPY', 'CHF'],
        docsUrl: 'https://stripe.com/docs',
        supportsWebhook: true,
        supportsRefund: true,
        regions: ['Global'],
    },
    {
        key: 'paypal',
        label: 'PayPal',
        color: '#003087',
        bgColor: '#F0F4FF',
        description: 'Accept PayPal and major credit cards worldwide.',
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
        docsUrl: 'https://developer.paypal.com',
        supportsWebhook: true,
        supportsRefund: true,
        regions: ['Global'],
    },
    {
        key: 'razorpay',
        label: 'Razorpay',
        color: '#3395FF',
        bgColor: '#EFF6FF',
        description: 'Popular payment gateway for India. Supports UPI, cards, netbanking.',
        currencies: ['INR', 'USD'],
        docsUrl: 'https://razorpay.com/docs',
        supportsWebhook: true,
        supportsRefund: true,
        regions: ['India'],
    },
    {
        key: 'khalti',
        label: 'Khalti',
        color: '#5C2D91',
        bgColor: '#F5F0FF',
        description: 'Digital wallet and payment gateway for Nepal.',
        currencies: ['NPR'],
        docsUrl: 'https://docs.khalti.com',
        supportsWebhook: false,
        supportsRefund: false,
        regions: ['Nepal'],
    },
    {
        key: 'esewa',
        label: 'eSewa',
        color: '#60BB46',
        bgColor: '#F0FAF0',
        description: 'Most widely used digital payment service in Nepal.',
        currencies: ['NPR'],
        docsUrl: 'https://developer.esewa.com.np',
        supportsWebhook: false,
        supportsRefund: false,
        regions: ['Nepal'],
    },
];

const CREDENTIAL_FIELDS = {
    stripe: [
        {
            key: 'publishable_key',
            label: 'Publishable Key',
            hint: 'Starts with pk_test_ or pk_live_',
            placeholder: 'pk_test_...',
            isSecret: false,
            group: 'API Keys',
        },
        {
            key: 'secret_key',
            label: 'Secret Key',
            hint: 'Never share this key. Starts with sk_test_ or sk_live_',
            placeholder: 'sk_test_...',
            isSecret: true,
            group: 'API Keys',
        },
        {
            key: 'webhook_secret',
            label: 'Webhook Signing Secret',
            hint: 'Found in your Stripe Dashboard under Webhooks. Starts with whsec_',
            placeholder: 'whsec_...',
            isSecret: true,
            group: 'Webhook',
        },
        {
            key: 'statement_descriptor',
            label: 'Statement Descriptor',
            hint: 'Appears on the customer\'s bank statement (max 22 chars)',
            placeholder: 'MYCOMPANY',
            isSecret: false,
            required: false,
            group: 'Display',
        },
    ],
    paypal: [
        {
            key: 'client_id',
            label: 'Client ID',
            hint: 'From your PayPal Developer Dashboard app',
            placeholder: 'A...',
            isSecret: false,
            group: 'API Keys',
        },
        {
            key: 'client_secret',
            label: 'Client Secret',
            hint: 'Keep this secret. Found next to your Client ID.',
            placeholder: '...',
            isSecret: true,
            group: 'API Keys',
        },
        {
            key: 'webhook_id',
            label: 'Webhook ID',
            hint: 'From PayPal Developer Dashboard → Webhooks',
            placeholder: '...',
            isSecret: false,
            required: false,
            group: 'Webhook',
        },
    ],
    razorpay: [
        {
            key: 'key_id',
            label: 'Key ID',
            hint: 'Starts with rzp_test_ or rzp_live_',
            placeholder: 'rzp_test_...',
            isSecret: false,
            group: 'API Keys',
        },
        {
            key: 'key_secret',
            label: 'Key Secret',
            hint: 'Never expose this. Used for server-side signature verification.',
            placeholder: '...',
            isSecret: true,
            group: 'API Keys',
        },
        {
            key: 'webhook_secret',
            label: 'Webhook Secret',
            hint: 'Set when creating a webhook in Razorpay Dashboard',
            placeholder: '...',
            isSecret: true,
            required: false,
            group: 'Webhook',
        },
    ],
    khalti: [
        {
            key: 'public_key',
            label: 'Public Key',
            hint: 'From Khalti Merchant Dashboard',
            placeholder: 'test_public_key_...',
            isSecret: false,
            group: 'API Keys',
        },
        {
            key: 'secret_key',
            label: 'Secret Key',
            hint: 'Used for payment lookup/verification',
            placeholder: 'test_secret_key_...',
            isSecret: true,
            group: 'API Keys',
        },
        {
            key: 'live_secret_key',
            label: 'Live Secret Key',
            hint: 'Your live/production secret key',
            placeholder: 'live_secret_key_...',
            isSecret: true,
            required: false,
            group: 'API Keys',
        },
    ],
    esewa: [
        {
            key: 'merchant_id',
            label: 'Merchant ID (SCD)',
            hint: 'Your eSewa Merchant Code. Test: EPAYTEST',
            placeholder: 'EPAYTEST',
            isSecret: false,
            group: 'API Keys',
        },
        {
            key: 'secret_key',
            label: 'Secret Key',
            hint: 'Used for HMAC signature generation',
            placeholder: '...',
            isSecret: true,
            required: false,
            group: 'API Keys',
        },
    ],
};

const NAV_ITEMS = [
    { key: 'overview', label: 'Overview', icon: <SettingOutlined /> },
    { key: 'general', label: 'General Settings', icon: <WalletOutlined /> },
    { key: 'google-login', label: 'Customer Login', icon: <GoogleOutlined /> },
    { key: 'divider-gateways', type: 'divider', label: 'Payment Gateways' },
    { key: 'stripe', label: 'Stripe', icon: <CreditCardOutlined /> },
    { key: 'paypal', label: 'PayPal', icon: <BankOutlined /> },
    { key: 'razorpay', label: 'Razorpay', icon: <DollarOutlined /> },
    { key: 'khalti', label: 'Khalti', icon: <WalletOutlined /> },
    { key: 'esewa', label: 'eSewa', icon: <ApiOutlined /> },
    { key: 'divider-tools', type: 'divider', label: 'Tools' },
    { key: 'webhooks', label: 'Webhook Logs', icon: <HistoryOutlined /> },
];

/* ─────────────────── HELPERS ─────────────────── */

function CopyButton({ text, size = 'small' }) {
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        message.success('Copied!');
    };
    return (
        <Tooltip title="Copy to clipboard">
            <Button icon={<CopyOutlined />} size={size} type="text" onClick={handleCopy} />
        </Tooltip>
    );
}

function CredentialStatus({ configured, enabled }) {
    if (!configured) return <Tag icon={<WarningFilled />} color="warning">Not configured</Tag>;
    if (!enabled) return <Tag icon={<CheckCircleFilled />} color="default">Configured</Tag>;
    return <Tag icon={<CheckCircleFilled />} color="success">Active</Tag>;
}

function SectionHeader({ icon, title, description, extra }) {
    const { token } = theme.useToken();
    return (
        <div style={{ marginBottom: 24 }}>
            <Row justify="space-between" align="middle">
                <Col>
                    <Space align="center">
                        <span style={{ fontSize: 20, color: token.colorPrimary }}>{icon}</span>
                        <div>
                            <Title level={5} style={{ margin: 0 }}>{title}</Title>
                            {description && <Text type="secondary" style={{ fontSize: 13 }}>{description}</Text>}
                        </div>
                    </Space>
                </Col>
                {extra && <Col>{extra}</Col>}
            </Row>
        </div>
    );
}

function SettingRow({ label, description, children, required }) {
    const { token } = theme.useToken();
    return (
        <Row
            align="middle"
            style={{
                padding: '16px 0',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
            gutter={16}
        >
            <Col xs={24} sm={14}>
                <Space direction="vertical" size={2}>
                    <Space size={4}>
                        <Text strong style={{ fontSize: 14 }}>{label}</Text>
                        {required && <Text type="danger">*</Text>}
                    </Space>
                    {description && <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>}
                </Space>
            </Col>
            <Col xs={24} sm={10} style={{ textAlign: 'right' }}>
                {children}
            </Col>
        </Row>
    );
}

function WebhookUrlField({ provider }) {
    const { token } = theme.useToken();
    const url = `${window.location.origin}/api/webhooks/payments/${provider}`;
    return (
        <div style={{
            background: token.colorFillTertiary,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
        }}>
            <Space size={6}>
                <LinkOutlined style={{ color: token.colorTextTertiary, fontSize: 12 }} />
                <Text
                    style={{ fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}
                    copyable={{ tooltips: ['Copy URL', 'Copied!'] }}
                >
                    {url}
                </Text>
            </Space>
        </div>
    );
}

/* ─────────────────── OVERVIEW SECTION ─────────────────── */

function OverviewSection({ globalSettings, gateways }) {
    const { token } = theme.useToken();
    const enabledCount = gateways.filter(g => g.enabled).length;
    const configuredCount = gateways.filter(g => g.configured).length;
    const liveCount = gateways.filter(g => g.enabled && g.mode === 'live').length;

    return (
        <div>
            <SectionHeader
                icon={<SettingOutlined />}
                title="Online Payments Overview"
                description="Monitor the status of your payment infrastructure at a glance."
            />

            {/* Status banner */}
            {globalSettings?.enable_online_payment ? (
                <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleFilled />}
                    message="Online payments are enabled"
                    description={`${enabledCount} gateway${enabledCount !== 1 ? 's' : ''} active. ${liveCount > 0 ? liveCount + ' in live mode.' : 'All in test mode.'}`}
                    style={{ marginBottom: 24, borderRadius: token.borderRadiusLG }}
                />
            ) : (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningFilled />}
                    message="Online payments are disabled"
                    description="Enable online payments in General Settings to start accepting payments."
                    style={{ marginBottom: 24, borderRadius: token.borderRadiusLG }}
                />
            )}

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Gateways Configured', value: configuredCount, total: PROVIDERS.length, color: token.colorSuccess },
                    { label: 'Gateways Enabled', value: enabledCount, total: PROVIDERS.length, color: token.colorPrimary },
                    { label: 'Live Mode Active', value: liveCount, total: enabledCount, color: '#ff4d4f' },
                    { label: 'Payment Links', value: globalSettings?.allow_public_invoice_payment ? 'On' : 'Off', color: globalSettings?.allow_public_invoice_payment ? token.colorSuccess : token.colorTextTertiary },
                ].map((stat, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: token.borderRadiusLG,
                                background: token.colorFillTertiary,
                                textAlign: 'center',
                            }}
                            bodyStyle={{ padding: '16px 12px' }}
                        >
                            <Text style={{ fontSize: 28, fontWeight: 700, color: stat.color, display: 'block', lineHeight: 1 }}>
                                {stat.value}{stat.total !== undefined ? <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>/{stat.total}</Text> : ''}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>{stat.label}</Text>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Gateway status table */}
            <Card
                title={<Space><CreditCardOutlined /> Payment Gateways</Space>}
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG }}
            >
                {PROVIDERS.map(provider => {
                    const setting = gateways.find(g => g.provider === provider.key);
                    return (
                        <Row
                            key={provider.key}
                            align="middle"
                            style={{
                                padding: '14px 0',
                                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            }}
                            gutter={12}
                        >
                            <Col flex="auto">
                                <Space>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: setting?.enabled ? token.colorSuccess : token.colorBorderSecondary,
                                    }} />
                                    <Text strong style={{ color: provider.color }}>{provider.label}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {provider.regions.join(' · ')}
                                    </Text>
                                </Space>
                            </Col>
                            <Col>
                                <Space>
                                    <CredentialStatus
                                        configured={setting?.configured}
                                        enabled={setting?.enabled}
                                    />
                                    {setting?.enabled && (
                                        <Tag color={setting.mode === 'live' ? 'red' : 'blue'}>
                                            {setting.mode?.toUpperCase()}
                                        </Tag>
                                    )}
                                    {!setting?.configured && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Credentials missing
                                        </Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                    );
                })}
            </Card>

            {/* Quick help */}
            <Card
                title={<Space><InfoCircleOutlined /> Quick Setup Guide</Space>}
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG, marginTop: 16 }}
                size="small"
            >
                <Steps
                    direction="vertical"
                    size="small"
                    current={
                        !globalSettings?.enable_online_payment ? 0 :
                        configuredCount === 0 ? 1 :
                        enabledCount === 0 ? 2 : 3
                    }
                    items={[
                        {
                            title: 'Enable Online Payments',
                            description: 'Go to General Settings and turn on Online Payments.',
                        },
                        {
                            title: 'Configure a Gateway',
                            description: 'Add API credentials for at least one payment provider.',
                        },
                        {
                            title: 'Enable the Gateway',
                            description: 'Toggle the gateway on and verify credentials.',
                        },
                        {
                            title: 'Generate Payment Links',
                            description: 'Open any invoice and generate a public payment link to share with customers.',
                        },
                    ]}
                />
            </Card>
        </div>
    );
}

/* ─────────────────── GENERAL SETTINGS SECTION ─────────────────── */

function GeneralSettingsSection({ globalSettings, onSaved }) {
    const { token } = theme.useToken();
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (globalSettings) {
            setValues({
                enable_online_payment: globalSettings.enable_online_payment ?? false,
                allow_public_invoice_payment: globalSettings.allow_public_invoice_payment ?? false,
                allow_partial_invoice_payment: globalSettings.allow_partial_invoice_payment ?? false,
                allow_invoice_overpayment: globalSettings.allow_invoice_overpayment ?? false,
                minimum_partial_payment_amount: globalSettings.minimum_partial_payment_amount ?? '',
                payment_link_expiry_days: globalSettings.payment_link_expiry_days ?? '',
                default_gateway: globalSettings.default_gateway ?? null,
                receipt_email_enabled: globalSettings.receipt_email_enabled ?? true,
                webhook_logging_enabled: globalSettings.webhook_logging_enabled ?? true,
            });
            setDirty(false);
        }
    }, [globalSettings]);

    const set = (key, val) => {
        setValues(v => ({ ...v, [key]: val }));
        setDirty(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            await axios.put('/api/online-payment-settings', values);
            message.success('General settings saved.');
            setDirty(false);
            onSaved();
        } catch (e) {
            message.error(e.response?.data?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const sections = [
        {
            title: 'Payments',
            icon: <WalletOutlined />,
            rows: [
                {
                    key: 'enable_online_payment',
                    label: 'Enable Online Payments',
                    description: 'Master switch. When off, no online payment will be processed regardless of gateway settings.',
                    control: <Switch checked={values.enable_online_payment} onChange={v => set('enable_online_payment', v)} />,
                },
                {
                    key: 'allow_public_invoice_payment',
                    label: 'Allow Public Invoice Payment Links',
                    description: 'Allow generating shareable payment links for invoices. Customers can pay without logging in.',
                    control: <Switch checked={values.allow_public_invoice_payment} onChange={v => set('allow_public_invoice_payment', v)} />,
                },
                {
                    key: 'allow_partial_invoice_payment',
                    label: 'Allow Partial Payments',
                    description: 'Let customers pay less than the full balance due. Useful for installment arrangements.',
                    control: <Switch checked={values.allow_partial_invoice_payment} onChange={v => set('allow_partial_invoice_payment', v)} />,
                },
                {
                    key: 'allow_invoice_overpayment',
                    label: 'Allow Overpayment',
                    description: 'Allow customers to pay more than the balance due. Excess will be tracked as credit.',
                    control: <Switch checked={values.allow_invoice_overpayment} onChange={v => set('allow_invoice_overpayment', v)} />,
                },
                {
                    key: 'minimum_partial_payment_amount',
                    label: 'Minimum Partial Payment Amount',
                    description: 'The smallest amount accepted when partial payments are enabled.',
                    control: (
                        <InputNumber
                            style={{ width: 160 }}
                            min={0}
                            step={0.01}
                            precision={2}
                            value={values.minimum_partial_payment_amount || undefined}
                            onChange={v => set('minimum_partial_payment_amount', v)}
                            placeholder="No minimum"
                            prefix="$"
                        />
                    ),
                },
            ],
        },
        {
            title: 'Payment Links',
            icon: <LinkOutlined />,
            rows: [
                {
                    key: 'payment_link_expiry_days',
                    label: 'Payment Link Expiry',
                    description: 'Number of days before a payment link expires. Leave blank for links that never expire.',
                    control: (
                        <InputNumber
                            style={{ width: 160 }}
                            min={1}
                            max={365}
                            value={values.payment_link_expiry_days || undefined}
                            onChange={v => set('payment_link_expiry_days', v)}
                            placeholder="Never expires"
                            addonAfter="days"
                        />
                    ),
                },
                {
                    key: 'default_gateway',
                    label: 'Default Payment Gateway',
                    description: 'The gateway pre-selected on the public payment page. Customers can still choose another.',
                    control: (
                        <Select
                            style={{ width: 200 }}
                            allowClear
                            placeholder="No default"
                            value={values.default_gateway}
                            onChange={v => set('default_gateway', v)}
                            options={PROVIDERS.map(p => ({ value: p.key, label: p.label }))}
                        />
                    ),
                },
            ],
        },
        {
            title: 'Notifications & Logging',
            icon: <BellOutlined />,
            rows: [
                {
                    key: 'receipt_email_enabled',
                    label: 'Send Payment Receipt Emails',
                    description: 'Automatically email a payment receipt to the customer after a successful payment.',
                    control: <Switch checked={values.receipt_email_enabled} onChange={v => set('receipt_email_enabled', v)} />,
                },
                {
                    key: 'webhook_logging_enabled',
                    label: 'Enable Webhook Logging',
                    description: 'Log all incoming webhook events to the database for debugging and audit purposes.',
                    control: <Switch checked={values.webhook_logging_enabled} onChange={v => set('webhook_logging_enabled', v)} />,
                },
            ],
        },
    ];

    return (
        <div>
            <SectionHeader
                icon={<SettingOutlined />}
                title="General Settings"
                description="Control how online payments work across the entire application."
                extra={
                    <Button
                        type="primary"
                        loading={saving}
                        disabled={!dirty}
                        onClick={save}
                    >
                        Save Changes
                    </Button>
                }
            />

            {sections.map(section => (
                <Card
                    key={section.title}
                    bordered={false}
                    style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}
                    title={<Space>{section.icon}<Text strong>{section.title}</Text></Space>}
                >
                    {section.rows.map(row => (
                        <SettingRow key={row.key} label={row.label} description={row.description}>
                            {row.control}
                        </SettingRow>
                    ))}
                </Card>
            ))}

            {dirty && (
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button type="primary" loading={saving} onClick={save} size="large">
                        Save Changes
                    </Button>
                </div>
            )}
        </div>
    );
}

/* ─────────────────── GOOGLE LOGIN SECTION ─────────────────── */

function GoogleLoginSection({ globalSettings, onSaved }) {
    const { token } = theme.useToken();
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (globalSettings) {
            setValues({
                enable_google_login: globalSettings.enable_google_login ?? false,
                google_client_id: globalSettings.google_client_id ?? '',
                google_client_secret: '',
                google_redirect_uri: globalSettings.google_redirect_uri ?? `${window.location.origin}/auth/google/callback`,
                google_allowed_domains: globalSettings.google_allowed_domains ?? '',
            });
            setDirty(false);
        }
    }, [globalSettings]);

    const set = (key, val) => {
        setValues(v => ({ ...v, [key]: val }));
        setDirty(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            await axios.put('/api/online-payment-settings', values);
            message.success('Google login settings saved.');
            setDirty(false);
            onSaved();
        } catch (e) {
            message.error(e.response?.data?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <SectionHeader
                icon={<GoogleOutlined />}
                title="Customer Login Settings"
                description="Allow customers to optionally sign in with Google on the public payment page."
                extra={
                    <Button type="primary" loading={saving} disabled={!dirty} onClick={save}>
                        Save Changes
                    </Button>
                }
            />

            <Alert
                type="info"
                showIcon
                message="Google login is optional for customers"
                description="Customers can always pay without logging in. Google login is an opt-in feature that can help pre-fill customer details and improve trust."
                style={{ marginBottom: 24, borderRadius: token.borderRadiusLG }}
            />

            <Card
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}
                title={<Space><GoogleOutlined /> Google OAuth Configuration</Space>}
            >
                <SettingRow
                    label="Enable Google Login"
                    description="Show a 'Continue with Google' button on the public invoice payment page."
                >
                    <Switch checked={values.enable_google_login} onChange={v => set('enable_google_login', v)} />
                </SettingRow>

                <SettingRow
                    label="Google Client ID"
                    description="From Google Cloud Console → Credentials → OAuth 2.0 Client IDs."
                >
                    <Input
                        style={{ width: 320 }}
                        placeholder="xxxx.apps.googleusercontent.com"
                        value={values.google_client_id}
                        onChange={e => set('google_client_id', e.target.value)}
                    />
                </SettingRow>

                <SettingRow
                    label="Google Client Secret"
                    description={
                        globalSettings?.google_client_secret_configured
                            ? 'A secret is already saved. Enter a new one to replace it.'
                            : 'From Google Cloud Console → Credentials.'
                    }
                >
                    <Space direction="vertical" align="end" size={4}>
                        {globalSettings?.google_client_secret_configured && (
                            <Tag color="success" icon={<CheckCircleFilled />}>Secret configured</Tag>
                        )}
                        <Input.Password
                            style={{ width: 320 }}
                            placeholder={globalSettings?.google_client_secret_configured ? 'Enter new secret to replace' : 'Paste client secret'}
                            value={values.google_client_secret}
                            onChange={e => set('google_client_secret', e.target.value)}
                        />
                    </Space>
                </SettingRow>

                <SettingRow
                    label="Redirect URI"
                    description="Add this URI to your Google Cloud Console → Authorized redirect URIs."
                >
                    <Space direction="vertical" align="end" size={4} style={{ width: 320 }}>
                        <div style={{
                            background: token.colorFillTertiary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: token.borderRadius,
                            padding: '6px 12px',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                {values.google_redirect_uri}
                            </Text>
                            <CopyButton text={values.google_redirect_uri} />
                        </div>
                    </Space>
                </SettingRow>

                <SettingRow
                    label="Allowed Domains"
                    description="Restrict Google login to specific email domains (e.g. company.com). Leave blank to allow all."
                >
                    <Input
                        style={{ width: 320 }}
                        placeholder="example.com, company.com"
                        value={values.google_allowed_domains}
                        onChange={e => set('google_allowed_domains', e.target.value)}
                    />
                </SettingRow>
            </Card>

            <Card
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG }}
                title={<Space><InfoCircleOutlined /> Setup Instructions</Space>}
                size="small"
            >
                <Steps
                    direction="vertical"
                    size="small"
                    items={[
                        { title: 'Create a Google Cloud project at console.cloud.google.com' },
                        { title: 'Enable the Google+ API and create OAuth 2.0 credentials' },
                        { title: 'Set the Authorized Redirect URI shown above' },
                        { title: 'Copy the Client ID and Client Secret into this form' },
                        { title: 'Enable Google Login and save' },
                    ]}
                />
            </Card>

            {dirty && (
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button type="primary" loading={saving} onClick={save} size="large">
                        Save Changes
                    </Button>
                </div>
            )}
        </div>
    );
}

/* ─────────────────── GATEWAY SECTION ─────────────────── */

function GatewaySection({ providerKey, gateways, onSaved }) {
    const { token } = theme.useToken();
    const provider = PROVIDERS.find(p => p.key === providerKey);
    const existing = gateways.find(g => g.provider === providerKey);

    const [values, setValues] = useState({});
    const [credentials, setCredentials] = useState({});
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null); // null | { success, message }
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (existing) {
            setValues({
                enabled: existing.enabled ?? false,
                mode: existing.mode ?? 'test',
                display_name: existing.display_name ?? provider.label,
                allowed_currencies: existing.allowed_currencies ?? provider.currencies,
                default_currency: existing.default_currency ?? provider.currencies[0],
                webhook_enabled: existing.webhook_enabled ?? true,
            });
            // Populate masked credentials
            const creds = {};
            (CREDENTIAL_FIELDS[providerKey] || []).forEach(f => {
                creds[f.key] = existing.masked_credentials?.[f.key] ?? '';
            });
            setCredentials(creds);
        } else {
            setValues({
                enabled: false,
                mode: 'test',
                display_name: provider.label,
                allowed_currencies: provider.currencies,
                default_currency: provider.currencies[0],
                webhook_enabled: true,
            });
            const creds = {};
            (CREDENTIAL_FIELDS[providerKey] || []).forEach(f => { creds[f.key] = ''; });
            setCredentials(creds);
        }
        setDirty(false);
        setTestResult(null);
    }, [providerKey, existing]);

    const set = (key, val) => { setValues(v => ({ ...v, [key]: val })); setDirty(true); };
    const setCred = (key, val) => { setCredentials(c => ({ ...c, [key]: val })); setDirty(true); };

    const save = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/payment-gateway-settings/${providerKey}`, {
                ...values,
                credentials,
            });
            message.success(`${provider.label} settings saved.`);
            setDirty(false);
            onSaved();
        } catch (e) {
            message.error(e.response?.data?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post(`/api/payment-gateway-settings/${providerKey}/test`);
            setTestResult({ success: res.data.success, message: res.data.message });
        } catch (e) {
            setTestResult({ success: false, message: e.response?.data?.message || 'Test failed.' });
        } finally {
            setTesting(false);
        }
    };

    const fields = CREDENTIAL_FIELDS[providerKey] || [];
    const fieldGroups = fields.reduce((acc, f) => {
        const g = f.group || 'Other';
        if (!acc[g]) acc[g] = [];
        acc[g].push(f);
        return acc;
    }, {});

    return (
        <div>
            <SectionHeader
                icon={<CreditCardOutlined />}
                title={provider.label}
                description={provider.description}
                extra={
                    <Space>
                        {existing?.configured && (
                            <Button
                                icon={<ThunderboltOutlined />}
                                loading={testing}
                                onClick={testConnection}
                            >
                                Test Connection
                            </Button>
                        )}
                        <Button type="primary" loading={saving} disabled={!dirty} onClick={save}>
                            Save
                        </Button>
                    </Space>
                }
            />

            {/* Test result */}
            {testResult && (
                <Alert
                    type={testResult.success ? 'success' : 'error'}
                    showIcon
                    message={testResult.success ? 'Connection successful' : 'Connection failed'}
                    description={testResult.message}
                    closable
                    onClose={() => setTestResult(null)}
                    style={{ marginBottom: 16, borderRadius: token.borderRadiusLG }}
                />
            )}

            {/* Status + Mode */}
            <Card
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}
                title="Gateway Status"
            >
                <SettingRow
                    label="Enable Gateway"
                    description={`When enabled, ${provider.label} will appear as a payment option on public invoice pages.`}
                >
                    <Space>
                        <Switch
                            checked={values.enabled}
                            onChange={v => set('enabled', v)}
                        />
                        <Text type="secondary">{values.enabled ? 'Enabled' : 'Disabled'}</Text>
                    </Space>
                </SettingRow>

                <SettingRow
                    label="Mode"
                    description={
                        values.mode === 'live'
                            ? '⚠ Live mode — real money will be charged to customers.'
                            : 'Test mode — no real charges. Use test cards/credentials.'
                    }
                >
                    <Select
                        style={{ width: 180 }}
                        value={values.mode}
                        onChange={v => set('mode', v)}
                        options={[
                            { value: 'test', label: '🧪 Test / Sandbox' },
                            { value: 'live', label: '🔴 Live / Production' },
                        ]}
                    />
                </SettingRow>

                <SettingRow
                    label="Display Name"
                    description="Name shown to customers on the payment page."
                >
                    <Input
                        style={{ width: 240 }}
                        value={values.display_name}
                        onChange={e => set('display_name', e.target.value)}
                        placeholder={provider.label}
                    />
                </SettingRow>
            </Card>

            {/* Currencies */}
            <Card
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}
                title="Currency Settings"
            >
                <SettingRow
                    label="Allowed Currencies"
                    description="The gateway will only be shown when the invoice currency matches one of these."
                >
                    <Select
                        mode="multiple"
                        style={{ width: 280 }}
                        value={values.allowed_currencies}
                        onChange={v => set('allowed_currencies', v)}
                        options={provider.currencies.map(c => ({ value: c, label: c }))}
                    />
                </SettingRow>

                <SettingRow
                    label="Default Currency"
                    description="The currency used by default when creating payments."
                >
                    <Select
                        style={{ width: 140 }}
                        value={values.default_currency}
                        onChange={v => set('default_currency', v)}
                        options={(values.allowed_currencies || provider.currencies).map(c => ({ value: c, label: c }))}
                    />
                </SettingRow>
            </Card>

            {/* Credentials */}
            <Card
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}
                title={
                    <Space>
                        <KeyOutlined />
                        <Text strong>API Credentials</Text>
                        {existing?.configured
                            ? <Tag color="success" icon={<CheckCircleFilled />}>Configured</Tag>
                            : <Tag color="warning" icon={<WarningFilled />}>Not configured</Tag>
                        }
                    </Space>
                }
                extra={
                    <a href={provider.docsUrl} target="_blank" rel="noreferrer">
                        <Text type="secondary" style={{ fontSize: 12 }}>📖 {provider.label} Docs</Text>
                    </a>
                }
            >
                <Alert
                    type="info"
                    showIcon
                    icon={<LockOutlined />}
                    message="Credentials are encrypted at rest using AES-256 encryption."
                    description="Secrets are never returned to the browser. Masked values are shown — leave a field blank to keep the existing value."
                    style={{ marginBottom: 20, borderRadius: token.borderRadius }}
                />

                {Object.entries(fieldGroups).map(([groupName, groupFields]) => (
                    <div key={groupName}>
                        <Divider orientation="left" style={{ fontSize: 12, color: token.colorTextTertiary }}>
                            {groupName}
                        </Divider>
                        {groupFields.map(field => (
                            <SettingRow
                                key={field.key}
                                label={field.label}
                                description={field.hint}
                                required={field.required !== false}
                            >
                                {field.isSecret ? (
                                    <Input.Password
                                        style={{ width: 320 }}
                                        placeholder={credentials[field.key]?.includes('****') ? '(unchanged — enter new value to replace)' : field.placeholder}
                                        value={credentials[field.key]?.includes('****') ? '' : (credentials[field.key] ?? '')}
                                        onChange={e => setCred(field.key, e.target.value)}
                                        iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                                    />
                                ) : (
                                    <Input
                                        style={{ width: 320 }}
                                        placeholder={field.placeholder}
                                        value={credentials[field.key]?.includes('****') ? '' : (credentials[field.key] ?? '')}
                                        onChange={e => setCred(field.key, e.target.value)}
                                    />
                                )}
                            </SettingRow>
                        ))}
                    </div>
                ))}
            </Card>

            {/* Webhook */}
            {provider.supportsWebhook && (
                <Card
                    bordered={false}
                    style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}
                    title={<Space><ApiOutlined /> Webhook Configuration</Space>}
                >
                    <Alert
                        type="info"
                        showIcon
                        message="Webhooks are the source of truth for payment confirmation."
                        description="Configure the URL below in your payment provider dashboard. Do not rely on redirect URLs alone to mark payments as confirmed."
                        style={{ marginBottom: 20, borderRadius: token.borderRadius }}
                    />

                    <SettingRow
                        label="Enable Webhooks"
                        description="Receive and process payment event notifications from the provider."
                    >
                        <Switch checked={values.webhook_enabled} onChange={v => set('webhook_enabled', v)} />
                    </SettingRow>

                    <SettingRow
                        label="Your Webhook URL"
                        description={`Add this URL to your ${provider.label} dashboard under Webhooks.`}
                    >
                        <div style={{ width: 400 }}>
                            <WebhookUrlField provider={providerKey} />
                        </div>
                    </SettingRow>
                </Card>
            )}

            {/* Capabilities */}
            <Card
                bordered={false}
                style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}
                title="Gateway Capabilities"
                size="small"
            >
                <Row gutter={[16, 8]}>
                    {[
                        { label: 'Webhooks', value: provider.supportsWebhook },
                        { label: 'Refunds', value: provider.supportsRefund },
                        { label: 'Partial Payments', value: true },
                        { label: 'Regions', value: provider.regions.join(', '), isText: true },
                        { label: 'Currencies', value: provider.currencies.join(', '), isText: true },
                    ].map(cap => (
                        <Col key={cap.label} span={12}>
                            <Space>
                                {cap.isText ? (
                                    <>
                                        <InfoCircleOutlined style={{ color: token.colorTextTertiary }} />
                                        <Text type="secondary">{cap.label}:</Text>
                                        <Text>{cap.value}</Text>
                                    </>
                                ) : cap.value ? (
                                    <>
                                        <CheckCircleFilled style={{ color: token.colorSuccess }} />
                                        <Text>{cap.label}</Text>
                                    </>
                                ) : (
                                    <>
                                        <CloseCircleFilled style={{ color: token.colorTextTertiary }} />
                                        <Text type="secondary">{cap.label} (not supported)</Text>
                                    </>
                                )}
                            </Space>
                        </Col>
                    ))}
                </Row>
            </Card>

            {dirty && (
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Space>
                        {existing?.configured && (
                            <Button icon={<ThunderboltOutlined />} loading={testing} onClick={testConnection}>
                                Test Connection
                            </Button>
                        )}
                        <Button type="primary" loading={saving} onClick={save} size="large">
                            Save Changes
                        </Button>
                    </Space>
                </div>
            )}
        </div>
    );
}

/* ─────────────────── WEBHOOK LOGS SECTION ─────────────────── */

function WebhookLogsSection() {
    const { token } = theme.useToken();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [providerFilter, setProviderFilter] = useState(null);

    const load = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/online-payments', {
                params: { page, per_page: 20, ...(providerFilter && { provider: providerFilter }) }
            });
            setLogs(res.data.data || []);
            setPagination(p => ({ ...p, current: page, total: res.data.total || 0 }));
        } catch { /* */ } finally {
            setLoading(false);
        }
    }, [providerFilter]);

    useEffect(() => { load(1); }, [load]);

    const columns = [
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'date',
            width: 160,
            render: v => v ? new Date(v).toLocaleString() : '—',
        },
        {
            title: 'Provider',
            dataIndex: 'provider',
            key: 'provider',
            width: 100,
            render: v => {
                const p = PROVIDERS.find(x => x.key === v);
                return <Text style={{ color: p?.color }}>{p?.label || v}</Text>;
            },
        },
        {
            title: 'Invoice',
            dataIndex: 'invoice',
            key: 'invoice',
            render: v => v?.invoice_no || '—',
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (v, r) => `${r.currency_code} ${Number(v).toFixed(2)}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: v => {
                const map = { succeeded: 'success', failed: 'error', cancelled: 'warning', pending: 'default', processing: 'processing' };
                return <Tag color={map[v] || 'default'}>{v?.replace(/_/g, ' ').toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Reference',
            dataIndex: 'provider_payment_id',
            key: 'ref',
            render: v => v ? <Text code style={{ fontSize: 11 }}>{v.substring(0, 24)}...</Text> : '—',
        },
    ];

    return (
        <div>
            <SectionHeader
                icon={<HistoryOutlined />}
                title="Online Payment Transactions"
                description="All online payments attempted through public invoice links."
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current)}>Refresh</Button>
                }
            />

            <Card bordered={false} style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}>
                <Row gutter={12}>
                    <Col>
                        <Select
                            placeholder="Filter by provider"
                            allowClear
                            value={providerFilter}
                            onChange={setProviderFilter}
                            style={{ width: 180 }}
                            options={PROVIDERS.map(p => ({ value: p.key, label: p.label }))}
                        />
                    </Col>
                </Row>
            </Card>

            <Card bordered={false} style={{ borderRadius: token.borderRadiusLG }}>
                <Table
                    dataSource={logs}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{
                        current: pagination.current,
                        total: pagination.total,
                        pageSize: pagination.pageSize,
                        onChange: load,
                        showTotal: t => `${t} transactions`,
                    }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: <Empty description="No payment transactions yet" /> }}
                />
            </Card>
        </div>
    );
}

/* ─────────────────── MAIN PAGE ─────────────────── */

export default function PaymentGatewaysIndex() {
    const { token } = theme.useToken();
    const [activeKey, setActiveKey] = useState('overview');
    const [gateways, setGateways] = useState([]);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [gatewaysRes, settingsRes] = await Promise.all([
                axios.get('/api/payment-gateway-settings'),
                axios.get('/api/online-payment-settings'),
            ]);
            setGateways(gatewaysRes.data.data || []);
            setGlobalSettings(settingsRes.data);
        } catch {
            message.error('Failed to load payment settings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const gatewayMap = gateways.reduce((acc, g) => { acc[g.provider] = g; return acc; }, {});

    const renderContent = () => {
        if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

        if (activeKey === 'overview') return <OverviewSection globalSettings={globalSettings} gateways={gateways} />;
        if (activeKey === 'general') return <GeneralSettingsSection globalSettings={globalSettings} onSaved={loadData} />;
        if (activeKey === 'google-login') return <GoogleLoginSection globalSettings={globalSettings} onSaved={loadData} />;
        if (activeKey === 'webhooks') return <WebhookLogsSection />;
        if (PROVIDERS.find(p => p.key === activeKey)) {
            return <GatewaySection providerKey={activeKey} gateways={gateways} onSaved={loadData} />;
        }
        return null;
    };

    return (
        <AuthenticatedLayout header="Payment Gateway Settings">
            <div style={{ padding: '24px 16px' }}>
                {/* Page header */}
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Space align="center">
                            <div style={{
                                width: 40, height: 40, borderRadius: token.borderRadiusLG,
                                background: token.colorPrimary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CreditCardOutlined style={{ color: '#fff', fontSize: 20 }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0 }}>Online Payments</Title>
                                <Text type="secondary">Configure payment gateways and payment settings</Text>
                            </div>
                        </Space>
                    </Col>
                    <Col>
                        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                            Refresh
                        </Button>
                    </Col>
                </Row>

                <Row gutter={24}>
                    {/* Sidebar nav */}
                    <Col xs={24} md={6}>
                        <Card
                            bordered={false}
                            style={{ borderRadius: token.borderRadiusLG, position: 'sticky', top: 80 }}
                            bodyStyle={{ padding: '8px 0' }}
                        >
                            {NAV_ITEMS.map(item => {
                                if (item.type === 'divider') {
                                    return (
                                        <div
                                            key={item.key}
                                            style={{
                                                padding: '12px 16px 4px',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: token.colorTextTertiary,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}
                                        >
                                            {item.label}
                                        </div>
                                    );
                                }

                                const provider = PROVIDERS.find(p => p.key === item.key);
                                const gw = provider ? gatewayMap[item.key] : null;
                                const isActive = activeKey === item.key;

                                return (
                                    <div
                                        key={item.key}
                                        onClick={() => setActiveKey(item.key)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 16px',
                                            cursor: 'pointer',
                                            borderRadius: token.borderRadius,
                                            margin: '1px 8px',
                                            background: isActive ? token.colorPrimaryBg : 'transparent',
                                            color: isActive ? token.colorPrimary : token.colorText,
                                            fontWeight: isActive ? 600 : 400,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <Space size={8}>
                                            <span style={{ color: isActive ? token.colorPrimary : token.colorTextSecondary }}>
                                                {item.icon}
                                            </span>
                                            <Text style={{ color: isActive ? token.colorPrimary : undefined, fontWeight: 'inherit' }}>
                                                {item.label}
                                            </Text>
                                        </Space>
                                        {provider && (
                                            <span>
                                                {gw?.enabled ? (
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: token.colorSuccess,
                                                    }} />
                                                ) : gw?.configured ? (
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: token.colorWarning,
                                                    }} />
                                                ) : (
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: token.colorBorderSecondary,
                                                    }} />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </Card>
                    </Col>

                    {/* Main content */}
                    <Col xs={24} md={18}>
                        {renderContent()}
                    </Col>
                </Row>
            </div>
        </AuthenticatedLayout>
    );
}
