import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  CheckCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  StarOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { api, cleanPayload } from '../settingsApi.jsx';

const { Text } = Typography;

const providerOptions = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'sparrow_sms', label: 'Sparrow SMS' },
  { value: 'sms_global', label: 'SMS Global' },
  { value: 'message_bird', label: 'MessageBird' },
  { value: 'vonage', label: 'Vonage' },
  { value: 'custom_http', label: 'Custom HTTP' },
  { value: 'custom_post', label: 'Custom POST' },
  { value: 'custom_get', label: 'Custom GET' },
];

const moduleOptions = ['system', 'crm', 'sales', 'purchase', 'accounting', 'hrm', 'payroll', 'inventory', 'campaign'].map((value) => ({ value, label: value.toUpperCase() }));
const variables = ['contact_name', 'customer_name', 'supplier_name', 'company_name', 'invoice_no', 'bill_no', 'amount', 'due_date', 'payment_date', 'campaign_title', 'otp_code', 'employee_name', 'payroll_month'];
const getError = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || Object.values(error?.response?.data || {})?.[0]?.[0] || fallback;
const listFrom = (data) => (Array.isArray(data) ? data : data?.results || data?.data || []);
const segments = (text) => Math.max(1, Math.ceil(Math.max((text || '').length, 1) / 160));

