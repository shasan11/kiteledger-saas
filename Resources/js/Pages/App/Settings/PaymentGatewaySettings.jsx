import { useState, useEffect, useCallback } from 'react';
import {
    Alert, Badge, Button, Card, Col, Descriptions, Divider, Empty,
    Form, Input, InputNumber, message, Row, Select, Skeleton,
    Space, Steps, Switch, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
    ApiOutlined,
    BankOutlined,
    CheckCircleFilled,
    CloseCircleFilled,
    CopyOutlined,
    CreditCardOutlined,
    DollarOutlined,
    EyeInvisibleOutlined,
    EyeTwoTone,
    GlobalOutlined,
    GoogleOutlined,
    HistoryOutlined,
    InfoCircleOutlined,
    KeyOutlined,
    LinkOutlined,
    LockOutlined,
    ReloadOutlined,
    SafetyOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    WalletOutlined,
    WarningFilled,
    BellOutlined,
} from '@ant-design/icons';
import { theme } from 'antd';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

/* ─────────────── CONSTANTS ─────────────── */

const PROVIDERS = [
    {
        key: 'stripe', label: 'Stripe', color: '#635BFF',
        description: 'Accept cards, wallets, and local payment methods globally.',
        currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'INR', 'JPY', 'CHF'],
        docsUrl: 'https://stripe.com/docs', supportsWebhook: true, supportsRefund: true, regions: ['Global'],
    },
    {
        key: 'paypal', label: 'PayPal', color: '#003087',
        description: 'Accept PayPal and major credit cards worldwide.',
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
        docsUrl: 'https://developer.paypal.com', supportsWebhook: true, supportsRefund: true, regions: ['Global'],
    },
    {
        key: 'razorpay', label: 'Razorpay', color: '#3395FF',
        description: 'Popular payment gateway for India. Supports UPI, cards, netbanking.',
        currencies: ['INR', 'USD'],
        docsUrl: 'https://razorpay.com/docs', supportsWebhook: true, supportsRefund: true, regions: ['India'],
    },
    {
        key: 'khalti', label: 'Khalti', color: '#5C2D91',
        description: 'Digital wallet and payment gateway for Nepal.',
        currencies: ['NPR'],
        docsUrl: 'https://docs.khalti.com', supportsWebhook: false, supportsRefund: false, regions: ['Nepal'],
    },
    {
        key: 'esewa', label: 'eSewa', color: '#60BB46',
        description: 'Most widely used digital payment service in Nepal.',
        currencies: ['NPR'],
        docsUrl: 'https://developer.esewa.com.np', supportsWebhook: false, supportsRefund: false, regions: ['Nepal'],
    },
];

const CREDENTIAL_FIELDS = {
    stripe: [
        { key: 'publishable_key', label: 'Publishable Key', hint: 'Starts with pk_test_ or pk_live_', placeholder: 'pk_test_...', isSecret: false, group: 'API Keys' },
        { key: 'secret_key', label: 'Secret Key', hint: 'Never share this key. Starts with sk_test_ or sk_live_', placeholder: 'sk_test_...', isSecret: true, group: 'API Keys' },
        { key: 'webhook_secret', label: 'Webhook Signing Secret', hint: 'From Stripe Dashboard → Webhooks. Starts with whsec_', placeholder: 'whsec_...', isSecret: true, group: 'Webhook' },
        { key: 'statement_descriptor', label: 'Statement Descriptor', hint: 'Appears on the customer\'s bank statement (max 22 chars)', placeholder: 'MYCOMPANY', isSecret: false, required: false, group: 'Display' },
    ],
    paypal: [
        { key: 'client_id', label: 'Client ID', hint: 'From your PayPal Developer Dashboard app', placeholder: 'A...', isSecret: false, group: 'API Keys' },
        { key: 'client_secret', label: 'Client Secret', hint: 'Keep this secret. Found next to your Client ID.', placeholder: '...', isSecret: true, group: 'API Keys' },
        { key: 'webhook_id', label: 'Webhook ID', hint: 'From PayPal Developer Dashboard → Webhooks', placeholder: '...', isSecret: false, required: false, group: 'Webhook' },
    ],
    razorpay: [
        { key: 'key_id', label: 'Key ID', hint: 'Starts with rzp_test_ or rzp_live_', placeholder: 'rzp_test_...', isSecret: false, group: 'API Keys' },
        { key: 'key_secret', label: 'Key Secret', hint: 'Never expose this. Used for server-side signature verification.', placeholder: '...', isSecret: true, group: 'API Keys' },
        { key: 'webhook_secret', label: 'Webhook Secret', hint: 'Set when creating a webhook in Razorpay Dashboard', placeholder: '...', isSecret: true, required: false, group: 'Webhook' },
    ],
    khalti: [
        { key: 'public_key', label: 'Public Key', hint: 'From Khalti Merchant Dashboard', placeholder: 'test_public_key_...', isSecret: false, group: 'API Keys' },
        { key: 'secret_key', label: 'Secret Key', hint: 'Used for payment lookup/verification', placeholder: 'test_secret_key_...', isSecret: true, group: 'API Keys' },
        { key: 'live_secret_key', label: 'Live Secret Key', hint: 'Your live/production secret key', placeholder: 'live_secret_key_...', isSecret: true, required: false, group: 'API Keys' },
    ],
    esewa: [
        { key: 'merchant_id', label: 'Merchant ID (SCD)', hint: 'Your eSewa Merchant Code. Test value: EPAYTEST', placeholder: 'EPAYTEST', isSecret: false, group: 'API Keys' },
        { key: 'secret_key', label: 'Secret Key', hint: 'Used for HMAC signature generation', placeholder: '...', isSecret: true, required: false, group: 'API Keys' },
    ],
};

