import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button, Card, Col, Drawer, Form, Input, Row, Select, Space, Switch, Table, Tag, Typography, message, theme } from 'antd';
import { EditOutlined, PlusOutlined, PrinterOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { api, cleanPayload } from '../settingsApi.jsx';
import { TemplatePlaceholderPanel, sanitizeTemplateHtml } from '../TemplatePlaceholders.jsx';

const { Text } = Typography;

const documentTypes = [
  'quotation','sales_order','invoice','customer_payment_receipt','credit_note','customer_statement',
  'purchase_order','purchase_bill','supplier_payment_voucher','debit_note','supplier_statement',
  'journal_voucher','general_ledger','trial_balance','balance_sheet','profit_and_loss','cash_flow',
  'stock_adjustment','warehouse_transfer','stock_ledger','payslip','appointment_letter','experience_letter','leave_approval',
  'lead_summary','deal_summary','activity_summary','shipment_label','booking_confirmation','house_bill_of_lading','master_bill_of_lading','awb','mawb','manifest','delivery_order','proof_of_delivery',
].map((value) => ({ value, label: value.split('_').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') }));

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

export default function PrintingTemplates() {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
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
      template_key: record?.template_key || '',
      template_html: record?.template_html || defaultHtml,
      template_css: record?.template_css || '',
      is_default: record?.is_default || false,
      active: record?.active !== false,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payload = cleanPayload({
        ...values,
        template_html: sanitizeTemplateHtml(values.template_html),
        is_default: values.is_default === true,
        active: values.active !== false,
      });
      if (editing?.id) {
        await axios.patch(api(`/api/printing-templates/${editing.id}`), payload);
        message.success('Printing template updated');
      } else {
        await axios.post(api('/api/printing-templates'), payload);
        message.success('Printing template created');
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
    { title: 'Template Name', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
    { title: 'Document Type', dataIndex: 'document_type', key: 'document_type', render: (v) => <Tag>{v}</Tag> },
    { title: 'Module', key: 'module', render: (_, r) => moduleFor(r.document_type) },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 90, render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Default', dataIndex: 'is_default', key: 'is_default', width: 90, render: (v) => <Tag color={v ? 'blue' : 'default'}>{v ? 'Default' : 'No'}</Tag> },
    { title: 'Updated At', dataIndex: 'updated_at', key: 'updated_at', width: 170, render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Actions', key: 'actions', width: 90, render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)}>Edit</Button> },
  ], []);

  const preview = `<style>${css || ''}</style>${sanitizeTemplateHtml(html || '')}`;

  return (
    <div style={{ padding: token.padding }}>
      <Head title="Printing Templates" />
      <Card
        size="small"
        title={<><PrinterOutlined /> Printing Templates</>}
        extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Add Template</Button></Space>}
      >
        <Table rowKey="id" size="middle" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} />
      </Card>

      <Drawer
        title={editing ? 'Edit Printing Template' : 'New Printing Template'}
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
                <Col xs={24} md={10}><Form.Item name="name" label="Template Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="document_type" label="Document Type" rules={[{ required: true }]}><Select showSearch options={documentTypes} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="template_key" label="Template Key"><Input placeholder="invoice.default" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="is_default" label="Default" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24}><Form.Item name="template_html" label="HTML Body" rules={[{ required: true }]}><Input.TextArea rows={18} style={{ fontFamily: 'monospace' }} /></Form.Item></Col>
                <Col xs={24}><Form.Item name="template_css" label="CSS / Style"><Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} /></Form.Item></Col>
              </Row>
            </Form>
            <Card size="small" title="Live Preview" style={{ marginTop: token.margin }}>
              <iframe title="Print preview" sandbox="" srcDoc={preview} style={{ width: '100%', minHeight: 320, border: `1px solid ${token.colorBorderSecondary}` }} />
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <TemplatePlaceholderPanel documentType={documentType} />
          </Col>
        </Row>
      </Drawer>
    </div>
  );
}
