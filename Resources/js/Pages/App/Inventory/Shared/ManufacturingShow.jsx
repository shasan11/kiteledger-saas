import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
  Alert, Button, Card, Col, Descriptions, Empty, Form,
  Input, Modal, Row, Skeleton, Space, Table, Tag, Typography, message,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EditOutlined, ExperimentOutlined, FileTextOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';

const { Title, Text } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const authHeaders = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const fmtDate = (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD MMM YYYY') : '-');
const fmtNum = (v, d = 2) => Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtQty = (v) => fmtNum(v, 4).replace(/\.?0+$/, '').replace(/^-?0$/, '0');
const label = (obj) => obj?.name || obj?.label || obj?.display_name || obj?.code || '-';

const STATUS_COLOR = {
  draft: 'default', approved: 'success', released: 'processing',
  in_progress: 'processing', completed: 'success', void: 'error',
  cancelled: 'error', posted: 'success',
};
const statusTag = (s) => <Tag color={STATUS_COLOR[s] || 'default'}>{String(s || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Tag>;

const CONFIG = {
  bom: {
    title: 'Bill of Materials',
    apiBase: '/api/bills-of-material',
    indexRoute: 'inventory.bill-of-materials.index',
    editRoute: 'inventory.bill-of-materials.edit',
    docNoLabel: 'BOM No',
    getDocNo: (r) => r?.code,
    canEdit: (r) => !r?.approved,
    canApprove: (r) => !r?.approved && !r?.void,
    canVoid: () => false,
    canPost: () => false,
    canCreateJournal: () => false,
    approveLabel: 'Approve BOM',
    approveIcon: <CheckCircleOutlined />,
    approveConfirm: 'Approve this Bill of Materials? Once approved, it cannot be edited.',
    approveEndpoint: null,
  },
  production_order: {
    title: 'Production Order',
    apiBase: '/api/production-orders',
    indexRoute: 'inventory.production-orders.index',
    editRoute: 'inventory.production-orders.edit',
    journalAddRoute: 'inventory.production-journals.add',
    docNoLabel: 'PO No',
    getDocNo: (r) => r?.code,
    canEdit: (r) => !r?.approved && !r?.void && (r?.status === 'draft' || !r?.status),
    canApprove: (r) => !r?.approved && !r?.void,
    canVoid: (r) => !!r?.approved && !r?.void,
    canPost: () => false,
    canCreateJournal: (r) => !!r?.approved && !r?.void,
    approveLabel: 'Approve Order',
    approveIcon: <CheckCircleOutlined />,
    approveConfirm: 'Approve this Production Order? Stock will not be posted until a Production Journal is created and posted.',
    approveEndpoint: (id) => `/api/production-orders/${id}/approve`,
  },
  production_journal: {
    title: 'Production Journal',
    apiBase: '/api/production-journals',
    indexRoute: 'inventory.production-journals.index',
    editRoute: 'inventory.production-journals.edit',
    docNoLabel: 'Journal No',
    getDocNo: (r) => r?.code,
    canEdit: (r) => !r?.stock_posted && r?.status === 'draft',
    canApprove: () => false,
    canVoid: (r) => !!r?.stock_posted && !r?.void,
    canPost: (r) => !r?.stock_posted && !r?.void && r?.status !== 'cancelled',
    canCreateJournal: () => false,
    approveLabel: 'Post Journal',
    approveIcon: <CheckCircleOutlined />,
    approveConfirm: null,
    approveEndpoint: (id) => `/api/production-journals/${id}/approve`,
  },
};

export default function ManufacturingShow({ id, documentType, ...props }) {
  const cfg = CONFIG[documentType];
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actioning, setActioning] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidForm] = Form.useForm();

  const load = async () => {
    try {
      const res = await axios.get(api(`${cfg.apiBase}/${id}/`), { headers: authHeaders() });
      setRecord(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to load ${cfg.title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = () => {
    const msg = documentType === 'production_journal'
      ? 'Post this Production Journal? This will consume raw materials from stock and add finished goods. This action cannot be undone.'
      : cfg.approveConfirm;

    Modal.confirm({
      title: cfg.approveLabel,
      content: msg,
      okText: cfg.approveLabel,
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        setActioning(true);
        try {
          let res;
          if (documentType === 'bom') {
            res = await axios.patch(api(`${cfg.apiBase}/${id}/`), { approved: true, status: 'approved' }, { headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
          } else {
            res = await axios.post(api(cfg.approveEndpoint(id)), {}, { headers: authHeaders() });
          }
          message.success(documentType === 'production_journal' ? 'Journal posted successfully' : `${cfg.title} approved`);
          setRecord(res.data);
        } catch (e) {
          const data = e?.response?.data;
          const first = data && typeof data === 'object' ? Object.values(data).flat().filter(Boolean)[0] : null;
          message.error(first || data?.message || 'Action failed');
        } finally {
          setActioning(false);
        }
      },
    });
  };

  const handleVoid = async () => {
    const values = await voidForm.validateFields().catch(() => null);
    if (!values) return;
    setActioning(true);
    try {
      const res = await axios.post(
        api(`${cfg.apiBase}/${id}/void`),
        { voided_reason: values.voided_reason },
        { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }
      );
      message.success(`${cfg.title} voided`);
      setRecord(res.data);
      setVoidOpen(false);
      voidForm.resetFields();
    } catch (e) {
      const data = e?.response?.data;
      const first = data && typeof data === 'object' ? Object.values(data).flat().filter(Boolean)[0] : null;
      message.error(first || data?.message || 'Void failed');
    } finally {
      setActioning(false);
    }
  };

  if (loading) return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title={cfg.title} />
      <div style={{ padding: 32 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
    </AuthenticatedLayout>
  );

  if (error) return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title={cfg.title} />
      <div style={{ padding: 24 }}><Alert type="error" showIcon message={error} /></div>
    </AuthenticatedLayout>
  );

  const docNo = cfg.getDocNo(record) || `#${id.slice(0, 8)}`;
  const isVoid = !!(record?.void);
  const isApproved = !!(record?.approved);
  const isPosted = !!(record?.stock_posted);

  const rawMaterials = record?.rawMaterials || record?.raw_materials || [];
  const byProducts = documentType === 'production_journal'
    ? (record?.byProducts || record?.by_products || [])
    : (record?.byproducts || record?.by_products || []);
  const expenses = documentType === 'production_journal'
    ? (record?.productionExpenses || record?.production_expenses || [])
    : (record?.expenses || []);

  const overviewItems = getOverviewItems(record, documentType, isApproved, isPosted, isVoid);
  const costSummary = getCostSummary(record, documentType);

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title={`${cfg.title} — ${docNo}`} />

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route(cfg.indexRoute))}>
          Back
        </Button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={8} wrap>
            <Title level={5} style={{ margin: 0 }}>{cfg.title}</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{docNo}</Text>
            {statusTag(record?.status)}
            {isApproved && documentType !== 'production_journal' && <Tag color="success">Approved</Tag>}
            {isPosted && <Tag color="success">Stock Posted</Tag>}
            {isVoid && <Tag color="error">Voided</Tag>}
          </Space>
        </div>
        <Space wrap>
          {cfg.canEdit(record) && (
            <Button icon={<EditOutlined />} onClick={() => router.visit(route(cfg.editRoute, id))}>
              Edit
            </Button>
          )}
          {cfg.canApprove(record) && (
            <Button type="primary" icon={cfg.approveIcon} loading={actioning} onClick={handleApprove}>
              {cfg.approveLabel}
            </Button>
          )}
          {cfg.canPost(record) && (
            <Button type="primary" icon={<CheckCircleOutlined />} loading={actioning} onClick={handleApprove}>
              Post Journal
            </Button>
          )}
          {cfg.canCreateJournal(record) && (
            <Button icon={<ExperimentOutlined />} onClick={() => router.visit(route(cfg.journalAddRoute))}>
              Create Journal
            </Button>
          )}
          {cfg.canVoid(record) && (
            <Button danger icon={<StopOutlined />} loading={actioning} onClick={() => setVoidOpen(true)}>
              Void
            </Button>
          )}
        </Space>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ padding: '24px 24px 48px' }}>

        {/* Overview + Cost Summary */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={16}>
            <Card size="small" title={<Text strong>{cfg.title} Overview</Text>} style={{ height: '100%' }}>
              <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                {overviewItems.map((item) => (
                  item && <Descriptions.Item key={item.label} label={item.label}>{item.value}</Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card size="small" title={<Text strong>Cost Summary</Text>} style={{ height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {costSummary.map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: item.isTotal ? '1px solid #d9d9d9' : undefined }}>
                    <Text type={item.isTotal ? undefined : 'secondary'} strong={item.isTotal}>{item.label}</Text>
                    <Text strong={item.isTotal} type={item.neg ? 'danger' : undefined}>{item.value}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Raw Materials / Components */}
        <Card size="small" title={<Text strong>{documentType === 'bom' ? 'Components / Raw Materials' : 'Raw Materials'}</Text>} style={{ marginBottom: 16 }}>
          {rawMaterials.length === 0 ? <Empty description="No materials" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
            <Table size="small" dataSource={rawMaterials} rowKey="id" pagination={false} bordered
              columns={getRawMaterialColumns(documentType)}
              summary={(rows) => {
                const total = rows.reduce((s, r) => s + (Number(r.amount || r.total_cost || 0) || (Number(r.quantity || r.qty || 0) * Number(r.rate || r.unit_cost || 0))), 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={getRawMaterialColumns(documentType).length - 1}><Text strong>Total</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right"><Text strong>{fmtNum(total)}</Text></Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          )}
        </Card>

        {/* By-products */}
        {(byProducts.length > 0 || documentType !== 'bom') && (
          <Card size="small" title={<Text strong>By-products</Text>} style={{ marginBottom: 16 }}>
            {byProducts.length === 0 ? <Empty description="No by-products" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <Table size="small" dataSource={byProducts} rowKey="id" pagination={false} bordered
                columns={getByProductColumns(documentType)} />
            )}
          </Card>
        )}

        {/* Expenses */}
        {(expenses.length > 0 || documentType !== 'bom') && (
          <Card size="small" title={<Text strong>Production Expenses</Text>} style={{ marginBottom: 16 }}>
            {expenses.length === 0 ? <Empty description="No expenses" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <Table size="small" dataSource={expenses} rowKey="id" pagination={false} bordered
                columns={getExpenseColumns(documentType)} />
            )}
          </Card>
        )}

        {/* Journal Voucher link */}
        {record?.journalVoucher && (
          <Card size="small" title={<Text strong>Accounting</Text>}>
            <Descriptions size="small">
              <Descriptions.Item label="Journal Voucher">
                <Text copyable>{record.journalVoucher?.voucher_no || record.journalVoucher?.id}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Void info */}
        {isVoid && (
          <Alert
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
            message={`Voided on ${fmtDate(record.voided_at)}`}
            description={record.voided_reason}
            style={{ marginTop: 16 }}
          />
        )}

        {/* Notes */}
        {record?.notes && (
          <Card size="small" title={<Text strong>Notes</Text>} style={{ marginTop: 16 }}>
            <Text>{record.notes}</Text>
          </Card>
        )}
      </div>

      {/* ── Void Modal ────────────────────────────────────────── */}
      <Modal
        title={`Void ${cfg.title}`}
        open={voidOpen}
        onCancel={() => { setVoidOpen(false); voidForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setVoidOpen(false); voidForm.resetFields(); }}>Cancel</Button>,
          <Button key="void" danger loading={actioning} onClick={handleVoid}>Confirm Void</Button>,
        ]}
      >
        <Alert type="warning" showIcon message="This action cannot be undone." style={{ marginBottom: 16 }} />
        <Form form={voidForm} layout="vertical">
          <Form.Item label="Reason for voiding" name="voided_reason" rules={[{ required: true, min: 3, message: 'Please provide a reason (min 3 characters)' }]}>
            <Input.TextArea rows={3} placeholder="Enter reason for voiding this document..." />
          </Form.Item>
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}

function getOverviewItems(record, documentType, isApproved, isPosted, isVoid) {
  const base = [
    { label: 'Date', value: fmtDate(record?.date) },
    { label: 'Reference', value: record?.reference || '-' },
  ];

  if (documentType === 'bom') {
    return [
      { label: 'BOM No', value: record?.code || '-' },
      { label: 'Finished Product', value: label(record?.product) },
      { label: 'Output Quantity', value: `${fmtQty(record?.output_quantity)} ${record?.output_unit_code || ''}`.trim() },
      ...base,
      { label: 'Status', value: <>{statusTag(record?.status)}{isApproved && <Tag color="success" style={{ marginLeft: 4 }}>Approved</Tag>}</> },
      { label: 'Auto-manufacture', value: record?.manufacture_on_every_sale ? 'Yes' : 'No' },
    ];
  }

  if (documentType === 'production_order') {
    return [
      { label: 'PO No', value: record?.code || '-' },
      { label: 'Finished Product', value: label(record?.finishedProduct) },
      { label: 'Warehouse', value: label(record?.warehouse) },
      { label: 'Planned Qty', value: `${fmtQty(record?.output_quantity)} ${record?.productUnit?.name || ''}`.trim() },
      ...base,
      { label: 'Status', value: <>{statusTag(record?.status)}{isApproved && <Tag color="success" style={{ marginLeft: 4 }}>Approved</Tag>}</> },
      record?.approvedBy && { label: 'Approved By', value: record.approvedBy?.name || '-' },
      record?.approved_at && { label: 'Approved At', value: fmtDate(record.approved_at) },
    ].filter(Boolean);
  }

  if (documentType === 'production_journal') {
    return [
      { label: 'Journal No', value: record?.code || '-' },
      { label: 'Finished Product', value: label(record?.finishedProduct) },
      { label: 'Warehouse', value: label(record?.warehouse) },
      { label: 'Output Qty', value: `${fmtQty(record?.output_quantity)} ${record?.output_unit_code || ''}`.trim() },
      ...base,
      { label: 'Status', value: <>{statusTag(record?.status)}{isPosted && <Tag color="success" style={{ marginLeft: 4 }}>Posted</Tag>}</> },
      record?.approvedBy && { label: 'Posted By', value: record.approvedBy?.name || '-' },
      record?.approved_at && { label: 'Posted At', value: fmtDate(record.approved_at) },
    ].filter(Boolean);
  }

  return base;
}

function getCostSummary(record, documentType) {
  if (documentType === 'bom') {
    return [{ label: 'BOM is a template only — no cost impact', value: '', isTotal: true }];
  }

  if (documentType === 'production_order') {
    const rmCost = Number(record?.total_raw_material_cost || 0);
    const expCost = Number(record?.total_expense_cost || 0);
    const bpCost = Number(record?.total_byproduct_cost || 0);
    const total = Number(record?.total_production_cost || 0);
    const unitCost = Number(record?.finished_goods_unit_cost || 0);
    return [
      { label: 'Raw Material Cost', value: fmtNum(rmCost) },
      { label: 'Expense Cost', value: fmtNum(expCost) },
      { label: 'By-product Credit', value: fmtNum(bpCost), neg: bpCost > 0 },
      { label: 'Total Production Cost', value: fmtNum(total), isTotal: true },
      { label: 'Unit Cost', value: fmtNum(unitCost) },
    ];
  }

  if (documentType === 'production_journal') {
    const rmCost = Number(record?.raw_material_cost || 0);
    const expCost = Number(record?.production_expense_amount || 0);
    const bpCost = Number(record?.by_product_allocated_cost || 0);
    const fgCost = Number(record?.finished_goods_cost || 0);
    const cpUnit = Number(record?.cost_per_unit || 0);
    return [
      { label: 'Raw Material Cost', value: fmtNum(rmCost) },
      { label: 'Production Expenses', value: fmtNum(expCost) },
      { label: 'By-product Allocation', value: fmtNum(bpCost), neg: bpCost > 0 },
      { label: 'Finished Goods Cost', value: fmtNum(fgCost), isTotal: true },
      { label: 'Cost Per Unit', value: fmtNum(cpUnit) },
    ];
  }

  return [];
}

function getRawMaterialColumns(documentType) {
  if (documentType === 'bom') {
    return [
      { title: 'Component', render: (_, r) => label(r.product) },
      { title: 'Quantity', dataIndex: 'quantity', align: 'right', width: 120, render: (v) => fmtQty(v) },
      { title: 'Unit', dataIndex: 'unit_code', width: 80 },
      { title: 'Wastage %', dataIndex: 'wastage_percent', align: 'right', width: 110, render: (v) => v ? `${fmtNum(v, 2)}%` : '-' },
      { title: 'Notes', dataIndex: 'notes', render: (v) => v || '-', align: 'right' },
    ];
  }

  if (documentType === 'production_order') {
    return [
      { title: 'Raw Material', render: (_, r) => label(r.product) },
      { title: 'Planned Qty', dataIndex: 'quantity', align: 'right', width: 130, render: (v) => fmtQty(v) },
      { title: 'Unit', key: 'unit', width: 80, render: (_, r) => r.productUnit?.name || r.unit_code || '-' },
      { title: 'Unit Cost', dataIndex: 'unit_cost', align: 'right', width: 120, render: (v) => fmtNum(v) },
      { title: 'Total Cost', align: 'right', width: 130, render: (_, r) => fmtNum(r.total_cost || (Number(r.quantity) * Number(r.unit_cost))) },
    ];
  }

  // production_journal
  return [
    { title: 'Material', render: (_, r) => label(r.product) },
    { title: 'Quantity', dataIndex: 'quantity', align: 'right', width: 120, render: (v) => fmtQty(v) },
    { title: 'Unit', dataIndex: 'unit_code', width: 80 },
    { title: 'Rate', dataIndex: 'rate', align: 'right', width: 120, render: (v) => fmtNum(v) },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 130, render: (v, r) => fmtNum(v || (Number(r.quantity) * Number(r.rate || 0))) },
  ];
}

function getByProductColumns(documentType) {
  if (documentType === 'bom') {
    return [
      { title: 'By-product', render: (_, r) => label(r.product) },
      { title: 'Cost %', dataIndex: 'cost_percent', align: 'right', width: 100, render: (v) => v ? `${fmtNum(v, 2)}%` : '-' },
      { title: 'Quantity', dataIndex: 'quantity', align: 'right', width: 120, render: (v) => fmtQty(v) },
      { title: 'Unit', dataIndex: 'unit_code', width: 80 },
    ];
  }

  if (documentType === 'production_order') {
    return [
      { title: 'By-product', render: (_, r) => label(r.product) },
      { title: 'Cost Share %', dataIndex: 'cost_share_percent', align: 'right', width: 130, render: (v) => v ? `${fmtNum(v, 2)}%` : '-' },
      { title: 'Quantity', dataIndex: 'quantity', align: 'right', width: 120, render: (v) => fmtQty(v) },
      { title: 'Allocated Cost', dataIndex: 'allocated_cost', align: 'right', width: 140, render: (v) => fmtNum(v) },
    ];
  }

  // production_journal
  return [
    { title: 'By-product', render: (_, r) => label(r.product) },
    { title: 'Cost %', dataIndex: 'cost_percent', align: 'right', width: 100, render: (v) => v ? `${fmtNum(v, 2)}%` : '-' },
    { title: 'Quantity', dataIndex: 'quantity', align: 'right', width: 120, render: (v) => fmtQty(v) },
    { title: 'Allocated Cost', dataIndex: 'allocated_cost', align: 'right', width: 140, render: (v) => fmtNum(v) },
  ];
}

function getExpenseColumns(documentType) {
  if (documentType === 'bom' || documentType === 'production_journal') {
    return [
      { title: 'Cost Term', render: (_, r) => label(r.costTerm) || r.name || '-' },
      { title: 'Amount', dataIndex: 'amount', align: 'right', width: 160, render: (v) => fmtNum(v) },
      { title: 'Notes', dataIndex: 'notes', render: (v) => v || '-' },
    ];
  }

  // production_order
  return [
    { title: 'Expense', dataIndex: 'name' },
    { title: 'Account', render: (_, r) => label(r.expenseAccount) },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 160, render: (v) => fmtNum(v) },
    { title: 'Notes', dataIndex: 'notes', render: (v) => v || '-' },
  ];
}
