import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Form,
    InputNumber,
    message,
    Radio,
    Row,
    Select,
    Space,
    Steps,
    Switch,
    Tag,
    Typography,
} from 'antd';
import {
    ApartmentOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckCircleOutlined,
    GlobalOutlined,
    PercentageOutlined,
    SaveOutlined,
    SettingOutlined,
    ShoppingCartOutlined,
    ShoppingOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

// Presets that are generic (not country-specific).
// Country-specific presets are injected based on the selected country.
const BASE_PRESETS = [
    {
        key: 'no_tax',
        label: 'No Tax',
        description: 'Your business does not charge or pay tax.',
        color: 'default',
    },
    {
        key: 'custom',
        label: 'Custom Tax',
        description: 'Set up your own rates manually using the wizard below.',
        color: 'orange',
    },
];

const COUNTRY_PRESETS = {
    standard_vat:       { label: 'Standard VAT',          description: 'Single VAT rate on both sales and purchases.',        color: 'green'  },
    sales_tax_only:     { label: 'Sales Tax Only',         description: 'You charge tax on sales only — no purchase recovery.', color: 'blue'   },
    purchase_sales_vat: { label: 'Purchase + Sales VAT',   description: 'Separate rates for sales and purchases, both recoverable.', color: 'purple' },
};

const REGISTRATION_TYPE_OPTIONS = [
    { value: 'vat',   label: 'VAT Number' },
    { value: 'pan',   label: 'PAN Number' },
    { value: 'gstin', label: 'GSTIN (India)' },
    { value: 'ein',   label: 'EIN (US)' },
    { value: 'sales_tax_permit', label: 'Sales Tax Permit' },
    { value: 'tan',   label: 'TAN' },
];

const PRODUCT_BEHAVIOR_OPTIONS = [
    { value: 'all_same',        label: 'Same tax applies to all products/services' },
    { value: 'some_exempt',     label: 'Some products/services are tax free' },
    { value: 'some_different',  label: 'Some products/services have different rates' },
];

const STEPS = [
    { title: 'Registration',  icon: <GlobalOutlined /> },
    { title: 'Sales Tax',     icon: <ShoppingOutlined /> },
    { title: 'Purchase Tax',  icon: <ShoppingCartOutlined /> },
    { title: 'Products',      icon: <ApartmentOutlined /> },
    { title: 'Review',        icon: <CheckCircleOutlined /> },
];

const yesNo = (v) => (v ? 'Yes' : 'No');
const rateLabel = (v) => (v != null ? `${v}%` : '—');

export default function TaxSettings({ auth }) {
    const [form]         = Form.useForm();
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [step, setStep]         = useState(0);
    const [countryOptions, setCountryOptions] = useState([]);
    const [values, setValues]     = useState({
        is_tax_registered:           false,
        registration_type:           'vat',
        tax_number:                  '',
        tax_registered_name:         '',
        country_code:                'NP',
        default_currency:            'NPR',
        registration_effective_date: null,
        sales_tax_enabled:           false,
        sales_tax_name:              'VAT',
        sales_tax_rate_percent:      13,
        sales_tax_account_id:        null,
        sales_tax_payable_account_id: null,
        purchase_tax_enabled:        false,
        purchase_tax_name:           'VAT',
        purchase_tax_rate_percent:   13,
        purchase_tax_recoverable:    true,
        purchase_tax_account_id:     null,
        product_tax_behavior:        'all_same',
        advanced_mode:               false,
        preset:                      'none',
        wizard_completed:            false,
    });
    const [advancedMode, setAdvancedMode] = useState(false);
    const [msgApi, contextHolder]         = message.useMessage();

    // Derived: presets to show for currently selected country
    const selectedCountry = values.country_code || 'NP';
    const selectedCountryMeta = countryOptions.find((c) => c.value === selectedCountry);
    const hasPreset = selectedCountryMeta?.has_preset;

    const availablePresets = [
        ...BASE_PRESETS,
        ...(hasPreset
            ? Object.entries(COUNTRY_PRESETS).map(([key, p]) => ({ key, ...p }))
            : []),
    ];

    // Load settings + country options
    useEffect(() => {
        Promise.all([
            axios.get(api('/api/tax-settings')),
            axios.get(api('/api/tax-country-options')),
        ])
            .then(([settingsRes, countriesRes]) => {
                const s = settingsRes.data?.data;
                if (s) {
                    setValues((prev) => ({ ...prev, ...s }));
                    setAdvancedMode(!!s.advanced_mode);
                    form.setFieldsValue(s);
                }
                setCountryOptions(countriesRes.data || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // When country changes, auto-fill currency and reset tax name/rate from preset
    const handleCountryChange = (code) => {
        const meta = countryOptions.find((c) => c.value === code);
        const updates = {
            country_code: code,
        };
        if (meta?.currency) updates.default_currency = meta.currency;
        if (meta?.tax_name)  updates.sales_tax_name   = meta.tax_name;
        if (meta?.tax_name)  updates.purchase_tax_name = meta.tax_name;
        if (meta?.default_rate != null) {
            updates.sales_tax_rate_percent    = meta.default_rate;
            updates.purchase_tax_rate_percent = meta.default_rate;
        }
        const next = { ...values, ...updates };
        setValues(next);
        form.setFieldsValue(next);
    };

    const applyPreset = (key) => {
        const meta = countryOptions.find((c) => c.value === selectedCountry);
        const updates = { preset: key };

        if (key === 'no_tax') {
            Object.assign(updates, { sales_tax_enabled: false, purchase_tax_enabled: false });
        } else if (key === 'standard_vat') {
            Object.assign(updates, {
                sales_tax_enabled: true, purchase_tax_enabled: true,
                sales_tax_name: meta?.tax_name || 'VAT',
                purchase_tax_name: meta?.tax_name || 'VAT',
                sales_tax_rate_percent: meta?.default_rate ?? 13,
                purchase_tax_rate_percent: meta?.default_rate ?? 13,
            });
        } else if (key === 'sales_tax_only') {
            Object.assign(updates, {
                sales_tax_enabled: true, purchase_tax_enabled: false,
                sales_tax_name: meta?.tax_name || 'VAT',
                sales_tax_rate_percent: meta?.default_rate ?? 13,
            });
        } else if (key === 'purchase_sales_vat') {
            Object.assign(updates, {
                sales_tax_enabled: true, purchase_tax_enabled: true,
                sales_tax_name: meta?.tax_name || 'VAT',
                purchase_tax_name: meta?.tax_name || 'VAT',
                sales_tax_rate_percent: meta?.default_rate ?? 13,
                purchase_tax_rate_percent: meta?.default_rate ?? 13,
                purchase_tax_recoverable: true,
            });
        }

        const next = { ...values, ...updates };
        setValues(next);
        form.setFieldsValue(next);
    };

    const validateStep = () => {
        if (step === 0) {
            const v = form.getFieldsValue();
            if (v.is_tax_registered && !v.tax_number) {
                msgApi.warning('Please enter your tax/VAT/PAN number.');
                return false;
            }
        }
        if (step === 1) {
            const v = form.getFieldsValue();
            if (v.sales_tax_enabled && (v.sales_tax_rate_percent == null || v.sales_tax_rate_percent === '')) {
                msgApi.warning('Please enter the default sales tax rate.');
                return false;
            }
        }
        if (step === 2) {
            const v = form.getFieldsValue();
            if (v.purchase_tax_enabled && (v.purchase_tax_rate_percent == null || v.purchase_tax_rate_percent === '')) {
                msgApi.warning('Please enter the default purchase tax rate.');
                return false;
            }
        }
        return true;
    };

    const next = () => {
        const current = form.getFieldsValue();
        setValues((prev) => ({ ...prev, ...current }));
        if (!validateStep()) return;
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const prev = () => setStep((s) => Math.max(s - 1, 0));

    const save = async () => {
        const current = form.getFieldsValue();
        const payload  = { ...values, ...current, wizard_completed: true };

        setSaving(true);
        try {
            await axios.put(api('/api/tax-settings'), payload);
            msgApi.success('Tax settings saved successfully.');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to save tax settings.';
            msgApi.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const toggleAdvanced = async () => {
        setSaving(true);
        try {
            const { data } = await axios.post(api('/api/tax-settings/toggle-advanced'));
            setAdvancedMode(!!data.advanced_mode);
            msgApi.success(data.advanced_mode ? 'Advanced mode enabled.' : 'Advanced mode disabled.');
        } catch {
            msgApi.error('Could not toggle advanced mode.');
        } finally {
            setSaving(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 0: return (
                <StepRegistration
                    form={form}
                    values={values}
                    countryOptions={countryOptions}
                    onCountryChange={handleCountryChange}
                />
            );
            case 1: return <StepSalesTax     form={form} values={values} />;
            case 2: return <StepPurchaseTax  form={form} values={values} />;
            case 3: return <StepProducts     form={form} values={values} />;
            case 4: return <StepReview       values={{ ...values, ...form.getFieldsValue() }} />;
            default: return null;
        }
    };

    return (
        <AuthenticatedLayout auth={auth}>
            {contextHolder}
            <Head title="Tax Settings" />

            <div style={{ padding: '24px 24px 48px', maxWidth: 860, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Tax Settings</Title>
                        <Text type="secondary">Configure how tax works in your business.</Text>
                    </div>
                    <Space>
                        <Button
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={toggleAdvanced}
                            loading={saving}
                        >
                            {advancedMode ? 'Disable Advanced Mode' : 'Enable Advanced Mode'}
                        </Button>
                        {advancedMode && (
                            <Button
                                size="small"
                                onClick={() => router.visit('/tax/advanced')}
                            >
                                Advanced Setup
                            </Button>
                        )}
                    </Space>
                </div>

                {/* Country hint */}
                {selectedCountryMeta && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={
                            <span>
                                Country: <strong>{selectedCountryMeta.label}</strong>
                                {selectedCountryMeta.tax_name && (
                                    <> — default tax: <strong>{selectedCountryMeta.tax_name} {selectedCountryMeta.default_rate}%</strong></>
                                )}
                                {!selectedCountryMeta.has_preset && (
                                    <> — <Text type="warning">No preset available. Rates will be set manually.</Text></>
                                )}
                            </span>
                        }
                    />
                )}

                {/* Preset picker */}
                <Card
                    title={<Text strong>Quick Start: Choose a preset</Text>}
                    size="small"
                    style={{ marginBottom: 24 }}
                >
                    <Row gutter={[10, 10]}>
                        {availablePresets.map((p) => {
                            const selected = values.preset === p.key;
                            return (
                                <Col key={p.key} xs={24} sm={12} md={8}>
                                    <Card
                                        size="small"
                                        hoverable
                                        onClick={() => applyPreset(p.key)}
                                        style={{
                                            borderColor: selected ? '#0369a1' : undefined,
                                            background: selected ? '#f0f9ff' : undefined,
                                            cursor: 'pointer',
                                            height: '100%',
                                        }}
                                    >
                                        <Space direction="vertical" size={2}>
                                            <Space>
                                                <Tag color={selected ? 'blue' : p.color}>{p.label}</Tag>
                                                {selected && <CheckCircleOutlined style={{ color: '#0369a1' }} />}
                                            </Space>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{p.description}</Text>
                                        </Space>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </Card>

                {/* Wizard */}
                <Card size="small">
                    <Steps
                        current={step}
                        size="small"
                        items={STEPS}
                        style={{ marginBottom: 28, padding: '8px 0' }}
                    />

                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={values}
                        size="middle"
                    >
                        {renderStep()}
                    </Form>

                    <Divider style={{ margin: '20px 0 16px' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={prev}
                            disabled={step === 0}
                        >
                            Back
                        </Button>

                        <Space>
                            {step < STEPS.length - 1 ? (
                                <Button type="primary" onClick={next} icon={<ArrowRightOutlined />} iconPosition="end">
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={saving}
                                    onClick={save}
                                >
                                    Save Tax Settings
                                </Button>
                            )}
                        </Space>
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}

// ── Step 1: Business Registration ─────────────────────────────────────────────
function StepRegistration({ form, values, countryOptions, onCountryChange }) {
    const isRegistered = Form.useWatch('is_tax_registered', form);
    const selectedCountry = Form.useWatch('country_code', form) || values.country_code;

    // Derive currency options from loaded country list
    const currencyOptions = countryOptions
        .filter((c) => c.currency)
        .reduce((acc, c) => {
            if (!acc.find((o) => o.value === c.currency)) {
                acc.push({ value: c.currency, label: `${c.currency} — ${c.label}` });
            }
            return acc;
        }, []);

    return (
        <div>
            <Title level={5} style={{ marginBottom: 2 }}>Is your business tax registered?</Title>
            <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
                A tax-registered business collects tax from customers on behalf of the government.
            </Paragraph>

            <Form.Item name="is_tax_registered" valuePropName="checked">
                <Switch
                    checkedChildren="Yes — we are tax registered"
                    unCheckedChildren="No — we are not registered"
                />
            </Form.Item>

            {isRegistered && (
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="registration_type"
                            label="Registration Type"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <Select options={REGISTRATION_TYPE_OPTIONS} placeholder="Select type" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="tax_number"
                            label="Tax / VAT / PAN Number"
                            rules={[{ required: true, message: 'Tax number is required when registered' }]}
                        >
                            <input
                                className="ant-input"
                                placeholder="e.g. 123456789"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="tax_registered_name" label="Tax Registered Business Name">
                            <input className="ant-input" placeholder="Legal name on tax certificate" style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="registration_effective_date" label="Effective Date">
                            <input type="date" className="ant-input" style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
            )}

            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item name="country_code" label="Country">
                        <Select
                            options={countryOptions.map((c) => ({
                                value: c.value,
                                label: `${c.label} (${c.value})`,
                            }))}
                            showSearch
                            filterOption={(input, option) =>
                                option.label.toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={onCountryChange}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item name="default_currency" label="Default Tax Currency">
                        <Select
                            options={currencyOptions}
                            showSearch
                            filterOption={(input, option) =>
                                option.label.toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                </Col>
            </Row>
        </div>
    );
}

// ── Step 2: Default Sales Tax ──────────────────────────────────────────────────
function StepSalesTax({ form }) {
    const enabled = Form.useWatch('sales_tax_enabled', form);

    return (
        <div>
            <Title level={5} style={{ marginBottom: 2 }}>Do you charge tax on sales?</Title>
            <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
                When enabled, tax will automatically appear on invoices, sales orders, and quotations.
            </Paragraph>

            <Form.Item name="sales_tax_enabled" valuePropName="checked">
                <Switch
                    checkedChildren="Yes — charge tax on sales"
                    unCheckedChildren="No — no tax on sales"
                />
            </Form.Item>

            {enabled && (
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="sales_tax_name"
                            label="Tax Name"
                            tooltip="Short name shown on invoices, e.g. VAT, GST"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <input className="ant-input" placeholder="e.g. VAT" style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="sales_tax_rate_percent"
                            label="Default Sales Tax Rate (%)"
                            rules={[
                                { required: true, message: 'Required' },
                                { type: 'number', min: 0, max: 100, message: 'Rate must be 0–100' },
                            ]}
                        >
                            <InputNumber
                                min={0}
                                max={100}
                                step={0.5}
                                suffix="%"
                                style={{ width: '100%' }}
                                placeholder="13"
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24}>
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                            message="Tax accounts are optional at setup time. You can link them later in Advanced Setup."
                        />
                    </Col>
                </Row>
            )}
        </div>
    );
}

// ── Step 3: Default Purchase Tax ──────────────────────────────────────────────
function StepPurchaseTax({ form }) {
    const enabled = Form.useWatch('purchase_tax_enabled', form);

    return (
        <div>
            <Title level={5} style={{ marginBottom: 2 }}>Do you pay tax on purchases?</Title>
            <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
                When enabled, tax on purchase bills can be tracked and reclaimed if your business is VAT/GST registered.
            </Paragraph>

            <Form.Item name="purchase_tax_enabled" valuePropName="checked">
                <Switch
                    checkedChildren="Yes — track tax on purchases"
                    unCheckedChildren="No — no purchase tax tracking"
                />
            </Form.Item>

            {enabled && (
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="purchase_tax_name"
                            label="Purchase Tax Name"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <input className="ant-input" placeholder="e.g. VAT" style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="purchase_tax_rate_percent"
                            label="Default Purchase Tax Rate (%)"
                            rules={[
                                { required: true, message: 'Required' },
                                { type: 'number', min: 0, max: 100, message: 'Rate must be 0–100' },
                            ]}
                        >
                            <InputNumber
                                min={0}
                                max={100}
                                step={0.5}
                                suffix="%"
                                style={{ width: '100%' }}
                                placeholder="13"
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="purchase_tax_recoverable"
                            label="Is purchase tax recoverable?"
                            tooltip="Recoverable means you can claim it back from the tax authority."
                            valuePropName="checked"
                        >
                            <Switch
                                checkedChildren="Yes — recoverable"
                                unCheckedChildren="No — not recoverable"
                            />
                        </Form.Item>
                    </Col>
                </Row>
            )}
        </div>
    );
}

// ── Step 4: Product Tax Behavior ──────────────────────────────────────────────
function StepProducts() {
    return (
        <div>
            <Title level={5} style={{ marginBottom: 2 }}>How does tax apply to your products and services?</Title>
            <Paragraph type="secondary" style={{ marginBottom: 20, fontSize: 13 }}>
                This helps us know whether to apply the same tax to everything or let you set exceptions per product.
            </Paragraph>

            <Form.Item name="product_tax_behavior">
                <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PRODUCT_BEHAVIOR_OPTIONS.map((o) => (
                        <Radio key={o.value} value={o.value}>
                            <Text>{o.label}</Text>
                        </Radio>
                    ))}
                </Radio.Group>
            </Form.Item>

            <Alert
                type="info"
                showIcon
                message='If you choose "Some products have different rates", you can set a tax type per product on the product form.'
                style={{ marginTop: 12 }}
            />
        </div>
    );
}

// ── Step 5: Review ─────────────────────────────────────────────────────────────
function StepReview({ values: v }) {
    const preset    = [...BASE_PRESETS, ...Object.entries(COUNTRY_PRESETS).map(([key, p]) => ({ key, ...p }))].find((p) => p.key === v.preset);
    const behavior  = PRODUCT_BEHAVIOR_OPTIONS.find((o) => o.value === v.product_tax_behavior);

    return (
        <div>
            <Title level={5} style={{ marginBottom: 16 }}>Review your tax setup</Title>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card size="small" title="Business Registration">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Tax Registered">
                                <Tag color={v.is_tax_registered ? 'green' : 'default'}>
                                    {yesNo(v.is_tax_registered)}
                                </Tag>
                            </Descriptions.Item>
                            {v.is_tax_registered && (
                                <>
                                    <Descriptions.Item label="Tax Number">{v.tax_number || '—'}</Descriptions.Item>
                                    <Descriptions.Item label="Registered Name">{v.tax_registered_name || '—'}</Descriptions.Item>
                                </>
                            )}
                            <Descriptions.Item label="Country">{v.country_code}</Descriptions.Item>
                            <Descriptions.Item label="Currency">{v.default_currency}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card size="small" title="Sales Tax">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Charge Tax on Sales">
                                <Tag color={v.sales_tax_enabled ? 'green' : 'default'}>
                                    {yesNo(v.sales_tax_enabled)}
                                </Tag>
                            </Descriptions.Item>
                            {v.sales_tax_enabled && (
                                <>
                                    <Descriptions.Item label="Tax Name">{v.sales_tax_name}</Descriptions.Item>
                                    <Descriptions.Item label="Default Rate">{rateLabel(v.sales_tax_rate_percent)}</Descriptions.Item>
                                </>
                            )}
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card size="small" title="Purchase Tax">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Track Tax on Purchases">
                                <Tag color={v.purchase_tax_enabled ? 'green' : 'default'}>
                                    {yesNo(v.purchase_tax_enabled)}
                                </Tag>
                            </Descriptions.Item>
                            {v.purchase_tax_enabled && (
                                <>
                                    <Descriptions.Item label="Tax Name">{v.purchase_tax_name}</Descriptions.Item>
                                    <Descriptions.Item label="Default Rate">{rateLabel(v.purchase_tax_rate_percent)}</Descriptions.Item>
                                    <Descriptions.Item label="Recoverable">
                                        <Tag color={v.purchase_tax_recoverable ? 'green' : 'orange'}>
                                            {yesNo(v.purchase_tax_recoverable)}
                                        </Tag>
                                    </Descriptions.Item>
                                </>
                            )}
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card size="small" title="Product Tax Behavior">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Behavior">{behavior?.label || '—'}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                {preset && preset.key !== 'none' && (
                    <Col xs={24}>
                        <Alert
                            type="success"
                            showIcon
                            message={`Preset: ${preset.label}`}
                            description={`Saving will automatically create the underlying tax records for "${preset.label}".`}
                        />
                    </Col>
                )}
            </Row>
        </div>
    );
}
