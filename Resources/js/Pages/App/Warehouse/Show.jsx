import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Progress,
  Row,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  SwapOutlined,
  ToolOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';

const api = (path) => `${BACKEND}${path}`;

const authHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const get = (path, params = {}) =>
  axios.get(api(path), {
    headers: authHeaders(),
    params,
  });

const toList = (data) => data?.results || data || [];

const fmtNum = (value, digits = 2) =>
  Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const fmtQty = (value) => {
  const number = Number(value ?? 0);
  if (Number.isInteger(number)) return number.toLocaleString();

  return fmtNum(number, 4).replace(/\.?0+$/, '');
};

const fmtDate = (value) =>
  value && dayjs(value).isValid() ? dayjs(value).format('DD MMM YYYY') : '-';

const ago = (value) =>
  value && dayjs(value).isValid() ? dayjs(value).fromNow() : '-';

const stockStatus = (item) => {
  const qty = Number(item?.qty_on_hand ?? 0);
  const reorder = Number(item?.reorder_level ?? item?.product?.reorder_level ?? 0);

  if (qty < 0) return { label: 'Negative', color: 'red' };
  if (qty === 0) return { label: 'Out', color: 'volcano' };
  if (reorder > 0 && qty <= reorder) return { label: 'Low', color: 'gold' };

  return { label: 'In Stock', color: 'green' };
};

const txnStatus = (status) => {
  const map = {
    draft: ['default', 'Draft'],
    approved: ['success', 'Approved'],
    posted: ['success', 'Posted'],
    completed: ['success', 'Completed'],
    void: ['error', 'Void'],
    cancelled: ['error', 'Cancelled'],
  };

  const [color, label] = map[status] || ['default', status || 'Draft'];

  return <Tag color={color}>{label}</Tag>;
};

function StatCard({ label, value, hint, tone, onClick }) {
  const { token } = theme.useToken();

  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
      className="warehouse-stat-card"
      style={{
        borderColor: token.colorBorderSecondary,
        cursor: onClick ? 'pointer' : 'default',
      }}
      bodyStyle={{ padding: 12 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {label}
        </Text>

        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.15,
            color: tone || token.colorText,
          }}
        >
          {value}
        </div>

        {hint && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {hint}
          </Text>
        )}
      </div>
    </Card>
  );
}

function DetailLine({ label, children }) {
  return (
    <div className="warehouse-detail-line">
      <Text type="secondary" className="warehouse-detail-label">
        {label}
      </Text>
      <div className="warehouse-detail-value">{children}</div>
    </div>
  );
}