const NAV_SECTIONS = [
    { key: 'overview',     label: 'Overview',          icon: <SettingOutlined />,    type: 'item' },
    { key: 'general',      label: 'General Settings',  icon: <WalletOutlined />,     type: 'item' },
    { key: 'google-login', label: 'Customer Login',    icon: <GoogleOutlined />,     type: 'item' },
    { type: 'divider', label: 'Payment Gateways' },
    { key: 'stripe',    label: 'Stripe',    icon: <CreditCardOutlined />, type: 'item' },
    { key: 'paypal',    label: 'PayPal',    icon: <BankOutlined />,       type: 'item' },
    { key: 'razorpay',  label: 'Razorpay',  icon: <DollarOutlined />,     type: 'item' },
    { key: 'khalti',    label: 'Khalti',    icon: <WalletOutlined />,     type: 'item' },
    { key: 'esewa',     label: 'eSewa',     icon: <ApiOutlined />,        type: 'item' },
    { type: 'divider', label: 'Activity' },
    { key: 'transactions', label: 'Transactions', icon: <HistoryOutlined />, type: 'item' },
];

/* ─────────────── SHARED HELPERS ─────────────── */

function CopyBtn({ text }) {
    return (
        <Tooltip title="Copy">
            <Button
                icon={<CopyOutlined />} size="small" type="text"
                onClick={() => { navigator.clipboard.writeText(text); message.success('Copied!'); }}
            />
        </Tooltip>
    );
}

function CredTag({ configured, enabled }) {
    if (!configured) return <Tag icon={<WarningFilled />} color="warning">Not configured</Tag>;
    if (!enabled)    return <Tag icon={<CheckCircleFilled />} color="default">Configured</Tag>;
    return <Tag icon={<CheckCircleFilled />} color="success">Active</Tag>;
}

function SettingRow({ label, description, children, noBorder }) {
    const { token } = theme.useToken();
    return (
        <Row
            align="middle"
            gutter={12}
            style={{
                padding: '14px 0',
                borderBottom: noBorder ? 'none' : `1px solid ${token.colorBorderSecondary}`,
            }}
        >
            <Col xs={24} sm={15}>
                <Text strong style={{ fontSize: 13 }}>{label}</Text>
                {description && (
                    <><br /><Text type="secondary" style={{ fontSize: 12 }}>{description}</Text></>
                )}
            </Col>
            <Col xs={24} sm={9} style={{ textAlign: 'right' }}>
                {children}
            </Col>
        </Row>
    );
}

