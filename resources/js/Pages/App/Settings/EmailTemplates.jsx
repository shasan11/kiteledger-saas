import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button, Card, Col, Drawer, Form, Input, Row, Select, Space, Switch, Table, Tag, Typography, message, theme } from 'antd';
import { EditOutlined, MailOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { api, cleanPayload } from './settingsApi.jsx';
import { TemplatePlaceholderPanel, sanitizeTemplateHtml } from './TemplatePlaceholders.jsx';

const { Text } = Typography;

const moduleOptions = ['sales', 'purchase', 'accounting', 'hrm', 'crm', 'inventory', 'system'].map((value) => ({ value, label: value.toUpperCase() }));
const getError = (error, fallback) => error?.response?.data?.message || Object.values(error?.response?.data || {})?.[0]?.[0] || fallback;

export default function EmailTemplates() {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const body = Form.useWatch('body', form);
  const selectedModule = Form.useWatch('module', form);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/email-templates'), { params: { page_size: 100 } });
      setRows(Array.isArray(data) ? data : data?.results || data?.data || []);
    } catch (error) {
      message.error(getError(error, 'Failed to load email templates'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openForm = (record = null) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      module: record?.module || 'system',
      template_key: record?.template_key || '',
      name: record?.name || record?.title || '',
      subject: record?.subject || '',
      preheader: record?.preheader || '',
      body: record?.body || '',
      plain_text_body: record?.plain_text_body || '',
      description: record?.description || '',
      active: record?.active !== false,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payload = cleanPayload({
        module: values.module,
        template_key: values.template_key,
        subject: values.subject,
        body: sanitizeTemplateHtml(values.body),
        variables: [],
        active: values.active !== false,
      });

      if (editing?.id) {
        await axios.patch(api(`/api/email-templates/${editing.id}`), payload);
        message.success('Email template updated');
      } else {
        await axios.post(api('/api/email-templates'), payload);
        message.success('Email template created');
      }

      setOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields) message.error(getError(error, 'Failed to save email template'));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { title: 'Template Name', dataIndex: 'subject', key: 'subject', render: (value) => <Text strong>{value || '-'}</Text> },
    { title: 'Template Key', dataIndex: 'template_key', key: 'template_key', render: (value) => <Text code>{value}</Text> },
    { title: 'Module', dataIndex: 'module', key: 'module', render: (value) => <Tag>{value || 'system'}</Tag> },
    { title: 'Subject', dataIndex: 'subject', key: 'subject' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 90, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Updated At', dataIndex: 'updated_at', key: 'updated_at', width: 170, render: (value) => value ? new Date(value).toLocaleString() : '-' },
    { title: 'Actions', key: 'actions', width: 90, render: (_, record) => <Button size="small" icon={<EditOutlined />} onClick={() => openForm(record)}>Edit</Button> },
  ], []);

  return (
    <div style={{ padding: token.padding }}>
      <Head title="Email Templates" />
      <Card
        size="small"
        title={<><MailOutlined /> Email Templates</>}
        extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Add Template</Button></Space>}
      >
        <Table rowKey="id" size="middle" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} />
      </Card>

      <Drawer
        title={editing ? 'Edit Email Template' : 'New Email Template'}
        open={open}
        onClose={() => setOpen(false)}
        width="calc(100vw - 48px)"
        destroyOnHidden
        extra={<Space><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save</Button></Space>}
      >
        <Row gutter={16}>
          <Col xs={24} lg={15}>
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col xs={24} md={8}><Form.Item name="template_key" label="Template Key" rules={[{ required: true }]}><Input placeholder="invoice.created" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="module" label="Module" rules={[{ required: true }]}><Select options={moduleOptions} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24}><Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input placeholder="Invoice {{invoice_no}} from {{company_name}}" /></Form.Item></Col>
                <Col xs={24}><Form.Item name="preheader" label="Email Preheader"><Input /></Form.Item></Col>
                <Col xs={24}><Form.Item name="body" label="HTML Body" rules={[{ required: true }]}><Input.TextArea rows={16} style={{ fontFamily: 'monospace' }} /></Form.Item></Col>
                <Col xs={24}><Form.Item name="plain_text_body" label="Plain Text Body"><Input.TextArea rows={5} /></Form.Item></Col>
                <Col xs={24}><Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item></Col>
              </Row>
            </Form>
            <Card size="small" title="Preview" style={{ marginTop: token.margin }}>
              <iframe title="Email preview" sandbox="" srcDoc={sanitizeTemplateHtml(body || '')} style={{ width: '100%', minHeight: 260, border: `1px solid ${token.colorBorderSecondary}` }} />
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <TemplatePlaceholderPanel documentType={selectedModule} />
          </Col>
        </Row>
      </Drawer>
    </div>
  );
}
