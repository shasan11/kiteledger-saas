import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const emptyService = {
  name: '',
  code: '',
  sku: '',
  description: '',
  product_category_id: null,
  product_tax_category_id: null,
  product_unit_id: null,
  tax_class_id: null,
  sales_account_id: null,
  purchase_account_id: null,
  selling_price: 0,
  purchase_price: 0,
  allow_sale: true,
  allow_purchase: false,
  active: true,
};

const emptyQuickAdd = {
  name: '',
  short_name: '',
  description: '',
  accept_fractional: false,
};

const apiErrorMessage = (error, fallback = 'Something went wrong.') => {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return first[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
};

const money = (value) =>
  Number(value || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const relationLabel = (record) =>
  record?.label || record?.name || record?.code || record?.short_name || '-';

const optionLabel = (record) =>
  [record.code, record.name || record.short_name].filter(Boolean).join(' - ') ||
  record.label ||
  record.id;

const shortNameFromName = (value = '') =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 12);

export default function Services({ auth }) {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [quickForm] = Form.useForm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState({ open: false, type: null });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [lookups, setLookups] = useState({
    categories: [],
    units: [],
    taxCategories: [],
    taxClasses: [],
    accounts: [],
  });

  const loadLookups = async () => {
    const [categories, units, taxCategories, taxClasses, accounts] = await Promise.all([
      axios.get(api('/api/product-categories'), { params: { page_size: 100, active: true } }),
      axios.get(api('/api/product-units'), { params: { page_size: 100, active: true } }),
      axios.get(api('/api/product-tax-categories'), {
        params: { page_size: 100, active: true, tax_category_type: 'service' },
      }),
      axios.get(api('/api/tax-classes'), { params: { page_size: 100, active: true } }),
      axios.get(api('/api/accounts'), { params: { page_size: 100, active: true } }),
    ]);

    setLookups({
      categories: categories.data?.results || [],
      units: units.data?.results || [],
      taxCategories: taxCategories.data?.results || [],
      taxClasses: taxClasses.data?.results || [],
      accounts: accounts.data?.results || [],
    });
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/products'), {
        params: {
          product_type: 'service',
          search: search || undefined,
          page_size: 100,
          ordering: 'name',
        },
      });
      setRows(data?.results || []);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to load services.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups().catch((error) => message.error(apiErrorMessage(error, 'Unable to load service setup data.')));
  }, []);

  useEffect(() => {
    loadRows();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(emptyService);
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...emptyService,
      ...record,
      product_category_id: record.product_category_id,
      product_tax_category_id: record.product_tax_category_id,
      product_unit_id: record.product_unit_id,
      tax_class_id: record.tax_class_id,
      sales_account_id: record.sales_account_id,
      purchase_account_id: record.purchase_account_id,
    });
    setDrawerOpen(true);
  };

  const save = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      product_type: 'service',
      track_inventory: false,
      reorder_level: 0,
      valuation_method: null,
    };

    setLoading(true);
    try {
      if (editing) {
        await axios.patch(api(`/api/products/${editing.id}`), payload);
        message.success('Service updated.');
      } else {
        await axios.post(api('/api/products'), payload);
        message.success('Service created.');
      }

      setDrawerOpen(false);
      setEditing(null);
      form.resetFields();
      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to save service.'));
    } finally {
      setLoading(false);
    }
  };

  const openQuickAdd = (type) => {
    quickForm.setFieldsValue(emptyQuickAdd);
    setQuickAdd({ open: true, type });
  };

  const closeQuickAdd = () => {
    setQuickAdd({ open: false, type: null });
    quickForm.resetFields();
  };

  const saveQuickAdd = async () => {
    const values = await quickForm.validateFields();
    const isUnit = quickAdd.type === 'unit';
    const endpoint = isUnit ? '/api/product-units' : '/api/product-categories';
    const targetField = isUnit ? 'product_unit_id' : 'product_category_id';
    const payload = isUnit
      ? {
          name: values.name,
          short_name: values.short_name || shortNameFromName(values.name),
          description: values.description || null,
          accept_fractional: values.accept_fractional === true,
          active: true,
        }
      : {
          name: values.name,
          description: values.description || null,
          active: true,
        };

    setQuickSaving(true);
    try {
      const { data } = await axios.post(api(endpoint), payload);
      await loadLookups();

      if (data?.id) {
        form.setFieldsValue({ [targetField]: data.id });
      }

      message.success(`${values.name} added.`);
      closeQuickAdd();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to add item.'));
    } finally {
      setQuickSaving(false);
    }
  };

  const toggleActive = (record) => {
    modal.confirm({
      title: `${record.active ? 'Deactivate' : 'Activate'} service?`,
      content: record.name,
      okText: record.active ? 'Deactivate' : 'Activate',
      onOk: async () => {
        try {
          await axios.patch(api(`/api/products/${record.id}`), {
            active: !record.active,
            product_type: 'service',
            track_inventory: false,
          });
          message.success('Service status updated.');
          await loadRows();
        } catch (error) {
          message.error(apiErrorMessage(error, 'Unable to update service status.'));
          throw error;
        }
      },
    });
  };

  const lookupOptions = useMemo(
    () => ({
      categories: lookups.categories.map((row) => ({ value: row.id, label: optionLabel(row) })),
      units: lookups.units.map((row) => ({ value: row.id, label: optionLabel(row) })),
      taxCategories: lookups.taxCategories.map((row) => ({ value: row.id, label: optionLabel(row) })),
      taxClasses: lookups.taxClasses.map((row) => ({ value: row.id, label: optionLabel(row) })),
      accounts: lookups.accounts.map((row) => ({ value: row.id, label: optionLabel(row) })),
    }),
    [lookups],
  );

  const columns = [
    {
      title: 'Service',
      key: 'service',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.code || record.sku || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Category',
      render: (_, record) => relationLabel(record.product_category),
    },
    {
      title: 'Unit',
      render: (_, record) => relationLabel(record.product_unit),
    },
    {
      title: 'Tax',
      render: (_, record) =>
        relationLabel(record.product_tax_category) !== '-'
          ? relationLabel(record.product_tax_category)
          : relationLabel(record.tax_class),
    },
    {
      title: 'Sale',
      align: 'right',
      render: (_, record) => money(record.selling_price),
    },
    {
      title: 'Purchase',
      align: 'right',
      render: (_, record) => money(record.purchase_price),
    },
    {
      title: 'Status',
      render: (_, record) => <Tag color={record.active ? 'green' : 'red'}>{record.active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button size="small" onClick={() => toggleActive(record)}>
            {record.active ? 'Deactivate' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Services" />

      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card bordered={false} style={{ borderRadius: token.borderRadiusLG }}>
            <Row gutter={[16, 16]} align="middle">
              <Col flex="auto">
                <Title level={3} style={{ margin: 0 }}>
                  Services
                </Title>
                <Text type="secondary">Manage non-inventory service items for sales and purchase documents.</Text>
              </Col>
              <Col>
                <Space>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Search services"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onPressEnter={loadRows}
                    style={{ width: 260 }}
                  />
                  <Button icon={<ReloadOutlined />} onClick={loadRows} loading={loading} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    New Service
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={{ borderRadius: token.borderRadiusLG }}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={{ pageSize: 15 }}
            />
          </Card>
        </Space>
      </div>

      <Drawer
        title={editing ? 'Edit Service' : 'New Service'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={760}
        extra={
          <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={save}>
            Save Service
          </Button>
        }
      >
        <Form form={form} layout="vertical" initialValues={emptyService}>
          <Row gutter={12}>
            <Col xs={24} md={16}>
              <Form.Item name="name" label="Service Name" rules={[{ required: true, message: 'Service name is required.' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="code" label="Code">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="sku" label="SKU / SAC">
                <Input placeholder="Auto generated on save" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="selling_price" label="Selling Price">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="purchase_price" label="Purchase Cost">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="product_category_id" label="Category">
                <Space.Compact style={{ width: '100%' }}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={lookupOptions.categories}
                    style={{ flex: 1 }}
                  />
                  <Button icon={<PlusOutlined />} onClick={() => openQuickAdd('category')} />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="product_unit_id" label="Unit">
                <Space.Compact style={{ width: '100%' }}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={lookupOptions.units}
                    style={{ flex: 1 }}
                  />
                  <Button icon={<PlusOutlined />} onClick={() => openQuickAdd('unit')} />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="product_tax_category_id" label="Service Tax Category">
                <Select allowClear showSearch optionFilterProp="label" options={lookupOptions.taxCategories} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tax_class_id" label="Tax Class">
                <Select allowClear showSearch optionFilterProp="label" options={lookupOptions.taxClasses} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="sales_account_id" label="Sales Account">
                <Select allowClear showSearch optionFilterProp="label" options={lookupOptions.accounts} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="purchase_account_id" label="Purchase Account">
                <Select allowClear showSearch optionFilterProp="label" options={lookupOptions.accounts} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="allow_sale" label="Sellable" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="allow_purchase" label="Purchasable" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>

      <Modal
        title={quickAdd.type === 'unit' ? 'Quick Add Unit' : 'Quick Add Category'}
        open={quickAdd.open}
        onCancel={closeQuickAdd}
        onOk={saveQuickAdd}
        confirmLoading={quickSaving}
        okText="Add"
        destroyOnHidden
      >
        <Form form={quickForm} layout="vertical" initialValues={emptyQuickAdd}>
          <Form.Item name="name" label={quickAdd.type === 'unit' ? 'Unit Name' : 'Category Name'} rules={[{ required: true, message: 'Name is required.' }]}>
            <Input autoFocus />
          </Form.Item>

          {quickAdd.type === 'unit' ? (
            <>
              <Form.Item name="short_name" label="Short Name">
                <Input placeholder="Auto from name if blank" />
              </Form.Item>
              <Form.Item name="accept_fractional" label="Accept Fractional Quantity" valuePropName="checked">
                <Switch />
              </Form.Item>
            </>
          ) : null}

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
