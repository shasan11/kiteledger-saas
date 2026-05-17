import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Space, Tag, Typography } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const activityTypeOptions = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'follow_up', label: 'Follow Up' },
];

const statusColor = {
  pending: 'orange',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
};

const priorityColor = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const labelize = (value) => value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';
const relatedLabel = (record) => record?.lead?.name || record?.deal?.title || record?.contact?.name || '-';

const emptyComment = {
  user_id: null,
  comment: '',
};

export default function Activities(props) {
  const columns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      sorter: true,
      width: 220,
      render: (val, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{val || '-'}</Text>
          {record?.activity_type ? <Tag style={{ width: 'fit-content', margin: 0 }}>{labelize(record.activity_type)}</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      sorter: true,
      width: 110,
      render: (val) => <Tag color={priorityColor[val] || 'default'}>{labelize(val || 'medium')}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      width: 120,
      render: (val) => <Tag color={statusColor[val] || 'default'}>{labelize(val || 'pending')}</Tag>,
    },
    {
      title: 'Assigned',
      key: 'assigned_to',
      width: 140,
      render: (_, record) => record?.assigned_to?.name || record?.assignedTo?.name || '-',
    },
    {
      title: 'Related',
      key: 'related',
      width: 180,
      render: (_, record) => relatedLabel(record),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_at',
      key: 'due_at',
      sorter: true,
      width: 140,
      render: (val) => val || '-',
    },
    {
      title: 'Follow-up',
      dataIndex: 'next_follow_up_at',
      key: 'next_follow_up_at',
      sorter: true,
      width: 140,
      render: (val) => val || '-',
    },
  ];

  const fields = [
    {
      type: 'group',
      label: 'Activity Details',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true,
          col: 16,
          placeholder: 'Activity subject',
        },
        {
          name: 'activity_type',
          label: 'Type',
          type: 'select',
          col: 8,
          placeholder: 'Select type',
          options: activityTypeOptions,
        },
        {
          name: 'outcome',
          label: 'Outcome',
          type: 'text',
          col: 8,
          placeholder: 'Outcome',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          col: 8,
          placeholder: 'Select status',
          options: statusOptions,
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          col: 8,
          placeholder: 'Select priority',
          options: priorityOptions,
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
          name: 'deal_id',
          label: 'Deal',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select deal',
          fkUrl: api('/api/deals/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'title',
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
      ],
    },
    {
      type: 'group',
      label: 'Dates',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'due_at',
          label: 'Due At',
          type: 'datePicker',
          col: 6,
          placeholder: 'Select date',
        },
        {
          name: 'next_follow_up_at',
          label: 'Next Follow Up',
          type: 'datePicker',
          col: 6,
          placeholder: 'Select date',
        },
        {
          name: 'reminder_at',
          label: 'Reminder At',
          type: 'datePicker',
          col: 6,
          placeholder: 'Select date',
        },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Activity description',
    },
    {
      name: 'comments',
      label: 'Comments',
      type: 'objectArray',
      col: 24,
      headerBg: '#424b59',
      headerColor: '#ffffff',
      addButtonLabel: 'Add Comment',
      defaultItem: { ...emptyComment },
      columns: [
        {
          key: 'user_id',
          name: 'user_id',
          label: 'User',
          type: 'fkSelect',
          width: '1fr',
          placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          key: 'comment',
          name: 'comment',
          label: 'Comment',
          type: 'textarea',
          width: '2fr',
          placeholder: 'Enter comment',
        },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    subject: Yup.string().required('Subject is required').max(180),
    outcome: Yup.string().nullable().max(255),
    lead_id: Yup.string().nullable(),
    deal_id: Yup.string().nullable(),
    contact_id: Yup.string().nullable(),
    assigned_to_id: Yup.number().nullable(),
    status: Yup.string().nullable().oneOf(['pending', 'in_progress', 'completed', 'cancelled', null]),
    priority: Yup.string().nullable().oneOf(['low', 'medium', 'high', 'urgent', null]),
    activity_type: Yup.string().nullable().oneOf(['call', 'email', 'meeting', 'task', 'note', 'follow_up', null]),
    due_at: Yup.string().nullable(),
    next_follow_up_at: Yup.string().nullable(),
    reminder_at: Yup.string().nullable(),
    description: Yup.string().nullable(),
    comments: Yup.array().of(
      Yup.object().shape({
        user_id: Yup.number().nullable(),
        comment: Yup.string().nullable(),
      })
    ),
  });

  const crudInitialValues = {
    subject: '',
    outcome: '',
    lead_id: null,
    deal_id: null,
    contact_id: null,
    assigned_to_id: null,
    status: 'pending',
    priority: 'medium',
    activity_type: null,
    due_at: null,
    next_follow_up_at: null,
    reminder_at: null,
    description: '',
    comments: [],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.subject = p.subject?.trim() || null;
    p.outcome = p.outcome?.trim() || null;
    p.description = p.description?.trim() || null;
    p.lead_id = p.lead_id || null;
    p.deal_id = p.deal_id || null;
    p.contact_id = p.contact_id || null;
    p.assigned_to_id = p.assigned_to_id || null;
    p.due_at = formatDate(p.due_at);
    p.next_follow_up_at = formatDate(p.next_follow_up_at);
    p.reminder_at = formatDate(p.reminder_at);
    p.comments = Array.isArray(p.comments)
      ? p.comments.map((c) => ({
          ...c,
          user_id: c.user_id || null,
          comment: c.comment?.trim() || null,
        }))
      : [];
    p.deleted_item_ids = Array.isArray(p.deleted_item_ids) ? p.deleted_item_ids : [];
    Object.keys(p).forEach((k) => {
      if (p[k] === '' && k !== 'comments' && k !== 'deleted_item_ids') p[k] = null;
    });
    return p;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}
      header={<div style={{ fontSize: 18, fontWeight: 650, }}>
       Activities
      </div>}
      >
      <Head title="Activities" />
      <ReusableCrud
        icon={<ScheduleOutlined />}
        title="Activities"
        apiUrl={api('/api/crm-activities/')}
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
        canView={true}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
            router.visit(route('crm.activities.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
