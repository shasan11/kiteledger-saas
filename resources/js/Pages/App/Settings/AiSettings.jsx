import { useEffect, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    Alert,
    AutoComplete,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    Typography,
    message as antMessage,
} from 'antd';
import { ApiOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

const FALLBACK_PROVIDERS = ['openai', 'groq', 'gemini', 'openrouter', 'ollama'];

const PROVIDER_LABELS = {
    openai: 'OpenAI',
    groq: 'Groq',
    gemini: 'Gemini',
    openrouter: 'OpenRouter',
    ollama: 'Ollama',
};

const PROVIDER_KEY_PLACEHOLDERS = {
    openai: 'Paste OpenAI provider key',
    groq: 'Paste Groq provider key',
    gemini: 'Paste Gemini provider key',
    openrouter: 'Paste OpenRouter provider key',
    ollama: 'Not required for local Ollama',
};

const SAFE_DEFAULTS = {
    ai_enabled: true,
    ai_provider: 'openai',
    ai_model: 'gpt-4o-mini',
    ai_base_url: 'https://api.openai.com/v1',
    ai_temperature: 0.2,
    ai_max_tokens: 500,
    ai_timeout_seconds: 180,
    ai_connect_timeout_seconds: 15,
    ai_stream_enabled: false,
    ai_cache_enabled: true,
    ai_cache_ttl: 600,
    ai_context_max_rows: 15,
    ai_context_max_chars: 5000,
    ai_fast_mode: true,
    ai_default_financial_date_scope: 'current_fiscal_year',
    ai_allow_developer_details: false,
    ai_financial_assistant_enabled: true,
    ai_document_assistant_enabled: true,
    ai_write_actions_enabled: true,
    ai_fallback_provider: '',
};

function hasAnyPermission(perms = [], required = []) {
    if (!Array.isArray(perms)) return false;
    return required.some((r) => perms.includes(r));
}

function extractApiError(err, fallback) {
    const data = err?.response?.data;
    if (data?.message) return data.message;

    if (data?.errors && typeof data.errors === 'object') {
        const first = Object.values(data.errors).flat().filter(Boolean)[0];
        if (first) return first;
    }

    return fallback;
}

export default function AiSettings() {
    const page = usePage();
    const permissions = page.props?.auth?.permissions || [];
    const canBypass = !!page.props?.auth?.canBypassPermissions;
    const canView = canBypass || hasAnyPermission(permissions, ['ai.settings.view', 'ai.manage']);
    const canManage = canBypass || hasAnyPermission(permissions, ['ai.manage', 'ai.settings.update']);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [form] = Form.useForm();
    const currentProvider = Form.useWatch('ai_provider', form) || data?.settings?.ai_provider || 'openai';

    const providers = useMemo(() => {
        const list = data?.supported_providers;
        return Array.isArray(list) && list.length ? list : FALLBACK_PROVIDERS;
    }, [data?.supported_providers]);

    const providerOptions = useMemo(() => providers.map((provider) => ({
        value: provider,
        label: PROVIDER_LABELS[provider] || provider,
    })), [providers]);

    const modelOptions = useMemo(() => {
        const models = data?.model_suggestions?.[currentProvider] || [];
        return models.map((model) => ({ value: model, label: model }));
    }, [currentProvider, data?.model_suggestions]);

    useEffect(() => {
        if (!canView) {
            setLoading(false);
            return;
        }

        let mounted = true;
        setLoading(true);

        axios.get('/api/ai/settings')
            .then((res) => {
                if (!mounted) return;
                setData(res.data);
                form.setFieldsValue({
                    ...SAFE_DEFAULTS,
                    ...res.data.settings,
                    ai_api_key: '',
                });
            })
            .catch((err) => {
                if (!mounted) return;
                setError(extractApiError(err, 'Failed to load AI settings.'));
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [canView, form]);

    const patchProviderDefaults = (provider) => {
        const base = data?.default_base_urls?.[provider];
        const models = data?.model_suggestions?.[provider] || [];
        const patch = {};

        if (base) patch.ai_base_url = base;
        if (models.length) patch.ai_model = models[0];

        form.setFieldsValue(patch);
        setTestResult(null);
    };

    const cleanPayload = (values) => {
        const payload = { ...values };

        if (!payload.ai_api_key || String(payload.ai_api_key).trim() === '') {
            delete payload.ai_api_key;
        }

        return payload;
    };

    const saveCurrentValues = async ({ showMessage = true } = {}) => {
        const values = await form.validateFields();
        const res = await axios.put('/api/ai/settings', cleanPayload(values));

        setData((prev) => ({
            ...(prev || {}),
            settings: res.data.settings,
        }));

        form.setFieldsValue({
            ...SAFE_DEFAULTS,
            ...res.data.settings,
            ai_api_key: '',
        });

        if (showMessage) antMessage.success('AI settings saved.');
        return res.data.settings;
    };

    const save = async () => {
        if (!canManage) return;

        try {
            setSaving(true);
            setTestResult(null);
            await saveCurrentValues();
        } catch (err) {
            if (err?.errorFields) return;
            antMessage.error(extractApiError(err, 'Failed to save AI settings.'));
        } finally {
            setSaving(false);
        }
    };

    const resetDefaults = () => {
        const provider = form.getFieldValue('ai_provider') || data?.settings?.ai_provider || 'openai';
        const model = data?.model_suggestions?.[provider]?.[0] || SAFE_DEFAULTS.ai_model;
        const baseUrl = data?.default_base_urls?.[provider] || SAFE_DEFAULTS.ai_base_url;

        form.setFieldsValue({
            ...SAFE_DEFAULTS,
            ai_provider: provider,
            ai_model: model,
            ai_base_url: baseUrl,
            ai_api_key: '',
        });

        setTestResult(null);
        antMessage.info('Recommended defaults loaded. Save to apply.');
    };

    const test = async () => {
        if (!canManage) return;

        try {
            setTesting(true);
            setSaving(true);
            setTestResult(null);

            await saveCurrentValues({ showMessage: false });
            const res = await axios.post('/api/ai/settings/test');

            setTestResult(res.data);
            antMessage.success(`Connection OK. Reply: ${res.data.response || 'OK'}`);
        } catch (err) {
            if (err?.errorFields) return;
            const response = err?.response?.data;
            setTestResult(response || { success: false, message: 'Connection failed.' });
            antMessage.error(extractApiError(err, 'Connection failed.'));
        } finally {
            setTesting(false);
            setSaving(false);
        }
    };

    if (!canView) {
        return (
            <div style={{ padding: 24 }}>
                <Head title="AI Settings" />
                <Alert
                    type="warning"
                    showIcon
                    message="You do not have permission to view AI Settings."
                    description="Required permission: ai.settings.view or ai.manage."
                />
            </div>
        );
    }

    return (
        <div>
            <Head title="AI Settings" />

            <div style={{ padding: 16 }}>
                {loading ? <Spin /> : error ? (
                    <Alert type="error" showIcon message={error} />
                ) : (
                    <Card size="small">
                        <Form
                            form={form}
                            layout="vertical"
                            disabled={!canManage}
                            onValuesChange={(changed) => {
                                if (changed.ai_provider) patchProviderDefaults(changed.ai_provider);
                                if (!changed.ai_provider) setTestResult(null);
                            }}
                        >
                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_enabled" label="Enable AI" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_stream_enabled" label="Enable Streaming" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_fast_mode" label="Fast Mode" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_provider" label="Provider" rules={[{ required: true, message: 'Provider is required' }]}>
                                        <Select options={providerOptions} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_model" label="Model" rules={[{ required: true, message: 'Model is required' }]}>
                                        <AutoComplete
                                            allowClear
                                            placeholder="Select or type model name"
                                            options={modelOptions}
                                            filterOption={(input, option) => (option?.value || '').toLowerCase().includes(input.toLowerCase())}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_base_url" label="Base URL" rules={[{ required: true, message: 'Base URL is required' }]}>
                                        <Input placeholder="https://api.openai.com/v1" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                label={
                                    <Space wrap>
                                        API Key
                                        {data?.settings?.ai_has_api_key && (
                                            <Tag color="green">Saved: {data.settings.ai_api_key_masked}</Tag>
                                        )}
                                        {currentProvider === 'ollama' && <Tag>Not required</Tag>}
                                    </Space>
                                }
                                name="ai_api_key"
                                extra="Leave blank to keep the existing saved key. Save & Test will save the current form first, then test the saved settings."
                            >
                                <Input.Password placeholder={PROVIDER_KEY_PLACEHOLDERS[currentProvider] || 'Provider key'} autoComplete="new-password" />
                            </Form.Item>

                            <Divider>Generation</Divider>
                            <Row gutter={16}>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_temperature" label="Temperature">
                                        <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_max_tokens" label="Max Tokens">
                                        <InputNumber min={50} max={32000} step={50} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_timeout_seconds" label="Timeout (s)" extra="Use 120–180s for cloud providers; local Ollama may need longer.">
                                        <InputNumber min={5} max={600} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_connect_timeout_seconds" label="Connect Timeout (s)">
                                        <InputNumber min={2} max={60} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider>Caching & Context</Divider>
                            <Row gutter={16}>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_cache_enabled" label="Enable Cache" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_cache_ttl" label="Cache TTL (s)">
                                        <InputNumber min={30} max={86400} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_context_max_rows" label="Maximum rows used in answers">
                                        <InputNumber min={1} max={500} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_context_max_chars" label="Maximum answer context size">
                                        <InputNumber min={500} max={200000} step={500} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider>Assistant Safety</Divider>
                            <Row gutter={16}>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_financial_assistant_enabled" label="Financial assistant" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_document_assistant_enabled" label="Document assistant" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_write_actions_enabled" label="Prepare write actions" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_allow_developer_details" label="Show developer details" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="ai_default_financial_date_scope" label="Default financial date range">
                                        <Select
                                            options={[
                                                { value: 'current_fiscal_year', label: 'Current fiscal year' },
                                                { value: 'this_month', label: 'This month' },
                                                { value: 'last_30_days', label: 'Last 30 days' },
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="ai_fallback_provider" label="Fallback provider">
                                        <Select
                                            options={[
                                                { value: '', label: 'None' },
                                                ...providerOptions,
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            {testResult && (
                                <Alert
                                    style={{ marginBottom: 16 }}
                                    type={testResult.success ? 'success' : 'error'}
                                    showIcon
                                    message={testResult.success ? 'Connection successful' : 'Connection failed'}
                                    description={testResult.success
                                        ? `${PROVIDER_LABELS[testResult.provider] || testResult.provider || 'Provider'} / ${testResult.model || 'model'} replied: ${testResult.response || 'OK'}`
                                        : `${testResult.code ? `${testResult.code}: ` : ''}${testResult.message || 'Please check provider, model, base URL and key.'}`}
                                />
                            )}

                            <Space wrap>
                                <Button type="primary" icon={<SaveOutlined />} loading={saving && !testing} onClick={save} disabled={!canManage}>
                                    Save
                                </Button>
                                <Button icon={<ApiOutlined />} loading={testing} onClick={test} disabled={!canManage}>
                                    Save & Test Connection
                                </Button>
                                <Button icon={<ReloadOutlined />} onClick={resetDefaults} disabled={!canManage}>
                                    Reset Recommended Defaults
                                </Button>
                                {!canManage && (
                                    <Text type="secondary">Read-only — you do not have permission to edit AI settings.</Text>
                                )}
                            </Space>
                        </Form>
                    </Card>
                )}
            </div>
        </div>
    );
}
