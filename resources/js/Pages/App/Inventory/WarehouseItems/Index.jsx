import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Button, Card, Checkbox, Col, Input, Row, Select, Space, Table, Tag, Typography, theme } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const { Title } = Typography;

const money = (value) => Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (value) => Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const statusColor = (value) => ({ 'Out of Stock': 'red', 'Low Stock': 'orange', 'In Stock': 'green' }[value] || 'default');

export default function WarehouseItemsIndex(props) {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ warehouses: [], products: [], categories: [], branches: props.branchContext?.branches || [] });
  const [filters, setFilters] = useState({ search: '', warehouse_id: undefined, product_id: undefined, category_id: undefined, branch_id: props.branchContext?.selectedBranchId, include_zero_stock: false, include_inactive: false });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [ordering, setOrdering] = useState('product_name');

  const loadOptions = async () => {
    const [warehouses, products, categories] = await Promise.all([
      axios.get(api('/api/warehouses/'), { params: { page_size: 100 } }),
      axios.get(api('/api/products/'), { params: { page_size: 100 } }),
      axios.get(api('/api/product-categories/'), { params: { page_size: 100 } }),
    ]);
    setOptions((prev) => ({
      ...prev,
      warehouses: warehouses.data?.results || [],
      products: products.data?.results || [],
      categories: categories.data?.results || [],
    }));
  };

  const loadRows = async (page = pagination.current, pageSize = pagination.pageSize, nextOrdering = ordering) => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/warehouse-items/'), {
        params: {
          ...filters,
          include_zero_stock: filters.include_zero_stock ? 1 : 0,
          include_inactive: filters.include_inactive ? 1 : 0,
          page,
          page_size: pageSize,
          ordering: nextOrdering,
        },
      });
      setRows(data.results || []);
      setPagination({ current: page, pageSize, total: data.count || 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOptions(); loadRows(1); }, []);

  const columns = useMemo(() => [
    { title: 'Warehouse', key: 'warehouse_name', sorter: true, render: (_, r) => r?.warehouse?.name || '-' },
    { title: 'Product Code', key: 'code', render: (_, r) => r?.product?.code || '-' },
    { title: 'Product Name', key: 'product_name', sorter: true, render: (_, r) => r?.product?.name || '-' },
    { title: 'SKU', key: 'sku', render: (_, r) => r?.product?.sku || '-' },
    { title: 'Unit', key: 'unit', render: (_, r) => r?.product?.product_unit?.name || r?.product?.productUnit?.name || '-' },
    { title: 'Qty On Hand', dataIndex: 'qty_on_hand', key: 'qty_on_hand', sorter: true, align: 'right', render: qty },
    { title: 'Avg Cost', dataIndex: 'avg_cost', key: 'avg_cost', align: 'right', render: money },
    { title: 'Total Value', dataIndex: 'total_value', key: 'total_value', sorter: true, align: 'right', render: money },
    { title: 'Reorder Level', dataIndex: 'reorder_level', key: 'reorder_level', align: 'right', render: qty },
    { title: 'Stock Status', dataIndex: 'stock_status', key: 'stock_status', render: (v) => <Tag color={statusColor(v)}>{v}</Tag> },
  ], []);

  const handleTableChange = (nextPagination, _filters, sorter) => {
    const map = { product_name: 'product_name', warehouse_name: 'warehouse_name', qty_on_hand: 'qty_on_hand', total_value: 'total_value' };
    const key = sorter?.order ? map[sorter.columnKey] : ordering;
    const nextOrdering = sorter?.order === 'descend' ? `-${key}` : key;
    setOrdering(nextOrdering);
    loadRows(nextPagination.current, nextPagination.pageSize, nextOrdering);
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Warehouse Stock" />
      <div style={{ padding: 20 }}>
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>Warehouse Stock</Title>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8} lg={6}><Input allowClear prefix={<SearchOutlined />} placeholder="Search product, SKU, barcode, warehouse" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} onPressEnter={() => loadRows(1)} /></Col>
              <Col xs={24} md={8} lg={5}><Select allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Warehouse" value={filters.warehouse_id} onChange={(v) => setFilters((p) => ({ ...p, warehouse_id: v }))} options={options.warehouses.map((x) => ({ value: x.id, label: x.name }))} /></Col>
              <Col xs={24} md={8} lg={5}><Select allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Product" value={filters.product_id} onChange={(v) => setFilters((p) => ({ ...p, product_id: v }))} options={options.products.map((x) => ({ value: x.id, label: x.name }))} /></Col>
              <Col xs={24} md={8} lg={4}><Select allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Category" value={filters.category_id} onChange={(v) => setFilters((p) => ({ ...p, category_id: v }))} options={options.categories.map((x) => ({ value: x.id, label: x.name }))} /></Col>
              <Col xs={24} md={8} lg={4}><Select allowClear style={{ width: '100%' }} placeholder="Branch" value={filters.branch_id} onChange={(v) => setFilters((p) => ({ ...p, branch_id: v }))} options={(options.branches || []).map((x) => ({ value: x.id, label: x.name }))} /></Col>
              <Col xs={24}><Space wrap>
                <Checkbox checked={filters.include_zero_stock} onChange={(e) => setFilters((p) => ({ ...p, include_zero_stock: e.target.checked }))}>Include zero stock</Checkbox>
                <Checkbox checked={filters.include_inactive} onChange={(e) => setFilters((p) => ({ ...p, include_inactive: e.target.checked }))}>Include inactive</Checkbox>
                <Button type="primary" onClick={() => loadRows(1)}>Apply</Button>
                <Button icon={<ReloadOutlined />} onClick={() => { setFilters((p) => ({ ...p, search: '', warehouse_id: undefined, product_id: undefined, category_id: undefined, include_zero_stock: false, include_inactive: false })); setTimeout(() => loadRows(1), 0); }}>Reset</Button>
                <Button icon={<DownloadOutlined />} onClick={() => window.open(api('/api/reports/inventory/warehouse-wise-stock/export?format=xlsx'), '_blank')}>Export</Button>
              </Space></Col>
            </Row>
          </Space>
        </Card>
        <Card bordered={false} bodyStyle={{ padding: 0, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Table rowKey="id" size="small" columns={columns} dataSource={rows} loading={loading} pagination={pagination} onChange={handleTableChange} scroll={{ x: 'max-content' }} />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
