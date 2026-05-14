import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  CalendarOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  FundOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { buildLeadCrud, buildActivityCrud, buildDealCrud } from '@/Pages/App/Crm/Shared/crmCrudConfigs';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const fmtDate = (v) => v ? dayjs(v).format('DD MMM YY') : '-';
const fmtMoney = (v) => v == null ? '-' : Number(v).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STATUS_COLOR = { new: 'blue', contacted: 'cyan', qualified: 'green', unqualified: 'volcano', lost: 'red', converted: 'purple' };
const PRIORITY_COLOR = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' }, { value: 'unqualified', label: 'Unqualified' },
  { value: 'lost', label: 'Lost' }, { value: 'converted', label: 'Converted' },
];
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
];

const ANCHOR_FILTERS = [
  { key: 'all', label: 'All', params: {} },
  { key: 'new', label: 'New', params: { status: 'new' } },
  { key: 'contacted', label: 'Contacted', params: { status: 'contacted' } },
  { key: 'qualified', label: 'Qualified', params: { status: 'qualified' } },
  { key: 'lost', label: 'Lost', params: { status: 'lost' } },
  { key: 'converted', label: 'Converted', params: { status: 'converted' } },
];

function QuickActionBar({ lead, onRefresh }) {
  const [messageApi, ctx] = message.useMessage();
  const [markingLost, setMarkingLost] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [showLostModal, setShowLostModal] = useState(false);

  const doMarkStatus = async (status) => {
    try {
      await axios.patch(api(`/api/leads/${lead.id}`), { status }, { headers: authHeaders() });
      messageApi.success(`Lead marked ${status}`);
      onRefresh?.();
    } catch {
      messageApi.error('Failed to update status');
    }
  };

  const doMarkLost = async () => {
    if (!lostReason.trim()) { messageApi.warning('Please enter a lost reason'); return; }
    setMarkingLost(true);
    try {
      await axios.post(api(`/api/crm/leads/${lead.id}/mark-lost`), { lost_reason: lostReason }, { headers: authHeaders() });
      messageApi.success('Lead marked lost');
      setShowLostModal(false);
      setLostReason('');
      onRefresh?.();
    } catch {
      messageApi.error('Failed to mark lost');
    } finally {
      setMarkingLost(false);
    }
  };

  return (
    <>
      {ctx}
      <Space size={4} wrap>
        <Tooltip title="Call">
          <Button size="small" icon={<PhoneOutlined />} onClick={() => lead.phone && (window.location.href = `tel:${lead.phone}`)} />
        </Tooltip>
        <Tooltip title="Email">
          <Button size="small" icon={<MailOutlined />} onClick={() => lead.email && (window.location.href = `mailto:${lead.email}`)} />
        </Tooltip>
        <Tooltip title="Mark Contacted">
          <Button size="small" icon={<CheckOutlined />} onClick={() => doMarkStatus('contacted')} />
        </Tooltip>
        <Tooltip title="Mark Lost">
          <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => setShowLostModal(true)} />
        </Tooltip>
      </Space>
      <Modal
        title="Mark Lead Lost"
        open={showLostModal}
        onOk={doMarkLost}
        confirmLoading={markingLost}
        onCancel={() => { setShowLostModal(false); setLostReason(''); }}
        okText="Mark Lost"
        okButtonProps={{ danger: true }}
      >
        <Form layout="vertical">
          <Form.Item label="Lost Reason" required>
            <Input.TextArea rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Why is this lead lost?" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default function Leads(props) {
  const { token } = theme.useToken();
  const [messageApi, ctx] = message.useMessage();
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [anchor, setAnchor] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [convertLead, setConvertLead] = useState(null);
  const crudRef = useRef(null);

  const leadCrud = buildLeadCrud();
  const activityCrud = buildActivityCrud();
  const dealCrud = buildDealCrud();

  useEffect(() => {
    axios.get(api('/api/deal-pipelines/'), { headers: authHeaders(), params: { page_size: 50 } })
      .then((r) => {
        const rows = r.data?.data?.data || r.data?.data || r.data?.results || [];
        setPipelines(rows);
      })
      .catch(() => {});
  }, []);

  const handleConvertToDeal = (lead) => {
    setConvertLead(lead);
  };

  const doConvert = async (dealId) => {
    try {
      await axios.post(api(`/api/crm/leads/${convertLead.id}/convert`), { converted_deal_id: dealId }, { headers: authHeaders() });
      messageApi.success('Lead converted to deal');
      setConvertLead(null);
      crudRef.current?.refresh?.();
    } catch (e) {
      messageApi.error(e?.response?.data?.message || 'Conversion failed');
    }
  };

  const anchorParams = ANCHOR_FILTERS.find((a) => a.key === anchor)?.params || {};
  const combinedFilters = { ...anchorParams, ...filters };
  if (search) combinedFilters.search = search;

  const columns = [
    {
      title: 'Lead',
      key: 'lead',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{record.name || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.company_name || record.email || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 140,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 11 }}>{r.phone || r.mobile || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'lead_source',
      key: 'lead_source',
      width: 110,
      render: (v) => v ? <Text style={{ fontSize: 11 }}>{v}</Text> : <Text type="secondary" style={{ fontSize: 11 }}>-</Text>,
    },
    {
      title: 'Value',
      dataIndex: 'expected_value',
      key: 'expected_value',
      width: 100,
      align: 'right',
      render: (v) => <Text style={{ fontSize: 12 }}>{fmtMoney(v)}</Text>,
    },
    {
      title: 'Pipeline',
      key: 'pipeline',
      width: 120,
      render: (_, r) => <Text style={{ fontSize: 11 }}>{r.deal_pipeline?.name || r.dealPipeline?.name || '-'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v) => (
        <Tag color={STATUS_COLOR[v] || 'default'} style={{ margin: 0, fontSize: 11 }}>
          {v ? String(v).replace(/_/g, ' ').toUpperCase() : 'NEW'}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (v) => (
        <Tag color={PRIORITY_COLOR[v] || 'default'} style={{ margin: 0, fontSize: 11 }}>
          {v ? v.toUpperCase() : 'MED'}
        </Tag>
      ),
    },
    {
      title: 'Assigned',
      key: 'assigned',
      width: 110,
      render: (_, r) => <Text style={{ fontSize: 11 }}>{r.assigned_to?.name || r.assignedTo?.name || '-'}</Text>,
    },
    {
      title: 'Follow-up',
      key: 'follow_up',
      width: 100,
      render: (_, r) => {
        const d = r.next_follow_up_at || r.next_follow_up_date;
        if (!d) return <Text type="secondary" style={{ fontSize: 11 }}>-</Text>;
        const isOverdue = dayjs(d).isBefore(dayjs(), 'day');
        return (
          <Text style={{ fontSize: 11, color: isOverdue ? token.colorError : undefined }}>
            {fmtDate(d)}
          </Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          <QuickActionBar lead={record} onRefresh={() => crudRef.current?.refresh?.()} />
          <Tooltip title="Convert to Deal">
            <Button size="small" type="primary" icon={<FundOutlined />} onClick={(e) => { e.stopPropagation(); handleConvertToDeal(record); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filterPanel = (
    <Space wrap size={8}>
      <Select
        allowClear placeholder="Status" size="small" style={{ width: 120 }}
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
      />
      <Select
        allowClear placeholder="Priority" size="small" style={{ width: 110 }}
        options={PRIORITY_OPTIONS}
        value={filters.priority}
        onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
      />
      <Select
        allowClear placeholder="Pipeline" size="small" style={{ width: 150 }}
        options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
        value={filters.deal_pipeline_id}
        onChange={(v) => setFilters((f) => ({ ...f, deal_pipeline_id: v }))}
      />
      {Object.keys(filters).length > 0 && (
        <Button size="small" onClick={() => setFilters({})}>Clear</Button>
      )}
    </Space>
  );

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      {ctx}
      <Head title="Leads" />

      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={token.paddingSM} style={{ width: '100%' }}>

          {/* Anchor filter tabs */}
          <Card size="small" bodyStyle={{ padding: '8px 12px' }}>
            <Space wrap size={4}>
              {ANCHOR_FILTERS.map((a) => (
                <Button
                  key={a.key}
                  size="small"
                  type={anchor === a.key ? 'primary' : 'default'}
                  onClick={() => setAnchor(a.key)}
                >
                  {a.label}
                </Button>
              ))}
              <span style={{ marginLeft: 12 }}>
                <Space size={8}>
                  <Input.Search
                    size="small"
                    placeholder="Search leads..."
                    style={{ width: 200 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                  />
                  <Button
                    size="small"
                    icon={<FilterOutlined />}
                    type={showFilters ? 'primary' : 'default'}
                    onClick={() => setShowFilters((v) => !v)}
                  >
                    Filters
                  </Button>
                </Space>
              </span>
            </Space>
            {showFilters && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                {filterPanel}
              </div>
            )}
          </Card>

          {/* Main ReusableCrud with overridden columns */}
          <ReusableCrud
            ref={crudRef}
            icon={<UserSwitchOutlined />}
            title="Leads"
            apiUrl={api('/api/leads/')}
            columns={columns}
            fields={leadCrud.fields}
            validationSchema={leadCrud.validationSchema}
            crudInitialValues={leadCrud.crudInitialValues}
            transformPayload={leadCrud.transformPayload}
            form_ui="drawer"
            drawerWidth={900}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            sortMode="ordering"
            orderingParam="ordering"
            enableServerPagination={true}
            showSearch={false}
            baseFilters={combinedFilters}
            canAdd={true}
            canEdit={true}
            canDelete={true}
            hasActions={true}
            hasActionColumns={false}
            activeTableRowFunction={(record) => ({
              onClick: (event) => {
                if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select,.ant-tooltip-open')) return;
                router.visit(route('crm.leads.show', record.id));
              },
              style: { cursor: 'pointer' },
            })}
            scroll={{ x: 1200 }}
          />
        </Space>
      </div>

      {/* Convert to Deal drawer */}
      {convertLead && (
        <Drawer
          title={`Convert "${convertLead.name}" to Deal`}
          open={!!convertLead}
          onClose={() => setConvertLead(null)}
          width={700}
          footer={null}
        >
          <ReusableCrud
            title="Create Deal"
            apiUrl={api('/api/deals/')}
            columns={[
              { title: 'Title', dataIndex: 'title', key: 'title', render: (v) => <Text strong>{v}</Text> },
              { title: 'Stage', key: 'stage', render: (_, r) => r.deal_stage?.name || '-' },
              { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: fmtMoney },
            ]}
            fields={dealCrud.fields}
            validationSchema={dealCrud.validationSchema}
            crudInitialValues={{
              ...dealCrud.crudInitialValues,
              lead_id: convertLead.id,
              title: convertLead.name,
              amount: convertLead.expected_value,
              source: convertLead.lead_source,
              deal_pipeline_id: convertLead.deal_pipeline_id,
              contact_id: convertLead.contact_id,
              assigned_to_id: convertLead.assigned_to_id,
            }}
            transformPayload={(values) => {
              const p = dealCrud.transformPayload(values);
              return p;
            }}
            form_ui="drawer"
            drawerWidth={700}
            enableServerPagination={true}
            baseFilters={{ lead_id: convertLead.id }}
            showSearch={false}
            canAdd={true}
            canEdit={false}
            canDelete={false}
            hasActions={false}
            hasActionColumns={false}
          />
          <div style={{ marginTop: 16, padding: 16, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
            <Text type="secondary">After creating the deal above, click below to mark the lead as converted.</Text>
            <div style={{ marginTop: 8 }}>
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    await axios.post(api(`/api/crm/leads/${convertLead.id}/convert`), {}, { headers: authHeaders() });
                    messageApi.success('Lead marked as converted');
                    setConvertLead(null);
                    crudRef.current?.refresh?.();
                  } catch (e) {
                    messageApi.error(e?.response?.data?.message || 'Failed to convert lead');
                  }
                }}
              >
                Mark Lead as Converted
              </Button>
            </div>
          </div>
        </Drawer>
      )}
    </AuthenticatedLayout>
  );
}
