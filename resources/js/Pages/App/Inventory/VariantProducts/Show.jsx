import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { Button, Card, Descriptions, Empty, Space, Table, Tabs, Tag, Typography } from 'antd';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const { Title, Text } = Typography;
const money = (value) => Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (value) => Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const optionRows = (record) => (record?.product_variant_items || record?.productVariantItems || []).map((item) => ({ id: item.id, group: item?.variant_line?.variant?.name || item?.variantLine?.variant?.name || '-', value: item?.variant_line?.value || item?.variantLine?.value || '-' }));

export default function VariantProductShow({ id, ...props }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(api(`/api/products/${id}`)).then(({ data }) => setRecord(data)).finally(() => setLoading(false));
  }, [id]);

  const inventoryColumns = useMemo(() => [
    { title: 'Warehouse', key: 'warehouse', render: (_, r) => r?.warehouse?.name || '-' },
    { title: 'Qty On Hand', dataIndex: 'qty_on_hand', key: 'qty_on_hand', align: 'right', render: qty },
    { title: 'Avg Cost', dataIndex: 'avg_cost', key: 'avg_cost', align: 'right', render: money },
    { title: 'Total Value', dataIndex: 'total_value', key: 'total_value', align: 'right', render: money },
    { title: 'Reorder Level', dataIndex: 'reorder_level', key: 'reorder_level', align: 'right', render: qty },
  ], []);

  const variantOptionColumns = [{ title: 'Variant', dataIndex: 'group', key: 'group' }, { title: 'Option', dataIndex: 'value', key: 'value' }];

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title={record?.name || 'Variant Product'} />
      <div style={{ padding: 20 }}>
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Button onClick={() => router.visit(route('inventory.variant-products.index'))}>Back to Variant Products</Button>
            <Title level={4} style={{ margin: 0 }}>{record?.name || 'Variant Product'}</Title>
            <Space wrap>
              <Tag>{record?.product_type?.replace('_', ' ') || '-'}</Tag>
              <Tag color={record?.active ? 'green' : 'default'}>{record?.active ? 'Active' : 'Inactive'}</Tag>
              <Text type="secondary">{record?.sku || record?.code || '-'}</Text>
            </Space>
          </Space>
        </Card>
        <Card bordered={false} loading={loading}>
          {!record ? <Empty /> : (
            <Tabs items={[
              { key: 'overview', label: 'Overview', children: <Descriptions bordered size="small" column={2} items={[
                { key: 'code', label: 'Product Code', children: record.code || '-' },
                { key: 'sku', label: 'SKU', children: record.sku || '-' },
                { key: 'barcode', label: 'Barcode', children: record.barcode || '-' },
                { key: 'category', label: 'Category', children: record?.product_category?.name || record?.productCategory?.name || '-' },
                { key: 'unit', label: 'Unit', children: record?.product_unit?.name || record?.productUnit?.name || '-' },
                { key: 'track', label: 'Track Inventory', children: record.track_inventory ? 'Yes' : 'No' },
              ]} /> },
              { key: 'options', label: 'Variant Options', children: <Table rowKey="id" size="small" pagination={false} columns={variantOptionColumns} dataSource={optionRows(record)} /> },
              { key: 'pricing', label: 'Pricing', children: <Descriptions bordered size="small" column={2} items={[
                { key: 'purchase', label: 'Purchase Price', children: money(record.purchase_price) },
                { key: 'selling', label: 'Selling Price', children: money(record.selling_price) },
                { key: 'valuation', label: 'Valuation Method', children: record.valuation_method || '-' },
              ]} /> },
              { key: 'inventory', label: 'Inventory by Warehouse', children: <Table rowKey="id" size="small" pagination={false} columns={inventoryColumns} dataSource={record?.warehouse_items || record?.warehouseItems || []} /> },
              { key: 'sales-purchase', label: 'Sales/Purchase Info', children: <Descriptions bordered size="small" column={2} items={[
                { key: 'sale', label: 'Allow Sale', children: record.allow_sale ? 'Yes' : 'No' },
                { key: 'purchase', label: 'Allow Purchase', children: record.allow_purchase ? 'Yes' : 'No' },
                { key: 'salesAccount', label: 'Sales Account', children: record?.sales_account?.name || record?.salesAccount?.name || '-' },
                { key: 'purchaseAccount', label: 'Purchase Account', children: record?.purchase_account?.name || record?.purchaseAccount?.name || '-' },
              ]} /> },
            ]} />
          )}
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
