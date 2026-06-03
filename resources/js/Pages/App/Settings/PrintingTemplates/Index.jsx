import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button, Card, Col, Drawer, Form, Input, Row, Space, Table, Tag, Typography, message, theme } from 'antd';
import { EditOutlined, EyeOutlined, PrinterOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { api, cleanPayload } from '../settingsApi.jsx';
import { TemplatePlaceholderPanel, sanitizeTemplateHtml } from '../TemplatePlaceholders.jsx';
import RichHtmlEditor from '@/Components/RichHtmlEditor';
import TemplatePreviewDrawer from '@/Components/TemplatePreviewDrawer';
import ActionDropdown from '@/Components/ActionDropdown';
import { humanizeLabel } from '@/utils/humanizeLabel';

const { Text } = Typography;

const getError = (error, fallback) => error?.response?.data?.message || Object.values(error?.response?.data || {})?.[0]?.[0] || fallback;
const moduleFor = (type = '') => type.startsWith('purchase') || ['supplier_payment_voucher','debit_note','supplier_statement'].includes(type)
  ? 'Purchase'
  : type.startsWith('journal') || ['general_ledger','trial_balance','balance_sheet','profit_and_loss','cash_flow'].includes(type)
    ? 'Accounting'
    : type.includes('payslip') || type.includes('letter') || type.includes('leave')
      ? 'HRM'
      : type.includes('shipment') || ['awb','mawb','manifest','delivery_order','proof_of_delivery'].includes(type)
        ? 'Logistics'
        : 'Sales';

const defaultHtml = `<section>
  <header>{{company_name}}</header>
  <h1>{{document_title}}</h1>
  <p>{{document_no}} | {{document_date}}</p>
  {{items_table}}
  <strong>{{grand_total}}</strong>
</section>`;
const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';
const sample = {
  company_name: 'KiteLedger Pvt. Ltd.',
  document_title: 'Tax Invoice',
  document_no: 'INV-000001',
  document_date: '18 May 2026',
  grand_total: 'NPR 10,735.00',
  items_table: '<table style="width:100%;border-collapse:collapse"><tr><th align="left">Item</th><th align="right">Total</th></tr><tr><td>Consulting Service</td><td align="right">NPR 10,735.00</td></tr></table>',
};
const renderSample = (value = '') => Object.entries(sample).reduce((html, [key, text]) => html.replaceAll(`{{${key}}}`, text).replaceAll(`{{ ${key} }}`, text), value);

export default function PrintingTemplates() {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form] = Form.useForm();
  const html = Form.useWatch('template_html', form);
  const css = Form.useWatch('template_css', form);
  const documentType = Form.useWatch('document_type', form);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/printing-templates'), { params: { page_size: 100 } });
      setRows(Array.isArray(data) ? data : data?.results || data?.data || []);
    } catch (error) {
      message.error(getError(error, 'Failed to load printing templates'));
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
      document_type: record?.document_type || 'invoice',
      template_html: record?.template_html || defaultHtml,
      template_css: record?.template_css || '',
    });
    setOpen(true);
  };

  const insertVariable = (placeholder) => {
    form.setFieldValue('template_html', `${form.getFieldValue('template_html') || ''}${placeholder}`);
  };

  const save = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payload = cleanPayload({
        name: values.name,
        document_type: values.document_type,
        template_html: sanitizeTemplateHtml(values.template_html),
        template_css: values.template_css,
      });
      if (editing?.id) {
        await axios.patch(api(`/api/printing-templates/${editing.id}`), payload);
        message.success('Printing template updated');
      }
      setOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields) message.error(getError(error, 'Failed to save printing template'));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { title: 'Template Name', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{humanizeLabel(v)}</Text> },
    { title: 'Module', key: 'module', render: (_, r) => moduleFor(r.document_type) },
    { title: 'Purpose', dataIndex: 'document_type', key: 'document_type', render: (v) => humanizeLabel(v) },
    { title: 'Type', key: 'type', render: () => <Tag>Printing Template</Tag> },
    { title: 'Last Updated', dataIndex: 'updated_at', key: 'updated_at', width: 170, render: formatDate },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <ActionDropdown items={[
          { label: 'Edit Template', icon: <EditOutlined />, onClick: () => openForm(record) },
          { label: 'Print Preview', icon: <EyeOutlined />, onClick: () => { openForm(record); setPreviewOpen(true); } },
        ]} />
      ),
    },
  ], []);

  const previewHtml = renderSample(html || '');

  return (
    <div style={{ padding: token.padding }}>
      <Head title="Printing Templates" />
      <Card
        size="small"
        title={<><PrinterOutlined /> Printing Templates</>}
        extra={<Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>}
      >
        <Table rowKey="id" size="middle" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} />
      </Card>

      <Drawer
        title="Printing Template"
        open={open}
        onClose={() => setOpen(false)}
        width="calc(100vw - 48px)"
        destroyOnHidden
        extra={<Space><Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>Preview</Button><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save Changes</Button></Space>}
      >
        <Row gutter={16}>
          <Col xs={24} lg={15}>
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item name="name" label="Template Name" rules={[{ required: true }]}><Input readOnly /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Purpose"><Input readOnly value={humanizeLabel(documentType)} /></Form.Item></Col>
                <Form.Item name="document_type" hidden><Input /></Form.Item>
                <Col xs={24}><Form.Item name="template_html" label="HTML Body" rules={[{ required: true }]}><RichHtmlEditor height={460} /></Form.Item></Col>
                <Col xs={24}><Form.Item name="template_css" label="Print Style"><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item></Col>
              </Row>
            </Form>
          </Col>
          <Col xs={24} lg={9}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <TemplatePlaceholderPanel documentType={documentType} onInsert={insertVariable} />
              <Card size="small" title="Template Info">
                <Space direction="vertical" size={4}>
                  <Text type="secondary">This is a predefined print layout. Edit the body and style only.</Text>
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
        type="print"
        title={form.getFieldValue('name') || 'Printing Template'}
        html={previewHtml}
        css={css}
      />
    </div>
  );
}
