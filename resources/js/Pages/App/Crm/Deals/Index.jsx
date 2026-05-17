import { useEffect, useRef, useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
  PlusOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { buildDealCrud } from '@/Pages/App/Crm/Shared/crmCrudConfigs';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const fmtMoney = (v) => v == null ? '-' : Number(v).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (v) => v ? dayjs(v).format('DD MMM YY') : '-';
const rowsFrom = (data) => data?.data?.data || data?.data || data?.results || (Array.isArray(data) ? data : []);

const STATUS_COLOR = { open: 'processing', won: 'success', lost: 'error', cancelled: 'default' };
const PRIORITY_COLOR = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };
const DEAL_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];
const DEAL_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const optionLabel = (record) =>
  record?.name ||
  record?.display_name ||
  record?.title ||
  record?.company_name ||
  record?.email ||
  record?.deal_no ||
  record?.code ||
  record?.id;

const toOptions = (records = []) =>
  records.map((record) => ({
    value: record.id,
    label: optionLabel(record),
  }));

const cleanDealPayload = (values) => {
  const payload = {
    ...values,
    title: values.title?.trim() || null,
    source: values.source?.trim() || null,
    description: values.description?.trim() || null,
    lead_id: values.lead_id || null,
    contact_id: values.contact_id || null,
    deal_pipeline_id: values.deal_pipeline_id || null,
    deal_stage_id: values.deal_stage_id || null,
    assigned_to_id: values.assigned_to_id || null,
    amount: values.amount !== undefined && values.amount !== null && values.amount !== '' ? Number(values.amount) : null,
    probability: values.probability !== undefined && values.probability !== null && values.probability !== '' ? Number(values.probability) : null,
    committed: Boolean(values.committed),
    expected_close_date: values.expected_close_date ? dayjs(values.expected_close_date).format('YYYY-MM-DD') : null,
    active: true,
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === null || payload[key] === undefined || payload[key] === '') {
      delete payload[key];
    }
  });

  return payload;
};

function DealCard({ deal, onStageMove, onCardClick, stages }) {
  const { token } = theme.useToken();
  const isStuck = deal.updated_at && dayjs().diff(dayjs(deal.updated_at), 'day') > 14 && deal.status === 'open';

  return (
    <Card
      size="small"
      hoverable
      style={{
        marginBottom: 8,
        borderColor: isStuck ? token.colorWarningBorder : token.colorBorderSecondary,
        borderRadius: token.borderRadius,
        cursor: 'pointer',
      }}
      bodyStyle={{ padding: '10px 12px' }}
      onClick={() => onCardClick(deal)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('dealId', deal.id)}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 12, lineHeight: 1.3, flex: 1 }}>{deal.title}</Text>
          {isStuck && <Tooltip title="Stuck >14 days"><WarningOutlined style={{ color: token.colorWarning }} /></Tooltip>}
        </Space>
        <Text style={{ fontSize: 13, fontWeight: 600, color: token.colorPrimary }}>{fmtMoney(deal.amount)}</Text>
        <Space wrap size={4}>
          {deal.priority && <Tag color={PRIORITY_COLOR[deal.priority]} style={{ margin: 0, fontSize: 10 }}>{deal.priority.toUpperCase()}</Tag>}
          {deal.probability != null && <Text type="secondary" style={{ fontSize: 10 }}>{deal.probability}%</Text>}
        </Space>
        {(deal.contact?.name || deal.lead?.name) && (
          <Text type="secondary" style={{ fontSize: 11 }}>{deal.contact?.name || deal.lead?.name}</Text>
        )}
        {deal.expected_close_date && (
          <Text style={{ fontSize: 10, color: dayjs(deal.expected_close_date).isBefore(dayjs()) ? token.colorError : token.colorTextSecondary }}>
            Close: {fmtDate(deal.expected_close_date)}
          </Text>
        )}
        {deal.assigned_to?.name && <Text type="secondary" style={{ fontSize: 10 }}>{deal.assigned_to.name}</Text>}
      </Space>
    </Card>
  );
}

