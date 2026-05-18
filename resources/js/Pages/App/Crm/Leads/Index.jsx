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
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
  Empty,
  Skeleton,
} from 'antd';
import {
  AppstoreOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  FundOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { buildLeadCrud, buildDealCrud } from '@/Pages/App/Crm/Shared/crmCrudConfigs';
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
  { value: 'converted', label: 'Converted' }, { value: 'lost', label: 'Lost' },
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
  { key: 'unqualified', label: 'Unqualified', params: { status: 'unqualified' } },
  { key: 'converted', label: 'Converted', params: { status: 'converted' } },
  { key: 'lost', label: 'Lost', params: { status: 'lost' } },
];

const rowsFrom = (data) => data?.data?.data || data?.data || data?.results || (Array.isArray(data) ? data : []);

function LeadsKanban({ filters, onOpenLead }) {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, ctx] = message.useMessage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(api('/api/leads/'), {
        headers: authHeaders(),
        params: { page_size: 300, ordering: '-created_at', ...filters },
      });
      setRows(rowsFrom(res.data));
    } catch (error) {
      messageApi.error(error?.response?.data?.message || 'Failed to load leads');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  const moveLead = async (leadId, status) => {
    const previousRows = rows;
    const current = rows.find((item) => item.id === leadId);
    if (!current || current.status === status) return;

    setRows((items) => items.map((item) => item.id === leadId ? { ...item, status } : item));

    try {
      await axios.post(api(`/api/leads/${leadId}/move-status`), { status }, { headers: authHeaders() });
      messageApi.success('Lead moved');
      load();
    } catch (error) {
      setRows(previousRows);
      messageApi.error(error?.response?.data?.message || 'Could not move lead');
    }
  };

  if (loading) {
    return (
      <Card style={{ borderRadius: token.borderRadiusLG, borderColor: token.colorBorderSecondary }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const columns = STATUS_OPTIONS.map((status) => ({
    ...status,
    rows: rows.filter((lead) => (lead.status || 'new') === status.value),
  }));

  return (
    <>
      {ctx}
      <div
        style={{
          display: 'flex',
          gap: token.paddingSM,
          overflowX: 'auto',
          paddingBottom: token.paddingXS,
          minHeight: 'calc(100vh - 235px)',
        }}
      >
        {columns.map((column) => {
          const total = column.rows.reduce((sum, lead) => sum + Number(lead.expected_value || 0), 0);
          return (
            <div
              key={column.value}
              style={{
                flex: '0 0 276px',
                minWidth: 276,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorFillQuaternary,
                borderRadius: token.borderRadiusLG,
                padding: token.paddingSM,
                maxHeight: 'calc(100vh - 236px)',
                overflowY: 'auto',
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const leadId = event.dataTransfer.getData('leadId');
                if (leadId) moveLead(leadId, column.value);
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: token.paddingSM,
                }}
              >
                <Space direction="vertical" size={2}>
                  <Space size={6}>
                    <Tag color={STATUS_COLOR[column.value] || 'default'} style={{ margin: 0, fontWeight: 600 }}>{column.label}</Tag>
                    <Badge count={column.rows.length} color={token.colorTextSecondary} />
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11 }}>{fmtMoney(total)} total value</Text>
                </Space>
              </div>

              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {column.rows.map((lead) => (
                  <Card
                    key={lead.id}
                    size="small"
                    hoverable
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('leadId', lead.id)}
                    onClick={() => onOpenLead(lead)}
                    bodyStyle={{ padding: 12 }}
                    style={{
                      borderRadius: token.borderRadius,
                      cursor: 'pointer',
                      borderColor: token.colorBorderSecondary,
                      boxShadow: token.boxShadowTertiary,
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{lead.name || lead.lead_no || '-'}</Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {lead.company_name || lead.contact?.name || lead.email || '-'}
                          </Text>
                        </div>
                      </div>
                      <Space wrap size={4}>
                        {lead.lead_source ? <Tag style={{ margin: 0, fontSize: 11 }}>{lead.lead_source}</Tag> : null}
                        <Tag color={PRIORITY_COLOR[lead.priority] || 'default'} style={{ margin: 0, fontSize: 11 }}>
                          {String(lead.priority || 'medium').toUpperCase()}
                        </Tag>
                      </Space>
                      <Text style={{ color: token.colorPrimary, fontSize: 13, fontWeight: 650 }}>
                        {fmtMoney(lead.expected_value)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {lead.assigned_to?.name || lead.assignedTo?.name || 'Unassigned'} | Next: {fmtDate(lead.next_follow_up_at || lead.next_follow_up_date)}
                      </Text>
                    </Space>
                  </Card>
                ))}
                {!column.rows.length ? (
                  <div style={{ minHeight: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, background: token.colorBgContainer }}>
                    <Text type="secondary">Drop leads here</Text>
                  </div>
                ) : null}
              </Space>
            </div>
          );
        })}
        {!rows.length ? (
          <Card style={{ minWidth: 320, borderRadius: token.borderRadiusLG, borderColor: token.colorBorderSecondary }}>
            <Empty description="No leads found" />
          </Card>
        ) : null}
      </div>
    </>
  );
}

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
  const [addLead, setAddLead] = useState(false);
  const [view, setView] = useState('kanban');
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0);
  const crudRef = useRef(null);

  const leadCrud = buildLeadCrud();
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
    if (!dealId) {
      messageApi.error('Create a deal before marking this lead as converted.');
      return;
    }

    try {
      await axios.post(api(`/api/crm/leads/${convertLead.id}/convert`), { converted_deal_id: dealId }, { headers: authHeaders() });
      messageApi.success('Lead converted to deal');
      setConvertLead(null);
      crudRef.current?.refresh?.();
      setKanbanRefreshKey((key) => key + 1);
    } catch (e) {
      messageApi.error(e?.response?.data?.message || 'Conversion failed');
    }
  };

  const anchorParams = ANCHOR_FILTERS.find((a) => a.key === anchor)?.params || {};
  const combinedFilters = { ...anchorParams, ...filters };
  if (search) combinedFilters.search = search;

  const activeFilterCount = Object.values({ ...filters, search }).filter((value) => value !== undefined && value !== null && value !== '').length;

  const refreshCurrentView = () => {
    crudRef.current?.refresh?.();
    setKanbanRefreshKey((key) => key + 1);
  };

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
        <Button size="small" onClick={() => setFilters({})}>Clear filters</Button>
      )}
    </Space>
  );

  const headerNode = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: token.padding, flexWrap: 'wrap' }}>
      <Space direction="vertical" size={0}>
        <Text strong style={{ fontSize: 18, lineHeight: 1.25 }}>Leads</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>Track incoming opportunities from first touch to conversion.</Text>
      </Space>
      <Space size={8} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddLead(true)}>
          Add Lead
        </Button>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { label: 'Kanban', value: 'kanban', icon: <AppstoreOutlined /> },
            { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
          ]}
        />
      </Space>
    </div>
  );

  return (
    <AuthenticatedLayout user={props.auth?.user} header={headerNode}>
      {ctx}
      <Head title="Leads" />

      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 104px)' }}>
        <Space direction="vertical" size={token.paddingSM} style={{ width: '100%' }}>
          <Card
            size="small"
            bodyStyle={{ padding: token.paddingSM }}
            style={{ borderRadius: token.borderRadiusLG, borderColor: token.colorBorderSecondary }}
          >
            <Row gutter={[10, 10]} align="middle" justify="space-between">
              <Col flex="auto">
                <Space wrap size={8}>
                  <Input.Search
                    placeholder="Search name, company, email..."
                    style={{ width: 280, maxWidth: '100%' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                  />
                  <Button
                    type={showFilters ? 'primary' : 'default'}
                    onClick={() => setShowFilters((value) => !value)}
                  >
                    Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
                  </Button>
                  {(activeFilterCount > 0 || anchor !== 'all') && (
                    <Button
                      onClick={() => {
                        setSearch('');
                        setFilters({});
                        setAnchor('all');
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </Space>
              </Col>
              <Col>
                <Space size={8} wrap>
                  <Select
                    size="middle"
                    style={{ width: 160 }}
                    value={anchor}
                    onChange={setAnchor}
                    options={ANCHOR_FILTERS.map((item) => ({ label: item.key === 'all' ? 'All statuses' : item.label, value: item.key }))}
                  />
                </Space>
              </Col>
            </Row>
            {showFilters && (
              <div style={{ marginTop: token.paddingSM, paddingTop: token.paddingSM, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                {filterPanel}
              </div>
            )}
          </Card>

          {view === 'list' ? (
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
              canAdd={false}
              canEdit={true}
              canDelete={true}
              hasActions={false}
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
          ) : (
            <LeadsKanban key={kanbanRefreshKey} filters={combinedFilters} onOpenLead={(lead) => router.visit(route('crm.leads.show', lead.id))} />
          )}
        </Space>
      </div>

      {addLead ? (
        <div style={{ display: 'none' }}>
          <ReusableCrud
            title="Leads"
            apiUrl={api('/api/leads/')}
            columns={columns}
            fields={leadCrud.fields}
            validationSchema={leadCrud.validationSchema}
            crudInitialValues={leadCrud.crudInitialValues}
            transformPayload={leadCrud.transformPayload}
            form_ui="modal"
            modalWidth={900}
            enableServerPagination={false}
            showSearch={false}
            canAdd
            canEdit={false}
            canDelete={false}
            hasActions={false}
            hasActionColumns={false}
            openOnMount
            openMode="add"
            onFormClose={() => setAddLead(false)}
            onAddSuccess={() => {
              setAddLead(false);
              refreshCurrentView();
            }}
          />
        </div>
      ) : null}

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
            onAddSuccess={(savedRecord) => {
              const createdDeal = savedRecord?.data || savedRecord;
              return doConvert(createdDeal?.id);
            }}
          />
          <div style={{ marginTop: 16, padding: 16, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
            <Text type="secondary">Create the deal here. The lead will be marked Converted and linked to the new deal automatically.</Text>
          </div>
        </Drawer>
      )}
    </AuthenticatedLayout>
  );
}
