import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Form,
    Input,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Typography,
    message,
} from 'antd';
import { ApiOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

const DEFAULTS = {
    media_disk: 'public',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_default_region: '',
    aws_bucket: '',
    aws_url: '',
    aws_endpoint: '',
    aws_use_path_style_endpoint: false,
    aws_media_prefix: '',
    aws_visibility: 'public',
};

export default function StorageSettings() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState(null);
    const driver = Form.useWatch('media_disk', form) || 'public';

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        axios.get('/api/settings/storage')
            .then(({ data }) => {
                if (!mounted) return;
                form.setFieldsValue({ ...DEFAULTS, ...data });
            })
            .catch(() => message.error('Failed to load storage settings.'))
            .finally(() => mounted && setLoading(false));

        return () => {
            mounted = false;
        };
    }, [form]);

    const payload = (values) => ({
        ...values,
        media_disk: values.media_disk || 'public',
        aws_use_path_style_endpoint: !!values.aws_use_path_style_endpoint,
    });

    const save = async () => {
        const values = await form.validateFields();
        setSaving(true);
        setResult(null);

        try {
            const { data } = await axios.put('/api/settings/storage', payload(values));
            form.setFieldsValue({ ...DEFAULTS, ...data });
            message.success('Storage settings saved.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to save storage settings.');
        } finally {
            setSaving(false);
        }
    };

    const test = async () => {
        const values = await form.validateFields();
        setTesting(true);
        setResult(null);

        try {
            const { data } = await axios.post('/api/settings/storage/test', payload(values));
            setResult(data);
            message.success(data.message || 'AWS storage connection successful.');
            form.setFieldsValue((await axios.get('/api/settings/storage')).data);
        } catch (error) {
            const data = error?.response?.data || {};
            setResult({ success: false, message: data.message || 'AWS storage connection failed. Please check credentials, region, and bucket.' });
            message.error(data.message || 'AWS storage connection failed.');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return <div style={{ padding: 16 }}><Spin /></div>;
    }

    return (
        <div style={{ padding: 16 }}>
            <Card size="small" title="Storage Settings">
                <Form form={form} layout="vertical" initialValues={DEFAULTS}>
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message="Changing storage only affects new uploads. Existing files remain in their current location unless migrated."
                    />

                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item name="media_disk" label="Storage Driver" rules={[{ required: true }]}>
                                <Select
                                    options={[
                                        { value: 'public', label: 'Local/Public Storage' },
                                        { value: 's3', label: 'AWS S3' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="aws_visibility" label="Visibility">
                                <Select
                                    disabled={driver !== 's3'}
                                    options={[
                                        { value: 'public', label: 'public' },
                                        { value: 'private', label: 'private' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    {driver === 's3' && (
                        <>
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="aws_access_key_id" label="AWS Access Key ID" extra="Leave masked value unchanged to keep the saved credential.">
                                        <Input.Password autoComplete="new-password" placeholder="AWS access key ID" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="aws_secret_access_key" label="AWS Secret Access Key" extra="Secret values are never returned by the API.">
                                        <Input.Password autoComplete="new-password" placeholder="AWS secret access key" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="aws_default_region" label="AWS Default Region" rules={[{ required: true, message: 'Region is required for S3.' }]}>
                                        <Input placeholder="us-east-1" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="aws_bucket" label="AWS Bucket" rules={[{ required: true, message: 'Bucket is required for S3.' }]}>
                                        <Input placeholder="my-bucket" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="aws_media_prefix" label="AWS Media Prefix / Root Folder">
                                        <Input placeholder="media" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="aws_url" label="AWS URL">
                                        <Input placeholder="https://cdn.example.com" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="aws_endpoint" label="AWS Endpoint">
                                        <Input placeholder="https://s3.amazonaws.com" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="aws_use_path_style_endpoint" label="AWS Use Path Style Endpoint" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </>
                    )}

                    {result && (
                        <Alert
                            style={{ marginBottom: 16 }}
                            type={result.success ? 'success' : 'error'}
                            showIcon
                            message={result.message}
                        />
                    )}

                    <Space wrap>
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
                            Save
                        </Button>
                        <Button icon={<ApiOutlined />} loading={testing} disabled={driver !== 's3'} onClick={test}>
                            Test Connection
                        </Button>
                        {driver !== 's3' && <Text type="secondary">AWS fields are available when AWS S3 is selected.</Text>}
                    </Space>
                </Form>
            </Card>
        </div>
    );
}
