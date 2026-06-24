import { useEffect, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    Alert,
    AutoComplete,
    Button,
    Card,
    Col,
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
    ai_temperature: 0.1,
    ai_max_tokens: 900,
    ai_timeout_seconds: 180,
    ai_connect_timeout_seconds: 15,
    ai_stream_enabled: false,
    ai_cache_enabled: true,
    ai_cache_ttl: 600,
    ai_context_max_rows: 15,
    ai_context_max_chars: 5000,
    ai_fast_mode: false,
    ai_default_financial_date_scope: 'current_fiscal_year',
    ai_allow_developer_details: false,
    ai_financial_assistant_enabled: false,
    ai_document_assistant_enabled: false,
    ai_write_actions_enabled: false,
    ai_assistant_mode: 'full',
    ai_fallback_provider: '',
};

function hasAnyPermission(perms = [], required = []) {
    if (!Array.isArray(perms)) return false;
    return required.some((permission) => perms.includes(permission));
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
            return undefined;
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
                    ai_context_max_rows: Math.min(50, res.data.settings?.ai_context_max_rows || SAFE_DEFAULTS.ai_context_max_rows),
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
        const payload = {
            ...SAFE_DEFAULTS,
            ...values,
            ai_temperature: 0.1,
            ai_stream_enabled: false,
            ai_fast_mode: false,
            ai_context_max_chars: 5000,
            ai_financial_assistant_enabled: false,
            ai_document_assistant_enabled: false,
            ai_write_actions_enabled: false,
            ai_assistant_mode: 'full',
            ai_allow_developer_details: false,
            ai_fallback_provider: '',
        };

        if (!payload.ai_api_key || String(payload.ai_api_key).trim() === '') {
            delete payload.ai_api_key;
        }

        payload.ai_context_max_rows = Math.min(50, Number(payload.ai_context_max_rows || 15));

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
            ai_context_max_rows: Math.min(50, res.data.settings?.ai_context_max_rows || SAFE_DEFAULTS.ai_context_max_rows),
        });

        if (showMessage) antMessage.success('AI report summarizer settings saved.');
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
        antMessage.info('Recommended report summarizer defaults loaded. Save to apply.');
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
                    <Card size="small" title="AI Report Summarizer">
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
                                    <Form.Item name="ai_enabled" label="Enable Report Summarizer" valuePropName="checked">
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
                                label={(
                                    <Space wrap>
                                        API Key
                                        {data?.settings?.ai_has_api_key && (
                                            <Tag color="green">Saved: {data.settings.ai_api_key_masked}</Tag>
                                        )}
                                        {currentProvider === 'ollama' && <Tag>Not required</Tag>}
                                    </Space>
                                )}
                                name="ai_api_key"
                                extra="Leave blank to keep the existing saved key. Save & Test saves the form first, then tests the saved settings."
                            >
                                <Input.Password placeholder={PROVIDER_KEY_PLACEHOLDERS[currentProvider] || 'Provider key'} autoComplete="new-password" />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_max_tokens" label="Max Tokens">
                                        <InputNumber min={50} max={1200} step={50} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_timeout_seconds" label="Timeout (s)">
                                        <InputNumber min={5} max={600} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_context_max_rows" label="Max Report Rows for Summary">
                                        <InputNumber min={1} max={50} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_cache_enabled" label="Enable Cache" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_cache_ttl" label="Cache TTL (s)">
                                        <InputNumber min={30} max={86400} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_connect_timeout_seconds" label="Connect Timeout (s)">
                                        <InputNumber min={2} max={60} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        name="ai_assistant_mode"
                                        label="Assistant Mode"
                                        tooltip="Full = complete ERP agent (search, exact numbers, action proposals). Reports only = restrict chat to report Q&A."
                                    >
                                        <Select
                                            options={[
                                                { value: 'full', label: 'Full ERP assistant (recommended)' },
                                                { value: 'reports_only', label: 'Reports only (read-only Q&A)' },
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        name="ai_write_actions_enabled"
                                        label="Allow AI to prepare create/update drafts"
                                        valuePropName="checked"
                                        tooltip="When off, the assistant can only read and summarize. When on, it can prepare drafts that still require explicit human approval before anything is written."
                                    >
                                        <Switch />
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
                                    <Text type="secondary">Read-only - you do not have permission to edit AI settings.</Text>
                                )}
                            </Space>
                        </Form>
                    </Card>
                )}
            </div>
        </div>
    );
}