function KanbanColumn({ stage, deals, onStageMove, onCardClick, stages }) {
  const { token } = theme.useToken();
  const [dragOver, setDragOver] = useState(false);

  const totalValue = deals.reduce((s, d) => s + Number(d.amount || 0), 0);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) onStageMove(dealId, stage.id, stage);
  };

  return (
    <div
      style={{
        minWidth: 260,
        maxWidth: 280,
        flex: '0 0 270px',
        background: dragOver ? token.colorPrimaryBg : token.colorFillAlter,
        border: `1px solid ${dragOver ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 10,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Space size={6}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            background: stage.color || token.colorPrimary,
          }} />
          <Text strong style={{ fontSize: 12 }}>{stage.name}</Text>
          {stage.is_won_stage && <Tag color="success" style={{ margin: 0, fontSize: 10 }}>Won</Tag>}
          {stage.is_lost_stage && <Tag color="error" style={{ margin: 0, fontSize: 10 }}>Lost</Tag>}
        </Space>
        <Badge count={deals.length} color={token.colorTextSecondary} style={{ fontSize: 10 }} />
      </div>
      <div style={{ fontSize: 11, color: token.colorTextSecondary, marginBottom: 10 }}>
        {stage.probability != null ? `${stage.probability}% · ` : ''}{fmtMoney(totalValue)}
      </div>

      {/* Cards */}
      <div style={{ minHeight: 60 }}>
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onStageMove={onStageMove}
            onCardClick={onCardClick}
            stages={stages}
          />
        ))}
        {!deals.length && (
          <div style={{
            minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px dashed ${token.colorBorderSecondary}`, borderRadius: token.borderRadius,
            background: token.colorBgContainer,
          }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Drop here</Text>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ pipelineId, search, extraFilters, onDealClick }) {
  const [stages, setStages] = useState([]);
  const [dealsByStage, setDealsByStage] = useState({});
  const [loading, setLoading] = useState(true);
  const [messageApi, ctx] = message.useMessage();
  const [lostModal, setLostModal] = useState(null); // { dealId, stageId, stage }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page_size: 100, ordering: 'sort_order' };
      if (pipelineId) params.deal_pipeline_id = pipelineId;

      const [stagesRes, dealsRes] = await Promise.all([
        axios.get(api('/api/deal-stages/'), { headers: authHeaders(), params }),
        axios.get(api('/api/deals/'), {
          headers: authHeaders(),
          params: { page_size: 300, ...(pipelineId ? { deal_pipeline_id: pipelineId } : {}), ...(search ? { search } : {}), ...extraFilters },
        }),
      ]);

      const stageRows = rowsFrom(stagesRes.data);
      const dealRows = rowsFrom(dealsRes.data);

      setStages(stageRows);

      const grouped = stageRows.reduce((acc, s) => { acc[s.id] = []; return acc; }, { __none: [] });
      dealRows.forEach((deal) => {
        const key = deal.deal_stage_id && grouped[deal.deal_stage_id] !== undefined ? deal.deal_stage_id : '__none';
        grouped[key].push(deal);
      });

      setDealsByStage(grouped);
    } catch {
      messageApi.error('Failed to load Kanban');
    } finally {
      setLoading(false);
    }
  }, [pipelineId, search, JSON.stringify(extraFilters)]);

  useEffect(() => { load(); }, [load]);

  const handleStageMove = useCallback(async (dealId, newStageId, newStage) => {
    if (newStage?.is_lost_stage) {
      setLostModal({ dealId, stageId: newStageId, stage: newStage });
      return;
    }

    if (newStage?.is_won_stage) {
      Modal.confirm({
        title: 'Mark as Won?',
        content: `Moving to "${newStage.name}" will mark this deal as Won and set the close date to today.`,
        okText: 'Confirm Won',
        okButtonProps: { type: 'primary' },
        onOk: () => commitMove(dealId, newStageId, null),
      });
      return;
    }

    await commitMove(dealId, newStageId, null);
  }, []);

  const commitMove = async (dealId, stageId, lostReason) => {
    try {
      await axios.post(api(`/api/deals/${dealId}/move-stage`), { deal_stage_id: stageId, lost_reason: lostReason }, { headers: authHeaders() });
      messageApi.success('Deal moved');
      load();
    } catch (e) {
      messageApi.error(e?.response?.data?.message || 'Move failed');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading...</Text></div>;

  return (
    <>
      {ctx}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, minHeight: 200 }}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage[stage.id] || []}
            onStageMove={handleStageMove}
            onCardClick={onDealClick}
            stages={stages}
          />
        ))}
        {dealsByStage.__none?.length > 0 && (
          <KanbanColumn
            stage={{ id: '__none', name: 'No Stage', color: '#999' }}
            deals={dealsByStage.__none}
            onStageMove={handleStageMove}
            onCardClick={onDealClick}
            stages={stages}
          />
        )}
        {stages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">No stages found. Create a pipeline first.</Text>
          </div>
        )}
      </div>

      {/* Lost reason modal */}
      <LostReasonModal
        open={!!lostModal}
        stageName={lostModal?.stage?.name}
        onConfirm={(reason) => {
          commitMove(lostModal.dealId, lostModal.stageId, reason);
          setLostModal(null);
        }}
        onCancel={() => setLostModal(null)}
      />
    </>
  );
}

