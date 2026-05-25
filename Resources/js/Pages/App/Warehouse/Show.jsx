import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
  Alert, Badge, Button, Card, Col, Descriptions, Empty, Input,
  Modal, Progress, Row, Skeleton, Space, Table, Tabs, Tag,
  Typography, message, Form,
} from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined, ArrowDownOutlined,
  EditOutlined, ExclamationCircleOutlined, InboxOutlined,
  PlusOutlined, SearchOutlined, SwapOutlined, ToolOutlined,
  WarningOutlined, CheckCircleOutlined, CloseCircleOutlined,
  FileTextOutlined, DashboardOutlined, BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const authHeaders = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const fmtNum = (v, d = 2) =>
  Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtQty = (v) => {
  const n = Number(v ?? 0);
  return n === Math.floor(n) ? n.toLocaleString() : fmtNum(v, 4).replace(/\.?0+$/, '');
};
const fmtDate = (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD MMM YYYY') : '-');
const fmtDateShort = (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD MMM') : '-');
const ago = (v) => (v && dayjs(v).isValid() ? dayjs(v).fromNow() : '-');

const get = (path, params = {}) =>
  axios.get(api(path), { headers: authHeaders(), params });

// ─── Status helpers ────────────────────────────────────────────────────────────
const stockStatus = (item) => {
  const qty = Number(item?.qty_on_hand ?? 0);
  const reorder = Number(item?.reorder_level ?? item?.product?.reorder_level ?? 0);
  if (qty < 0) return { label: 'Negative', color: 'red', icon: <ExclamationCircleOutlined /> };
  if (qty === 0) return { label: 'Out of Stock', color: 'volcano', icon: <CloseCircleOutlined /> };
  if (reorder > 0 && qty <= reorder) return { label: 'Low Stock', color: 'gold', icon: <WarningOutlined /> };
  return { label: 'In Stock', color: 'green', icon: <CheckCircleOutlined /> };
};

const txnStatus = (s) => {
  const m = { draft: ['default', 'Draft'], approved: ['success', 'Approved'], posted: ['success', 'Posted'],
    void: ['error', 'Void'], cancelled: ['error', 'Cancelled'], completed: ['success', 'Completed'] };
  const [color, label] = m[s] || ['default', s || 'Draft'];
  return <Tag color={color}>{label}</Tag>;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, suffix, icon, color = '#1677ff', subtext, onClick }) {
  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
      style={{ borderTop: `3px solid ${color}`, cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontSize: 20, color,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{title}</Text>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{value}</span>
            {suffix && <Text type="secondary" style={{ fontSize: 12 }}>{suffix}</Text>}
          </div>
          {subtext && <Text type="secondary" style={{ fontSize: 11 }}>{subtext}</Text>}
        </div>
      </div>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function WarehouseShow({ id, ...props }) {
  const [warehouse, setWarehouse] = useState(null);
  const [items, setItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [productionJournals, setProductionJournals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState(null);

  const [itemSearch, setItemSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('stock');

  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // ── Load all data ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadCore = async () => {
      try {
        const res = await get(`/api/warehouses/${id}/`);
        if (!cancelled) setWarehouse(res.data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load warehouse');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadItems = async () => {
      try {
        const res = await get('/api/warehouse-items/', {
          warehouse_id: id, include_zero_stock: 1, include_inactive: 1,
          page_size: 500, ordering: '-total_value',
        });
        if (!cancelled) setItems(res.data?.results || res.data || []);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };

    const loadActivity = async () => {
      try {
        const [fromRes, toRes, adjRes, pjRes] = await Promise.allSettled([
          get('/api/warehouse-transfers/', { from_warehouse_id: id, page_size: 20, ordering: '-created_at' }),
          get('/api/warehouse-transfers/', { to_warehouse_id: id, page_size: 20, ordering: '-created_at' }),
          get('/api/adjustments/', { warehouse_id: id, page_size: 15, ordering: '-created_at' }),
          get('/api/production-journals/', { warehouse_id: id, page_size: 10, ordering: '-created_at' }),
        ]);

        if (!cancelled) {
          const fromList = (fromRes.status === 'fulfilled' ? fromRes.value.data?.results || [] : [])
            .map((t) => ({ ...t, _direction: 'out', _other: t.toWarehouse }));
          const toList = (toRes.status === 'fulfilled' ? toRes.value.data?.results || [] : [])
            .map((t) => ({ ...t, _direction: 'in', _other: t.fromWarehouse }));
          const merged = [...fromList, ...toList]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 25);
          setTransfers(merged);
          setAdjustments(adjRes.status === 'fulfilled' ? adjRes.value.data?.results || [] : []);
          setProductionJournals(pjRes.status === 'fulfilled' ? pjRes.value.data?.results || [] : []);
        }
      } finally {
        if (!cancelled) setLoadingActivity(false);
      }
    };

    loadCore();
    loadItems();
    loadActivity();
    return () => { cancelled = true; };
  }, [id]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + Number(i.total_value ?? 0), 0);
    const inStock = items.filter((i) => Number(i.qty_on_hand) > 0);
    const reorderLevel = items.filter((i) => {
      const qty = Number(i.qty_on_hand); const reorder = Number(i.reorder_level ?? i.product?.reorder_level ?? 0);
      return qty > 0 && reorder > 0 && qty <= reorder;
    });
    const outOfStock = items.filter((i) => Number(i.qty_on_hand) === 0);
    const negative = items.filter((i) => Number(i.qty_on_hand) < 0);

    // Value by category
    const byCat = {};
    items.forEach((i) => {
      const cat = i.product?.productCategory?.name || i.product?.category_name || 'Uncategorised';
      byCat[cat] = (byCat[cat] || 0) + Number(i.total_value ?? 0);
    });
    const catBreakdown = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }));

    return { total, skus: items.length, inStock: inStock.length, lowStock: reorderLevel.length, outOfStock: outOfStock.length, negative: negative.length, catBreakdown };
  }, [items]);

  // ── Filtered items ───────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let list = items;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      list = list.filter((i) =>
        i.product?.name?.toLowerCase().includes(q) ||
        i.product?.code?.toLowerCase().includes(q) ||
        i.product?.sku?.toLowerCase().includes(q)
      );
    }
    if (stockFilter !== 'all') {
      if (stockFilter === 'in') list = list.filter((i) => Number(i.qty_on_hand) > 0);
      if (stockFilter === 'low') list = list.filter((i) => {
        const qty = Number(i.qty_on_hand); const reorder = Number(i.reorder_level ?? i.product?.reorder_level ?? 0);
        return qty > 0 && reorder > 0 && qty <= reorder;
      });
      if (stockFilter === 'out') list = list.filter((i) => Number(i.qty_on_hand) === 0);
      if (stockFilter === 'negative') list = list.filter((i) => Number(i.qty_on_hand) < 0);
    }
    return list;
  }, [items, itemSearch, stockFilter]);

  // ── Edit warehouse ────────────────────────────────────────────────────────────
  const openEdit = () => {
    editForm.setFieldsValue({ name: warehouse?.name, code: warehouse?.code, address: warehouse?.address });
    setEditOpen(true);
  };
  const saveEdit = async () => {
    const v = await editForm.validateFields().catch(() => null);
    if (!v) return;
    setSaving(true);
    try {
      const res = await axios.patch(api(`/api/warehouses/${id}/`), v, {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      setWarehouse(res.data);
      setEditOpen(false);
      message.success('Warehouse updated');
    } catch (e) {
      message.error(e?.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  // ── Columns ──────────────────────────────────────────────────────────────────
  const itemColumns = [
    {
      title: 'Product', key: 'product', width: 220,
      render: (_, r) => (
        <div>
          <Text strong style={{ display: 'block', lineHeight: 1.3 }}>{r.product?.name || '-'}</Text>
          {r.product?.sku && <Text type="secondary" style={{ fontSize: 11 }}>{r.product.sku}</Text>}
        </div>
      ),
    },
    {
      title: 'Code', key: 'code', width: 90,
      render: (_, r) => r.product?.code ? <Tag>{r.product.code}</Tag> : '-',
    },
    {
      title: 'Category', key: 'category', width: 130,
      render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{r.product?.productCategory?.name || '—'}</Text>,
    },
    {
      title: 'Unit', key: 'unit', width: 70, align: 'center',
      render: (_, r) => r.product?.productUnit?.name || r.unit_code || '—',
    },
    {
      title: 'Qty on Hand', dataIndex: 'qty_on_hand', align: 'right', width: 120,
      sorter: (a, b) => Number(a.qty_on_hand) - Number(b.qty_on_hand),
      render: (v) => {
        const n = Number(v ?? 0);
        return <Text strong style={{ color: n < 0 ? '#cf1322' : n === 0 ? '#8c8c8c' : '#111' }}>{fmtQty(v)}</Text>;
      },
    },
    {
      title: 'Reorder Level', dataIndex: 'reorder_level', align: 'right', width: 120,
      render: (v, r) => {
        const reorder = Number(v ?? r.product?.reorder_level ?? 0);
        return reorder > 0 ? fmtQty(reorder) : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Avg Cost', dataIndex: 'avg_cost', align: 'right', width: 110,
      sorter: (a, b) => Number(a.avg_cost) - Number(b.avg_cost),
      render: (v) => fmtNum(v),
    },
    {
      title: 'Total Value', dataIndex: 'total_value', align: 'right', width: 130,
      sorter: (a, b) => Number(a.total_value) - Number(b.total_value),
      defaultSortOrder: 'descend',
      render: (v) => <Text strong>{fmtNum(v)}</Text>,
    },
    {
      title: 'Status', key: 'status', width: 120, align: 'center',
      render: (_, r) => {
        const s = stockStatus(r);
        return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
      },
    },
  ];

  const transferColumns = [
    {
      title: 'No', dataIndex: 'transfer_no', width: 120,
      render: (v, r) => (
        <Button type="link" size="small" style={{ padding: 0 }}
          onClick={() => router.visit(route('inventory.warehouse-transfers.show', r.id))}>
          {v || '#draft'}
        </Button>
      ),
    },
    {
      title: 'Date', dataIndex: 'transfer_date', width: 100,
      render: (v) => fmtDate(v),
    },
    {
      title: 'Direction', key: 'dir', width: 100, align: 'center',
      render: (_, r) => r._direction === 'in'
        ? <Tag color="green" icon={<ArrowDownOutlined />}>IN</Tag>
        : <Tag color="blue" icon={<ArrowUpOutlined />}>OUT</Tag>,
    },
    {
      title: 'Other Warehouse', key: 'other', width: 160,
      render: (_, r) => r._other?.name || r._other?.label || '—',
    },
    {
      title: 'Total Value', dataIndex: 'total', align: 'right', width: 120,
      render: (v) => v ? fmtNum(v) : '—',
    },
    {
      title: 'Status', dataIndex: 'status', width: 110,
      render: (v) => txnStatus(v),
    },
    {
      title: '', key: 'action', width: 50,
      render: (_, r) => (
        <Button type="text" size="small" icon={<ArrowRightOutlined />}
          onClick={() => router.visit(route('inventory.warehouse-transfers.show', r.id))} />
      ),
    },
  ];

  const adjColumns = [
    {
      title: 'No', dataIndex: 'adjustment_no', width: 130,
      render: (v, r) => (
        <Button type="link" size="small" style={{ padding: 0 }}
          onClick={() => router.visit(route('inventory.adjustments.show', r.id))}>
          {v || '#draft'}
        </Button>
      ),
    },
    { title: 'Date', dataIndex: 'adjustment_date', width: 110, render: (v) => fmtDate(v) },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true, render: (v) => v || '—' },
    {
      title: 'Items', key: 'items', width: 80, align: 'center',
      render: (_, r) => {
        const lines = r.items || r.inventoryAdjustmentLines || [];
        return <Badge count={lines.length} color="blue" />;
      },
    },
    { title: 'Status', dataIndex: 'status', width: 110, render: (v) => txnStatus(v) },
    {
      title: '', key: 'action', width: 50,
      render: (_, r) => (
        <Button type="text" size="small" icon={<ArrowRightOutlined />}
          onClick={() => router.visit(route('inventory.adjustments.show', r.id))} />
      ),
    },
  ];

  const pjColumns = [
    {
      title: 'Journal No', dataIndex: 'code', width: 140,
      render: (v, r) => (
        <Button type="link" size="small" style={{ padding: 0 }}
          onClick={() => router.visit(route('inventory.production-journals.show', r.id))}>
          {v || '#draft'}
        </Button>
      ),
    },
    { title: 'Date', dataIndex: 'date', width: 110, render: (v) => fmtDate(v) },
    {
      title: 'Finished Product', key: 'fp', ellipsis: true,
      render: (_, r) => r.finishedProduct?.name || r.finished_product_id || '—',
    },
    {
      title: 'Output Qty', dataIndex: 'output_quantity', width: 110, align: 'right',
      render: (v, r) => `${fmtQty(v)} ${r.output_unit_code || ''}`.trim(),
    },
    {
      title: 'Total Cost', dataIndex: 'finished_goods_cost', align: 'right', width: 120,
      render: (v) => fmtNum(v),
    },
    { title: 'Status', dataIndex: 'status', width: 100, render: (v) => txnStatus(v) },
  ];

  // ─── Loading / Error ────────────────────────────────────────────────────────
  if (loading) return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Warehouse" />
      <div style={{ padding: 32 }}><Skeleton active paragraph={{ rows: 12 }} /></div>
    </AuthenticatedLayout>
  );

  if (error) return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Warehouse" />
      <div style={{ padding: 24 }}><Alert type="error" showIcon message={error} /></div>
    </AuthenticatedLayout>
  );

  const CAT_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96'];

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title={`Warehouse — ${warehouse?.name}`} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '12px 24px', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('warehouse.index'))}>
          Back
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#1677ff12',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <InboxOutlined style={{ fontSize: 20, color: '#1677ff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={5} style={{ margin: 0 }}>{warehouse?.name}</Title>
              {warehouse?.code && <Tag color="blue">{warehouse.code}</Tag>}
              <Tag color={warehouse?.active ? 'success' : 'error'}>
                {warehouse?.active ? 'Active' : 'Inactive'}
              </Tag>
              {warehouse?.is_system_generated && <Tag color="purple">System</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {warehouse?.branch?.name || warehouse?.branch?.label || ''}
              {warehouse?.address && ` · ${warehouse.address}`}
            </Text>
          </div>
        </div>

        <Space wrap>
          <Button icon={<EditOutlined />} onClick={openEdit}>Edit</Button>
          <Button icon={<SwapOutlined />} type="default"
            onClick={() => router.visit(route('inventory.warehouse-transfers.add'))}>
            New Transfer
          </Button>
          <Button icon={<ToolOutlined />} type="default"
            onClick={() => router.visit(route('inventory.adjustments.add'))}>
            New Adjustment
          </Button>
        </Space>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 48px' }}>

        {/* KPI Cards */}
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Total Stock Value" value={fmtNum(stats.total)}
              icon={<BarChartOutlined />} color="#1677ff"
              subtext={`${stats.skus} SKUs`} onClick={() => setActiveTab('stock')} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="In Stock" value={stats.inStock}
              suffix="SKUs" icon={<CheckCircleOutlined />} color="#52c41a"
              onClick={() => { setActiveTab('stock'); setStockFilter('in'); }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Low Stock" value={stats.lowStock}
              suffix="SKUs" icon={<WarningOutlined />} color="#faad14"
              subtext="Below reorder level"
              onClick={() => { setActiveTab('stock'); setStockFilter('low'); }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Out of Stock" value={stats.outOfStock}
              suffix="SKUs" icon={<CloseCircleOutlined />} color="#ff4d4f"
              onClick={() => { setActiveTab('stock'); setStockFilter('out'); }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Negative Stock" value={stats.negative}
              suffix="SKUs" icon={<ExclamationCircleOutlined />} color="#cf1322"
              subtext={stats.negative > 0 ? 'Needs attention' : 'All clear'}
              onClick={() => { setActiveTab('stock'); setStockFilter('negative'); }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Transfers" value={transfers.length}
              suffix="recent" icon={<SwapOutlined />} color="#722ed1"
              onClick={() => setActiveTab('transfers')} />
          </Col>
        </Row>

        {/* Overview + Category Breakdown */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={10}>
            <Card size="small" title={<Space><FileTextOutlined /><span>Warehouse Details</span></Space>} style={{ height: '100%' }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Warehouse Name">{warehouse?.name}</Descriptions.Item>
                <Descriptions.Item label="Code">
                  {warehouse?.code ? <Tag color="blue">{warehouse.code}</Tag> : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Branch">{warehouse?.branch?.name || warehouse?.branch?.label || '—'}</Descriptions.Item>
                <Descriptions.Item label="Address">{warehouse?.address || <Text type="secondary">No address set</Text>}</Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag color={warehouse?.is_system_generated ? 'purple' : 'default'}>
                    {warehouse?.is_system_generated ? 'System Generated' : 'Manual'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={warehouse?.active ? 'success' : 'error'}>
                    {warehouse?.active ? 'Active' : 'Inactive'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Created">{fmtDate(warehouse?.created_at)}</Descriptions.Item>
                <Descriptions.Item label="Last Updated">{ago(warehouse?.updated_at)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card size="small"
              title={<Space><DashboardOutlined /><span>Stock Value by Category</span></Space>}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Total: {fmtNum(stats.total)}</Text>}
              style={{ height: '100%' }}>
              {loadingItems ? <Skeleton paragraph={{ rows: 5 }} active /> :
                stats.catBreakdown.length === 0 ? (
                  <Empty description="No stock data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                    {stats.catBreakdown.map((cat, idx) => (
                      <div key={cat.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Space size={6}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[idx % CAT_COLORS.length] }} />
                            <Text style={{ fontSize: 13 }}>{cat.name}</Text>
                          </Space>
                          <Space size={12}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{cat.pct}%</Text>
                            <Text strong style={{ fontSize: 13 }}>{fmtNum(cat.value)}</Text>
                          </Space>
                        </div>
                        <Progress
                          percent={cat.pct} showInfo={false} size={[undefined, 6]}
                          strokeColor={CAT_COLORS[idx % CAT_COLORS.length]}
                          trailColor="#f5f5f5"
                        />
                      </div>
                    ))}
                  </div>
                )
              }
            </Card>
          </Col>
        </Row>

        {/* Tabs: Stock / Transfers / Adjustments / Production */}
        <Card size="small" bodyStyle={{ padding: 0 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            style={{ padding: '0 16px' }}
            items={[
              {
                key: 'stock',
                label: (
                  <Space>
                    <InboxOutlined />
                    Stock Inventory
                    <Badge count={stats.skus} color="#1677ff" overflowCount={999} />
                  </Space>
                ),
                children: (
                  <div style={{ padding: '0 0 16px' }}>
                    {/* Filter bar */}
                    <div style={{ display: 'flex', gap: 8, padding: '12px 0', flexWrap: 'wrap' }}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        placeholder="Search product name, SKU, code…"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        allowClear
                        style={{ width: 280 }}
                      />
                      <Space>
                        {[
                          { key: 'all', label: 'All', count: stats.skus },
                          { key: 'in', label: 'In Stock', count: stats.inStock, color: '#52c41a' },
                          { key: 'low', label: 'Low Stock', count: stats.lowStock, color: '#faad14' },
                          { key: 'out', label: 'Out of Stock', count: stats.outOfStock, color: '#ff4d4f' },
                          { key: 'negative', label: 'Negative', count: stats.negative, color: '#cf1322' },
                        ].map((f) => (
                          <Button
                            key={f.key}
                            size="small"
                            type={stockFilter === f.key ? 'primary' : 'default'}
                            onClick={() => setStockFilter(f.key)}
                          >
                            {f.label}
                            {f.count > 0 && (
                              <Badge count={f.count} size="small"
                                style={{ marginLeft: 4, backgroundColor: stockFilter === f.key ? '#fff' : (f.color || '#1677ff'), color: stockFilter === f.key ? '#1677ff' : '#fff' }} />
                            )}
                          </Button>
                        ))}
                      </Space>
                    </div>

                    {loadingItems ? (
                      <Skeleton active paragraph={{ rows: 8 }} />
                    ) : filteredItems.length === 0 ? (
                      <Empty description="No matching products" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                    ) : (
                      <Table
                        rowKey="id"
                        size="small"
                        columns={itemColumns}
                        dataSource={filteredItems}
                        pagination={{ pageSize: 25, showTotal: (total) => `${total} items`, size: 'small' }}
                        scroll={{ x: 1000 }}
                        rowClassName={(r) => {
                          const qty = Number(r.qty_on_hand);
                          if (qty < 0) return 'row-negative';
                          if (qty === 0) return 'row-zero';
                          return '';
                        }}
                        summary={() => (
                          <Table.Summary fixed>
                            <Table.Summary.Row style={{ background: '#fafafa' }}>
                              <Table.Summary.Cell index={0} colSpan={7}>
                                <Text strong>Total ({filteredItems.length} SKUs)</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={7} align="right">
                                <Text strong style={{ color: '#1677ff' }}>
                                  {fmtNum(filteredItems.reduce((s, i) => s + Number(i.total_value ?? 0), 0))}
                                </Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={8} />
                            </Table.Summary.Row>
                          </Table.Summary>
                        )}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'transfers',
                label: (
                  <Space>
                    <SwapOutlined />
                    Transfers
                    <Badge count={transfers.length} color="#722ed1" overflowCount={99} />
                  </Space>
                ),
                children: (
                  <div style={{ padding: '12px 0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Most recent 25 transfers involving this warehouse</Text>
                      <Button size="small" icon={<PlusOutlined />}
                        onClick={() => router.visit(route('inventory.warehouse-transfers.add'))}>
                        New Transfer
                      </Button>
                    </div>
                    {loadingActivity ? <Skeleton active paragraph={{ rows: 6 }} /> :
                      transfers.length === 0 ? (
                        <Empty description="No transfers yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                      ) : (
                        <Table rowKey="id" size="small" columns={transferColumns} dataSource={transfers}
                          pagination={{ pageSize: 15, size: 'small' }} scroll={{ x: 700 }} />
                      )
                    }
                  </div>
                ),
              },
              {
                key: 'adjustments',
                label: (
                  <Space>
                    <ToolOutlined />
                    Adjustments
                    <Badge count={adjustments.length} color="#fa8c16" overflowCount={99} />
                  </Space>
                ),
                children: (
                  <div style={{ padding: '12px 0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Most recent 15 inventory adjustments for this warehouse</Text>
                      <Button size="small" icon={<PlusOutlined />}
                        onClick={() => router.visit(route('inventory.adjustments.add'))}>
                        New Adjustment
                      </Button>
                    </div>
                    {loadingActivity ? <Skeleton active paragraph={{ rows: 6 }} /> :
                      adjustments.length === 0 ? (
                        <Empty description="No adjustments yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                      ) : (
                        <Table rowKey="id" size="small" columns={adjColumns} dataSource={adjustments}
                          pagination={{ pageSize: 15, size: 'small' }} scroll={{ x: 600 }} />
                      )
                    }
                  </div>
                ),
              },
              {
                key: 'production',
                label: (
                  <Space>
                    <ToolOutlined />
                    Production
                    <Badge count={productionJournals.length} color="#13c2c2" overflowCount={99} />
                  </Space>
                ),
                children: (
                  <div style={{ padding: '12px 0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Most recent 10 production journals using this warehouse</Text>
                      <Button size="small" icon={<PlusOutlined />}
                        onClick={() => router.visit(route('inventory.production-journals.add'))}>
                        New Journal
                      </Button>
                    </div>
                    {loadingActivity ? <Skeleton active paragraph={{ rows: 5 }} /> :
                      productionJournals.length === 0 ? (
                        <Empty description="No production journals yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                      ) : (
                        <Table rowKey="id" size="small" columns={pjColumns} dataSource={productionJournals}
                          pagination={{ pageSize: 10, size: 'small' }} scroll={{ x: 700 }} />
                      )
                    }
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* Low Stock Alert Banner */}
        {!loadingItems && stats.lowStock > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginTop: 16 }}
            message={`${stats.lowStock} product${stats.lowStock > 1 ? 's are' : ' is'} running low on stock`}
            description={
              <Button size="small" type="link" style={{ padding: 0 }}
                onClick={() => { setActiveTab('stock'); setStockFilter('low'); }}>
                View low stock items →
              </Button>
            }
          />
        )}
        {!loadingItems && stats.negative > 0 && (
          <Alert
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginTop: 8 }}
            message={`${stats.negative} product${stats.negative > 1 ? 's have' : ' has'} negative stock — immediate attention required`}
            description={
              <Button size="small" type="link" style={{ padding: 0 }}
                onClick={() => { setActiveTab('stock'); setStockFilter('negative'); }}>
                View negative stock items →
              </Button>
            }
          />
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        title="Edit Warehouse"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" loading={saving} onClick={saveEdit}>Save Changes</Button>,
        ]}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Warehouse Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Code" name="code">
            <Input placeholder="e.g. MAIN-WH" />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input.TextArea rows={3} placeholder="Full address" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-negative td { background: #fff1f0 !important; }
        .row-zero td { background: #fafafa !important; color: #8c8c8c; }
      `}</style>
    </AuthenticatedLayout>
  );
}
