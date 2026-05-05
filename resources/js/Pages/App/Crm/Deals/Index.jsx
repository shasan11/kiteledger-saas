import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { FundOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusColor = { open: 'blue', won: 'green', lost: 'red' };

export default function Deals(props) {
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      width: 220,
      render: (val) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      width: 100,
      render: (val) => (
        <Tag color={statusColor[val] || 'default'}>
          {val ? String(val).toUpperCase() : 'OPEN'}
        </Tag>
      ),
    },
    {
      title: 'Expected Close',
      dataIndex: 'expected_close_date',
      key: 'expected_close_date',
      sorter: true,
      width: 140,
      render: (val) => val || '-',
    },
    {
      title: 'Closed Date',
      dataIndex: 'closed_date',
      key: 'closed_date',
      sorter: true,
      width: 140,
      render: (val) => val || '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: true,
      width: 140,
      align: 'right',
      render: (val) => money(val),
    },
    {
      title: 'Deal No',
      dataIndex: 'deal_no',
      key: 'deal_no',
      sorter: true,
      width: 120,
      render: (val) => val || '-',
    },
  ];

  const fields = [
    {
      type: 'group',
      label: 'Deal Details',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          col: 12,
          placeholder: 'Deal title',
        },
        {
          name: 'deal_no',
          label: 'Deal No',
          type: 'text',
          col: 6,
          placeholder: 'Auto or manual',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          col: 6,
          placeholder: 'Select status',
          options: statusOptions,
        },
        {
          name: 'lead_id',
          label: 'Lead',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select lead',
          fkUrl: api('/api/leads/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          name: 'contact_id',
          label: 'Contact',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select contact',
          fkUrl: api('/api/contacts/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          name: 'assigned_to_id',
          label: 'Assigned To',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          name: 'deal_pipeline_id',
          label: 'Pipeline',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select pipeline',
          fkUrl: api('/api/deal-pipelines/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          name: 'deal_stage_id',
          label: 'Stage',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select stage',
          fkUrl: api('/api/deal-stages/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          col: 8,
          placeholder: 'Select priority',
          options: priorityOptions,
        },
      ],
    },
    {
      type: 'group',
      label: 'Financial & Dates',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'amount',
          label: 'Amount',
          type: 'number',
          col: 8,
          min: 0,
          placeholder: '0.00',
        },
        {
          name: 'probability',
          label: 'Probability (%)',
          type: 'number',
          col: 8,
          min: 0,
          max: 100,
          placeholder: '0 - 100',
        },
        {
          name: 'source',
          label: 'Source',
          type: 'text',
          col: 8,
          placeholder: 'e.g. Referral, Website',
        },
        {
          name: 'expected_close_date',
          label: 'Expected Close Date',
          type: 'datePicker',
          col: 8,
          placeholder: 'Select date',
        },
        {
          name: 'closed_date',
          label: 'Closed Date',
          type: 'datePicker',
          col: 8,
          placeholder: 'Select date',
        },
        {
          name: 'lost_reason',
          label: 'Lost Reason',
          type: 'text',
          col: 8,
          placeholder: 'Reason if lost',
        },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Deal description',
    },
  ];

  const validationSchema = Yup.object().shape({
    title: Yup.string().required('Title is required').max(180),
    deal_no: Yup.string().nullable().max(40),
    lead_id: Yup.string().nullable(),
    contact_id: Yup.string().nullable(),
    deal_pipeline_id: Yup.string().nullable(),
    deal_stage_id: Yup.string().nullable(),
    assigned_to_id: Yup.number().nullable(),
    priority: Yup.string().nullable().oneOf(['low', 'medium', 'high', 'urgent', null]),
    status: Yup.string().nullable().oneOf(['open', 'won', 'lost', null]),
    probability: Yup.number().nullable().min(0).max(100),
    source: Yup.string().nullable().max(120),
    lost_reason: Yup.string().nullable().max(255),
    expected_close_date: Yup.string().nullable(),
    closed_date: Yup.string().nullable(),
    amount: Yup.number().nullable().min(0),
    description: Yup.string().nullable(),
  });

  const crudInitialValues = {
    title: '',
    deal_no: '',
    lead_id: null,
    contact_id: null,
    deal_pipeline_id: null,
    deal_stage_id: null,
    assigned_to_id: null,
    priority: 'medium',
    status: 'open',
    probability: null,
    source: '',
    lost_reason: '',
    expected_close_date: null,
    closed_date: null,
    amount: null,
    description: '',
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.title = p.title?.trim() || null;
    p.deal_no = p.deal_no?.trim() || null;
    p.source = p.source?.trim() || null;
    p.lost_reason = p.lost_reason?.trim() || null;
    p.description = p.description?.trim() || null;
    p.lead_id = p.lead_id || null;
    p.contact_id = p.contact_id || null;
    p.deal_pipeline_id = p.deal_pipeline_id || null;
    p.deal_stage_id = p.deal_stage_id || null;
    p.assigned_to_id = p.assigned_to_id || null;
    p.amount = p.amount != null ? Number(p.amount) : null;
    p.probability = p.probability != null ? Number(p.probability) : null;
    p.expected_close_date = formatDate(p.expected_close_date);
    p.closed_date = formatDate(p.closed_date);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  const anchorFilters = [
    { key: 'all', label: 'All', title: 'All Deals', params: {} },
    { key: 'open', label: 'Open', title: 'Open Deals', params: { status: 'open' } },
    { key: 'won', label: 'Won', title: 'Won Deals', params: { status: 'won' } },
    { key: 'lost', label: 'Lost', title: 'Lost Deals', params: { status: 'lost' } },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Deals" />
      <ReusableCrud
        icon={<FundOutlined />}
        title="Deals"
        apiUrl={api('/api/deals/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1100}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination={true}
        showSearch={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
        anchorFilters={anchorFilters}
        defaultAnchorKey="all"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