function WebhookUrl({ provider }) {
    const { token } = theme.useToken();
    const url = `${window.location.origin}/api/webhooks/payments/${provider}`;
    return (
        <div style={{
            background: token.colorFillTertiary, border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius, padding: '7px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        }}>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>
                {url}
            </Text>
            <CopyBtn text={url} />
        </div>
    );
}

function SectionTitle({ icon, title, description }) {
    const { token } = theme.useToken();
    return (
        <div style={{ marginBottom: 20 }}>
            <Space>
                <span style={{ fontSize: 18, color: token.colorPrimary }}>{icon}</span>
                <div>
                    <Text strong style={{ fontSize: 15, display: 'block' }}>{title}</Text>
                    {description && <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>}
                </div>
            </Space>
        </div>
    );
}

/* ─────────────── OVERVIEW ─────────────── */

function OverviewPanel({ globalSettings, gateways }) {
    const { token } = theme.useToken();
    const enabledCount  = gateways.filter(g => g.enabled).length;
    const configuredCount = gateways.filter(g => g.configured).length;
    const liveCount     = gateways.filter(g => g.enabled && g.mode === 'live').length;

    return (
        <div style={{ padding: '20px 24px' }}>
            <SectionTitle icon={<SettingOutlined />} title="Online Payments — Overview" description="Current status of your payment infrastructure." />

            {globalSettings?.enable_online_payment ? (
                <Alert type="success" showIcon icon={<CheckCircleFilled />}
                    message="Online payments are enabled"
                    description={`${enabledCount} gateway${enabledCount !== 1 ? 's' : ''} active.${liveCount > 0 ? ` ${liveCount} in live mode.` : ' All in test mode.'}`}
                    style={{ marginBottom: 20, borderRadius: token.borderRadius }} />
            ) : (
                <Alert type="warning" showIcon icon={<WarningFilled />}
                    message="Online payments are disabled"
                    description="Enable online payments under General Settings to start accepting payments."
                    style={{ marginBottom: 20, borderRadius: token.borderRadius }} />
            )}

            {/* Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                {[
                    { label: 'Gateways Configured', value: configuredCount, suffix: `/ ${PROVIDERS.length}`, color: token.colorSuccess },
                    { label: 'Gateways Enabled',    value: enabledCount,    suffix: `/ ${PROVIDERS.length}`, color: token.colorPrimary },
                    { label: 'Live Mode',            value: liveCount,      suffix: `/ ${enabledCount || 0}`, color: '#ff4d4f' },
                    {
                        label: 'Public Links',
                        value: globalSettings?.allow_public_invoice_payment ? 'On' : 'Off',
                        color: globalSettings?.allow_public_invoice_payment ? token.colorSuccess : token.colorTextQuaternary,
                    },
                ].map((s, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <div style={{
                            background: token.colorFillTertiary, borderRadius: token.borderRadiusLG,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            padding: '12px 10px', textAlign: 'center',
                        }}>
                            <Text style={{ fontSize: 22, fontWeight: 700, color: s.color, display: 'block', lineHeight: 1.2 }}>
                                {s.value}
                                {s.suffix && <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}> {s.suffix}</Text>}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
                        </div>
                    </Col>
                ))}
            </Row>

            {/* Gateway status list */}
            <div style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG, overflow: 'hidden', marginBottom: 20,
            }}>
                <div style={{
                    padding: '8px 14px', background: token.colorFillTertiary,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}>
                    <Text strong style={{ fontSize: 12, color: token.colorTextSecondary }}>PAYMENT GATEWAYS</Text>
                </div>
                {PROVIDERS.map((p, i) => {
                    const gw = gateways.find(g => g.provider === p.key);
                    return (
                        <Row
                            key={p.key}
                            align="middle"
                            style={{
                                padding: '10px 14px',
                                borderBottom: i < PROVIDERS.length - 1 ? `1px solid ${token.colorBorderSecondary}` : 'none',
                            }}
                        >
                            <Col flex="auto">
                                <Space size={8}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: gw?.enabled ? token.colorSuccess : token.colorBorderSecondary,
                                        flexShrink: 0,
                                    }} />
                                    <Text strong style={{ color: p.color, fontSize: 13 }}>{p.label}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {p.regions.join(' · ')} · {p.currencies.join(', ')}
                                    </Text>
                                </Space>
                            </Col>
                            <Col>
                                <Space size={6}>
                                    <CredTag configured={gw?.configured} enabled={gw?.enabled} />
                                    {gw?.enabled && (
                                        <Tag color={gw.mode === 'live' ? 'red' : 'blue'} style={{ fontSize: 11 }}>
                                            {gw.mode?.toUpperCase()}
                                        </Tag>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                    );
                })}
            </div>

            {/* Setup guide */}
            <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: '14px 16px' }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>Quick Setup Guide</Text>
                <Steps
                    direction="vertical" size="small"
                    current={
                        !globalSettings?.enable_online_payment ? 0 :
                        configuredCount === 0 ? 1 : enabledCount === 0 ? 2 : 3
                    }
                    items={[
                        { title: 'Enable Online Payments', description: 'Go to General Settings and turn on the master switch.' },
                        { title: 'Configure a Gateway',    description: 'Add API credentials for at least one payment provider.' },
                        { title: 'Enable the Gateway',     description: 'Toggle a gateway on and test the credentials.' },
                        { title: 'Generate Payment Links', description: 'Open any invoice and share the public payment link with customers.' },
                    ]}
                />
            </div>
        </div>
    );
}

/* ─────────────── GENERAL SETTINGS ─────────────── */

