import { useCallback, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Row,
  Skeleton,
  Space,
  Steps,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  FundOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ScheduleOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { buildActivityCrud, buildDealCrud } from '@/Pages/App/Crm/Shared/crmCrudConfigs';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const fmtMoney = (v) => v == null ? '-' : Number(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v) => v ? dayjs(v).format('DD MMM YYYY') : '-';
const fmtDateTime = (v) => v ? dayjs(v).format('DD MMM YYYY HH:mm') : '-';
const labelize = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';
const rowsFrom = (data) => data?.data?.data || data?.data || data?.results || (Array.isArray(data) ? data : []);
const unwrap = (data) => data?.data ?? data;

const STATUS_COLOR = { open: 'processing', won: 'success', lost: 'error', cancelled: 'default' };
const PRIORITY_COLOR = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };

function StagePath({ stages, currentStageId, onMove }) {
  const { token } = theme.useToken();
  if (!stages?.length) return null;

  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  const items = stages.map((stage, i) => {
    const isDone = i < currentIndex;
    const isCurrent = i === currentIndex;

    return {
      title: (
        <Tooltip title={`Move to ${stage.name}`}>
          <span
            style={{ cursor: isCurrent ? 'default' : 'pointer', fontSize: 12 }}
            onClick={() => !isCurrent && onMove(stage)}
          >
            {stage.name}
            {stage.is_won_stage && <Tag color="success" style={{ marginLeft: 4, fontSize: 10 }}>Won</Tag>}
            {stage.is_lost_stage && <Tag color="error" style={{ marginLeft: 4, fontSize: 10 }}>Lost</Tag>}
          </span>
        </Tooltip>
      ),
      status: isCurrent ? 'process' : isDone ? 'finish' : 'wait',
    };
  });

  return (
    <Card size="small" bodyStyle={{ padding: '10px 16px' }}>
      <Steps size="small" current={currentIndex} items={items} style={{ fontSize: 12 }} />
    </Card>
  );
}

function RailRow({ label, value }) {
  const { token } = theme.useToken();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', borderBottom: `1px solid ${token.colorBorderSecondary}`, fontSize: 12 }}>
      <span style={{ padding: '7px 10px', background: token.colorFillAlter, fontWeight: 600, color: token.colorTextSecondary, borderRight: `1px solid ${token.colorBorderSecondary}` }}>
        {label}
      </span>
      <span style={{ padding: '7px 10px', wordBreak: 'break-word' }}>{value ?? '-'}</span>
    </div>
  );
}

