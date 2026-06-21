import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { CloseOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const defaultSettings = {
  enable_tax: true,
  tax_label: 'VAT',
  custom_tax_label: '',
  sales_tax_rate_percent: 13,
  purchase_tax_rate_percent: 13,
  tax_calculation_type: 'exclusive',
  tax_rounding_method: 'document',
  show_tax_on_invoice: true,
  company_tax_number: '',
  default_tax_rate_id: null,
  default_sales_tax_id: null,
  default_purchase_tax_id: null,
  sales_tax_calculation_type: 'global',
  purchase_tax_calculation_type: 'global',
  allow_sales_tax_override: true,
  allow_purchase_tax_override: true,
  show_tax_summary_on_bill: true,
  advanced_mode: false,
  country_code: 'NP',
  default_currency: 'NPR',
  preset: 'custom',
  wizard_completed: true,
};

const usedForOptions = [
  { value: 'sale', label: 'Sales' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'both', label: 'Both' },
];

const rateLabel = (rate) => `${Number(rate || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}%`;

const rateName = (rate) => {
  if (!rate) return 'No tax';
  return `${rate.name || 'Tax'} (${rateLabel(rate.rate_percent)})`;
};

export default function TaxSettings({ auth }) {
  const [settingsForm] = Form.useForm();
  const [rateForm] = Form.useForm();
  const [settings, setSettings] = useState(defaultSettings);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rateEditorOpen, setRateEditorOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [msgApi, contextHolder] = message.useMessage();

  const activeRateOptions = useMemo(
    () => rates
      .filter((rate) => rate.active !== false)
      .map((rate) => ({ value: rate.id, label: rateName(rate) })),
    [rates]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, ratesRes] = await Promise.all([
        axios.get(api('/api/tax-settings')),
        axios.get(api('/api/tax-rates/'), { params: { page_size: 100, ordering: '-is_default,name' } }),
      ]);
      const nextSettings = { ...defaultSettings, ...(settingsRes.data?.data || {}) };
      const nextRates = ratesRes.data?.results || [];
      setSettings(nextSettings);
      setRates(nextRates);
      settingsForm.setFieldsValue(nextSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => msgApi.error('Could not load tax settings.'));
  }, []);

  const saveSettings = async () => {
    const values = await settingsForm.validateFields().catch(() => null);
    if (!values) return;

    const label = values.tax_label === 'Custom' ? values.custom_tax_label || 'Tax' : values.tax_label;
    const defaultRate = rates.find((rate) => rate.id === values.default_tax_rate_id);
    const defaultRatePercent = defaultRate ? Number(defaultRate.rate_percent || 0) : values.sales_tax_rate_percent;
    const payload = {
      ...settings,
      ...values,
      sales_tax_enabled: !!values.enable_tax,
      purchase_tax_enabled: !!values.enable_tax,
      sales_tax_name: label,
      purchase_tax_name: label,
      sales_tax_rate_percent: defaultRatePercent ?? 0,
      purchase_tax_rate_percent: defaultRatePercent ?? 0,
      default_sales_tax_id: values.default_sales_tax_id || values.default_tax_rate_id || null,
      default_purchase_tax_id: values.default_purchase_tax_id || values.default_tax_rate_id || null,
      advanced_mode: !!(values.advanced_mode ?? settings.advanced_mode),
      preset: 'custom',
      wizard_completed: true,
    };

    setSaving(true);
    try {
      const { data } = await axios.put(api('/api/tax-settings'), payload);
      const saved = { ...defaultSettings, ...(data?.data || {}) };
      setSettings(saved);
      settingsForm.setFieldsValue(saved);
      msgApi.success('Tax settings saved.');
      if (!rates.length) msgApi.warning('Add at least one tax rate to apply tax automatically.');
    } catch (error) {
      msgApi.error(error?.response?.data?.message || 'Failed to save tax settings.');
    } finally {
      setSaving(false);
    }
  };

  const openRateEditor = (rate = null) => {
    setEditingRate(rate);
    rateForm.setFieldsValue({
      name: rate?.name || '',
      rate_percent: Number(rate?.rate_percent || 0),
      applies_on: rate?.applies_on || 'both',
      description: rate?.description || '',
      active: rate?.active !== false,
      is_default: !!rate?.is_default,
    });
    setRateEditorOpen(true);
  };

  const closeRateEditor = () => {
    setEditingRate(null);
    rateForm.resetFields();
    setRateEditorOpen(false);
  };

  const saveRate = async () => {
    const values = await rateForm.validateFields().catch(() => null);
    if (!values) return;

    const payload = {
      country_code: settings.country_code || 'NP',
      tax_type: settings.tax_label === 'GST' ? 'gst' : 'vat',
      calculation_method: 'single',
      inclusive: settings.tax_calculation_type === 'inclusive',
      name: values.name,
      code: values.name.replace(/\s+/g, '_').toUpperCase().slice(0, 50),
      rate_percent: values.rate_percent || 0,
      applies_on: values.applies_on,
      description: values.description || null,
      active: values.active !== false,
      is_default: !!values.is_default,
    };

    setSaving(true);
    try {
      if (editingRate?.id) {
        await axios.put(api(`/api/tax-rates/${editingRate.id}`), payload);
      } else {
        await axios.post(api('/api/tax-rates/'), payload);
      }
      closeRateEditor();
      msgApi.success(editingRate ? 'Tax rate updated.' : 'Tax rate added.');
      await loadData();
    } catch (error) {
      msgApi.error(error?.response?.data?.message || 'Could not save tax rate.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (rate) => {
    setSaving(true);
    try {
      await axios.delete(api(`/api/tax-rates/${rate.id}`));
      msgApi.success('Tax rate deleted.');
      await loadData();
    } catch (error) {
      msgApi.error(error?.response?.data?.message || 'Could not delete tax rate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout auth={auth}>
      {contextHolder}
      <Head title="Tax Settings" />
      <div className="tax-settings-page" style={{ padding: 20, maxWidth: 1180, margin: '0 auto' }}>
        <style>{`
          .tax-settings-page .ant-card {
            border-radius: 8px;
            border-color: #e5e7eb;
            box-shadow: none;
          }
          .tax-settings-page .ant-card-head {
            min-height: 42px;
            padding: 0 14px;
          }
          .tax-settings-page .ant-card-body {
            padding: 14px;
          }
          .tax-settings-page .ant-tabs-nav {
            margin-bottom: 10px;
          }
          .tax-settings-page .ant-tabs-tab {
            padding: 8px 0;
          }
          .tax-settings-page .ant-form-item {
            margin-bottom: 10px;
          }
          .tax-settings-page .ant-form-item-label {
            padding-bottom: 3px;
          }
          .tax-settings-page .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 650;
            color: #374151;
          }
          .tax-settings-page .ant-input,
          .tax-settings-page .ant-input-number,
          .tax-settings-page .ant-select-selector {
            min-height: 32px;
            border-radius: 6px !important;
          }
          .tax-settings-page .ant-table-thead > tr > th {
            background: #f8fafc !important;
            color: #475569;
            font-size: 12px;
            font-weight: 650;
            padding: 8px 10px !important;
          }
          .tax-settings-page .ant-table-tbody > tr > td {
            padding: 7px 10px !important;
          }
          .tax-inline-editor {
            background: #f8fafc;
            border: 1px solid #dbe3ef;
          }
        `}</style>
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Tax Settings</Title>
            <Text type="secondary">Set your tax label, default rate and how tax appears on documents.</Text>
          </div>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveSettings} loading={saving}>
            Save
          </Button>
        </Space>

        {!loading && !rates.length && (
          <Alert
            showIcon
            type="warning"
            message="Add at least one tax rate to apply tax automatically."
            style={{ marginBottom: 12 }}
          />
        )}

        <Form form={settingsForm} layout="vertical" initialValues={defaultSettings}>
          <Tabs
            defaultActiveKey="basic"
            size="small"
            items={[
              {
                key: 'basic',
                label: 'Basic Setup',
                children: (
                  <TaxBasicSetupCard
                    form={settingsForm}
                    rateOptions={activeRateOptions}
                    loading={loading}
                  />
                ),
              },
              {
                key: 'rates',
                label: 'Tax Rates',
                children: (
                  <TaxRateTable
                    form={rateForm}
                    rates={rates}
                    loading={loading}
                    saving={saving}
                    editorOpen={rateEditorOpen}
                    editingRate={editingRate}
                    onAdd={() => openRateEditor()}
                    onEdit={openRateEditor}
                    onCancel={closeRateEditor}
                    onSave={saveRate}
                    onDelete={deleteRate}
                  />
                ),
              },
              {
                key: 'defaults',
                label: 'Sales & Purchase Defaults',
                children: (
                  <SalesPurchaseTaxDefaults rateOptions={activeRateOptions} />
                ),
              },
            ]}
          />
        </Form>
      </div>
    </AuthenticatedLayout>
  );
}

function TaxBasicSetupCard({ form, rateOptions, loading }) {
  const taxLabel = Form.useWatch('tax_label', form);
  const taxEnabled = Form.useWatch('enable_tax', form);

  return (
    <Card size="small" loading={loading}>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="enable_tax" label="Enable Tax" valuePropName="checked">
            <Switch checkedChildren="On" unCheckedChildren="Off" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="tax_label" label="Tax Label">
            <Select options={['VAT', 'GST', 'Tax', 'Custom'].map((value) => ({ value, label: value }))} disabled={!taxEnabled} />
          </Form.Item>
        </Col>
        {taxLabel === 'Custom' && (
          <Col xs={24} md={8}>
            <Form.Item name="custom_tax_label" label="Custom Tax Label" rules={[{ required: true, message: 'Enter a label' }]}>
              <Input placeholder="e.g. Service Tax" disabled={!taxEnabled} />
            </Form.Item>
          </Col>
        )}
        <Col xs={24} md={8}>
          <Form.Item name="sales_tax_rate_percent" label="Default Tax Rate">
            <InputNumber min={0} max={100} suffix="%" style={{ width: '100%' }} disabled={!taxEnabled} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="default_tax_rate_id" label="Default Tax">
            <Select options={rateOptions} allowClear placeholder="Choose a tax rate" disabled={!taxEnabled} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="tax_calculation_type" label="Tax Calculation">
            <Select
              disabled={!taxEnabled}
              options={[
                { value: 'exclusive', label: 'Exclusive Tax' },
                { value: 'inclusive', label: 'Inclusive Tax' },
              ]}
            />
          </Form.Item>
          <Text type="secondary">Exclusive: tax is added on top of price. Inclusive: price already includes tax.</Text>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="tax_rounding_method" label="Tax Rounding">
            <Select
              disabled={!taxEnabled}
              options={[
                { value: 'document', label: 'Round per document' },
                { value: 'line', label: 'Round per line' },
              ]}
            />
          </Form.Item>
          <Text type="secondary">Round per document is easiest for most users. Round per line is useful when each item needs separate rounding.</Text>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="show_tax_on_invoice" label="Show tax on invoice" valuePropName="checked">
            <Switch disabled={!taxEnabled} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="company_tax_number" label="Company Tax/VAT/GST Number">
            <Input placeholder="Optional" disabled={!taxEnabled} />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

function TaxRateTable({
  form,
  rates,
  loading,
  saving,
  editorOpen,
  editingRate,
  onAdd,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}) {
  const columns = [
    {
      title: 'Tax Name',
      dataIndex: 'name',
      render: (value, rate) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value || 'Tax'}</Text>
          {rate.description && <Text type="secondary" style={{ fontSize: 12 }}>{rate.description}</Text>}
        </Space>
      ),
    },
    { title: 'Rate', dataIndex: 'rate_percent', width: 110, render: (value) => <Tag color={Number(value) > 0 ? 'green' : 'default'}>{rateLabel(value)}</Tag> },
    { title: 'Used For', dataIndex: 'applies_on', width: 130, render: (value) => <Tag>{usedForOptions.find((o) => o.value === value)?.label || 'Both'}</Tag> },
    { title: 'Active', dataIndex: 'active', width: 100, render: (value) => <Tag color={value !== false ? 'green' : 'default'}>{value !== false ? 'Active' : 'Off'}</Tag> },
    { title: 'Default', dataIndex: 'is_default', width: 100, render: (value) => value ? <Tag color="blue">Default</Tag> : '-' },
    {
      title: 'Action',
      width: 120,
      render: (_, rate) => (
        <Space>
          <Tooltip title="Edit tax rate"><Button size="small" icon={<EditOutlined />} onClick={() => onEdit(rate)} /></Tooltip>
          <Popconfirm title="Delete this tax rate?" onConfirm={() => onDelete(rate)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="Tax Rates"
      extra={
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>
          Add Rate
        </Button>
      }
    >
      {editorOpen && (
        <InlineTaxRateEditor
          form={form}
          editingRate={editingRate}
          saving={saving}
          onCancel={onCancel}
          onSave={onSave}
        />
      )}
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rates} pagination={{ pageSize: 8 }} />
    </Card>
  );
}

function InlineTaxRateEditor({ form, editingRate, saving, onCancel, onSave }) {
  return (
    <div className="tax-inline-editor" style={{ marginBottom: 12, padding: 12, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <Text strong>{editingRate ? 'Edit rate' : 'New rate'}</Text>
        <Space>
          <Button size="small" icon={<CloseOutlined />} onClick={onCancel}>
            Cancel
          </Button>
          <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
            Save Rate
          </Button>
        </Space>
      </div>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12} align="bottom">
          <Col xs={24} md={7}>
            <Form.Item name="name" label="Tax Name" rules={[{ required: true, message: 'Enter tax name' }]}>
              <Input placeholder="VAT 13%" />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="rate_percent" label="Rate %" rules={[{ required: true, message: 'Enter rate' }]}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={5}>
            <Form.Item name="applies_on" label="Used For">
              <Select options={usedForOptions} />
            </Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="is_default" label="Default" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={24}>
            <Form.Item name="description" label="Description">
              <Input placeholder="Optional note" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

function SalesPurchaseTaxDefaults({ rateOptions }) {
  return (
    <Card size="small">
      <Row gutter={20}>
        <Col xs={24} md={12}>
          <Title level={5}>Sales</Title>
          <Form.Item name="default_sales_tax_id" label="Default Sales Tax">
            <Select options={rateOptions} allowClear placeholder="Use global default" />
          </Form.Item>
          <Form.Item name="sales_tax_calculation_type" label="Sales Tax Calculation">
            <Select options={[
              { value: 'global', label: 'Use global setting' },
              { value: 'inclusive', label: 'Inclusive' },
              { value: 'exclusive', label: 'Exclusive' },
            ]} />
          </Form.Item>
          <Form.Item name="allow_sales_tax_override" label="Allow user to change tax on sales documents" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="show_tax_on_invoice" label="Show tax summary on invoice" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Title level={5}>Purchase</Title>
          <Form.Item name="default_purchase_tax_id" label="Default Purchase Tax">
            <Select options={rateOptions} allowClear placeholder="Use global default" />
          </Form.Item>
          <Form.Item name="purchase_tax_calculation_type" label="Purchase Tax Calculation">
            <Select options={[
              { value: 'global', label: 'Use global setting' },
              { value: 'inclusive', label: 'Inclusive' },
              { value: 'exclusive', label: 'Exclusive' },
            ]} />
          </Form.Item>
          <Form.Item name="allow_purchase_tax_override" label="Allow user to change tax on purchase documents" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="show_tax_summary_on_bill" label="Show tax summary on bill" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