function GeneralPanel({ globalSettings, onSaved }) {
    const { token } = theme.useToken();
    const [vals, setVals] = useState({});
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!globalSettings) return;
        setVals({
            enable_online_payment:          globalSettings.enable_online_payment          ?? false,
            allow_public_invoice_payment:   globalSettings.allow_public_invoice_payment   ?? false,
            allow_partial_invoice_payment:  globalSettings.allow_partial_invoice_payment  ?? false,
            allow_invoice_overpayment:      globalSettings.allow_invoice_overpayment      ?? false,
            minimum_partial_payment_amount: globalSettings.minimum_partial_payment_amount ?? null,
            payment_link_expiry_days:       globalSettings.payment_link_expiry_days       ?? null,
            default_gateway:               globalSettings.default_gateway                ?? null,
            receipt_email_enabled:         globalSettings.receipt_email_enabled           ?? true,
            webhook_logging_enabled:       globalSettings.webhook_logging_enabled         ?? true,
        });
        setDirty(false);
    }, [globalSettings]);

    const set = (k, v) => { setVals(prev => ({ ...prev, [k]: v })); setDirty(true); };

    const save = async () => {
        setSaving(true);
        try {
            await axios.put('/api/online-payment-settings', vals);
            message.success('General settings saved.');
            setDirty(false);
            onSaved();
        } catch (e) {
            message.error(e.response?.data?.message || 'Save failed.');
        } finally { setSaving(false); }
    };

    const groups = [
        {
            title: 'Payments', icon: <WalletOutlined />,
            rows: [
                {
                    k: 'enable_online_payment', label: 'Enable Online Payments',
                    desc: 'Master switch. Disabling this stops all online payment processing regardless of gateway settings.',
                    ctrl: <Switch checked={vals.enable_online_payment} onChange={v => set('enable_online_payment', v)} />,
                },
                {
                    k: 'allow_public_invoice_payment', label: 'Allow Public Invoice Payment Links',
                    desc: 'Let users generate a public shareable link for any invoice so customers can pay without logging in.',
                    ctrl: <Switch checked={vals.allow_public_invoice_payment} onChange={v => set('allow_public_invoice_payment', v)} />,
                },
                {
                    k: 'allow_partial_invoice_payment', label: 'Allow Partial Payments',
                    desc: 'Customers can pay less than the full balance due — useful for deposit or instalment arrangements.',
                    ctrl: <Switch checked={vals.allow_partial_invoice_payment} onChange={v => set('allow_partial_invoice_payment', v)} />,
                },
                {
                    k: 'allow_invoice_overpayment', label: 'Allow Overpayment',
                    desc: 'Customers can pay more than the balance due. Excess is tracked as a credit on the account.',
                    ctrl: <Switch checked={vals.allow_invoice_overpayment} onChange={v => set('allow_invoice_overpayment', v)} />,
                },
                {
                    k: 'minimum_partial_payment_amount', label: 'Minimum Partial Payment Amount',
                    desc: 'The smallest amount accepted when partial payments are enabled. Leave blank for no minimum.',
                    ctrl: (
                        <InputNumber
                            style={{ width: 160 }} min={0} step={0.01} precision={2}
                            value={vals.minimum_partial_payment_amount}
                            onChange={v => set('minimum_partial_payment_amount', v)}
                            placeholder="No minimum" prefix="$"
                        />
                    ),
                },
            ],
        },
        {
            title: 'Payment Links', icon: <LinkOutlined />,
            rows: [
                {
                    k: 'payment_link_expiry_days', label: 'Payment Link Expiry',
                    desc: 'How many days before a payment link expires. Leave blank for links that never expire.',
                    ctrl: (
                        <InputNumber
                            style={{ width: 160 }} min={1} max={365}
                            value={vals.payment_link_expiry_days}
                            onChange={v => set('payment_link_expiry_days', v)}
                            placeholder="Never expires" addonAfter="days"
                        />
                    ),
                },
                {
                    k: 'default_gateway', label: 'Default Payment Gateway',
                    desc: 'Gateway pre-selected on the public payment page. Customers can still choose another.',
                    ctrl: (
                        <Select
                            style={{ width: 180 }} allowClear placeholder="No default"
                            value={vals.default_gateway} onChange={v => set('default_gateway', v)}
                            options={PROVIDERS.map(p => ({ value: p.key, label: p.label }))}
                        />
                    ),
                },
            ],
        },
        {
            title: 'Notifications & Logging', icon: <BellOutlined />,
            rows: [
                {
                    k: 'receipt_email_enabled', label: 'Send Payment Receipt Emails',
                    desc: 'Email a payment receipt to the customer automatically after each successful payment.',
                    ctrl: <Switch checked={vals.receipt_email_enabled} onChange={v => set('receipt_email_enabled', v)} />,
                },
                {
                    k: 'webhook_logging_enabled', label: 'Enable Webhook Logging',
                    desc: 'Log all incoming provider webhook events to the database for debugging and auditing.',
                    ctrl: <Switch checked={vals.webhook_logging_enabled} onChange={v => set('webhook_logging_enabled', v)} />,
                },
            ],
        },
    ];

    return (
        <div style={{ padding: '20px 24px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                <Col>
                    <SectionTitle icon={<SettingOutlined />} title="General Settings" description="Control how online payments work across the entire application." />
                </Col>
                <Col>
                    <Button type="primary" loading={saving} disabled={!dirty} onClick={save}>
                        Save Changes
                    </Button>
                </Col>
            </Row>

            {groups.map(group => (
                <div key={group.title} style={{ marginBottom: 24 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginBottom: 4, paddingBottom: 8,
                        borderBottom: `2px solid ${theme.useToken().token.colorBorderSecondary}`,
                    }}>
                        <span style={{ color: theme.useToken().token.colorPrimary }}>{group.icon}</span>
                        <Text strong style={{ fontSize: 13 }}>{group.title}</Text>
                    </div>
                    {group.rows.map((row, i) => (
                        <SettingRow
                            key={row.k} label={row.label} description={row.desc}
                            noBorder={i === group.rows.length - 1}
                        >
                            {row.ctrl}
                        </SettingRow>
                    ))}
                </div>
            ))}

            {dirty && (
                <Row justify="end" style={{ marginTop: 8 }}>
                    <Button type="primary" loading={saving} onClick={save}>Save Changes</Button>
                </Row>
            )}
        </div>
    );
}

/* ─────────────── GOOGLE LOGIN ─────────────── */

function GoogleLoginPanel({ globalSettings, onSaved }) {
    const { token } = theme.useToken();
    const [vals, setVals]     = useState({});
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty]   = useState(false);

    useEffect(() => {
        if (!globalSettings) return;
        setVals({
            enable_google_login:    globalSettings.enable_google_login    ?? false,
            google_client_id:       globalSettings.google_client_id       ?? '',
            google_client_secret:   '',
            google_redirect_uri:    globalSettings.google_redirect_uri    ?? `${window.location.origin}/auth/google/callback`,
            google_allowed_domains: globalSettings.google_allowed_domains ?? '',
        });
        setDirty(false);
    }, [globalSettings]);

    const set = (k, v) => { setVals(p => ({ ...p, [k]: v })); setDirty(true); };

    const save = async () => {
        setSaving(true);
        try {
            await axios.put('/api/online-payment-settings', vals);
            message.success('Customer login settings saved.');
            setDirty(false);
            onSaved();
        } catch (e) {
            message.error(e.response?.data?.message || 'Save failed.');
        } finally { setSaving(false); }
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                <Col>
                    <SectionTitle icon={<GoogleOutlined />} title="Customer Login Settings" description="Optionally allow customers to sign in with Google on the public payment page." />
                </Col>
                <Col>
                    <Button type="primary" loading={saving} disabled={!dirty} onClick={save}>Save Changes</Button>
                </Col>
            </Row>

            <Alert
                type="info" showIcon
                message="Google login is optional for customers"
                description="Customers can always pay without logging in. This is purely an opt-in convenience feature."
                style={{ marginBottom: 20, borderRadius: token.borderRadius }}
            />

            <SettingRow label="Enable Google Login" description="Show a 'Continue with Google' button on the public invoice payment page.">
                <Switch checked={vals.enable_google_login} onChange={v => set('enable_google_login', v)} />
            </SettingRow>

            <SettingRow label="Google Client ID" description="From Google Cloud Console → Credentials → OAuth 2.0 Client IDs.">
                <Input
                    style={{ width: 300 }} placeholder="xxxx.apps.googleusercontent.com"
                    value={vals.google_client_id} onChange={e => set('google_client_id', e.target.value)}
                />
            </SettingRow>

            <SettingRow
                label="Google Client Secret"
                description={globalSettings?.google_client_secret_configured
                    ? 'A secret is already saved. Enter a new one only if you want to replace it.'
                    : 'From Google Cloud Console → Credentials.'}
            >
                <Space direction="vertical" align="end" size={4}>
                    {globalSettings?.google_client_secret_configured && (
                        <Tag color="success" icon={<CheckCircleFilled />}>Secret configured</Tag>
                    )}
                    <Input.Password
                        style={{ width: 300 }}
                        placeholder={globalSettings?.google_client_secret_configured ? 'Enter new secret to replace' : 'Paste client secret'}
                        value={vals.google_client_secret}
                        onChange={e => set('google_client_secret', e.target.value)}
                    />
                </Space>
            </SettingRow>

            <SettingRow label="Redirect URI" description="Add this URI to Google Cloud Console → Authorised redirect URIs exactly as shown.">
                <div style={{
                    width: 300, display: 'flex', alignItems: 'center', gap: 6,
                    background: token.colorFillTertiary,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: token.borderRadius, padding: '6px 10px',
                }}>
                    <Text style={{ fontSize: 11, fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                        {vals.google_redirect_uri}
                    </Text>
                    <CopyBtn text={vals.google_redirect_uri} />
                </div>
            </SettingRow>

            <SettingRow label="Allowed Domains" description="Comma-separated email domains allowed to use Google login. Leave blank to allow all." noBorder>
                <Input
                    style={{ width: 300 }} placeholder="example.com, company.com"
                    value={vals.google_allowed_domains} onChange={e => set('google_allowed_domains', e.target.value)}
                />
            </SettingRow>

            <Divider />

            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                <InfoCircleOutlined /> &nbsp;Setup Instructions
            </Text>
            <Steps direction="vertical" size="small" items={[
                { title: 'Go to console.cloud.google.com and create or open a project' },
                { title: 'Enable the Google People API (or Google+ API)' },
                { title: 'Create an OAuth 2.0 Client ID under Credentials' },
                { title: 'Add the Redirect URI shown above to Authorised redirect URIs' },
                { title: 'Copy the Client ID and Client Secret into this form' },
                { title: 'Enable Google Login above and save' },
            ]} />

            {dirty && (
                <Row justify="end" style={{ marginTop: 16 }}>
                    <Button type="primary" loading={saving} onClick={save}>Save Changes</Button>
                </Row>
            )}
        </div>
    );
}

/* ─────────────── GATEWAY PANEL ─────────────── */

function GatewayPanel({ providerKey, gateways, onSaved }) {
    const { token } = theme.useToken();
    const provider = PROVIDERS.find(p => p.key === providerKey);
    const existing = gateways.find(g => g.provider === providerKey);

    const [vals, setVals]   = useState({});
    const [creds, setCreds] = useState({});
    const [saving, setSaving]   = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setVals({
            enabled:            existing?.enabled            ?? false,
            mode:               existing?.mode               ?? 'test',
            display_name:       existing?.display_name       ?? provider.label,
            allowed_currencies: existing?.allowed_currencies ?? provider.currencies,
            default_currency:   existing?.default_currency   ?? provider.currencies[0],
            webhook_enabled:    existing?.webhook_enabled    ?? true,
        });
        const c = {};
        (CREDENTIAL_FIELDS[providerKey] || []).forEach(f => {
            c[f.key] = existing?.masked_credentials?.[f.key] ?? '';
        });
        setCreds(c);
        setDirty(false);
        setTestResult(null);
    }, [providerKey, existing]);

    const setV = (k, v) => { setVals(p => ({ ...p, [k]: v })); setDirty(true); };
    const setC = (k, v) => { setCreds(p => ({ ...p, [k]: v })); setDirty(true); };

    const save = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/payment-gateway-settings/${providerKey}`, { ...vals, credentials: creds });
            message.success(`${provider.label} settings saved.`);
            setDirty(false);
            onSaved();
        } catch (e) {
            message.error(e.response?.data?.message || 'Save failed.');
        } finally { setSaving(false); }
    };

    const test = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post(`/api/payment-gateway-settings/${providerKey}/test`);
            setTestResult({ ok: res.data.success, msg: res.data.message });
        } catch (e) {
            setTestResult({ ok: false, msg: e.response?.data?.message || 'Connection test failed.' });
        } finally { setTesting(false); }
    };

    const fields   = CREDENTIAL_FIELDS[providerKey] || [];
    const groups   = fields.reduce((acc, f) => {
        const g = f.group || 'Other';
        if (!acc[g]) acc[g] = [];
        acc[g].push(f);
        return acc;
    }, {});

    const isMasked = v => typeof v === 'string' && v.includes('****');

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                <Col>
                    <SectionTitle
                        icon={<CreditCardOutlined />}
                        title={<span style={{ color: provider.color }}>{provider.label}</span>}
                        description={provider.description}
                    />
                </Col>
                <Col>
                    <Space>
                        {existing?.configured && (
                            <Button icon={<ThunderboltOutlined />} loading={testing} onClick={test}>
                                Test Connection
                            </Button>
                        )}
                        <Button type="primary" loading={saving} disabled={!dirty} onClick={save}>
                            Save
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* Test result */}
            {testResult && (
                <Alert
                    type={testResult.ok ? 'success' : 'error'} showIcon closable
                    onClose={() => setTestResult(null)}
                    message={testResult.ok ? 'Connection successful' : 'Connection failed'}
                    description={testResult.msg}
                    style={{ marginBottom: 16, borderRadius: token.borderRadius }}
                />
            )}

            {/* ── Status ── */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ borderBottom: `2px solid ${token.colorBorderSecondary}`, paddingBottom: 8, marginBottom: 0 }}>
                    <Text strong style={{ fontSize: 13 }}>Status</Text>
                </div>
                <SettingRow label="Enable Gateway" description={`When enabled, ${provider.label} will appear as a payment option on public invoice pages.`}>
                    <Space>
                        <Switch checked={vals.enabled} onChange={v => setV('enabled', v)} />
                        <Text type="secondary">{vals.enabled ? 'Enabled' : 'Disabled'}</Text>
                    </Space>
                </SettingRow>
                <SettingRow
                    label="Mode"
                    description={vals.mode === 'live'
                        ? '⚠ Live mode — real money will be charged to customers.'
                        : 'Test mode — no real charges. Use test credentials / test cards.'}
                >
                    <Select
                        style={{ width: 200 }} value={vals.mode} onChange={v => setV('mode', v)}
                        options={[
                            { value: 'test', label: '🧪  Test / Sandbox' },
                            { value: 'live', label: '🔴  Live / Production' },
                        ]}
                    />
                </SettingRow>
                <SettingRow label="Display Name" description="Name shown to customers on the public payment page." noBorder>
                    <Input
                        style={{ width: 220 }} placeholder={provider.label}
                        value={vals.display_name} onChange={e => setV('display_name', e.target.value)}
                    />
                </SettingRow>
            </div>

            {/* ── Currencies ── */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ borderBottom: `2px solid ${token.colorBorderSecondary}`, paddingBottom: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>Currency Settings</Text>
                </div>
                <SettingRow label="Allowed Currencies" description="This gateway only shows on the payment page when the invoice currency matches one of these.">
                    <Select
                        mode="multiple" style={{ width: 260 }}
                        value={vals.allowed_currencies} onChange={v => setV('allowed_currencies', v)}
                        options={provider.currencies.map(c => ({ value: c, label: c }))}
                    />
                </SettingRow>
                <SettingRow label="Default Currency" description="Currency used when creating payments for this gateway." noBorder>
                    <Select
                        style={{ width: 120 }}
                        value={vals.default_currency} onChange={v => setV('default_currency', v)}
                        options={(vals.allowed_currencies || provider.currencies).map(c => ({ value: c, label: c }))}
                    />
                </SettingRow>
            </div>

            {/* ── API Credentials ── */}
            <div style={{ marginBottom: 20 }}>
                <Row justify="space-between" align="middle" style={{ borderBottom: `2px solid ${token.colorBorderSecondary}`, paddingBottom: 8, marginBottom: 0 }}>
                    <Col>
                        <Space>
                            <KeyOutlined style={{ color: token.colorPrimary }} />
                            <Text strong style={{ fontSize: 13 }}>API Credentials</Text>
                            <CredTag configured={existing?.configured} enabled={existing?.enabled} />
                        </Space>
                    </Col>
                    <Col>
                        <a href={provider.docsUrl} target="_blank" rel="noreferrer">
                            <Text type="secondary" style={{ fontSize: 12 }}>📖 {provider.label} Docs ↗</Text>
                        </a>
                    </Col>
                </Row>

                <Alert
                    type="info" showIcon icon={<LockOutlined />}
                    message="Credentials are encrypted at rest using AES-256."
                    description="Secrets are never returned to the browser in plain text. Masked values are shown — leave a field blank to keep the existing value unchanged."
                    style={{ margin: '12px 0 16px', borderRadius: token.borderRadius }}
                />

                {Object.entries(groups).map(([groupName, groupFields]) => (
                    <div key={groupName}>
                        <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: token.colorTextTertiary, margin: '12px 0 0' }}>
                            {groupName}
                        </Divider>
                        {groupFields.map((f, i) => (
                            <SettingRow key={f.key} label={f.label} description={f.hint} noBorder={i === groupFields.length - 1}>
                                {f.isSecret ? (
                                    <Input.Password
                                        style={{ width: 300 }}
                                        placeholder={isMasked(creds[f.key]) ? '(unchanged — enter new to replace)' : (f.placeholder || '')}
                                        value={isMasked(creds[f.key]) ? '' : (creds[f.key] ?? '')}
                                        onChange={e => setC(f.key, e.target.value)}
                                        iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                                    />
                                ) : (
                                    <Input
                                        style={{ width: 300 }}
                                        placeholder={isMasked(creds[f.key]) ? '(unchanged — enter new to replace)' : (f.placeholder || '')}
                                        value={isMasked(creds[f.key]) ? '' : (creds[f.key] ?? '')}
                                        onChange={e => setC(f.key, e.target.value)}
                                    />
                                )}
                            </SettingRow>
                        ))}
                    </div>
                ))}
            </div>

            {/* ── Webhook ── */}
            {provider.supportsWebhook && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ borderBottom: `2px solid ${token.colorBorderSecondary}`, paddingBottom: 8 }}>
                        <Space>
                            <ApiOutlined style={{ color: token.colorPrimary }} />
                            <Text strong style={{ fontSize: 13 }}>Webhook Configuration</Text>
                        </Space>
                    </div>
                    <Alert
                        type="warning" showIcon
                        message="Webhooks are the authoritative source for payment confirmation."
                        description={`Configure the URL below in your ${provider.label} dashboard. Never mark an invoice paid based solely on the customer redirect.`}
                        style={{ margin: '12px 0', borderRadius: token.borderRadius }}
                    />
                    <SettingRow label="Enable Webhooks" description="Receive and process payment event notifications from the provider.">
                        <Switch checked={vals.webhook_enabled} onChange={v => setV('webhook_enabled', v)} />
                    </SettingRow>
                    <SettingRow label="Webhook URL" description={`Copy this URL into your ${provider.label} dashboard to receive events.`} noBorder>
                        <div style={{ width: 360 }}>
                            <WebhookUrl provider={providerKey} />
                        </div>
                    </SettingRow>
                </div>
            )}

            {/* ── Capabilities ── */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ borderBottom: `2px solid ${token.colorBorderSecondary}`, paddingBottom: 8, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>Gateway Capabilities</Text>
                </div>
                <Row gutter={[12, 8]}>
                    {[
                        { label: 'Webhooks',         value: provider.supportsWebhook },
                        { label: 'Refunds',          value: provider.supportsRefund },
                        { label: 'Partial Payments', value: true },
                        { label: 'Regions',  text: provider.regions.join(', ') },
                        { label: 'Currencies', text: provider.currencies.join(', ') },
                    ].map(cap => (
                        <Col key={cap.label} xs={24} sm={12}>
                            <Space size={6}>
                                {cap.text !== undefined ? (
                                    <><InfoCircleOutlined style={{ color: token.colorTextTertiary }} /><Text type="secondary">{cap.label}:</Text><Text>{cap.text}</Text></>
                                ) : cap.value ? (
                                    <><CheckCircleFilled style={{ color: token.colorSuccess }} /><Text>{cap.label}</Text></>
                                ) : (
                                    <><CloseCircleFilled style={{ color: token.colorTextQuaternary }} /><Text type="secondary">{cap.label} (not supported)</Text></>
                                )}
                            </Space>
                        </Col>
                    ))}
                </Row>
            </div>

            {dirty && (
                <Row justify="end" style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    <Space>
                        {existing?.configured && (
                            <Button icon={<ThunderboltOutlined />} loading={testing} onClick={test}>Test Connection</Button>
                        )}
                        <Button type="primary" loading={saving} onClick={save}>Save Changes</Button>
                    </Space>
                </Row>
            )}
        </div>
    );
}

/* ─────────────── TRANSACTIONS PANEL ─────────────── */

function TransactionsPanel() {
    const { token } = theme.useToken();
    const [rows, setRows]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState(null);
    const [pg, setPg] = useState({ current: 1, pageSize: 20, total: 0 });

    const load = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/online-payments', {
                params: { page, per_page: 20, ...(provider && { provider }) },
            });
            setRows(res.data.data || []);
            setPg(p => ({ ...p, current: page, total: res.data.total || 0 }));
        } catch { /* */ } finally { setLoading(false); }
    }, [provider]);

    useEffect(() => { load(1); }, [load]);

    const STATUS_COLOR = { succeeded: 'success', failed: 'error', cancelled: 'warning', pending: 'default', processing: 'processing', refunded: 'default' };

    const cols = [
        { title: 'Date',     dataIndex: 'paid_at',    key: 'd', width: 130, render: v => v ? new Date(v).toLocaleDateString() : '—' },
        {
            title: 'Provider', dataIndex: 'provider', key: 'p', width: 100,
            render: v => { const p = PROVIDERS.find(x => x.key === v); return <Text style={{ color: p?.color }}>{p?.label || v}</Text>; },
        },
        { title: 'Invoice',  dataIndex: 'invoice',   key: 'i', render: v => v?.invoice_no || '—' },
        { title: 'Customer', dataIndex: 'customer_name', key: 'c', render: (v, r) => v || r.contact?.name || '—' },
        { title: 'Amount',   dataIndex: 'amount',    key: 'a', align: 'right', render: (v, r) => `${r.currency_code} ${Number(v).toFixed(2)}` },
        {
            title: 'Status', dataIndex: 'status', key: 's', width: 120,
            render: v => <Tag color={STATUS_COLOR[v] || 'default'}>{v?.replace(/_/g, ' ').toUpperCase()}</Tag>,
        },
        {
            title: 'Ref', dataIndex: 'provider_payment_id', key: 'r',
            render: v => v ? <Text code style={{ fontSize: 10 }}>{v.substring(0, 18)}…</Text> : '—',
        },
    ];

    return (
        <div style={{ padding: '20px 24px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <SectionTitle icon={<HistoryOutlined />} title="Online Payment Transactions" description="All payment attempts made through public invoice links." />
                </Col>
                <Col>
                    <Button icon={<ReloadOutlined />} onClick={() => load(pg.current)}>Refresh</Button>
                </Col>
            </Row>

            <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col>
                    <Select
                        placeholder="Filter by provider" allowClear style={{ width: 180 }}
                        value={provider} onChange={setProvider}
                        options={PROVIDERS.map(p => ({ value: p.key, label: p.label }))}
                    />
                </Col>
            </Row>

            <Table
                dataSource={rows} columns={cols} rowKey="id" loading={loading} size="small"
                scroll={{ x: 700 }}
                pagination={{
                    current: pg.current, total: pg.total, pageSize: pg.pageSize,
                    onChange: load, showTotal: t => `${t} transactions`,
                }}
                locale={{ emptyText: <Empty description="No payment transactions yet" /> }}
            />
        </div>
    );
}

/* ─────────────── LEFT NAV ─────────────── */

function NavItem({ item, active, gateways }) {
    const { token } = theme.useToken();
    const gw = gateways.find(g => g.provider === item.key);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: token.borderRadiusSM,
            background: active ? token.colorPrimaryBg : 'transparent',
            cursor: 'pointer',
            transition: 'background 0.15s',
        }}>
            <Space size={7}>
                <span style={{
                    width: 20, height: 20, borderRadius: token.borderRadiusSM,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? token.colorPrimaryBg : token.colorFillQuaternary,
                    color: active ? token.colorPrimary : token.colorTextSecondary,
                    border: `1px solid ${active ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                    fontSize: 11, flexShrink: 0,
                }}>
                    {item.icon}
                </span>
                <Text style={{
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? token.colorPrimary : token.colorText,
                    whiteSpace: 'nowrap',
                }}>
                    {item.label}
                </Text>
            </Space>

            {/* status dot for gateways */}
            {PROVIDERS.find(p => p.key === item.key) && (
                <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: gw?.enabled ? token.colorSuccess : gw?.configured ? token.colorWarning : token.colorBorderSecondary,
                    flexShrink: 0,
                }} />
            )}
        </div>
    );
}

