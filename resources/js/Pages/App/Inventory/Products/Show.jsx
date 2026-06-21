import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { Button, Card, Descriptions, Empty, Space, Table, Tabs, Tag, Typography } from 'antd';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const { Title, Text } = Typography;

const money = (value) =>
  Number(value || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const qty = (value) =>
  Number(value || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

export default function ProductShow({ id, auth }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(api(`/api/products/${id}`))
      .then(({ data }) => setRecord(data))
      .finally(() => setLoading(false));
  }, [id]);

  const stockColumns = useMemo(() => [
    { title: 'Warehouse', key: 'warehouse', render: (_, row) => row.warehouse?.name || '-' },
    { title: 'Qty On Hand', dataIndex: 'qty_on_hand', align: 'right', render: qty },
    { title: 'Avg Cost', dataIndex: 'avg_cost', align: 'right', render: money },
    { title: 'Total Value', dataIndex: 'total_value', align: 'right', render: money },
  ], []);

  const variantColumns = useMemo(() => [
    { title: 'Variant', dataIndex: 'name' },
    { title: 'Options', dataIndex: 'variant_label' },
    { title: 'SKU', dataIndex: 'sku' },
    { title: 'Barcode', dataIndex: 'barcode' },
    { title: 'Stock', key: 'stock', align: 'right', render: (_, row) => qty(row.stock_summary?.qty_on_hand) },
    { title: 'Selling Price', dataIndex: 'selling_price', align: 'right', render: money },
    { title: 'Active', dataIndex: 'active', render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag> },
  ], []);

  const optionColumns = useMemo(() => [
    { title: 'Variant Group', dataIndex: 'variant_name' },
    { title: 'Value', dataIndex: 'variant_line_value' },
  ], []);

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title={record?.name || 'Product'} />
      <Card bordered={false} loading={loading}>
        {!record ? <Empty /> : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space direction="vertical" size={4}>
              <Button onClick={() => router.visit(route('inventory.products.index'))}>Back to Products</Button>
              <Title level={4} style={{ margin: 0 }}>{record.name}</Title>
              <Space wrap>
                <Tag color={record.product_type === 'variant_parent' ? 'purple' : record.product_type === 'variant' ? 'green' : 'blue'}>
                  {String(record.product_type || 'simple').replace('_', ' ')}
                </Tag>
                <Tag color={record.active ? 'green' : 'default'}>{record.active ? 'Active' : 'Inactive'}</Tag>
                <Text type="secondary">{[record.sku, record.barcode].filter(Boolean).join(' | ') || record.code || '-'}</Text>
              </Space>
            </Space>

            <Tabs
              items={[
                {
                  key: 'overview',
                  label: 'Overview',
                  children: (
                    <Descriptions bordered size="small" column={2} items={[
                      { key: 'category', label: 'Category', children: record.product_category?.name || '-' },
                      { key: 'unit', label: 'Unit', children: record.product_unit?.name || '-' },
                      { key: 'parent', label: 'Parent Product', children: record.parent_detail?.name || '-' },
                      { key: 'variant', label: 'Variant Options', children: record.variant_label || '-' },
                      { key: 'purchase', label: 'Purchase Price', children: money(record.purchase_price) },
                      { key: 'selling', label: 'Selling Price', children: money(record.selling_price) },
                      { key: 'track', label: 'Track Inventory', children: record.track_inventory ? 'Yes' : 'No' },
                      { key: 'stock', label: 'Total Stock', children: qty(record.stock_summary?.qty_on_hand) },
                    ]} />
                  ),
                },
                record.product_type === 'variant_parent'
                  ? {
                      key: 'children',
                      label: `Child Variants (${record.children_count || 0})`,
                      children: <Table rowKey="id" size="small" columns={variantColumns} dataSource={record.children || []} pagination={false} />,
                    }
                  : null,
                record.product_type === 'variant'
                  ? {
                      key: 'options',
                      label: 'Variant Attributes',
                      children: <Table rowKey="variant_line_id" size="small" columns={optionColumns} dataSource={record.variant_options || []} pagination={false} />,
                    }
                  : null,
                {
                  key: 'stock',
                  label: 'Warehouse Stock',
                  children: <Table rowKey="id" size="small" columns={stockColumns} dataSource={record.warehouse_items || record.warehouseItems || []} pagination={false} />,
                },
                {
                  key: 'sales-purchase',
                  label: 'Sales/Purchase',
                  children: (
                    <Descriptions bordered size="small" column={2} items={[
                      { key: 'allow_sale', label: 'Allow Sale', children: record.allow_sale ? 'Yes' : 'No' },
                      { key: 'allow_purchase', label: 'Allow Purchase', children: record.allow_purchase ? 'Yes' : 'No' },
                      { key: 'sales_account', label: 'Sales Account', children: record.sales_account?.name || '-' },
                      { key: 'purchase_account', label: 'Purchase Account', children: record.purchase_account?.name || '-' },
                    ]} />
                  ),
                },
              ].filter(Boolean)}
            />
          </Space>
        )}
      </Card>
    </AuthenticatedLayout>
  );
}
