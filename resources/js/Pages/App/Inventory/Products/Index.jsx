import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  BranchesOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const { Text } = Typography;

const emptyProduct = {
  name: '',
  code: '',
  sku: '',
  barcode: '',
  product_type: 'simple',
  product_category_id: null,
  product_unit_id: null,
  tax_class_id: null,
  sales_account_id: null,
  purchase_account_id: null,
  purchase_price: 0,
  selling_price: 0,
  reorder_level: 0,
  track_inventory: true,
  allow_sale: true,
  allow_purchase: true,
  active: true,
  description: '',
};

const money = (value) =>
  Number(value || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const productTypeTag = (type) => {
  const meta = {
    simple: ['Simple', 'blue'],
    variant_parent: ['Variant Parent', 'purple'],
    variant: ['Variant', 'green'],
  }[type || 'simple'] || ['Simple', 'blue'];

  return <Tag color={meta[1]}>{meta[0]}</Tag>;
};

const buildSignature = (ids = []) => [...new Set(ids.filter(Boolean).map(String))].sort().join('|');

const cartesian = (groups = []) =>
  groups.reduce((carry, group) => {
    const ids = group.variant_line_ids || [];
    const next = [];
    carry.forEach((prefix) => ids.forEach((id) => next.push([...prefix, id])));
    return next;
  }, [[]]);

export default function Products({ auth }) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('catalog');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [options, setOptions] = useState({
    categories: [],
    units: [],
    taxClasses: [],
    accounts: [],
    variants: [],
  });
  const [variantGroups, setVariantGroups] = useState([]);
  const [variantChildren, setVariantChildren] = useState([]);

  const variantLineMap = useMemo(() => {
    const map = {};
    options.variants.forEach((variant) => {
      (variant.variant_lines || variant.variantLines || []).forEach((line) => {
        map[line.id] = { ...line, variant };
      });
    });
    return map;
  }, [options.variants]);

  const loadOptions = async () => {
    const [categories, units, taxClasses, accounts, variants] = await Promise.all([
      axios.get(api('/api/product-categories/'), { params: { page_size: 100, ordering: 'name' } }),
      axios.get(api('/api/product-units/'), { params: { page_size: 100, ordering: 'name' } }),
      axios.get(api('/api/tax-classes/'), { params: { page_size: 100, ordering: 'name' } }),
      axios.get(api('/api/accounts/'), { params: { page_size: 100, ordering: 'name' } }),
      axios.get(api('/api/variants/'), { params: { page_size: 100, ordering: 'sort_order' } }),
    ]);

    setOptions({
      categories: categories.data?.results || [],
      units: units.data?.results || [],
      taxClasses: taxClasses.data?.results || [],
      accounts: accounts.data?.results || [],
      variants: variants.data?.results || [],
    });
  };

  const loadRows = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search,
        ordering: 'name',
      };

      if (activeTab === 'catalog') params.catalog = true;
      if (activeTab === 'variants') params.product_type = 'variant';

      const { data } = await axios.get(api('/api/products/'), { params });
      setRows(data.results || []);
      setPagination({ current: page, pageSize, total: data.count || 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadRows(1);
  }, [activeTab]);

  const openCreate = () => {
    setEditing(null);
    setStep(0);
    setVariantGroups([]);
    setVariantChildren([]);
    form.setFieldsValue(emptyProduct);
    setDrawerOpen(true);
  };

  const openEdit = async (record) => {
    const { data } = await axios.get(api(`/api/products/${record.id}`));
    setEditing(data);
    setStep(0);
    form.setFieldsValue({
      ...emptyProduct,
      ...data,
      product_category_id: data.product_category_id || data.product_category?.id,
      product_unit_id: data.product_unit_id || data.product_unit?.id,
      tax_class_id: data.tax_class_id || data.tax_class?.id,
      sales_account_id: data.sales_account_id || data.sales_account?.id,
      purchase_account_id: data.purchase_account_id || data.purchase_account?.id,
    });

    const children = data.children || [];
    const grouped = {};
    children.forEach((child) => {
      (child.variant_options || []).forEach((option) => {
        if (!grouped[option.variant_id]) {
          grouped[option.variant_id] = new Set();
        }
        grouped[option.variant_id].add(option.variant_line_id);
      });
    });

    setVariantGroups(
      Object.entries(grouped).map(([variantId, ids]) => ({
        variant_id: variantId,
        variant_line_ids: Array.from(ids),
      })),
    );
    setVariantChildren(
      children.map((child) => ({
        id: child.id,
        variant_line_ids: (child.variant_options || []).map((option) => option.variant_line_id),
        sku: child.sku,
        barcode: child.barcode,
        purchase_price: Number(child.purchase_price || 0),
        selling_price: Number(child.selling_price || 0),
        reorder_level: Number(child.reorder_level || 0),
        track_inventory: child.track_inventory !== false,
        allow_sale: child.allow_sale !== false,
        allow_purchase: child.allow_purchase !== false,
        active: child.active !== false,
      })),
    );
    setDrawerOpen(true);
  };

  const selectedProductType = Form.useWatch('product_type', form) || 'simple';

  const generateChildren = (missingOnly = false) => {
    const product = form.getFieldsValue();
    const combinations = cartesian(variantGroups.filter((group) => group.variant_line_ids?.length));

    if (!combinations.length) {
      message.warning('Select at least one variant group and value.');
      return;
    }

    const existingBySignature = Object.fromEntries(
      variantChildren.map((child) => [buildSignature(child.variant_line_ids), child]),
    );

    const next = combinations.map((ids) => {
      const signature = buildSignature(ids);
      const existing = existingBySignature[signature];
      if (missingOnly && existing) return existing;

      const values = ids.map((id) => variantLineMap[id]?.value).filter(Boolean);
      const suffix = values.map((value) => String(value).toUpperCase().replace(/\s+/g, '-')).join('-');
      const baseSku = product.sku || product.code || String(product.name || 'PRODUCT').toUpperCase().replace(/\s+/g, '-');

      return {
        ...(existing || {}),
        variant_line_ids: ids,
        sku: existing?.sku || `${baseSku}-${suffix}`.slice(0, 80),
        barcode: existing?.barcode || '',
        purchase_price: existing?.purchase_price ?? Number(product.purchase_price || 0),
        selling_price: existing?.selling_price ?? Number(product.selling_price || 0),
        reorder_level: existing?.reorder_level ?? Number(product.reorder_level || 0),
        track_inventory: existing?.track_inventory ?? product.track_inventory !== false,
        allow_sale: existing?.allow_sale ?? product.allow_sale !== false,
        allow_purchase: existing?.allow_purchase ?? product.allow_purchase !== false,
        active: existing?.active ?? true,
      };
    });

    setVariantChildren(next);
    setStep(3);
  };

  const deactivateRemoved = () => {
    const signatures = new Set(cartesian(variantGroups).map(buildSignature));
    setVariantChildren((current) =>
      current.map((child) =>
        signatures.has(buildSignature(child.variant_line_ids))
          ? child
          : { ...child, active: false },
      ),
    );
  };

  const saveProduct = async () => {
    const values = await form.validateFields();
    const isVariantParent = values.product_type === 'variant_parent';
    const payload = {
      ...values,
      product_category_id: idOf(values.product_category_id),
      product_unit_id: idOf(values.product_unit_id),
      tax_class_id: idOf(values.tax_class_id),
      sales_account_id: idOf(values.sales_account_id),
      purchase_account_id: idOf(values.purchase_account_id),
      parent_id: null,
      track_inventory: isVariantParent ? false : values.track_inventory !== false,
      allow_sale: isVariantParent ? false : values.allow_sale !== false,
      allow_purchase: isVariantParent ? false : values.allow_purchase !== false,
      variant_groups: isVariantParent ? variantGroups : [],
      variant_children: isVariantParent ? variantChildren : [],
    };

    if (isVariantParent && !variantChildren.length) {
      message.warning('Generate at least one child variant before saving.');
      return;
    }

    setSaving(true);
    try {
      if (editing?.id) {
        await axios.patch(api(`/api/products/${editing.id}`), payload);
      } else {
        await axios.post(api('/api/products/'), payload);
      }

      message.success('Product saved');
      setDrawerOpen(false);
      loadRows(1);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space wrap>
            <Text strong>{record.name}</Text>
            {productTypeTag(record.product_type)}
          </Space>
          <Text type="secondary">{[record.sku, record.barcode].filter(Boolean).join(' | ') || record.code || '-'}</Text>
          {record.product_type === 'variant' ? <Text type="secondary">{record.variant_label}</Text> : null}
        </Space>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, record) => record.product_category?.name || record.product_category_name || '-',
    },
    {
      title: 'Stock',
      key: 'stock',
      align: 'right',
      render: (_, record) => Number(record.stock_summary?.qty_on_hand || 0).toLocaleString(),
    },
    {
      title: 'Children',
      key: 'children',
      align: 'center',
      render: (_, record) => record.product_type === 'variant_parent' ? <Tag>{record.children_count || 0}</Tag> : '-',
    },
    {
      title: 'Selling Price',
      dataIndex: 'selling_price',
      align: 'right',
      render: money,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 210,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); openEdit(record); }}>
            Edit
          </Button>
          {record.product_type === 'variant_parent' ? (
            <Button size="small" icon={<BranchesOutlined />} onClick={(event) => { event.stopPropagation(); openEdit(record); setStep(1); }}>
              Manage Variants
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const childColumns = [
    {
      title: 'Variant Name',
      render: (_, row) => `${form.getFieldValue('name') || 'Product'} - ${row.variant_line_ids.map((id) => variantLineMap[id]?.value).filter(Boolean).join(' / ')}`,
    },
    {
      title: 'Values',
      render: (_, row) => row.variant_line_ids.map((id) => {
        const line = variantLineMap[id];
        return <Tag key={id}>{line?.variant?.name}: {line?.value}</Tag>;
      }),
    },
    { title: 'SKU', dataIndex: 'sku', render: (_, row, index) => <Input value={row.sku} onChange={(e) => updateChild(index, { sku: e.target.value })} /> },
    { title: 'Barcode', dataIndex: 'barcode', render: (_, row, index) => <Input value={row.barcode} onChange={(e) => updateChild(index, { barcode: e.target.value })} /> },
    { title: 'Purchase', dataIndex: 'purchase_price', width: 120, render: (_, row, index) => <InputNumber min={0} value={row.purchase_price} onChange={(v) => updateChild(index, { purchase_price: v || 0 })} style={{ width: '100%' }} /> },
    { title: 'Selling', dataIndex: 'selling_price', width: 120, render: (_, row, index) => <InputNumber min={0} value={row.selling_price} onChange={(v) => updateChild(index, { selling_price: v || 0 })} style={{ width: '100%' }} /> },
    { title: 'Reorder', dataIndex: 'reorder_level', width: 110, render: (_, row, index) => <InputNumber min={0} value={row.reorder_level} onChange={(v) => updateChild(index, { reorder_level: v || 0 })} style={{ width: '100%' }} /> },
    { title: 'Track', dataIndex: 'track_inventory', render: (_, row, index) => <Switch checked={row.track_inventory} onChange={(v) => updateChild(index, { track_inventory: v })} /> },
    { title: 'Sale', dataIndex: 'allow_sale', render: (_, row, index) => <Switch checked={row.allow_sale} onChange={(v) => updateChild(index, { allow_sale: v })} /> },
    { title: 'Purchase', dataIndex: 'allow_purchase', render: (_, row, index) => <Switch checked={row.allow_purchase} onChange={(v) => updateChild(index, { allow_purchase: v })} /> },
    { title: 'Active', dataIndex: 'active', render: (_, row, index) => <Switch checked={row.active} onChange={(v) => updateChild(index, { active: v })} /> },
  ];

  const updateChild = (index, patch) => {
    setVariantChildren((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Products" />

      <div style={{ background: token.colorBgLayout, minHeight: '100vh' }}>
        <Card bordered={false} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col flex="auto">
              <Space>
                <AppstoreOutlined />
                <Text strong style={{ fontSize: 18 }}>Products</Text>
              </Space>
            </Col>
            <Col>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onPressEnter={() => loadRows(1)}
                style={{ width: 260 }}
              />
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={() => loadRows(1)}>Refresh</Button>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Product</Button>
            </Col>
          </Row>
        </Card>

        <Card bordered={false}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'catalog', label: 'Catalog' },
              { key: 'variants', label: 'Child Variants' },
              { key: 'all', label: 'All Products' },
            ]}
          />
          <Table
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={pagination}
            onChange={(pager) => loadRows(pager.current, pager.pageSize)}
            scroll={{ x: 'max-content' }}
            onRow={(record) => ({
              onClick: () => router.visit(route('inventory.products.show', record.id)),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        <Drawer
          title={editing ? 'Edit Product' : 'New Product'}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={1080}
          extra={<Button type="primary" loading={saving} onClick={saveProduct}>Save Product</Button>}
        >
          <Steps
            current={step}
            onChange={setStep}
            items={[
              { title: 'Basic Info' },
              { title: 'Variant Groups', disabled: selectedProductType !== 'variant_parent' },
              { title: 'Generate', disabled: selectedProductType !== 'variant_parent' },
              { title: 'Child Variants', disabled: selectedProductType !== 'variant_parent' },
            ]}
            style={{ marginBottom: 24 }}
          />

          <Form layout="vertical" form={form} initialValues={emptyProduct}>
            {step === 0 ? (
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="product_type" label="Product Type" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: 'simple', label: 'Simple Product' },
                        { value: 'variant_parent', label: 'Variant Product' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col md={12} xs={24}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="code" label="Code"><Input /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="sku" label="Base SKU"><Input /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="barcode" label="Base Barcode"><Input /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="product_category_id" label="Category"><Select allowClear showSearch optionFilterProp="label" options={options.categories.map((x) => ({ value: x.id, label: x.name }))} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="product_unit_id" label="Unit"><Select allowClear showSearch optionFilterProp="label" options={options.units.map((x) => ({ value: x.id, label: x.name }))} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="tax_class_id" label="Tax"><Select allowClear showSearch optionFilterProp="label" options={options.taxClasses.map((x) => ({ value: x.id, label: x.name }))} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="purchase_price" label="Purchase Price"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="selling_price" label="Selling Price"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="reorder_level" label="Reorder Level"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="track_inventory" label="Track Inventory" valuePropName="checked"><Switch disabled={selectedProductType === 'variant_parent'} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="allow_sale" label="Allow Sale" valuePropName="checked"><Switch disabled={selectedProductType === 'variant_parent'} /></Form.Item></Col>
                <Col md={6} xs={24}><Form.Item name="allow_purchase" label="Allow Purchase" valuePropName="checked"><Switch disabled={selectedProductType === 'variant_parent'} /></Form.Item></Col>
                <Col span={24}><Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item></Col>
              </Row>
            ) : null}
          </Form>

          {step === 1 ? (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {variantGroups.map((group, index) => {
                const variant = options.variants.find((item) => item.id === group.variant_id);
                const lines = variant?.variant_lines || variant?.variantLines || [];

                return (
                  <Card size="small" key={index}>
                    <Row gutter={12}>
                      <Col span={8}>
                        <Select
                          placeholder="Variant group"
                          value={group.variant_id}
                          onChange={(value) => setVariantGroups((current) => current.map((row, rowIndex) => rowIndex === index ? { variant_id: value, variant_line_ids: [] } : row))}
                          options={options.variants.map((item) => ({ value: item.id, label: item.name }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={14}>
                        <Select
                          mode="multiple"
                          placeholder="Values"
                          value={group.variant_line_ids}
                          onChange={(value) => setVariantGroups((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, variant_line_ids: value } : row))}
                          options={lines.map((line) => ({ value: line.id, label: line.value }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={2}>
                        <Button danger onClick={() => setVariantGroups((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button>
                      </Col>
                    </Row>
                  </Card>
                );
              })}
              <Button icon={<PlusOutlined />} onClick={() => setVariantGroups((current) => [...current, { variant_id: null, variant_line_ids: [] }])}>Add Variant Group</Button>
            </Space>
          ) : null}

          {step === 2 ? (
            <Space>
              <Button type="primary" icon={<BranchesOutlined />} onClick={() => generateChildren(false)}>Generate Variants</Button>
              <Button onClick={() => generateChildren(true)}>Regenerate Missing Only</Button>
              <Button onClick={deactivateRemoved}>Deactivate Removed</Button>
            </Space>
          ) : null}

          {step === 3 ? (
            <Table
              rowKey={(row) => buildSignature(row.variant_line_ids)}
              size="small"
              columns={childColumns}
              dataSource={variantChildren}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          ) : null}
        </Drawer>
      </div>
    </AuthenticatedLayout>
  );
}