function ConfigsTab() {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const provider = Form.useWatch('provider', form);

  const load = async () => {
    setLoading(true);
    try {
      const [configs, stats] = await Promise.all([
        axios.get(api('/api/sms-configs'), { params: { page_size: 100 } }),
        axios.get(api('/api/sms-configs/summary')),
      ]);
      setRows(listFrom(configs.data));
      setSummary(stats.data || {});
    } catch (error) {
      message.error(getError(error, 'Failed to load SMS configs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openForm = (record = null) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      name: record?.name || '',
      provider: record?.provider || 'custom_http',
      sender_id: record?.sender_id || '',
      api_base_url: record?.api_base_url || record?.base_url || '',
      api_key: '',
      api_secret: '',
      account_sid: record?.account_sid || '',
      username: record?.username || '',
      password: '',
      auth_token: '',
      from_number: record?.from_number || '',
      route: record?.route || '',
      country_code: record?.country_code || '',
      default_country_code: record?.default_country_code || '',
      webhook_url: record?.webhook_url || '',
      callback_url: record?.callback_url || '',
      test_phone: record?.test_phone || '',
      test_message: record?.test_message || 'KiteLedger SMS test message.',
      is_active: record?.is_active !== false,
      is_default: !!record?.is_default,
      method: record?.metadata?.method || (record?.provider === 'custom_get' ? 'GET' : 'POST'),
      headers: JSON.stringify(record?.metadata?.headers || {}, null, 2),
      payload: JSON.stringify(record?.metadata?.payload || {}, null, 2),
      phone_param: record?.metadata?.phone_param || 'to',
      message_param: record?.metadata?.message_param || 'message',
      sender_param: record?.metadata?.sender_param || 'sender',
    });
    setOpen(true);
  };

  const parseJson = (value, fallback) => {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const save = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const metadata = ['custom_http', 'custom_post', 'custom_get'].includes(values.provider)
        ? {
            method: values.method,
            headers: parseJson(values.headers, {}),
            payload: parseJson(values.payload, {}),
            phone_param: values.phone_param,
            message_param: values.message_param,
            sender_param: values.sender_param,
          }
        : undefined;
      const payload = cleanPayload({ ...values, metadata, active: values.is_active });
      ['api_key', 'api_secret', 'password', 'auth_token'].forEach((key) => { if (!payload[key]) delete payload[key]; });
      ['method', 'headers', 'payload', 'phone_param', 'message_param', 'sender_param'].forEach((key) => delete payload[key]);

      if (editing?.id) {
        await axios.patch(api(`/api/sms-configs/${editing.id}`), payload);
        message.success('SMS config updated');
      } else {
        await axios.post(api('/api/sms-configs'), payload);
        message.success('SMS config created');
      }
      setOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields) message.error(getError(error, 'Failed to save SMS config'));
    } finally {
      setSaving(false);
    }
  };

  const action = async (record, path, success) => {
    try {
      await axios.post(api(`/api/sms-configs/${record.id}/${path}`));
      message.success(success);
      await load();
    } catch (error) {
      message.error(getError(error, 'Action failed'));
    }
  };

  const runTest = async () => {
    try {
      const values = await testForm.validateFields();
      setTestResult(null);
      const { data } = await axios.post(api(`/api/sms-configs/${testConfig.id}/test`), values);
      setTestResult(data);
      message.success('Test SMS sent');
    } catch (error) {
      setTestResult(error?.response?.data || { success: false, error: getError(error, 'Test SMS failed') });
      if (!error?.errorFields) message.error(getError(error, 'Test SMS failed'));
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', render: (value) => <Text strong>{value}</Text> },
    { title: 'Provider', dataIndex: 'provider', render: (value) => <Tag>{value}</Tag> },
    { title: 'Sender ID', dataIndex: 'sender_id', render: (value, row) => value || row.from_number || '-' },
    { title: 'Default', dataIndex: 'is_default', width: 90, render: (value) => <Tag color={value ? 'gold' : 'default'}>{value ? 'Default' : 'No'}</Tag> },
    { title: 'Active', dataIndex: 'is_active', width: 90, render: (value, row) => <Tag color={(value ?? row.active) ? 'green' : 'default'}>{(value ?? row.active) ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Test Phone', dataIndex: 'test_phone', render: (value) => value || '-' },
    { title: 'Created Date', dataIndex: 'created_at', width: 170, render: (value) => value ? new Date(value).toLocaleString() : '-' },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 320,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(record)}>View</Button>
          <Button size="small" onClick={() => openForm(record)}>Edit</Button>
          <Button size="small" icon={<SendOutlined />} onClick={() => { setTestConfig(record); testForm.setFieldsValue({ phone: record.test_phone, message: record.test_message || 'KiteLedger SMS test message.' }); setTestResult(null); }}>Test</Button>
          {!record.is_default ? <Button size="small" icon={<StarOutlined />} onClick={() => action(record, 'set-default', 'Default SMS provider updated')} /> : null}
          {(record.is_active ?? record.active) ? <Button size="small" onClick={() => action(record, 'deactivate', 'SMS provider deactivated')}>Off</Button> : <Button size="small" icon={<CheckCircleOutlined />} onClick={() => action(record, 'activate', 'SMS provider activated')}>On</Button>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={12} style={{ marginBottom: token.margin }}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Total configs" value={summary.total_configs || 0} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Active configs" value={summary.active_configs || 0} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Default provider" value={summary.default_provider || '-'} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Failed SMS today" value={summary.failed_sms_today || 0} /></Card></Col>
      </Row>

      <Card size="small" title={<><MessageOutlined /> SMS Config</>} extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Add Provider</Button></Space>}>
        <Table rowKey="id" loading={loading} size="small" columns={columns} dataSource={rows} scroll={{ x: 1200 }} />
      </Card>

      <Drawer title={editing ? 'Edit SMS Provider' : 'New SMS Provider'} width="calc(100vw - 48px)" open={open} onClose={() => setOpen(false)} extra={<Space><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save</Button></Space>} destroyOnHidden>
        <Alert type="info" showIcon style={{ marginBottom: token.margin }} message="Sensitive credentials are masked after save. Leave secret fields blank to keep the existing value." />
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="provider" label="Provider" rules={[{ required: true }]}><Select options={providerOptions} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="sender_id" label="Sender ID"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="api_base_url" label="API Base URL" rules={['custom_http', 'custom_post', 'custom_get'].includes(provider) ? [{ required: true }] : []}><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="from_number" label="From Number"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="route" label="Route"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="account_sid" label="Account SID"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="api_key" label="API Key"><Input.Password autoComplete="new-password" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="api_secret" label="API Secret"><Input.Password autoComplete="new-password" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="auth_token" label="Auth Token"><Input.Password autoComplete="new-password" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="username" label="Username"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="password" label="Password"><Input.Password autoComplete="new-password" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="country_code" label="Country Code"><Input placeholder="+977" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="default_country_code" label="Default Country Code"><Input placeholder="+977" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="webhook_url" label="Webhook URL"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="callback_url" label="Callback URL"><Input /></Form.Item></Col>
            {['custom_http', 'custom_post', 'custom_get'].includes(provider) ? (
              <>
                <Col xs={24} md={6}><Form.Item name="method" label="Method"><Select options={[{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }]} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="phone_param" label="Phone Parameter"><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="message_param" label="Message Parameter"><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="sender_param" label="Sender Parameter"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="headers" label="Headers JSON"><Input.TextArea rows={5} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="payload" label="Payload JSON"><Input.TextArea rows={5} /></Form.Item></Col>
              </>
            ) : null}
            <Col xs={24} md={8}><Form.Item name="test_phone" label="Test Phone"><Input /></Form.Item></Col>
            <Col xs={24} md={16}><Form.Item name="test_message" label="Test Message"><Input.TextArea rows={2} maxLength={1600} showCount /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item name="is_default" label="Default" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
        </Form>
      </Drawer>

      <Drawer title="SMS Provider" width={620} open={!!viewing} onClose={() => setViewing(null)}>
        <Descriptions bordered size="small" column={1}>
          {viewing ? Object.entries(viewing).filter(([key]) => !key.includes('masked') && !key.startsWith('has_')).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}</Descriptions.Item>
          )) : null}
        </Descriptions>
      </Drawer>

      <Modal title="Send Test SMS" open={!!testConfig} onCancel={() => setTestConfig(null)} onOk={runTest} okText="Send Test SMS">
        <Form form={testForm} layout="vertical">
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true }]}><Input.TextArea rows={4} maxLength={1600} showCount /></Form.Item>
        </Form>
        {testResult ? <Alert type={testResult.success ? 'success' : 'error'} showIcon message={testResult.success ? 'SMS sent' : 'SMS failed'} description={<pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(testResult, null, 2)}</pre>} /> : null}
      </Modal>
    </>
  );
}

