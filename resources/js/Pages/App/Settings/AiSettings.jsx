import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage } from '@inertiajs/react';
import {
    Alert, AutoComplete, Button, Card, Col, Divider, Form, Input, InputNumber, Row, Select,
    Space, Spin, Switch, Tag, Typography, message as antMessage, theme,
} from 'antd';
import { ApiOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const PROVIDERS = ['openai', 'groq', 'gemini', 'ollama'];

function hasAnyPermission(perms = [], required = []) {
    if (!Array.isArray(perms)) return false;
    return required.some((r) => perms.includes(r));
}

export default function AiSettings() {
    const { token } = theme.useToken();
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
    const [form] = Form.useForm();

    useEffect(() => {
        if (!canView) {
            setLoading(false);
            return;
        }
        axios.get('/api/ai/settings')
            .then((res) => {
                setData(res.data);
                form.setFieldsValue({
                    ...res.data.settings,
                    ai_api_key: '', // never prefill key
                });
            })
            .catch((err) => setError(err.response?.data?.message || 'Failed to load AI settings.'))
            .finally(() => setLoading(false));
    }, [canView]);

    const onProviderChange = (provider) => {
        const base = data?.default_base_urls?.[provider];
        const models = data?.model_suggestions?.[provider] || [];
        const patch = {};
        if (base) patch.ai_base_url = base;
        if (models.length) patch.ai_model = models[0];
        form.setFieldsValue(patch);
    };

    const save = async () => {
        if (!canManage) return;
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = { ...values };
            if (!payload.ai_api_key) delete payload.ai_api_key;
            const res = await axios.put('/api/ai/settings', payload);
            setData((prev) => ({ ...prev, settings: res.data.settings }));
            form.setFieldsValue({ ...res.data.settings, ai_api_key: '' });
            antMessage.success('AI settings saved.');
        } catch (err) {
            if (err?.errorFields) return;
            antMessage.error(err.response?.data?.message || 'Failed to save AI settings.');
        } finally {
            setSaving(false);
        }
    };

    const test = async () => {
        setTesting(true);
        try {
            const res = await axios.post('/api/ai/settings/test');
            if (res.data?.success) {
                antMessage.success(`Connection OK. Reply: ${res.data.response || 'OK'}`);
            } else {
                antMessage.error(res.data?.message || 'Connection failed.');
            }
        } catch (err) {
            antMessage.error(err.response?.data?.message || 'Connection failed.');
        } finally {
            setTesting(false);
        }
    };

    if (!canView) {
        return (
            <AuthenticatedLayout header={<Title level={5} style={{ margin: 0 }}>AI Settings</Title>}>
                <Head title="AI Settings" />
                <div style={{ padding: 24 }}>
                    <Alert
                        type="warning"
                        showIcon
                        message="You do not have permission to view AI Settings."
                        description="Required permission: ai.settings.view or ai.manage."
                    />
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <Space>
                    <ThunderboltOutlined style={{ color: token.colorPrimary }} />
                    <Title level={5} style={{ margin: 0 }}>AI Settings</Title>
                </Space>
            }
        >
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
                                if (changed.ai_provider) onProviderChange(changed.ai_provider);
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
                                    <Form.Item name="ai_provider" label="Provider" rules={[{ required: true }]}>
                                        <Select options={PROVIDERS.map((p) => ({ value: p, label: p }))} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_model" label="Model" rules={[{ required: true, message: 'Model is required' }]}>
                                        <AutoComplete
                                            allowClear
                                            placeholder="gpt-4o-mini"
                                            options={(data?.model_suggestions?.[form.getFieldValue('ai_provider')] || []).map((m) => ({ value: m, label: m }))}
                                            filterOption={(input, option) => (option?.value || '').toLowerCase().includes(input.toLowerCase())}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ai_base_url" label="Base URL">
                                        <Input placeholder="https://api.openai.com/v1" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                label={
                                    <Space>
                                        API Key
                                        {data?.settings?.ai_has_api_key && (
                                            <Tag color="green">{data.settings.ai_api_key_masked}</Tag>
                                        )}
                                    </Space>
                                }
                                name="ai_api_key"
                                extra="Leave blank to keep the existing key. Stored encrypted in the database."
                            >
                                <Input.Password placeholder="sk-..." autoComplete="new-password" />
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
                                    <Form.Item name="ai_timeout_seconds" label="Timeout (s)">
                                        <InputNumber min={5} max={300} style={{ width: '100%' }} />
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
                                    <Form.Item name="ai_context_max_rows" label="Context Max Rows">
                                        <InputNumber min={1} max={500} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    <Form.Item name="ai_context_max_chars" label="Context Max Chars">
                                        <InputNumber min={500} max={200000} step={500} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Space>
                                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save} disabled={!canManage}>
                                    Save
                                </Button>
                                <Button icon={<ApiOutlined />} loading={testing} onClick={test} disabled={!canManage}>
                                    Test Connection
                                </Button>
                                {!canManage && (
                                    <Text type="secondary">You do not have permission to edit AI settings.</Text>
                                )}
                            </Space>
                        </Form>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
