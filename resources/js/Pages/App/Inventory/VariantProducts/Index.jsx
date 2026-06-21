import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { Button, Card, Checkbox, Col, Input, Row, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const { Title, Text } = Typography;
const money = (value) => Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const yesNo = (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Yes' : 'No'}</Tag>;
const optionLabel = (record) => (record?.product_variant_items || record?.productVariantItems || []).map((item) => item?.variant_line?.variant?.name || item?.variantLine?.variant?.name ? `${item?.variant_line?.variant?.name || item?.variantLine?.variant?.name}: ${item?.variant_line?.value || item?.variantLine?.value || ''}` : '').filter(Boolean).join(' / ') || '-';

export default function VariantProductsIndex(props) {
  const [activeTab, setActiveTab] = useState('parents');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ categories: [], variants: [] });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', category_id: undefined, active: undefined, track_inventory: undefined, variant_group_id: undefined });

  const productType = activeTab === 'parents' ? 'variant_parent' : activeTab === 'items' ? 'variant' : undefined;

  const loadOptions = async () => {
    const [categories, variants] = await Promise.all([
      axios.get(api('/api/product-categories/'), { params: { page_size: 100 } }),
      axios.get(api('/api/variants/'), { params: { page_size: 100 } }),
    ]);
    setOptions({ categories: categories.data?.results || [], variants: variants.data?.results || [] });
  };

  const loadRows = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const params = { ...filters, page, page_size: pageSize, ordering: 'name' };
      if (productType) params.product_type = productType;
      const { data } = await axios.get(api('/api/products/'), { params });
      const nextRows = activeTab === 'all'
        ? (data.results || []).filter((row) => ['variant_parent', 'variant'].includes(row.product_type))
        : data.results || [];
      setRows(nextRows);
      setPagination({ current: page, pageSize, total: data.count || nextRows.length });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOptions(); loadRows(1); }, []);
  useEffect(() => { loadRows(1); }, [activeTab]);

  const columns = useMemo(() => [
    { title: 'Product Name', dataIndex: 'name', key: 'name', sorter: true, render: (v, r) => <Space direction="vertical" size={0}><Text strong>{v}</Text><Text type="secondary">{r.product_type?.replace('_', ' ')}</Text></Space> },
    { title: 'Product Code', dataIndex: 'code', key: 'code' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode' },
    { title: 'Category', key: 'category', render: (_, r) => r?.product_category?.name || r?.productCategory?.name || '-' },
    { title: 'Unit', key: 'unit', render: (_, r) => r?.product_unit?.name || r?.productUnit?.name || '-' },
    { title: 'Variant Options', key: 'variant_options', render: (_, r) => optionLabel(r) },
    { title: 'Selling Price', dataIndex: 'selling_price', key: 'selling_price', align: 'right', render: money },
    { title: 'Purchase Price', dataIndex: 'purchase_price', key: 'purchase_price', align: 'right', render: money },
    { title: 'Track Inventory', dataIndex: 'track_inventory', key: 'track_inventory', render: yesNo },
    { title: 'Active', dataIndex: 'active', key: 'active', render: yesNo },
  ], []);

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Variant Products" />
      <div style={{ padding: 20 }}>
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>Variant Products</Title>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
              { key: 'parents', label: 'Variant Parents' },
              { key: 'items', label: 'Variant Items' },
              { key: 'all', label: 'All Variant Products' },
            ]} />
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8} lg={6}><Input allowClear prefix={<SearchOutlined />} placeholder="Search name, code, SKU, barcode" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} onPressEnter={() => loadRows(1)} /></Col>
              <Col xs={24} md={8} lg={5}><Select allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Category" value={filters.category_id} onChange={(v) => setFilters((p) => ({ ...p, category_id: v }))} options={options.categories.map((x) => ({ value: x.id, label: x.name }))} /></Col>
              <Col xs={24} md={8} lg={5}><Select allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Variant Group" value={filters.variant_group_id} onChange={(v) => setFilters((p) => ({ ...p, variant_group_id: v }))} options={options.variants.map((x) => ({ value: x.id, label: x.name }))} /></Col>
              <Col xs={24} md={8} lg={4}><Select allowClear style={{ width: '100%' }} placeholder="Active" value={filters.active} onChange={(v) => setFilters((p) => ({ ...p, active: v }))} options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} /></Col>
              <Col xs={24} md={8} lg={4}><Checkbox checked={filters.track_inventory === true} onChange={(e) => setFilters((p) => ({ ...p, track_inventory: e.target.checked ? true : undefined }))}>Track inventory</Checkbox></Col>
              <Col xs={24}><Space><Button type="primary" onClick={() => loadRows(1)}>Apply</Button><Button icon={<ReloadOutlined />} onClick={() => { setFilters({ search: '', category_id: undefined, active: undefined, track_inventory: undefined, variant_group_id: undefined }); setTimeout(() => loadRows(1), 0); }}>Reset</Button></Space></Col>
            </Row>
          </Space>
        </Card>
        <Card bordered={false}>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={pagination}
            onChange={(p) => loadRows(p.current, p.pageSize)}
            scroll={{ x: 'max-content' }}
            onRow={(record) => ({ onClick: () => router.visit(route('inventory.variant-products.show', record.id)), style: { cursor: 'pointer' } })}
          />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