function TemplatesTab() {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form] = Form.useForm();
  const body = Form.useWatch('body', form) || '';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/sms-templates'), { params: { page_size: 100 } });
      setRows(listFrom(data));
    } catch (error) {
      message.error(getError(error, 'Failed to load SMS templates'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openForm = (record = null) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({ name: record?.name || '', code: record?.code || '', module: record?.module || 'system', body: record?.body || '', variables: (record?.variables || variables).join(', '), is_active: record?.is_active !== false });
    setPreview(null);
    setOpen(true);
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      const payload = cleanPayload({ ...values, active: values.is_active, variables: String(values.variables || '').split(',').map((x) => x.trim()).filter(Boolean) });
      if (editing?.id) {
        await axios.patch(api(`/api/sms-templates/${editing.id}`), payload);
      } else {
        await axios.post(api('/api/sms-templates'), payload);
      }
      message.success('SMS template saved');
      setOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields) message.error(getError(error, 'Failed to save SMS template'));
    }
  };

  const doPreview = async () => {
    const values = form.getFieldsValue();
    const sample = Object.fromEntries(variables.map((key) => [key, key.includes('amount') ? '1250.00' : key.includes('date') ? '2026-06-01' : key.replaceAll('_', ' ')]));
    const { data } = await axios.post(api('/api/sms/preview-template'), { body: values.body || '', data: sample });
    setPreview(data);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', render: (value) => <Text strong>{value}</Text> },
    { title: 'Code', dataIndex: 'code', render: (value) => <Text code>{value}</Text> },
    { title: 'Module', dataIndex: 'module', render: (value) => <Tag>{value || 'system'}</Tag> },
    { title: 'Body Preview', dataIndex: 'body', ellipsis: true },
    { title: 'Active', dataIndex: 'is_active', width: 90, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Created Date', dataIndex: 'created_at', width: 170, render: (value) => value ? new Date(value).toLocaleString() : '-' },
    { title: 'Actions', width: 90, render: (_, record) => <Button size="small" onClick={() => openForm(record)}>Edit</Button> },
  ];

  return (
    <>
      <Card size="small" title="SMS Templates" extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Add Template</Button></Space>}>
        <Table rowKey="id" loading={loading} size="small" columns={columns} dataSource={rows} scroll={{ x: 1000 }} />
      </Card>
      <Drawer title={editing ? 'Edit SMS Template' : 'New SMS Template'} open={open} onClose={() => setOpen(false)} width="calc(100vw - 48px)" extra={<Space><Button onClick={doPreview}>Preview</Button><Button type="primary" icon={<SaveOutlined />} onClick={save}>Save</Button></Space>} destroyOnHidden>
        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col xs={24} md={8}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={4}><Form.Item name="module" label="Module"><Select options={moduleOptions} /></Form.Item></Col>
                <Col xs={24} md={4}><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24}><Form.Item name="body" label={`Body (${body.length} chars, ${segments(body)} segments)`} rules={[{ required: true }]}><Input.TextArea rows={10} maxLength={1600} showCount /></Form.Item></Col>
                <Col xs={24}><Form.Item name="variables" label="Variables"><Input /></Form.Item></Col>
              </Row>
            </Form>
            {preview ? <Alert type="success" showIcon message={`${preview.characters} chars, ${preview.segments} segment(s)`} description={preview.body} /> : null}
          </Col>
          <Col xs={24} lg={8}>
            <Card size="small" title="Variables">
              <Space wrap>{variables.map((item) => <Tag key={item}>{`{{${item}}}`}</Tag>)}</Space>
            </Card>
          </Col>
        </Row>
      </Drawer>
    </>
  );
}

function LogsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/sms-logs'), { params: { page_size: 100, ...filters, search: filters.search } });
      setRows(listFrom(data));
    } catch (error) {
      message.error(getError(error, 'Failed to load SMS logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const retry = async (record) => {
    try {
      await axios.post(api(`/api/sms-logs/${record.id}/retry`));
      message.success('SMS retry queued');
      await load();
    } catch (error) {
      message.error(getError(error, 'Retry failed'));
    }
  };

  const columns = [
    { title: 'Date/time', dataIndex: 'created_at', width: 170, render: (value) => value ? new Date(value).toLocaleString() : '-' },
    { title: 'Recipient name', dataIndex: 'recipient_name' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Provider', dataIndex: 'provider', render: (value) => <Tag>{value || '-'}</Tag> },
    { title: 'Sender ID', dataIndex: 'sender_id' },
    { title: 'Module', dataIndex: 'module' },
    { title: 'Status', dataIndex: 'status', render: (value) => <Tag color={value === 'sent' ? 'green' : value === 'failed' ? 'red' : 'default'}>{value}</Tag> },
    { title: 'Message preview', dataIndex: 'message', ellipsis: true },
    { title: 'Error reason', dataIndex: 'error_message', ellipsis: true },
    { title: 'Sent at', dataIndex: 'sent_at', width: 170, render: (value) => value ? new Date(value).toLocaleString() : '-' },
    { title: 'Action', width: 160, fixed: 'right', render: (_, record) => <Space><Button size="small" onClick={() => setViewing(record)}>View</Button>{record.status === 'failed' ? <Button size="small" onClick={() => retry(record)}>Retry</Button> : null}</Space> },
  ];

  return (
    <>
      <Card size="small" title="SMS Logs" extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button><Button onClick={() => { window.location.href = api('/api/sms-logs/export'); }}>Export</Button></Space>}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search placeholder="Search phone or message" allowClear onSearch={(search) => setFilters((prev) => ({ ...prev, search }))} />
          <Select placeholder="Status" allowClear style={{ width: 150 }} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} options={['pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'skipped', 'cancelled'].map((value) => ({ value, label: value }))} />
          <Select placeholder="Provider" allowClear style={{ width: 180 }} onChange={(provider) => setFilters((prev) => ({ ...prev, provider }))} options={providerOptions} />
          <Button onClick={load}>Apply</Button>
        </Space>
        <Table rowKey="id" loading={loading} size="small" columns={columns} dataSource={rows} scroll={{ x: 1500 }} />
      </Card>
      <Drawer title="SMS Log" width={720} open={!!viewing} onClose={() => setViewing(null)}>
        {viewing ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Phone">{viewing.phone}</Descriptions.Item>
            <Descriptions.Item label="Normalized phone">{viewing.normalized_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Message">{viewing.message}</Descriptions.Item>
            <Descriptions.Item label="Segments">{viewing.segment_count}</Descriptions.Item>
            <Descriptions.Item label="Provider">{viewing.provider}</Descriptions.Item>
            <Descriptions.Item label="Provider message ID">{viewing.provider_message_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="Error code">{viewing.error_code || '-'}</Descriptions.Item>
            <Descriptions.Item label="Error message">{viewing.error_message || '-'}</Descriptions.Item>
            <Descriptions.Item label="Provider response"><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(viewing.provider_response || {}, null, 2)}</pre></Descriptions.Item>
            <Descriptions.Item label="Timeline">{['queued_at', 'sent_at', 'delivered_at', 'failed_at', 'bounced_at'].map((key) => `${key}: ${viewing[key] || '-'}`).join('\n')}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </>
  );
}

function SmsConfigContent() {
  const { token } = theme.useToken();
  const items = useMemo(() => [
    { key: 'configs', label: 'SMS Config', children: <ConfigsTab /> },
    { key: 'templates', label: 'SMS Templates', children: <TemplatesTab /> },
    { key: 'logs', label: 'SMS Logs', children: <LogsTab /> },
  ], []);

  return (
    <div style={{ padding: token.padding }}>
      <Tabs items={items} />
    </div>
  );
}

export default function SmsConfig({ auth, embedded = false }) {
  const content = (
    <>
      <Head title="SMS Configuration" />
      <SmsConfigContent />
    </>
  );

  if (embedded) return content;

  return (
    <AuthenticatedLayout auth={auth} user={auth?.user}>
      {content}
    </AuthenticatedLayout>
  );
}
