import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import { Button, Card, Col, Descriptions, Progress, Row, Skeleton, Space, Statistic, Tabs, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, DollarOutlined, PhoneOutlined, ProjectOutlined, ThunderboltOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';

const { Title, Text } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const statusColor = {
  new: 'blue',
  contacted: 'cyan',
  qualified: 'green',
  unqualified: 'volcano',
  converted: 'purple',
  lost: 'red',
};

const priorityColor = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const clean = (value) => (value === '' || value === undefined ? null : value);
const toDate = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value;
};

export default function LeadShow({ auth, id }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLead = async () => {
    setLoading(true);
    try {
      const response = await axios.get(api(`/api/leads/${id}/`));
      setLead(response.data?.data ?? response.data);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLead();
  }, [id]);

  const activityColumns = useMemo(() => [
    { title: 'Subject', dataIndex: 'subject', key: 'subject', backendSort: true, sortField: 'subject', render: (value) => <Text strong>{value || '-'}</Text> },
    { title: 'Type', dataIndex: 'activity_type', key: 'activity_type', render: (value) => value ? <Tag>{String(value).toUpperCase()}</Tag> : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'completed' ? 'green' : 'gold'}>{String(value || 'pending').toUpperCase()}</Tag> },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', render: (value) => <Tag color={priorityColor[value] || 'default'}>{String(value || 'medium').toUpperCase()}</Tag> },
    { title: 'Due At', dataIndex: 'due_at', key: 'due_at', render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-' },
  ], []);

  const activityFields = useMemo(() => [
    { name: 'lead_id', label: 'Lead', type: 'fkSelect', readOnly: true, col: 12, fkUrl: api('/api/leads/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'subject', label: 'Subject', type: 'text', required: true, col: 12 },
    { name: 'activity_type', label: 'Type', type: 'select', col: 8, options: ['call', 'email', 'meeting', 'task', 'note', 'whatsapp', 'sms', 'follow_up'].map((value) => ({ value, label: value.replace(/_/g, ' ').toUpperCase() })) },
    { name: 'status', label: 'Status', type: 'select', col: 8, options: ['pending', 'in_progress', 'completed', 'cancelled'].map((value) => ({ value, label: value.replace(/_/g, ' ').toUpperCase() })) },
    { name: 'priority', label: 'Priority', type: 'select', col: 8, options: ['low', 'medium', 'high', 'urgent'].map((value) => ({ value, label: value.toUpperCase() })) },
    { name: 'due_at', label: 'Due At', type: 'datePicker', col: 8 },
    { name: 'completed_at', label: 'Completed At', type: 'datePicker', col: 8 },
    { name: 'reminder_at', label: 'Reminder At', type: 'datePicker', col: 8 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, col: 24 },
    { name: 'outcome', label: 'Outcome', type: 'textarea', rows: 2, col: 24 },
  ], []);

  const dealColumns = useMemo(() => [
    { title: 'Title', dataIndex: 'title', key: 'title', backendSort: true, sortField: 'title', render: (value) => <Text strong>{value || '-'}</Text> },
    { title: 'Deal No', dataIndex: 'deal_no', key: 'deal_no', render: (value) => value || '-' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'won' ? 'green' : value === 'lost' ? 'red' : 'blue'}>{String(value || 'open').toUpperCase()}</Tag> },
    { title: 'Probability', dataIndex: 'probability', key: 'probability', render: (value) => `${Number(value || 0)}%` },
  ], []);

  const dealFields = useMemo(() => [
    { name: 'lead_id', label: 'Lead', type: 'fkSelect', readOnly: true, col: 12, fkUrl: api('/api/leads/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 12, fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'title', label: 'Title', type: 'text', required: true, col: 12 },
    { name: 'deal_no', label: 'Deal No', type: 'text', col: 6 },
    { name: 'amount', label: 'Amount', type: 'number', col: 6 },
    { name: 'deal_pipeline_id', label: 'Pipeline', type: 'fkSelect', col: 8, fkUrl: api('/api/deal-pipelines/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'deal_stage_id', label: 'Stage', type: 'fkSelect', col: 8, fkUrl: api('/api/deal-stages/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'probability', label: 'Probability', type: 'number', col: 8 },
    { name: 'expected_close_date', label: 'Expected Close', type: 'datePicker', col: 8 },
    { name: 'status', label: 'Status', type: 'select', col: 8, options: ['open', 'won', 'lost', 'cancelled'].map((value) => ({ value, label: value.toUpperCase() })) },
    { name: 'priority', label: 'Priority', type: 'select', col: 8, options: ['low', 'medium', 'high', 'urgent'].map((value) => ({ value, label: value.toUpperCase() })) },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, col: 24 },
  ], []);

  const activityInitialValues = { lead_id: id, subject: '', activity_type: 'follow_up', status: 'pending', priority: 'medium', due_at: null, completed_at: null, reminder_at: null, description: '', outcome: '' };
  const dealInitialValues = { lead_id: id, contact_id: lead?.contact_id || null, title: lead?.company_name ? `${lead.company_name} Opportunity` : '', deal_no: '', amount: lead?.expected_value || 0, deal_pipeline_id: null, deal_stage_id: null, probability: 0, expected_close_date: null, status: 'open', priority: lead?.priority || 'medium', description: '' };

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={lead?.name || 'Lead'} />
      <div style={{ padding: 18 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link href={route('crm.leads.index')}>Back to leads</Link>
          </Button>

          {loading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <>
              <Card style={{ overflow: 'hidden' }}>
                <Row gutter={[18, 18]} align="middle">
                  <Col flex="auto">
                    <Space direction="vertical" size={8}>
                      <Space wrap>
                        <Tag color={statusColor[lead?.status] || 'blue'}>{String(lead?.status || 'new').toUpperCase()}</Tag>
                        <Tag color={priorityColor[lead?.priority] || 'blue'}>{String(lead?.priority || 'medium').toUpperCase()}</Tag>
                        {lead?.lead_no ? <Tag>{lead.lead_no}</Tag> : null}
                      </Space>
                      <Title level={2} style={{ margin: 0 }}>{lead?.name || 'Lead'}</Title>
                      <Text type="secondary">{lead?.company_name || 'No company'}{lead?.industry ? ` · ${lead.industry}` : ''}</Text>
                    </Space>
                  </Col>
                  <Col>
                    <Progress type="circle" percent={lead?.status === 'converted' ? 100 : lead?.status === 'qualified' ? 65 : lead?.status === 'contacted' ? 35 : 15} size={88} />
                  </Col>
                </Row>
              </Card>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}><Card><Statistic prefix={<DollarOutlined />} title="Expected Value" value={Number(lead?.expected_value || 0)} precision={2} /></Card></Col>
                <Col xs={24} md={8}><Card><Statistic prefix={<CalendarOutlined />} title="Next Follow Up" value={lead?.next_follow_up_date ? dayjs(lead.next_follow_up_date).format('YYYY-MM-DD') : '-'} /></Card></Col>
                <Col xs={24} md={8}><Card><Statistic prefix={<PhoneOutlined />} title="Phone" value={lead?.phone || lead?.mobile || '-'} /></Card></Col>
              </Row>

              <Card title="Lead Details">
                <Descriptions bordered size="small" column={3}>
                  <Descriptions.Item label="Email">{lead?.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Website">{lead?.website || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Source">{lead?.lead_source || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Location">{[lead?.city, lead?.state, lead?.country].filter(Boolean).join(', ') || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Assigned To">{lead?.assignedTo?.name || lead?.assigned_to?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Contact">{lead?.contact?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Notes" span={3}>{lead?.notes || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            </>
          )}

          <Tabs
            items={[
              {
                key: 'activities',
                label: 'Activities',
                children: (
                  <ReusableCrud
                    key={`lead-activities-${id}`}
                    icon={<ThunderboltOutlined />}
                    title="Lead Activities"
                    apiUrl={api('/api/crm-activities/')}
                    baseFilters={{ lead_id: id }}
                    columns={activityColumns}
                    fields={activityFields}
                    validationSchema={Yup.object({ subject: Yup.string().required('Subject is required') })}
                    crudInitialValues={activityInitialValues}
                    transformPayload={(values) => ({ ...values, lead_id: id, subject: clean(values.subject?.trim()), description: clean(values.description?.trim()), outcome: clean(values.outcome?.trim()), due_at: toDate(values.due_at), completed_at: toDate(values.completed_at), reminder_at: toDate(values.reminder_at), active: true })}
                    form_ui="drawer"
                    drawerWidth={900}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                  />
                ),
              },
              {
                key: 'deals',
                label: 'Deals',
                children: (
                  <ReusableCrud
                    key={`lead-deals-${id}-${lead?.contact_id || 'none'}`}
                    icon={<ProjectOutlined />}
                    title="Lead Deals"
                    apiUrl={api('/api/deals/')}
                    baseFilters={{ lead_id: id }}
                    columns={dealColumns}
                    fields={dealFields}
                    validationSchema={Yup.object({ title: Yup.string().required('Title is required'), amount: Yup.number().nullable().min(0) })}
                    crudInitialValues={dealInitialValues}
                    transformPayload={(values) => ({
                      ...values,
                      lead_id: id,
                      contact_id: values.contact_id || null,
                      title: clean(values.title?.trim()),
                      deal_no: clean(values.deal_no?.trim()),
                      amount: values.amount != null ? Number(values.amount) : null,
                      probability: values.probability != null ? Number(values.probability) : null,
                      expected_close_date: toDate(values.expected_close_date),
                      description: clean(values.description?.trim()),
                      active: true,
                    })}
                    form_ui="drawer"
                    drawerWidth={980}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                  />
                ),
              },
            ]}
          />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
