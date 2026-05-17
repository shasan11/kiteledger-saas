import { useCallback, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Row,
  Skeleton,
  Space,
  Steps,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { buildActivityCrud, buildDealCrud } from '@/Pages/App/Crm/Shared/crmCrudConfigs';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const fmtMoney = (value) => {
  if (value === null || value === undefined || value === '') return '-';

  return Number(value).toLocaleString('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-');
const fmtDateTime = (value) => (value ? dayjs(value).format('DD MMM YYYY HH:mm') : '-');

const labelize = (value) => {
  if (!value) return '-';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const rowsFrom = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;

  return [];
};

const unwrap = (payload) => payload?.data ?? payload;

const STATUS_COLOR = {
  open: 'processing',
  won: 'success',
  lost: 'error',
  cancelled: 'default',
};

const PRIORITY_COLOR = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

function StagePath({ stages = [], currentStageId, onMove }) {
  const visibleStages = stages.filter((stage) => !stage.is_lost_stage);

  if (!visibleStages.length) return null;

  const currentIndex = visibleStages.findIndex((stage) => stage.id === currentStageId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

  const items = visibleStages.map((stage, index) => {
    const isDone = currentIndex >= 0 && index < currentIndex;
    const isCurrent = index === currentIndex;

    return {
      title: (
        <Tooltip title={isCurrent ? stage.name : `Move to ${stage.name}`}>
          <span
            style={{
              cursor: isCurrent ? 'default' : 'pointer',
              fontSize: 12,
            }}
            onClick={() => {
              if (!isCurrent) onMove(stage);
            }}
          >
            {stage.name}
            {stage.is_won_stage ? (
              <Tag color="success" style={{ marginLeft: 4, fontSize: 10 }}>
                Won
              </Tag>
            ) : null}
          </span>
        </Tooltip>
      ),
      status: isCurrent ? 'process' : isDone ? 'finish' : 'wait',
    };
  });

  return (
    <Card size="small" bodyStyle={{ padding: '10px 16px' }}>
      <Steps size="small" current={safeCurrentIndex} items={items} />
    </Card>
  );
}

function RailRow({ label, value }) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '96px 1fr',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        fontSize: 12,
      }}
    >
      <span
        style={{
          padding: '7px 10px',
          background: token.colorFillAlter,
          fontWeight: 600,
          color: token.colorTextSecondary,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {label}
      </span>
      <span style={{ padding: '7px 10px', wordBreak: 'break-word' }}>{value ?? '-'}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  const { token } = theme.useToken();

  return (
    <tr style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
      <td
        style={{
          padding: '8px 10px',
          fontWeight: 600,
          color: token.colorTextSecondary,
          width: 150,
          background: token.colorFillAlter,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          verticalAlign: 'top',
        }}
      >
        {label}
      </td>
      <td style={{ padding: '8px 10px', wordBreak: 'break-word', verticalAlign: 'top' }}>
        {value || '-'}
      </td>
    </tr>
  );
}

export default function DealShow({ auth, id }) {
  const { token } = theme.useToken();
  const [messageApi, contextHolder] = message.useMessage();

  const [deal, setDeal] = useState(null);
  const [stages, setStages] = useState([]);
  const [history, setHistory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [lostModal, setLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [movingStage, setMovingStage] = useState(null);
  const [activityModal, setActivityModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const activityCrud = buildActivityCrud({ locked: { deal_id: id } });
  const dealCrud = buildDealCrud();

  const loadDeal = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(api(`/api/deals/${id}`), {
        headers: authHeaders(),
      });

      const currentDeal = unwrap(response.data);
      setDeal(currentDeal);

      const requests = [];

      if (currentDeal?.deal_pipeline_id) {
        requests.push(
          axios
            .get(api('/api/deal-stages/'), {
              headers: authHeaders(),
              params: {
                deal_pipeline_id: currentDeal.deal_pipeline_id,
                page_size: 50,
                ordering: 'sort_order',
              },
            })
            .then((stageResponse) => {
              setStages(rowsFrom(stageResponse.data).filter((stage) => !stage.is_lost_stage));
            })
            .catch(() => {
              setStages([]);
            })
        );
      } else {
        setStages([]);
      }

      requests.push(
        axios
          .get(api(`/api/crm/deals/${id}/stage-history`), {
            headers: authHeaders(),
          })
          .then((historyResponse) => {
            setHistory(rowsFrom(historyResponse.data));
          })
          .catch(() => {
            setHistory([]);
          })
      );

      requests.push(
        axios
          .get(api('/api/crm-activities/'), {
            headers: authHeaders(),
            params: {
              deal_id: id,
              page_size: 50,
            },
          })
          .then((activityResponse) => {
            setActivities(rowsFrom(activityResponse.data));
          })
          .catch(() => {
            setActivities([]);
          })
      );

      await Promise.allSettled(requests);
    } catch (err) {
      setDeal(null);
      setError(err?.response?.data?.message || 'Failed to load deal');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const moveToStage = async (stage, reason = null) => {
    try {
      await axios.post(
        api(`/api/deals/${id}/move-stage`),
        {
          deal_stage_id: stage.id,
          lost_reason: reason,
        },
        { headers: authHeaders() }
      );

      messageApi.success(`Moved to ${stage.name}`);
      loadDeal();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || 'Move failed');
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
    if (!lostReason.trim()) {
      messageApi.warning('Lost reason required');
      return;
    }

    try {
      if (movingStage) {
        await moveToStage(movingStage, lostReason);
      } else {
        await axios.patch(
          api(`/api/deals/${id}`),
          {
            status: 'lost',
            lost_reason: lostReason,
          },
          { headers: authHeaders() }
        );

        messageApi.success('Deal marked Lost');
        loadDeal();
      }

      setLostModal(false);
      setLostReason('');
      setMovingStage(null);
    } catch (err) {
      messageApi.error(err?.response?.data?.message || 'Failed to mark lost');
    }
  };

  const doMarkWon = () => {
    const wonStage = stages.find((stage) => stage.is_won_stage);

    if (wonStage) {
      handleStageClick(wonStage);
      return;
    }

    Modal.confirm({
      title: 'Mark Deal as Won?',
      onOk: async () => {
        try {
          await axios.patch(api(`/api/deals/${id}`), { status: 'won' }, { headers: authHeaders() });
          messageApi.success('Deal marked Won');
          loadDeal();
        } catch (err) {
          messageApi.error(err?.response?.data?.message || 'Failed to mark won');
        }
      },
    });
  };

  const doMarkLostDirect = () => {
    setMovingStage(null);
    setLostModal(true);
  };

  if (loading) {
    return (
      <AuthenticatedLayout user={auth?.user}>
        <Head title="Deal" />
        <div style={{ padding: token.padding }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !deal) {
    return (
      <AuthenticatedLayout user={auth?.user}>
        <Head title="Deal" />
        <div style={{ padding: token.padding }}>
          <Alert type="error" message={error || 'Deal not found'} showIcon />
        </div>
      </AuthenticatedLayout>
    );
  }

  const stage = deal.deal_stage || deal.dealStage;
  const pipeline = deal.deal_pipeline || deal.dealPipeline;
  const assignedTo = deal.assigned_to || deal.assignedTo;
  const contact = deal.contact;
  const lead = deal.lead;

  const timelineItems = [
    {
      color: 'blue',
      children: (
        <>
          <Text strong>Deal Created</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {fmtDateTime(deal.created_at)}
          </Text>
        </>
      ),
    },
    ...history.map((item) => ({
      color: 'green',
      children: (
        <>
          <Text strong>
            Stage moved: {item.from_stage?.name || 'Start'} → {item.to_stage?.name || 'Unknown'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {fmtDateTime(item.changed_at)} · {item.days_in_previous_stage ?? 0} days in previous stage
          </Text>
          {item.remarks ? (
            <>
              <br />
              <Text style={{ fontSize: 11 }}>{item.remarks}</Text>
            </>
          ) : null}
        </>
      ),
    })),
    ...activities.map((activity) => ({
      color: activity.status === 'completed' ? 'green' : 'orange',
      dot: <ScheduleOutlined />,
      children: (
        <>
          <Text strong>{activity.subject || '-'}</Text>
          <Tag style={{ marginLeft: 4, fontSize: 10 }}>{labelize(activity.activity_type)}</Tag>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {fmtDateTime(activity.due_at)} · {labelize(activity.status)}
          </Text>
        </>
      ),
    })),
  ];

  const activityPriorityFilters = [
    { key: 'all', label: 'All', params: {} },
    { key: 'low', label: 'Low', params: { priority: 'low' } },
    { key: 'medium', label: 'Medium', params: { priority: 'medium' } },
    { key: 'high', label: 'High', params: { priority: 'high' } },
    { key: 'urgent', label: 'Urgent', params: { priority: 'urgent' } },
  ];

  const detailsTab = (
    <Card size="small" title="Deal Details">
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <tbody>
          <InfoRow label="Title" value={deal.title} />
          <InfoRow label="Deal No" value={deal.deal_no} />
          <InfoRow label="Amount" value={fmtMoney(deal.amount)} />
          <InfoRow label="Probability" value={deal.probability !== null && deal.probability !== undefined ? `${deal.probability}%` : '-'} />
          <InfoRow label="Status" value={<Tag color={STATUS_COLOR[deal.status] || 'default'}>{labelize(deal.status)}</Tag>} />
          <InfoRow label="Stage" value={stage?.name} />
          <InfoRow label="Pipeline" value={pipeline?.name} />
          <InfoRow label="Source" value={deal.source} />
          <InfoRow label="Priority" value={deal.priority ? <Tag color={PRIORITY_COLOR[deal.priority]}>{labelize(deal.priority)}</Tag> : '-'} />
          <InfoRow label="Expected Close" value={fmtDate(deal.expected_close_date)} />
          <InfoRow label="Closed Date" value={fmtDate(deal.closed_date)} />
          <InfoRow label="Assigned To" value={assignedTo?.name} />
          <InfoRow label="Contact" value={contact?.name} />
          <InfoRow label="Lead" value={lead?.name} />
          <InfoRow label="Committed" value={deal.committed ? 'Yes' : 'No'} />
          <InfoRow label="Lost Reason" value={deal.lost_reason} />
          <InfoRow label="Description" value={deal.description} />
        </tbody>
      </table>
    </Card>
  );

  const timelineTab = (
    <Card size="small" title="Timeline">
      {timelineItems.length ? (
        <Timeline items={timelineItems} />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No timeline events" />
      )}
    </Card>
  );

  const activitiesTab = (
    <Card
      size="small"
      title="Activities"
      extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => setActivityModal(true)}>
          Add
        </Button>
      }
    >
      <ReusableCrud
        title="Activities"
        apiUrl={api('/api/crm-activities/')}
        columns={[
          {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            render: (value) => <Text strong>{value || '-'}</Text>,
          },
          {
            title: 'Type',
            dataIndex: 'activity_type',
            key: 'activity_type',
            width: 110,
            render: (value) => (value ? <Tag style={{ margin: 0 }}>{labelize(value)}</Tag> : '-'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (value) => (
              <Tag color={value === 'completed' ? 'success' : 'warning'} style={{ margin: 0 }}>
                {labelize(value)}
              </Tag>
            ),
          },
          {
            title: 'Due',
            dataIndex: 'due_at',
            key: 'due_at',
            width: 150,
            render: fmtDate,
          },
        ]}
        fields={activityCrud.fields}
        validationSchema={activityCrud.validationSchema}
        crudInitialValues={activityCrud.crudInitialValues}
        transformPayload={activityCrud.transformPayload}
        baseFilters={{ deal_id: id }}
        form_ui="modal"
        modalWidth={900}
        enableServerPagination
        showSearch={false}
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
        anchorFilters={activityPriorityFilters}
        defaultAnchorKey="all"
      />
    </Card>
  );

  const tabs = [
    {
      key: 'details',
      label: 'Details',
      children: detailsTab,
    },
    {
      key: 'timeline',
      label: 'Timeline',
      children: timelineTab,
    },
    {
      key: 'activities',
      label: 'Activities',
      children: activitiesTab,
    },
  ];

  return (
    <AuthenticatedLayout user={auth?.user}>
      {contextHolder}
      <Head title={deal.title || 'Deal'} />

      <div
        style={{
          padding: token.padding,
          background: token.colorBgLayout,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Space
          direction="vertical"
          size={token.paddingSM}
          style={{
            width: '100%',
            maxWidth: 1400,
            margin: '0 auto',
          }}
        >
          <Card size="small" bodyStyle={{ padding: '10px 16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                size="small"
                onClick={() => router.visit('/crm/deals')}
              >
                Deals
              </Button>

              <div style={{ flex: 1, minWidth: 240 }}>
                <Title level={4} style={{ margin: 0 }}>
                  {deal.title || 'Deal'}
                </Title>

                <Space size={6} style={{ flexWrap: 'wrap' }}>
                  <Tag color={STATUS_COLOR[deal.status] || 'default'}>{(deal.status || 'open').toUpperCase()}</Tag>
                  {deal.priority ? (
                    <Tag color={PRIORITY_COLOR[deal.priority]}>{deal.priority.toUpperCase()}</Tag>
                  ) : null}
                  {stage ? <Tag>{stage.name}</Tag> : null}
                  {pipeline ? (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {pipeline.name}
                    </Text>
                  ) : null}
                </Space>
              </div>

              <Space wrap size={6}>
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditModal(true)}>
                  Edit Deal
                </Button>
                <Button size="small" icon={<PlusOutlined />} onClick={() => setActivityModal(true)}>
                  Activity
                </Button>
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => router.visit(`/payment-in/quotations/add?deal_id=${id}`)}
                >
                  Quotation
                </Button>
                {deal.status !== 'won' ? (
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={doMarkWon}
                    style={{ background: token.colorSuccess }}
                  >
                    Mark Won
                  </Button>
                ) : null}
                {deal.status !== 'lost' ? (
                  <Button size="small" danger icon={<CloseCircleOutlined />} onClick={doMarkLostDirect}>
                    Mark Lost
                  </Button>
                ) : null}
              </Space>
            </div>
          </Card>

          {stages.length > 0 ? (
            <StagePath stages={stages} currentStageId={deal.deal_stage_id} onMove={handleStageClick} />
          ) : null}

          <Row gutter={[token.padding, token.padding]}>
            {[
              { label: 'Amount', value: fmtMoney(deal.amount) },
              {
                label: 'Probability',
                value: deal.probability !== null && deal.probability !== undefined ? `${deal.probability}%` : '-',
              },
              { label: 'Expected Close', value: fmtDate(deal.expected_close_date) },
              { label: 'Assigned', value: assignedTo?.name || '-' },
            ].map((item) => (
              <Col xs={12} md={6} key={item.label}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {item.label}
                  </Text>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{item.value}</div>
                </Card>
              </Col>
            ))}
          </Row>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '260px minmax(0, 1fr)',
              gap: token.padding,
              alignItems: 'start',
            }}
          >
            <aside>
              <Card size="small" bodyStyle={{ padding: 0 }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Text strong style={{ fontSize: 12 }}>
                    Deal Info
                  </Text>
                </div>

                <div style={{ borderRadius: token.borderRadius, overflow: 'hidden' }}>
                  <RailRow label="Deal No" value={deal.deal_no} />
                  <RailRow
                    label="Status"
                    value={
                      <Tag color={STATUS_COLOR[deal.status] || 'default'} style={{ margin: 0 }}>
                        {labelize(deal.status)}
                      </Tag>
                    }
                  />
                  <RailRow label="Stage" value={stage?.name} />
                  <RailRow label="Pipeline" value={pipeline?.name} />
                  <RailRow label="Source" value={deal.source} />
                  <RailRow
                    label="Priority"
                    value={
                      deal.priority ? (
                        <Tag color={PRIORITY_COLOR[deal.priority]} style={{ margin: 0 }}>
                          {labelize(deal.priority)}
                        </Tag>
                      ) : null
                    }
                  />
                  {contact ? (
                    <RailRow
                      label="Contact"
                      value={
                        <>
                          <Text style={{ fontSize: 11 }}>{contact.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {contact.email || contact.phone || ''}
                          </Text>
                        </>
                      }
                    />
                  ) : null}
                  {lead ? (
                    <RailRow
                      label="Lead"
                      value={
                        <Button
                          type="link"
                          size="small"
                          style={{ padding: 0, height: 'auto', fontSize: 11 }}
                          onClick={() => router.visit(`/crm/leads/${lead.id}`)}
                        >
                          {lead.name}
                        </Button>
                      }
                    />
                  ) : null}
                  <RailRow label="Committed" value={deal.committed ? 'Yes' : 'No'} />
                  <RailRow label="Created" value={fmtDate(deal.created_at)} />
                  {deal.closed_date ? <RailRow label="Closed" value={fmtDate(deal.closed_date)} /> : null}
                  {deal.lost_reason ? <RailRow label="Lost Reason" value={deal.lost_reason} /> : null}
                </div>
              </Card>
            </aside>

            <main style={{ minWidth: 0 }}>
              <Card size="small" bodyStyle={{ paddingTop: 6 }}>
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  tabPosition="top"
                  size="small"
                  items={tabs}
                />
              </Card>
            </main>
          </div>
        </Space>
      </div>

      {activityModal ? (
        <div style={{ display: 'none' }}>
          <ReusableCrud
            title="Activities"
            apiUrl={api('/api/crm-activities/')}
            columns={[{ title: 'Subject', dataIndex: 'subject', key: 'subject' }]}
            fields={activityCrud.fields}
            validationSchema={activityCrud.validationSchema}
            crudInitialValues={activityCrud.crudInitialValues}
            transformPayload={activityCrud.transformPayload}
            baseFilters={{ deal_id: id }}
            form_ui="modal"
            modalWidth={860}
            enableServerPagination={false}
            showSearch={false}
            canAdd
            canEdit={false}
            canDelete={false}
            hasActions={false}
            hasActionColumns={false}
            openOnMount
            openMode="add"
            submitLabelOverride="Add Activity"
            onFormClose={() => setActivityModal(false)}
            onAddSuccess={() => {
              setActivityModal(false);
              setActiveTab('activities');
              loadDeal();
            }}
          />
        </div>
      ) : null}

      {editModal ? (
        <div style={{ display: 'none' }}>
          <ReusableCrud
            title="Deals"
            apiUrl={api('/api/deals/')}
            columns={[{ title: 'Title', dataIndex: 'title', key: 'title' }]}
            fields={dealCrud.fields}
            validationSchema={dealCrud.validationSchema}
            crudInitialValues={dealCrud.crudInitialValues}
            transformPayload={dealCrud.transformPayload}
            form_ui="modal"
            modalWidth={900}
            enableServerPagination={false}
            showSearch={false}
            canAdd={false}
            canEdit
            canDelete={false}
            hasActions={false}
            hasActionColumns={false}
            openOnMount
            openMode="edit"
            openEditId={id}
            onFormClose={() => setEditModal(false)}
            onEditSuccess={() => {
              setEditModal(false);
              loadDeal();
            }}
          />
        </div>
      ) : null}

      <Modal
        title="Mark Deal Lost"
        open={lostModal}
        onOk={doMarkLost}
        onCancel={() => {
          setLostModal(false);
          setLostReason('');
          setMovingStage(null);
        }}
        okText="Confirm Lost"
        okButtonProps={{ danger: true }}
      >
        <Form layout="vertical">
          <Form.Item label="Lost Reason" required>
            <Input.TextArea
              rows={3}
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              placeholder="Why was this deal lost?"
            />
          </Form.Item>
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