export default function WarehouseShow({ id, ...props }) {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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

  useEffect(() => {
    let cancelled = false;

    const loadWarehouse = async () => {
      try {
        const res = await get(`/api/warehouses/${id}/`);
        if (!cancelled) setWarehouse(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load warehouse');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadItems = async () => {
      try {
        const res = await get('/api/warehouse-items/', {
          warehouse_id: id,
          include_zero_stock: 1,
          include_inactive: 1,
          page_size: 500,
          ordering: '-total_value',
        });

        if (!cancelled) setItems(toList(res.data));
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };

    const loadActivity = async () => {
      try {
        const [fromRes, toRes, adjRes, journalRes] = await Promise.allSettled([
          get('/api/warehouse-transfers/', {
            from_warehouse_id: id,
            page_size: 20,
            ordering: '-created_at',
          }),
          get('/api/warehouse-transfers/', {
            to_warehouse_id: id,
            page_size: 20,
            ordering: '-created_at',
          }),
          get('/api/adjustments/', {
            warehouse_id: id,
            page_size: 15,
            ordering: '-created_at',
          }),
          get('/api/production-journals/', {
            warehouse_id: id,
            page_size: 10,
            ordering: '-created_at',
          }),
        ]);

        if (cancelled) return;

        const outgoing =
          fromRes.status === 'fulfilled'
            ? toList(fromRes.value.data).map((row) => ({
                ...row,
                _direction: 'out',
                _other: row.toWarehouse,
              }))
            : [];

        const incoming =
          toRes.status === 'fulfilled'
            ? toList(toRes.value.data).map((row) => ({
                ...row,
                _direction: 'in',
                _other: row.fromWarehouse,
              }))
            : [];

        setTransfers(
          [...incoming, ...outgoing]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 25)
        );

        setAdjustments(adjRes.status === 'fulfilled' ? toList(adjRes.value.data) : []);
        setProductionJournals(
          journalRes.status === 'fulfilled' ? toList(journalRes.value.data) : []
        );
      } finally {
        if (!cancelled) setLoadingActivity(false);
      }
    };

    loadWarehouse();
    loadItems();
    loadActivity();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + Number(item.total_value ?? 0), 0);

    const inStock = items.filter((item) => Number(item.qty_on_hand) > 0);

    const lowStock = items.filter((item) => {
      const qty = Number(item.qty_on_hand ?? 0);
      const reorder = Number(item.reorder_level ?? item.product?.reorder_level ?? 0);
      return qty > 0 && reorder > 0 && qty <= reorder;
    });

    const outOfStock = items.filter((item) => Number(item.qty_on_hand) === 0);
    const negative = items.filter((item) => Number(item.qty_on_hand) < 0);

    const categoryMap = {};

    items.forEach((item) => {
      const category =
        item.product?.productCategory?.name ||
        item.product?.category_name ||
        'Uncategorised';

      categoryMap[category] =
        (categoryMap[category] || 0) + Number(item.total_value ?? 0);
    });

    const categories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }));

    return {
      total,
      skus: items.length,
      inStock: inStock.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      negative: negative.length,
      categories,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = [...items];

    if (itemSearch.trim()) {
      const query = itemSearch.toLowerCase();

      list = list.filter((item) => {
        const name = item.product?.name?.toLowerCase() || '';
        const sku = item.product?.sku?.toLowerCase() || '';
        const code = item.product?.code?.toLowerCase() || '';

        return name.includes(query) || sku.includes(query) || code.includes(query);
      });
    }

    if (stockFilter === 'in') {
      list = list.filter((item) => Number(item.qty_on_hand) > 0);
    }

    if (stockFilter === 'low') {
      list = list.filter((item) => {
        const qty = Number(item.qty_on_hand ?? 0);
        const reorder = Number(item.reorder_level ?? item.product?.reorder_level ?? 0);
        return qty > 0 && reorder > 0 && qty <= reorder;
      });
    }

    if (stockFilter === 'out') {
      list = list.filter((item) => Number(item.qty_on_hand) === 0);
    }

    if (stockFilter === 'negative') {
      list = list.filter((item) => Number(item.qty_on_hand) < 0);
    }

    return list;
  }, [items, itemSearch, stockFilter]);

  const openEdit = () => {
    editForm.setFieldsValue({
      name: warehouse?.name,
      code: warehouse?.code,
      address: warehouse?.address,
    });

    setEditOpen(true);
  };

  const saveEdit = async () => {
    const values = await editForm.validateFields().catch(() => null);
    if (!values) return;

    setSaving(true);

    try {
      const res = await axios.patch(api(`/api/warehouses/${id}/`), values, {
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
      });

      setWarehouse(res.data);
      setEditOpen(false);
      message.success('Warehouse updated');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const itemColumns = [
    {
      title: 'Product',
      key: 'product',
      width: 240,
      fixed: isMobile ? undefined : 'left',
      render: (_, row) => (
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: 'block', lineHeight: 1.25 }}>
            {row.product?.name || '-'}
          </Text>

          <Space size={4} wrap>
            {row.product?.sku && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                SKU: {row.product.sku}
              </Text>
            )}

            {row.product?.code && (
              <Tag style={{ marginInlineEnd: 0 }}>{row.product.code}</Tag>
            )}
          </Space>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      width: 140,
      responsive: ['lg'],
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.product?.productCategory?.name || '—'}
        </Text>
      ),
    },
    {
      title: 'Unit',
      key: 'unit',
      width: 80,
      align: 'center',
      responsive: ['md'],
      render: (_, row) => row.product?.productUnit?.name || row.unit_code || '—',
    },
    {
      title: 'Qty',
      dataIndex: 'qty_on_hand',
      width: 110,
      align: 'right',
      sorter: (a, b) => Number(a.qty_on_hand) - Number(b.qty_on_hand),
      render: (value) => {
        const qty = Number(value ?? 0);

        return (
          <Text
            strong
            style={{
              color:
                qty < 0
                  ? token.colorError
                  : qty === 0
                    ? token.colorTextTertiary
                    : token.colorText,
            }}
          >
            {fmtQty(value)}
          </Text>
        );
      },
    },
    {
      title: 'Reorder',
      dataIndex: 'reorder_level',
      width: 110,
      align: 'right',
      responsive: ['lg'],
      render: (value, row) => {
        const reorder = Number(value ?? row.product?.reorder_level ?? 0);
        return reorder > 0 ? fmtQty(reorder) : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Avg Cost',
      dataIndex: 'avg_cost',
      width: 110,
      align: 'right',
      responsive: ['xl'],
      sorter: (a, b) => Number(a.avg_cost) - Number(b.avg_cost),
      render: (value) => fmtNum(value),
    },
    {
      title: 'Value',
      dataIndex: 'total_value',
      width: 130,
      align: 'right',
      sorter: (a, b) => Number(a.total_value) - Number(b.total_value),
      defaultSortOrder: 'descend',
      render: (value) => <Text strong>{fmtNum(value)}</Text>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, row) => {
        const status = stockStatus(row);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
  ];

  const transferColumns = [
    {
      title: 'Transfer',
      dataIndex: 'transfer_no',
      width: 130,
      render: (value, row) => (
        <Button
          type="link"
          size="small"
          className="warehouse-link-btn"
          onClick={() => router.visit(route('inventory.warehouse-transfers.show', row.id))}
        >
          {value || '#draft'}
        </Button>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'transfer_date',
      width: 110,
      render: fmtDate,
    },
    {
      title: 'Direction',
      key: 'direction',
      width: 110,
      align: 'center',
      render: (_, row) =>
        row._direction === 'in' ? (
          <Tag color="green" icon={<ArrowDownOutlined />}>
            IN
          </Tag>
        ) : (
          <Tag color="blue" icon={<ArrowUpOutlined />}>
            OUT
          </Tag>
        ),
    },
    {
      title: 'Other Warehouse',
      key: 'other',
      ellipsis: true,
      render: (_, row) => row._other?.name || row._other?.label || '—',
    },
    {
      title: 'Value',
      dataIndex: 'total',
      width: 120,
      align: 'right',
      responsive: ['md'],
      render: (value) => (value ? fmtNum(value) : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: txnStatus,
    },
    {
      title: '',
      key: 'action',
      width: 48,
      align: 'right',
      render: (_, row) => (
        <Button
          type="text"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() => router.visit(route('inventory.warehouse-transfers.show', row.id))}
        />
      ),
    },
  ];

  const adjustmentColumns = [
    {
      title: 'Adjustment',
      dataIndex: 'adjustment_no',
      width: 140,
      render: (value, row) => (
        <Button
          type="link"
          size="small"
          className="warehouse-link-btn"
          onClick={() => router.visit(route('inventory.adjustments.show', row.id))}
        >
          {value || '#draft'}
        </Button>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'adjustment_date',
      width: 110,
      render: fmtDate,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      ellipsis: true,
      render: (value) => value || '—',
    },
    {
      title: 'Items',
      key: 'items',
      width: 80,
      align: 'center',
      responsive: ['md'],
      render: (_, row) => {
        const lines = row.items || row.inventoryAdjustmentLines || [];
        return <Badge count={lines.length} color={token.colorPrimary} />;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: txnStatus,
    },
    {
      title: '',
      key: 'action',
      width: 48,
      align: 'right',
      render: (_, row) => (
        <Button
          type="text"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() => router.visit(route('inventory.adjustments.show', row.id))}
        />
      ),
    },
  ];

  const journalColumns = [
    {
      title: 'Journal',
      dataIndex: 'code',
      width: 140,
      render: (value, row) => (
        <Button
          type="link"
          size="small"
          className="warehouse-link-btn"
          onClick={() => router.visit(route('inventory.production-journals.show', row.id))}
        >
          {value || '#draft'}
        </Button>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      width: 110,
      render: fmtDate,
    },
    {
      title: 'Finished Product',
      key: 'product',
      ellipsis: true,
      render: (_, row) => row.finishedProduct?.name || row.finished_product_id || '—',
    },
    {
      title: 'Output',
      dataIndex: 'output_quantity',
      width: 110,
      align: 'right',
      render: (value, row) => `${fmtQty(value)} ${row.output_unit_code || ''}`.trim(),
    },
    {
      title: 'Cost',
      dataIndex: 'finished_goods_cost',
      width: 120,
      align: 'right',
      responsive: ['md'],
      render: fmtNum,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: txnStatus,
    },
  ];

  if (loading) {
    return (
      <AuthenticatedLayout user={props.auth?.user}>
        <Head title="Warehouse" />
        <div style={{ padding: isMobile ? 16 : 24 }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout user={props.auth?.user}>
        <Head title="Warehouse" />
        <div style={{ padding: isMobile ? 16 : 24 }}>
          <Alert type="error" showIcon message={error} />
        </div>
      </AuthenticatedLayout>
    );
  }

  const filterItems = [
    { key: 'all', label: 'All', count: stats.skus },
    { key: 'in', label: 'In Stock', count: stats.inStock },
    { key: 'low', label: 'Low', count: stats.lowStock },
    { key: 'out', label: 'Out', count: stats.outOfStock },
    { key: 'negative', label: 'Negative', count: stats.negative },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title={`Warehouse — ${warehouse?.name || ''}`} />

      <div
        className="warehouse-shell"
        style={{
          background: token.colorBgLayout,
          color: token.colorText,
        }}
      >
        <div
          className="warehouse-header"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
          }}
        >
          <div className="warehouse-title-area">
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.visit(route('warehouse.index'))}
            >
              Back
            </Button>

            <div className="warehouse-title-block">
              <div className="warehouse-title-row">
                <InboxOutlined style={{ color: token.colorTextSecondary }} />

                <Title level={5} style={{ margin: 0 }}>
                  {warehouse?.name || 'Warehouse'}
                </Title>

                {warehouse?.code && <Tag>{warehouse.code}</Tag>}

                <Tag color={warehouse?.active ? 'success' : 'error'}>
                  {warehouse?.active ? 'Active' : 'Inactive'}
                </Tag>

                {warehouse?.is_system_generated && <Tag color="purple">System</Tag>}
              </div>

              <Text type="secondary" className="warehouse-subtitle">
                {warehouse?.branch?.name || warehouse?.branch?.label || 'No branch'}
                {warehouse?.address ? ` · ${warehouse.address}` : ''}
              </Text>
            </div>
          </div>

          <Space wrap className="warehouse-actions">
            <Button size="small" icon={<EditOutlined />} onClick={openEdit}>
              Edit
            </Button>

            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => router.visit(route('inventory.warehouse-transfers.add'))}
            >
              Transfer
            </Button>

            <Button
              size="small"
              icon={<ToolOutlined />}
              type="primary"
              onClick={() => router.visit(route('inventory.adjustments.add'))}
            >
              Adjustment
            </Button>
          </Space>
        </div>

        <main className="warehouse-content">
          {(stats.lowStock > 0 || stats.negative > 0) && !loadingItems && (
            <div className="warehouse-alerts">
              {stats.negative > 0 && (
                <Alert
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  message={`${stats.negative} negative stock item${stats.negative > 1 ? 's' : ''}`}
                  action={
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        setActiveTab('stock');
                        setStockFilter('negative');
                      }}
                    >
                      View
                    </Button>
                  }
                />
              )}

              {stats.lowStock > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  message={`${stats.lowStock} low stock item${stats.lowStock > 1 ? 's' : ''}`}
                  action={
                    <Button
                      size="small"
                      onClick={() => {
                        setActiveTab('stock');
                        setStockFilter('low');
                      }}
                    >
                      View
                    </Button>
                  }
                />
              )}
            </div>
          )}

          <Row gutter={[10, 10]} className="warehouse-stats-row">
            <Col xs={12} sm={8} lg={4}>
              <StatCard
                label="Stock Value"
                value={fmtNum(stats.total)}
                hint={`${stats.skus} SKUs`}
                tone={token.colorPrimary}
                onClick={() => setActiveTab('stock')}
              />
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <StatCard
                label="In Stock"
                value={stats.inStock}
                hint="available"
                tone={token.colorSuccess}
                onClick={() => {
                  setActiveTab('stock');
                  setStockFilter('in');
                }}
              />
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <StatCard
                label="Low Stock"
                value={stats.lowStock}
                hint="below reorder"
                tone={token.colorWarning}
                onClick={() => {
                  setActiveTab('stock');
                  setStockFilter('low');
                }}
              />
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <StatCard
                label="Out"
                value={stats.outOfStock}
                hint="zero balance"
                tone={token.colorError}
                onClick={() => {
                  setActiveTab('stock');
                  setStockFilter('out');
                }}
              />
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <StatCard
                label="Negative"
                value={stats.negative}
                hint={stats.negative ? 'check now' : 'clear'}
                tone={token.colorError}
                onClick={() => {
                  setActiveTab('stock');
                  setStockFilter('negative');
                }}
              />
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <StatCard
                label="Transfers"
                value={transfers.length}
                hint="recent"
                tone={token.colorText}
                onClick={() => setActiveTab('transfers')}
              />
            </Col>
          </Row>

          <Row gutter={[12, 12]} className="warehouse-overview-row">
            <Col xs={24} lg={8}>
              <Card
                size="small"
                className="warehouse-card"
                title="Details"
                bodyStyle={{ padding: 12 }}
              >
                <div className="warehouse-details">
                  <DetailLine label="Code">
                    {warehouse?.code ? <Tag>{warehouse.code}</Tag> : '—'}
                  </DetailLine>

                  <DetailLine label="Branch">
                    {warehouse?.branch?.name || warehouse?.branch?.label || '—'}
                  </DetailLine>

                  <DetailLine label="Address">
                    {warehouse?.address || <Text type="secondary">Not set</Text>}
                  </DetailLine>

                  <DetailLine label="Type">
                    <Tag color={warehouse?.is_system_generated ? 'purple' : 'default'}>
                      {warehouse?.is_system_generated ? 'System' : 'Manual'}
                    </Tag>
                  </DetailLine>

                  <DetailLine label="Created">{fmtDate(warehouse?.created_at)}</DetailLine>

                  <DetailLine label="Updated">{ago(warehouse?.updated_at)}</DetailLine>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={16}>
              <Card
                size="small"
                className="warehouse-card"
                title="Stock Value by Category"
                extra={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {fmtNum(stats.total)}
                  </Text>
                }
                bodyStyle={{ padding: 12 }}
              >
                {loadingItems ? (
                  <Skeleton active paragraph={{ rows: 5 }} />
                ) : stats.categories.length === 0 ? (
                  <Empty
                    description="No stock data"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ padding: 24 }}
                  />
                ) : (
                  <div className="warehouse-category-list">
                    {stats.categories.map((category) => (
                      <div key={category.name} className="warehouse-category-item">
                        <div className="warehouse-category-top">
                          <Text ellipsis style={{ maxWidth: isMobile ? 160 : 420 }}>
                            {category.name}
                          </Text>

                          <Space size={10}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {category.percent}%
                            </Text>

                            <Text strong style={{ fontSize: 12 }}>
                              {fmtNum(category.value)}
                            </Text>
                          </Space>
                        </div>

                        <Progress
                          percent={category.percent}
                          showInfo={false}
                          size={[undefined, 5]}
                          strokeColor={token.colorPrimary}
                          trailColor={token.colorFillQuaternary}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            className="warehouse-main-card"
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="small"
              className="warehouse-tabs"
              items={[
                {
                  key: 'stock',
                  label: (
                    <Space size={6}>
                      <span>Stock</span>
                      <Badge count={stats.skus} overflowCount={999} />
                    </Space>
                  ),
                  children: (
                    <div className="warehouse-tab-body">
                      <div className="warehouse-toolbar">
                        <Input
                          allowClear
                          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                          placeholder="Search product, SKU, code..."
                          value={itemSearch}
                          onChange={(event) => setItemSearch(event.target.value)}
                          className="warehouse-search"
                        />

                        <div className="warehouse-filters">
                          {filterItems.map((filter) => (
                            <Button
                              key={filter.key}
                              size="small"
                              type={stockFilter === filter.key ? 'primary' : 'default'}
                              onClick={() => setStockFilter(filter.key)}
                            >
                              {filter.label}
                              <span style={{ marginLeft: 5 }}>{filter.count}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {loadingItems ? (
                        <Skeleton active paragraph={{ rows: 8 }} />
                      ) : filteredItems.length === 0 ? (
                        <Empty
                          description="No matching products"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ padding: 36 }}
                        />
                      ) : (
                        <Table
                          rowKey="id"
                          size="small"
                          columns={itemColumns}
                          dataSource={filteredItems}
                          pagination={{
                            pageSize: 25,
                            size: 'small',
                            showTotal: (total) => `${total} items`,
                          }}
                          scroll={{ x: 900 }}
                          rowClassName={(row) => {
                            const qty = Number(row.qty_on_hand);

                            if (qty < 0) return 'warehouse-row-negative';
                            if (qty === 0) return 'warehouse-row-zero';

                            return '';
                          }}
                          summary={() => (
                            <Table.Summary fixed>
                              <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={6}>
                                  <Text strong>Total</Text>
                                  <Text type="secondary" style={{ marginLeft: 6 }}>
                                    {filteredItems.length} SKUs
                                  </Text>
                                </Table.Summary.Cell>

                                <Table.Summary.Cell index={6} align="right">
                                  <Text strong>
                                    {fmtNum(
                                      filteredItems.reduce(
                                        (sum, item) =>
                                          sum + Number(item.total_value ?? 0),
                                        0
                                      )
                                    )}
                                  </Text>
                                </Table.Summary.Cell>

                                <Table.Summary.Cell index={7} />
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
                    <Space size={6}>
                      <span>Transfers</span>
                      <Badge count={transfers.length} overflowCount={99} />
                    </Space>
                  ),
                  children: (
                    <div className="warehouse-tab-body">
                      <div className="warehouse-section-head">
                        <Text type="secondary">Recent transfers involving this warehouse</Text>

                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() =>
                            router.visit(route('inventory.warehouse-transfers.add'))
                          }
                        >
                          New
                        </Button>
                      </div>

                      {loadingActivity ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                      ) : transfers.length === 0 ? (
                        <Empty
                          description="No transfers yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ padding: 36 }}
                        />
                      ) : (
                        <Table
                          rowKey="id"
                          size="small"
                          columns={transferColumns}
                          dataSource={transfers}
                          pagination={{ pageSize: 15, size: 'small' }}
                          scroll={{ x: 720 }}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'adjustments',
                  label: (
                    <Space size={6}>
                      <span>Adjustments</span>
                      <Badge count={adjustments.length} overflowCount={99} />
                    </Space>
                  ),
                  children: (
                    <div className="warehouse-tab-body">
                      <div className="warehouse-section-head">
                        <Text type="secondary">Recent inventory adjustments</Text>

                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => router.visit(route('inventory.adjustments.add'))}
                        >
                          New
                        </Button>
                      </div>

                      {loadingActivity ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                      ) : adjustments.length === 0 ? (
                        <Empty
                          description="No adjustments yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ padding: 36 }}
                        />
                      ) : (
                        <Table
                          rowKey="id"
                          size="small"
                          columns={adjustmentColumns}
                          dataSource={adjustments}
                          pagination={{ pageSize: 15, size: 'small' }}
                          scroll={{ x: 680 }}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'production',
                  label: (
                    <Space size={6}>
                      <span>Production</span>
                      <Badge count={productionJournals.length} overflowCount={99} />
                    </Space>
                  ),
                  children: (
                    <div className="warehouse-tab-body">
                      <div className="warehouse-section-head">
                        <Text type="secondary">Recent production journals</Text>

                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() =>
                            router.visit(route('inventory.production-journals.add'))
                          }
                        >
                          New
                        </Button>
                      </div>

                      {loadingActivity ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                      ) : productionJournals.length === 0 ? (
                        <Empty
                          description="No production journals yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ padding: 36 }}
                        />
                      ) : (
                        <Table
                          rowKey="id"
                          size="small"
                          columns={journalColumns}
                          dataSource={productionJournals}
                          pagination={{ pageSize: 10, size: 'small' }}
                          scroll={{ x: 700 }}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </main>
      </div>

      <Modal
        title="Edit Warehouse"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        destroyOnClose
        width={520}
        footer={[
          <Button key="cancel" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" loading={saving} onClick={saveEdit}>
            Save
          </Button>,
        ]}
      >
        <Form
          form={editForm}
          layout="vertical"
          requiredMark={false}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            label="Warehouse Name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Code" name="code">
            <Input placeholder="MAIN-WH" />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input.TextArea rows={3} placeholder="Warehouse address" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .warehouse-shell {
          min-height: 100vh;
        }

        .warehouse-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 18px;
          border-bottom: 1px solid;
        }

        .warehouse-title-area {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .warehouse-title-block {
          min-width: 0;
        }

        .warehouse-title-row {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .warehouse-subtitle {
          display: block;
          max-width: 780px;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .warehouse-actions {
          justify-content: flex-end;
        }

        .warehouse-content {
          max-width: 1440px;
          margin: 0 auto;
          padding: 16px 18px 36px;
        }

        .warehouse-alerts {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .warehouse-stats-row,
        .warehouse-overview-row {
          margin-bottom: 12px;
        }

        .warehouse-stat-card,
        .warehouse-card,
        .warehouse-main-card {
          border-radius: 10px;
        }

        .warehouse-stat-card .ant-card-body {
          min-height: 78px;
        }

        .warehouse-details {
          display: grid;
          gap: 8px;
        }

        .warehouse-detail-line {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          font-size: 13px;
        }

        .warehouse-detail-label {
          font-size: 12px;
        }

        .warehouse-detail-value {
          min-width: 0;
          font-size: 13px;
        }

        .warehouse-category-list {
          display: grid;
          gap: 10px;
        }

        .warehouse-category-item {
          display: grid;
          gap: 4px;
        }

        .warehouse-category-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .warehouse-tabs > .ant-tabs-nav {
          margin: 0;
          padding: 0 12px;
        }

        .warehouse-tab-body {
          padding: 12px;
        }

        .warehouse-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .warehouse-search {
          width: 300px;
          max-width: 100%;
        }

        .warehouse-filters {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .warehouse-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .warehouse-link-btn {
          padding: 0;
          height: auto;
        }

        .warehouse-row-negative td {
          background: #fff1f0 !important;
        }

        .warehouse-row-zero td {
          background: #fafafa !important;
          color: rgba(0, 0, 0, 0.45);
        }

        .warehouse-main-card .ant-table-small .ant-table-thead > tr > th {
          font-size: 12px;
          font-weight: 600;
        }

        .warehouse-main-card .ant-table-small .ant-table-tbody > tr > td {
          font-size: 12px;
        }

        @media (max-width: 991px) {
          .warehouse-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .warehouse-title-area {
            width: 100%;
          }

          .warehouse-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .warehouse-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .warehouse-search {
            width: 100%;
          }

          .warehouse-filters {
            justify-content: flex-start;
          }
        }

        @media (max-width: 575px) {
          .warehouse-header {
            padding: 10px 12px;
          }

          .warehouse-content {
            padding: 12px 10px 28px;
          }

          .warehouse-title-area {
            align-items: flex-start;
          }

          .warehouse-title-row {
            gap: 5px;
          }

          .warehouse-title-row .ant-typography {
            max-width: 220px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .warehouse-subtitle {
            max-width: 260px;
          }

          .warehouse-actions .ant-btn {
            flex: 1;
          }

          .warehouse-actions {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .warehouse-stat-card .ant-card-body {
            min-height: 72px;
          }

          .warehouse-detail-line {
            grid-template-columns: 78px minmax(0, 1fr);
          }

          .warehouse-filters {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .warehouse-filters .ant-btn {
            width: 100%;
          }

          .warehouse-section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .warehouse-section-head .ant-btn {
            width: 100%;
          }

          .warehouse-tabs > .ant-tabs-nav {
            padding: 0 8px;
          }

          .warehouse-tab-body {
            padding: 10px 8px;
          }
        }
      `}</style>
    </AuthenticatedLayout>
  );
}