export default function DealShow({ auth, id }) {
  const { token } = theme.useToken();
  const [messageApi, ctx] = message.useMessage();
  const [deal, setDeal] = useState(null);
  const [stages, setStages] = useState([]);
  const [history, setHistory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');
  const [lostModal, setLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [movingStage, setMovingStage] = useState(null);
  const [activityDrawer, setActivityDrawer] = useState(false);

  const activityCrud = buildActivityCrud({ locked: { deal_id: id } });
  const dealCrud = buildDealCrud();

  const loadDeal = useCallback(async () => {
    try {
      const r = await axios.get(api(`/api/deals/${id}`), { headers: authHeaders() });
      const d = unwrap(r.data);
      setDeal(d);

      if (d.deal_pipeline_id) {
        axios.get(api('/api/deal-stages/'), {
          headers: authHeaders(),
          params: { deal_pipeline_id: d.deal_pipeline_id, page_size: 50, ordering: 'sort_order' },
        }).then((r2) => setStages(rowsFrom(r2.data))).catch(() => {});
      }

      axios.get(api(`/api/crm/deals/${id}/stage-history`), { headers: authHeaders() })
        .then((r2) => setHistory(rowsFrom(r2.data))).catch(() => {});

      axios.get(api('/api/crm-activities/'), { headers: authHeaders(), params: { deal_id: id, page_size: 50 } })
        .then((r2) => setActivities(rowsFrom(r2.data))).catch(() => {});
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load deal');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDeal(); }, [loadDeal]);

  const moveToStage = async (stage, reason = null) => {
    try {
      await axios.post(api(`/api/deals/${id}/move-stage`), {
        deal_stage_id: stage.id,
        lost_reason: reason,
      }, { headers: authHeaders() });
      messageApi.success(`Moved to ${stage.name}`);
      loadDeal();
    } catch (e) {
      messageApi.error(e?.response?.data?.message || 'Move failed');
    }
  };

  const handleStageClick = (stage) => {
    if (stage.is_lost_stage) {
      setMovingStage(stage);
      setLostModal(true);
      return;
    }
    if (stage.is_won_stage) {
      Modal.confirm({
        title: 'Mark as Won?',
        content: `Moving to "${stage.name}" will mark this deal Won and set close date to today.`,
        okText: 'Confirm',
        onOk: () => moveToStage(stage),
      });
      return;
    }
    moveToStage(stage);
  };

  const doMarkLost = async () => {
    if (!lostReason.trim()) { messageApi.warning('Lost reason required'); return; }
    await moveToStage(movingStage, lostReason);
    setLostModal(false);
    setLostReason('');
    setMovingStage(null);
  };

  const doMarkWon = () => {
    const wonStage = stages.find((s) => s.is_won_stage);
    if (wonStage) { handleStageClick(wonStage); return; }
    Modal.confirm({
      title: 'Mark Deal as Won?',
      onOk: async () => {
        await axios.patch(api(`/api/deals/${id}`), { status: 'won' }, { headers: authHeaders() });
        messageApi.success('Deal marked Won');
        loadDeal();
      },
    });
  };

  const doMarkLostDirect = () => {
    const lostStage = stages.find((s) => s.is_lost_stage);
    if (lostStage) { handleStageClick(lostStage); return; }
    setMovingStage(null);
    setLostModal(true);
  };

  if (loading) return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Deal" />
      <div style={{ padding: token.padding }}><Skeleton active paragraph={{ rows: 8 }} /></div>
    </AuthenticatedLayout>
  );

  if (error || !deal) return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Deal" />
      <div style={{ padding: token.padding }}>
        <Alert type="error" message={error || 'Deal not found'} showIcon />
      </div>
    </AuthenticatedLayout>
  );

  const stage = deal.deal_stage || deal.dealStage;
  const pipeline = deal.deal_pipeline || deal.dealPipeline;
  const assignedTo = deal.assigned_to || deal.assignedTo;
  const contact = deal.contact;
  const lead = deal.lead;

  const timelineItems = [
    { color: 'blue', children: <><Text strong>Deal Created</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{fmtDateTime(deal.created_at)}</Text></> },
    ...history.map((h) => ({
      color: 'green',
      children: (
        <>
          <Text strong>Stage moved: {h.from_stage?.name || 'Start'} → {h.to_stage?.name || 'Unknown'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{fmtDateTime(h.changed_at)} · {h.days_in_previous_stage ?? 0} days in prev stage</Text>
          {h.remarks && <><br /><Text style={{ fontSize: 11 }}>{h.remarks}</Text></>}
        </>
      ),
    })),
    ...activities.map((a) => ({
      color: a.status === 'completed' ? 'green' : 'orange',
      dot: <ScheduleOutlined />,
      children: (
        <>
          <Text strong>{a.subject}</Text>
          <Tag style={{ marginLeft: 4, fontSize: 10 }}>{labelize(a.activity_type)}</Tag>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{fmtDateTime(a.due_at)} · {labelize(a.status)}</Text>
        </>
      ),
    })),
  ].sort((a, b) => 0);

  const tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'activities', label: 'Activities' },
    { key: 'details', label: 'Details' },
  ];


  return (
    <AuthenticatedLayout user={auth?.user}>
      {ctx}
      <Head title={deal.title || 'Deal'} />

      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={token.paddingSM} style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>

          {/* Header */}
          <Card size="small" bodyStyle={{ padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Button type="text" icon={<ArrowLeftOutlined />} size="small" onClick={() => router.visit('/crm/deals')}>Deals</Button>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0 }}>{deal.title}</Title>
                <Space size={6} style={{ flexWrap: 'wrap' }}>
                  <Tag color={STATUS_COLOR[deal.status] || 'default'}>{(deal.status || 'open').toUpperCase()}</Tag>
                  {deal.priority && <Tag color={PRIORITY_COLOR[deal.priority]}>{deal.priority.toUpperCase()}</Tag>}
                  {stage && <Tag>{stage.name}</Tag>}
                  {pipeline && <Text type="secondary" style={{ fontSize: 11 }}>{pipeline.name}</Text>}
                </Space>
              </div>
              <Space wrap size={6}>
                <Button size="small" icon={<PlusOutlined />} onClick={() => setActivityDrawer(true)}>Activity</Button>
                <Button size="small" icon={<FileTextOutlined />} onClick={() => router.visit(`/payment-in/quotations/add?deal_id=${id}`)}>Quotation</Button>
                {deal.status !== 'won' && (
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={doMarkWon} style={{ background: token.colorSuccess }}>Mark Won</Button>
                )}
                {deal.status !== 'lost' && (
                  <Button size="small" danger icon={<CloseCircleOutlined />} onClick={doMarkLostDirect}>Mark Lost</Button>
                )}
              </Space>
            </div>
          </Card>

          {/* Stage progress */}
          {stages.length > 0 && (
            <StagePath stages={stages} currentStageId={deal.deal_stage_id} onMove={handleStageClick} />
          )}

          <Row gutter={[token.padding, token.padding]}>
            {/* Key metrics */}
            {[
              { label: 'Amount', value: fmtMoney(deal.amount) },
              { label: 'Probability', value: deal.probability != null ? `${deal.probability}%` : '-' },
              { label: 'Expected Close', value: fmtDate(deal.expected_close_date) },
              { label: 'Assigned', value: assignedTo?.name || '-' },
            ].map((m) => (
              <Col xs={12} md={6} key={m.label}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 11 }}>{m.label}</Text>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{m.value}</div>
                </Card>
              </Col>
            ))}
          </Row>

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: token.padding }}>
            {/* Left rail */}
            <div>
              <Card size="small" bodyStyle={{ padding: 0 }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                  <Text strong style={{ fontSize: 12 }}>Deal Info</Text>
                </div>
                <div style={{ borderRadius: token.borderRadius, overflow: 'hidden' }}>
                  <RailRow label="Deal No" value={deal.deal_no} />
                  <RailRow label="Status" value={<Tag color={STATUS_COLOR[deal.status] || 'default'} style={{ margin: 0 }}>{labelize(deal.status)}</Tag>} />
                  <RailRow label="Stage" value={stage?.name} />
                  <RailRow label="Pipeline" value={pipeline?.name} />
                  <RailRow label="Source" value={deal.source} />
                  <RailRow label="Priority" value={deal.priority ? <Tag color={PRIORITY_COLOR[deal.priority]} style={{ margin: 0 }}>{labelize(deal.priority)}</Tag> : null} />
                  {contact && <RailRow label="Contact" value={<><Text style={{ fontSize: 11 }}>{contact.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{contact.email || contact.phone || ''}</Text></>} />}
                  {lead && <RailRow label="Lead" value={<Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 11 }} onClick={() => router.visit(`/crm/leads/${lead.id}`)}>{lead.name}</Button>} />}
                  <RailRow label="Committed" value={deal.committed ? 'Yes' : 'No'} />
                  <RailRow label="Created" value={fmtDate(deal.created_at)} />
                  {deal.closed_date && <RailRow label="Closed" value={fmtDate(deal.closed_date)} />}
                  {deal.lost_reason && <RailRow label="Lost Reason" value={deal.lost_reason} />}
                </div>

                {/* Tab nav */}
                <div style={{ padding: '8px 10px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '7px 10px', cursor: 'pointer',
                          background: activeTab === tab.key ? token.colorPrimaryBg : 'transparent',
                          color: activeTab === tab.key ? token.colorPrimary : token.colorTextSecondary,
                          border: `1px solid ${activeTab === tab.key ? token.colorPrimaryBorder : 'transparent'}`,
                          borderRadius: token.borderRadius, fontWeight: 700, fontSize: 12,
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </Space>
                </div>
              </Card>
            </div>

            {/* Main content */}
            <div>
              {activeTab === 'timeline' && (
                <Card size="small" title="Timeline">
                  {timelineItems.length ? (
                    <Timeline items={timelineItems} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No timeline events" />
                  )}
                </Card>
              )}

              {activeTab === 'activities' && (
                <Card
                  size="small"
                  title="Activities"
                  extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setActivityDrawer(true)}>Add</Button>}
                >
                  <ReusableCrud
                    title="Activities"
                    apiUrl={api('/api/crm-activities/')}
                    columns={[
                      { title: 'Subject', dataIndex: 'subject', key: 'subject', render: (v) => <Text strong>{v}</Text> },
                      { title: 'Type', dataIndex: 'activity_type', key: 'type', width: 100, render: (v) => v ? <Tag style={{ margin: 0 }}>{labelize(v)}</Tag> : '-' },
                      { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={v === 'completed' ? 'success' : 'warning'} style={{ margin: 0 }}>{labelize(v)}</Tag> },
                      { title: 'Due', dataIndex: 'due_at', key: 'due_at', width: 130, render: fmtDate },
                    ]}
                    fields={activityCrud.fields}
                    validationSchema={activityCrud.validationSchema}
                    crudInitialValues={activityCrud.crudInitialValues}
                    transformPayload={activityCrud.transformPayload}
                    baseFilters={{ deal_id: id }}
                    form_ui="drawer"
                    drawerWidth={800}
                    enableServerPagination={true}
                    showSearch={false}
                    canAdd={true}
                    canEdit={true}
                    canDelete={true}
                    hasActions={true}
                    hasActionColumns={true}
                  />
                </Card>
              )}

              {activeTab === 'details' && (
                <Card size="small" title="Deal Details">
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <tbody>
                        {[
                          ['Title', deal.title], ['Deal No', deal.deal_no], ['Amount', fmtMoney(deal.amount)],
                          ['Probability', deal.probability != null ? `${deal.probability}%` : '-'],
                          ['Source', deal.source], ['Expected Close', fmtDate(deal.expected_close_date)],
                          ['Closed Date', fmtDate(deal.closed_date)], ['Lost Reason', deal.lost_reason],
                          ['Description', deal.description],
                        ].map(([label, value]) => (
                          <tr key={label} style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: token.colorTextSecondary, width: 140, background: token.colorFillAlter, borderRight: `1px solid ${token.colorBorderSecondary}` }}>{label}</td>
                            <td style={{ padding: '8px 10px', wordBreak: 'break-word' }}>{value || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Space>
                </Card>
              )}
            </div>
          </div>
        </Space>
      </div>

      {/* Add Activity Drawer */}
      <Drawer title="Add Activity" open={activityDrawer} onClose={() => setActivityDrawer(false)} width={700}>
        <ReusableCrud
          title="Activities"
          apiUrl={api('/api/crm-activities/')}
          columns={[{ title: 'Subject', dataIndex: 'subject', key: 'subject' }]}
          fields={activityCrud.fields}
          validationSchema={activityCrud.validationSchema}
          crudInitialValues={activityCrud.crudInitialValues}
          transformPayload={activityCrud.transformPayload}
          baseFilters={{ deal_id: id }}
          form_ui="drawer"
          drawerWidth={700}
          enableServerPagination={false}
          showSearch={false}
          canAdd={true}
          canEdit={false}
          canDelete={false}
          hasActions={false}
          hasActionColumns={false}
        />
      </Drawer>

      {/* Lost reason modal */}
      <Modal
        title="Mark Deal Lost"
        open={lostModal}
        onOk={doMarkLost}
        onCancel={() => { setLostModal(false); setLostReason(''); setMovingStage(null); }}
        okText="Confirm Lost"
        okButtonProps={{ danger: true }}
      >
        <Form layout="vertical">
          <Form.Item label="Lost Reason" required>
            <Input.TextArea rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Why was this deal lost?" />
          </Form.Item>
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
