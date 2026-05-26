import { CheckCircleOutlined, CloseCircleOutlined, RobotOutlined } from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Slider,
    Space,
    Switch,
    Typography,
    message,
    theme,
} from 'antd';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;

const PROVIDERS = [
    { value: 'openai',      label: 'OpenAI' },
    { value: 'openrouter',  label: 'OpenRouter' },
    { value: 'gemini',      label: 'Google Gemini' },
    { value: 'anthropic',   label: 'Anthropic' },
    { value: 'deepseek',    label: 'DeepSeek' },
    { value: 'ollama',      label: 'Ollama (Local)' },
];

const MODULE_LABELS = {
    global_command:     'Global Command Center',
    transaction_review: 'Transaction Review',
    invoice_assistant:  'Invoice Assistant',
    report_explainer:   'Report Explainer',
    accounting_copilot: 'Accounting Copilot',
    crm_assistant:      'CRM Follow-up Assistant',
    payment_collection: 'Payment Collection Assistant',
    inventory_insights: 'Inventory Insights',
};

export default function AiSettingsForm({ onSaved }) {
    const { token } = theme.useToken();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [settings, setSettings] = useState(null);
    const [apiKeyChanged, setApiKeyChanged] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        axios
            .get('/api/ai/settings')
            .then(({ data }) => {
                setSettings(data);
                form.setFieldsValue({
                    enabled:             data.enabled,
                    provider:            data.provider,
                    model:               data.model,
                    fallback_provider:   data.fallback_provider,
                    fallback_model:      data.fallback_model,
                    base_url:            data.base_url,
                    temperature:         data.temperature ?? 0.2,
                    max_tokens:          data.max_tokens ?? 1200,
                    daily_request_limit: data.daily_request_limit,
                    monthly_token_limit: data.monthly_token_limit,
                    safety_mode:         data.safety_mode ?? 'strict',
                    log_prompts:         data.log_prompts ?? true,
                    log_responses:       data.log_responses ?? true,
                    enabled_modules:     Object.keys(data.enabled_modules ?? {}).filter(
                        (k) => data.enabled_modules[k]
                    ),
                });
            })
            .catch(() => message.error('Failed to load AI settings.'))
            .finally(() => setLoading(false));
    }, [form]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (values) => {
        setSaving(true);

        const payload = { ...values };

        // Convert enabled_modules array back to object
        const allModules = Object.keys(MODULE_LABELS);
        const enabledArr = values.enabled_modules || [];
        payload.enabled_modules = Object.fromEntries(
            allModules.map((k) => [k, enabledArr.includes(k)])
        );

        // Only send api_key if user typed a new one
        if (!apiKeyChanged) {
            delete payload.api_key;
        }

        try {
            const { data } = await axios.put('/api/ai/settings', payload);
            setSettings(data.settings);
            setApiKeyChanged(false);
            message.success('AI settings saved.');
            onSaved?.();
        } catch (err) {
            const msg = err.response?.data?.message ?? 'Failed to save settings.';
            message.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const { data } = await axios.post('/api/ai/settings/test-connection');
            setTestResult(data);
        } catch (err) {
            setTestResult({ success: false, error: err.response?.data?.message ?? 'Connection failed.' });
        } finally {
            setTesting(false);
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            disabled={loading}
        >
            <Card
                size="small"
                title={
                    <Space>
                        <RobotOutlined style={{ color: token.colorPrimary }} />
                        <span>AI Settings</span>
                    </Space>
                }
                style={{ marginBottom: 16 }}
            >
                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="enabled" label="Enable AI" valuePropName="checked">
                            <Switch checkedChildren="On" unCheckedChildren="Off" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="safety_mode" label="Safety Mode">
                            <Select options={[
                                { value: 'strict',     label: 'Strict (Recommended)' },
                                { value: 'permissive', label: 'Permissive' },
                            ]} />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '8px 0' }}>Provider Configuration</Divider>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
                            <Select options={PROVIDERS} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="model" label="Model">
                            <Input placeholder="gpt-4o-mini, gemini-1.5-flash, claude-sonnet-4-6…" />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item
                            label={
                                settings?.has_api_key
                                    ? `API Key (current: ${settings.api_key_masked})`
                                    : 'API Key'
                            }
                        >
                            <Input.Password
                                placeholder={settings?.has_api_key ? 'Enter new key to replace existing' : 'Enter API key'}
                                onChange={() => setApiKeyChanged(true)}
                                onBlur={(e) => form.setFieldValue('api_key', e.target.value)}
                                autoComplete="new-password"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="base_url" label="Base URL (optional — for custom endpoints / OpenRouter)">
                            <Input placeholder="https://api.openai.com/v1" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '8px 0' }}>Fallback Provider</Divider>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="fallback_provider" label="Fallback Provider">
                            <Select options={[{ value: null, label: '— None —' }, ...PROVIDERS]} allowClear />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="fallback_model" label="Fallback Model">
                            <Input placeholder="gpt-3.5-turbo" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '8px 0' }}>Generation Parameters</Divider>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="temperature" label="Temperature">
                            <Slider min={0} max={2} step={0.05} tooltip={{ formatter: (v) => v?.toFixed(2) }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="max_tokens" label="Max Tokens">
                            <InputNumber min={100} max={32000} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '8px 0' }}>Usage Limits</Divider>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="daily_request_limit" label="Daily Request Limit (blank = unlimited)">
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="monthly_token_limit" label="Monthly Token Limit (blank = unlimited)">
                            <InputNumber min={1000} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '8px 0' }}>Logging</Divider>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="log_prompts" label="Log Prompts" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="log_responses" label="Log Responses" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card size="small" title="AI Feature Modules" style={{ marginBottom: 16 }}>
                <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                    Enable individual AI features. AI must also be globally enabled above.
                </Paragraph>
                <Form.Item name="enabled_modules">
                    <Checkbox.Group style={{ width: '100%' }}>
                        <Row gutter={[8, 8]}>
                            {Object.entries(MODULE_LABELS).map(([key, label]) => (
                                <Col xs={24} sm={12} key={key}>
                                    <Checkbox value={key}>{label}</Checkbox>
                                </Col>
                            ))}
                        </Row>
                    </Checkbox.Group>
                </Form.Item>
            </Card>

            {testResult && (
                <Alert
                    type={testResult.success ? 'success' : 'error'}
                    icon={testResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    message={testResult.success ? `Connection OK (${testResult.provider}/${testResult.model})` : testResult.error}
                    showIcon
                    style={{ marginBottom: 12 }}
                />
            )}

            <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                    Save Settings
                </Button>
                <Button onClick={handleTest} loading={testing}>
                    Test Connection
                </Button>
            </Space>
        </Form>
    );
}
