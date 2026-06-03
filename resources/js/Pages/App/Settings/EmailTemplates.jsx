import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button, Card, Col, Drawer, Form, Input, Row, Space, Table, Tag, Typography, message, theme } from 'antd';
import { EditOutlined, EyeOutlined, MailOutlined, ReloadOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import axios from 'axios';
import { api, cleanPayload } from './settingsApi.jsx';
import { TemplatePlaceholderPanel, sanitizeTemplateHtml } from './TemplatePlaceholders.jsx';
import RichHtmlEditor from '@/Components/RichHtmlEditor';
import TemplatePreviewDrawer from '@/Components/TemplatePreviewDrawer';
import ActionDropdown from '@/Components/ActionDropdown';
import { humanizeLabel } from '@/utils/humanizeLabel';

const { Text } = Typography;

const getError = (error, fallback) => error?.response?.data?.message || Object.values(error?.response?.data || {})?.[0]?.[0] || fallback;
const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';
const sample = {
  customer_name: 'ABC Traders',
  customer_email: 'accounts@abctraders.com',
  customer_phone: '+977 9840000000',
  invoice_no: 'INV-000001',
  document_no: 'INV-000001',
  document_date: '18 May 2026',
  due_date: '25 May 2026',
  total_amount: 'NPR 10,735.00',
  balance_due: 'NPR 5,735.00',
  company_name: 'KiteLedger Pvt. Ltd.',
  company_address: 'Kathmandu, Nepal',
  company_phone: '+977 9800000000',
  company_email: 'info@kiteledger.com',
};
const renderSample = (value = '') => Object.entries(sample).reduce((html, [key, text]) => html.replaceAll(`{{${key}}}`, text).replaceAll(`{{ ${key} }}`, text), value);

export default function EmailTemplates() {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
      name: record?.name || record?.title || humanizeLabel(record?.template_key || record?.module || 'Email Template'),
      subject: record?.subject || '',
      preheader: record?.preheader || '',
      body: record?.body || '',
      plain_text_body: record?.plain_text_body || '',
      description: record?.description || '',
    });
    setOpen(true);
  };

  const insertVariable = (placeholder) => {
    form.setFieldValue('body', `${form.getFieldValue('body') || ''}${placeholder}`);
  };

  const save = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payload = cleanPayload({
        subject: values.subject,
        body: sanitizeTemplateHtml(values.body),
      });

      if (editing?.id) {
        await axios.patch(api(`/api/email-templates/${editing.id}`), payload);
        message.success('Email template updated');
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
    { title: 'Template Name', key: 'name', render: (_, record) => <Text strong>{humanizeLabel(record.name || record.subject || record.template_key || 'Email Template')}</Text> },
    { title: 'Module', dataIndex: 'module', key: 'module', render: (value) => <Tag>{humanizeLabel(value || 'system')}</Tag> },
    { title: 'Purpose', dataIndex: 'subject', key: 'subject', ellipsis: true },
    { title: 'Type', key: 'type', render: () => <Tag>Email Template</Tag> },
    { title: 'Last Updated', dataIndex: 'updated_at', key: 'updated_at', width: 170, render: formatDate },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <ActionDropdown items={[
          { label: 'Edit Template', icon: <EditOutlined />, onClick: () => openForm(record) },
          { label: 'Preview', icon: <EyeOutlined />, onClick: () => { openForm(record); setPreviewOpen(true); } },
          { label: 'Send Test Email', icon: <SendOutlined />, onClick: () => message.info('Test email sending is not configured for this template yet.') },
        ]} />
      ),
    },
  ], []);

  return (
    <div style={{ padding: token.padding }}>
      <Head title="Email Templates" />
      <Card
        size="small"
        title={<><MailOutlined /> Email Templates</>}
        extra={<Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>}
      >
        <Table rowKey="id" size="middle" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} />
      </Card>

      <Drawer
        title="Email Template"
        open={open}
        onClose={() => setOpen(false)}
        width="calc(100vw - 48px)"
        destroyOnHidden
        extra={<Space><Button onClick={() => setPreviewOpen(true)} icon={<EyeOutlined />}>Preview</Button><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save Changes</Button></Space>}
      >
        <Row gutter={16}>
          <Col xs={24} lg={15}>
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item name="name" label="Template Name"><Input readOnly /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Module"><Input readOnly value={humanizeLabel(selectedModule)} /></Form.Item></Col>
                <Form.Item name="module" hidden><Input /></Form.Item>
                <Col xs={24}><Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input placeholder="Invoice {{invoice_no}} from {{company_name}}" /></Form.Item></Col>
                <Col xs={24}><Form.Item name="preheader" label="Email Preheader"><Input /></Form.Item></Col>
                <Col xs={24}><Form.Item name="body" label="Email Body" rules={[{ required: true }]}><RichHtmlEditor height={440} /></Form.Item></Col>
              </Row>
            </Form>
          </Col>
          <Col xs={24} lg={9}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <TemplatePlaceholderPanel documentType={selectedModule} onInsert={insertVariable} />
              <Card size="small" title="Template Info">
                <Space direction="vertical" size={4}>
                  <Text type="secondary">This is a predefined template. You can edit message content and placeholders.</Text>
                  <Text>Last updated: {formatDate(editing?.updated_at)}</Text>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </Drawer>
      <TemplatePreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={form.getFieldValue('name') || 'Email Template'}
        subject={renderSample(form.getFieldValue('subject') || '')}
        html={renderSample(body || '')}
      />
    </div>
  );
}