/* ─────────────── ROOT COMPONENT ─────────────── */

export default function PaymentGatewaySettings() {
    const { token } = theme.useToken();
    const [active, setActive]             = useState('overview');
    const [gateways, setGateways]         = useState([]);
    const [globalSettings, setGlobal]     = useState(null);
    const [loading, setLoading]           = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [gwRes, settingsRes] = await Promise.all([
                axios.get('/api/payment-gateway-settings'),
                axios.get('/api/online-payment-settings'),
            ]);
            setGateways(gwRes.data.data || []);
            setGlobal(settingsRes.data);
        } catch {
            message.error('Failed to load payment settings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const renderPanel = () => {
        if (loading) return <div style={{ padding: 32 }}><Skeleton active paragraph={{ rows: 10 }} /></div>;

        if (active === 'overview')    return <OverviewPanel globalSettings={globalSettings} gateways={gateways} />;
        if (active === 'general')     return <GeneralPanel globalSettings={globalSettings} onSaved={loadData} />;
        if (active === 'google-login')return <GoogleLoginPanel globalSettings={globalSettings} onSaved={loadData} />;
        if (active === 'transactions')return <TransactionsPanel />;
        if (PROVIDERS.find(p => p.key === active))
            return <GatewayPanel providerKey={active} gateways={gateways} onSaved={loadData} />;
        return null;
    };

    return (
        <div style={{ display: 'flex', height: '100%', minHeight: 500 }}>
            {/* ── Left nav ── */}
            <div style={{
                width: 190, flexShrink: 0,
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                padding: '12px 8px',
                display: 'flex', flexDirection: 'column', gap: 2,
                overflowY: 'auto',
            }}>
                {NAV_SECTIONS.map((item, i) => {
                    if (item.type === 'divider') {
                        return (
                            <div key={i} style={{
                                padding: '10px 10px 3px',
                                fontSize: 10, fontWeight: 800, letterSpacing: '0.07em',
                                textTransform: 'uppercase', color: token.colorTextQuaternary,
                                userSelect: 'none',
                            }}>
                                {item.label}
                            </div>
                        );
                    }
                    return (
                        <div key={item.key} onClick={() => setActive(item.key)}
                            onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = token.colorFillTertiary; }}
                            onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <NavItem item={item} active={active === item.key} gateways={gateways} />
                        </div>
                    );
                })}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
                {renderPanel()}
            </div>
        </div>
    );
}