function LostReasonModal({ open, stageName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');

  return (
    <Modal
      title={`Move to "${stageName}" — Mark Lost`}
      open={open}
      onOk={() => { if (reason.trim()) onConfirm(reason); }}
      onCancel={() => { setReason(''); onCancel(); }}
      okText="Confirm Lost"
      okButtonProps={{ danger: true, disabled: !reason.trim() }}
      afterClose={() => setReason('')}
    >
      <Form layout="vertical">
        <Form.Item label="Lost Reason" required>
          <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why was this deal lost?" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function SummaryBar({ pipelineId, search }) {
  const [data, setData] = useState(null);
  const { token } = theme.useToken();

  useEffect(() => {
    const params = { page_size: 300, status: 'open', ...(pipelineId ? { deal_pipeline_id: pipelineId } : {}) };
    axios.get(api('/api/deals/'), { headers: authHeaders(), params })
      .then((r) => {
        const deals = rowsFrom(r.data);
        const total = deals.reduce((s, d) => s + Number(d.amount || 0), 0);
        const weighted = deals.reduce((s, d) => s + Number(d.amount || 0) * (Number(d.probability || 0) / 100), 0);
        const stuck = deals.filter((d) => d.updated_at && dayjs().diff(dayjs(d.updated_at), 'day') > 14);
        setData({ count: deals.length, total, weighted, stuck: stuck.length });
      })
      .catch(() => {});
  }, [pipelineId]);

  if (!data) return null;

  return (
    <Row gutter={[10, 10]}>
      {[
        { title: 'Open Deals', value: data.count },
        { title: 'Pipeline Value', value: fmtMoney(data.total), noFormat: true },
        { title: 'Weighted Forecast', value: fmtMoney(data.weighted), noFormat: true },
        { title: 'Stuck Deals', value: data.stuck, valueStyle: data.stuck > 0 ? { color: token.colorWarning } : {} },
      ].map((m) => (
        <Col xs={12} md={6} key={m.title}>
          <Card size="small">
            <Statistic title={m.title} value={m.value} valueStyle={{ fontSize: 18, ...m.valueStyle }} formatter={m.noFormat ? (v) => v : undefined} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function AddDealModal({ open, selectedPipeline, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [quickContactOpen, setQuickContactOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const pipelineValue = Form.useWatch('deal_pipeline_id', form);

  const fetchStages = useCallback((pipelineId) => {
    const params = { page_size: 100, ordering: 'sort_order' };
    if (pipelineId) params.deal_pipeline_id = pipelineId;

    return axios
      .get(api('/api/deal-stages/'), { headers: authHeaders(), params })
      .then((response) => setStages(rowsFrom(response.data)))
      .catch(() => setStages([]));
  }, []);

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    form.setFieldsValue({
      status: 'open',
      priority: 'medium',
      committed: false,
      deal_pipeline_id: selectedPipeline || null,
    });

    setLoadingOptions(true);

    Promise.all([
      axios.get(api('/api/leads/'), { headers: authHeaders(), params: { page_size: 100 } }),
      axios.get(api('/api/contacts/'), { headers: authHeaders(), params: { page_size: 100 } }),
      axios.get(api('/api/hrm/users'), { headers: authHeaders(), params: { page_size: 100 } }),
      axios.get(api('/api/deal-pipelines/'), { headers: authHeaders(), params: { page_size: 100 } }),
      fetchStages(selectedPipeline),
    ])
      .then(([leadRes, contactRes, userRes, pipelineRes]) => {
        setLeads(rowsFrom(leadRes.data));
        setContacts(rowsFrom(contactRes.data));
        setUsers(rowsFrom(userRes.data));
        setPipelines(rowsFrom(pipelineRes.data));
      })
      .catch(() => {
        message.error('Failed to load deal form options');
      })
      .finally(() => setLoadingOptions(false));
  }, [fetchStages, form, open, selectedPipeline]);

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({ deal_stage_id: null });
    fetchStages(pipelineValue);
  }, [fetchStages, form, open, pipelineValue]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      await axios.post(api('/api/deals/'), cleanDealPayload(values), {
        headers: authHeaders(),
      });

      message.success('Deal added');
      onSaved();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.title?.[0] ||
          'Failed to add deal'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickContact = async () => {
    try {
      const values = await contactForm.validateFields();
      setSavingContact(true);

      const response = await axios.post(api('/api/contacts/'), {
        contact_type: values.contact_type || 'lead',
        name: values.name?.trim() || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        active: true,
      }, { headers: authHeaders() });

      const contact = response.data?.data || response.data;
      setContacts((current) => [contact, ...current.filter((item) => item.id !== contact.id)]);
      form.setFieldsValue({ contact_id: contact.id });
      contactForm.resetFields();
      setQuickContactOpen(false);
      message.success('Contact added');
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'Failed to add contact');
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <>
      <Modal
        title="Add Deal"
        open={open}
        onCancel={onCancel}
        width={900}
        destroyOnClose
        okText="Save Deal"
        onOk={handleSubmit}
        confirmLoading={saving}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={saving}
          initialValues={{
            status: 'open',
            priority: 'medium',
            committed: false,
            deal_pipeline_id: selectedPipeline || null,
          }}
        >
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="title"
                label="Title"
                rules={[
                  { required: true, message: 'Title is required' },
                  { max: 180, message: 'Title must be 180 characters or fewer' },
                ]}
              >
                <Input placeholder="Deal title" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="status" label="Status">
                <Select options={DEAL_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="priority" label="Priority">
                <Select options={DEAL_PRIORITY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="lead_id" label="Lead">
                <Select allowClear showSearch loading={loadingOptions} placeholder="Select lead" optionFilterProp="label" options={toOptions(leads)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Contact">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="contact_id" noStyle>
                    <Select allowClear showSearch loading={loadingOptions} placeholder="Select contact" optionFilterProp="label" options={toOptions(contacts)} />
                  </Form.Item>
                  <Button icon={<PlusOutlined />} onClick={() => setQuickContactOpen(true)} />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="assigned_to_id" label="Assigned To">
                <Select allowClear showSearch loading={loadingOptions} placeholder="Select user" optionFilterProp="label" options={toOptions(users)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="deal_pipeline_id" label="Pipeline">
                <Select allowClear showSearch loading={loadingOptions} placeholder="Default if blank" optionFilterProp="label" options={toOptions(pipelines)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="deal_stage_id" label="Stage">
                <Select allowClear showSearch loading={loadingOptions} placeholder="First stage if blank" optionFilterProp="label" options={toOptions(stages)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="source" label="Source">
                <Input placeholder="e.g. Referral" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="amount" label="Amount">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="probability" label="Probability (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="expected_close_date" label="Expected Close">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="committed" label="Committed" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} placeholder="Deal description" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Quick Add Contact"
        open={quickContactOpen}
        onCancel={() => {
          setQuickContactOpen(false);
          contactForm.resetFields();
        }}
        onOk={handleQuickContact}
        confirmLoading={savingContact}
        okText="Add Contact"
        destroyOnClose
      >
        <Form form={contactForm} layout="vertical" initialValues={{ contact_type: 'lead' }}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="contact_type" label="Contact Type" rules={[{ required: true, message: 'Contact type is required' }]}>
                <Select options={[{ value: 'customer', label: 'Customer' }, { value: 'supplier', label: 'Supplier' }, { value: 'lead', label: 'Lead' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Contact Name" rules={[{ required: true, message: 'Contact name is required' }]}>
                <Input placeholder="Contact name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

export default function DealsIndex(props) {
  const { token } = theme.useToken();
  const [view, setView] = useState('kanban');
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [search, setSearch] = useState('');
  const [extraFilters, setExtraFilters] = useState({});
  const [addDrawer, setAddDrawer] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const crudRef = useRef(null);

  const dealCrud = buildDealCrud();

  useEffect(() => {
    axios.get(api('/api/deal-pipelines/'), { headers: authHeaders(), params: { page_size: 50 } })
      .then((r) => {
        const rows = rowsFrom(r.data);
        setPipelines(rows);
      })
      .catch(() => {});
  }, []);

  const handleDealClick = (deal) => router.visit(route('crm.deals.show', deal.id));

  const tableColumns = [
    {
      title: 'Title', dataIndex: 'title', key: 'title', sorter: true, width: 220,
      render: (v) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: 'Stage', key: 'stage', width: 130,
      render: (_, r) => r.deal_stage?.name || r.dealStage?.name || '-',
    },
    {
      title: 'Amount', dataIndex: 'amount', key: 'amount', sorter: true, width: 120, align: 'right',
      render: fmtMoney,
    },
    {
      title: 'Probability', dataIndex: 'probability', key: 'probability', width: 100, align: 'right',
      render: (v) => v != null ? `${v}%` : '-',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (v) => <Tag color={STATUS_COLOR[v] || 'default'} style={{ margin: 0 }}>{v ? v.toUpperCase() : 'OPEN'}</Tag>,
    },
    {
      title: 'Close', dataIndex: 'expected_close_date', key: 'expected_close_date', sorter: true, width: 110,
      render: fmtDate,
    },
    {
      title: 'Assigned', key: 'assigned', width: 120,
      render: (_, r) => r.assigned_to?.name || r.assignedTo?.name || '-',
    },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Deals" />

      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={token.paddingSM} style={{ width: '100%' }}>

          {/* Top bar */}
          <Card size="small" bodyStyle={{ padding: '8px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <FundOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
              <Title level={5} style={{ margin: 0 }}>Deals</Title>

              <Select
                style={{ width: 200 }}
                size="small"
                placeholder="All pipelines"
                allowClear
                value={selectedPipeline}
                onChange={setSelectedPipeline}
                options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
              />

              <Input.Search
                size="small"
                placeholder="Search deals..."
                style={{ width: 200 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />

              <Space.Compact size="small" style={{ marginLeft: 'auto' }}>
                <Button
                  icon={<AppstoreOutlined />}
                  type={view === 'kanban' ? 'primary' : 'default'}
                  onClick={() => setView('kanban')}
                >
                  Kanban
                </Button>
                <Button
                  icon={<UnorderedListOutlined />}
                  type={view === 'list' ? 'primary' : 'default'}
                  onClick={() => setView('list')}
                >
                  List
                </Button>
              </Space.Compact>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => setAddDrawer(true)}
              >
                Add Deal
              </Button>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          </Card>

          {/* Summary */}
          <SummaryBar pipelineId={selectedPipeline} search={search} key={`sum-${refreshKey}`} />

          {/* Main view */}
          {view === 'kanban' ? (
            <KanbanBoard
              key={`kb-${selectedPipeline}-${refreshKey}`}
              pipelineId={selectedPipeline}
              search={search}
              extraFilters={extraFilters}
              onDealClick={handleDealClick}
            />
          ) : (
            <ReusableCrud
              ref={crudRef}
              icon={<FundOutlined />}
              title="Deals"
              apiUrl={api('/api/deals/')}
              columns={tableColumns}
              fields={dealCrud.fields}
              validationSchema={dealCrud.validationSchema}
              crudInitialValues={dealCrud.crudInitialValues}
              transformPayload={dealCrud.transformPayload}
              form_ui="drawer"
              drawerWidth={900}
              searchParam="search"
              pageParam="page"
              pageSizeParam="page_size"
              sortMode="ordering"
              orderingParam="ordering"
              enableServerPagination={true}
              showSearch={false}
              baseFilters={{ ...(selectedPipeline ? { deal_pipeline_id: selectedPipeline } : {}), ...(search ? { search } : {}), ...extraFilters }}
              canAdd={true}
              canEdit={true}
              canDelete={true}
              hasActions={true}
              hasActionColumns={true}
              anchorFilters={[
                { key: 'all', label: 'All', params: {} },
                { key: 'open', label: 'Open', params: { status: 'open' } },
                { key: 'won', label: 'Won', params: { status: 'won' } },
                { key: 'lost', label: 'Lost', params: { status: 'lost' } },
              ]}
              activeTableRowFunction={(record) => ({
                onClick: (event) => {
                  if (event.target.closest('button,a,input,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                  router.visit(route('crm.deals.show', record.id));
                },
                style: { cursor: 'pointer' },
              })}
            />
          )}
        </Space>
      </div>

      <AddDealModal
        open={addDrawer}
        selectedPipeline={selectedPipeline}
        onCancel={() => setAddDrawer(false)}
        onSaved={() => {
          setAddDrawer(false);
          setRefreshKey((key) => key + 1);
        }}
      />
    </AuthenticatedLayout>
  );
}
