import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Typography,
  message,
  theme,
} from 'antd';
import { MailOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const { Text } = Typography;

const getErrorMessage = (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  const firstKey = Object.keys(data || {})[0];
  const firstValue = data?.[firstKey];
  if (Array.isArray(firstValue)) return firstValue[0];
  if (typeof firstValue === 'string') return firstValue;
  return fallback;
};

function EmailConfigContent() {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    axios
      .get(api('/api/hrm/email-configs'))
      .then(({ data }) => {
        if (!alive) return;
        setRecord(data || null);
        form.setFieldsValue({
          email_config_name: data?.email_config_name || 'Default SMTP',
          from_name: data?.from_name || '',
          from_address: data?.from_address || '',
          mailer: data?.mailer || 'smtp',
          email_host: data?.email_host || '',
          email_port: data?.email_port || 587,
          encryption: data?.encryption || 'tls',
          email_user: data?.email_user || '',
          email_pass: '',
          active: data?.active !== false,
        });
      })
      .catch((error) => message.error(getErrorMessage(error, 'Failed to load email configuration')))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [form]);

  const save = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payload = { ...values, active: values.active !== false };
      if (!payload.email_pass) delete payload.email_pass;
      Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));

      const request = record?.id
        ? axios.patch(api(`/api/hrm/email-configs/${record.id}`), payload)
        : axios.post(api('/api/hrm/email-configs'), payload);
      const { data } = await request;
      setRecord(data);
      form.setFieldValue('email_pass', '');
      message.success('Email configuration saved');
    } catch (error) {
      if (!error?.errorFields) {
        message.error(getErrorMessage(error, 'Failed to save email configuration'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: token.padding }}>
      <Card
        size="small"
        title={<><MailOutlined /> Email Configuration</>}
        extra={<Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save</Button>}
        loading={loading}
        styles={{ body: { padding: token.paddingLG } }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: token.margin }}
          message="This workspace uses one active email configuration."
          description="Leave the password blank while editing to keep the currently saved password."
        />

        <Form form={form} layout="vertical">
          <Text strong>Sender Details</Text>
          <Row gutter={12} style={{ marginTop: token.marginXS }}>
            <Col xs={24} md={8}><Form.Item name="email_config_name" label="Configuration Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="from_name" label="From Name"><Input placeholder="KiteLedger" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="from_address" label="From Email" rules={[{ type: 'email' }]}><Input placeholder="no-reply@example.com" /></Form.Item></Col>
          </Row>

          <Text strong>SMTP Server</Text>
          <Row gutter={12} style={{ marginTop: token.marginXS }}>
            <Col xs={24} md={6}><Form.Item name="mailer" label="Mailer"><Select options={[{ value: 'smtp', label: 'SMTP' }, { value: 'sendmail', label: 'Sendmail' }, { value: 'log', label: 'Log' }]} /></Form.Item></Col>
            <Col xs={24} md={10}><Form.Item name="email_host" label="Host" rules={[{ required: true }]}><Input placeholder="smtp.gmail.com" /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="email_port" label="Port" rules={[{ required: true }]}><InputNumber min={1} max={65535} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="encryption" label="Encryption"><Select allowClear options={[{ value: 'tls', label: 'TLS' }, { value: 'ssl', label: 'SSL' }, { value: 'none', label: 'None' }]} /></Form.Item></Col>
          </Row>

          <Text strong>Authentication</Text>
          <Row gutter={12} style={{ marginTop: token.marginXS }}>
            <Col xs={24} md={12}><Form.Item name="email_user" label="Username / Email" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="email_pass" label="Password" extra="Leave blank to keep existing password."><Input.Password autoComplete="new-password" /></Form.Item></Col>
          </Row>

          <Text strong>Security</Text>
          <Row gutter={12} style={{ marginTop: token.marginXS }}>
            <Col xs={24} md={8}><Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}

export default function EmailConfigs({ auth, embedded = false }) {
  const content = (
    <>
      <Head title="Email Config" />
      <EmailConfigContent />
    </>
  );

  if (embedded) return content;

  return (
    <AuthenticatedLayout auth={auth} user={auth?.user}>
      {content}
    </AuthenticatedLayout>
  );
}
