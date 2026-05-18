import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Avatar, Badge, Space, Tag, Tooltip, Typography, theme } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  ScheduleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

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

const statusBadge = {
  pending: 'warning',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'error',
};

const priorityColor = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const normalizeSelectValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const labelize = (value) => {
  if (!value) return '-';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseDate = (value) => {
  if (!value) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null;
  }

  const strictDate = dayjs(value, 'DD-MM-YYYY', true);
  if (strictDate.isValid()) return strictDate;

  const fallbackDate = dayjs(value);
  return fallbackDate.isValid() ? fallbackDate : null;
};

const formatDate = (value) => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.format('YYYY-MM-DD') : null;
};

const formatDisplayDate = (value) => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.format('DD MMM YYYY') : '-';
};

const getDateState = (value) => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return { color: 'default', label: 'Not scheduled' };
  }

  const today = dayjs().startOf('day');

  if (parsedDate.isBefore(today, 'day')) {
    return { color: 'red', label: 'Overdue' };
  }

  if (parsedDate.isSame(today, 'day')) {
    return { color: 'orange', label: 'Today' };
  }

  if (parsedDate.diff(today, 'day') <= 7) {
    return { color: 'blue', label: 'Upcoming' };
  }

  return { color: 'default', label: 'Scheduled' };
};

const getRelatedRecord = (record) => {
  if (record?.lead?.name) {
    return { type: 'Lead', label: record.lead.name };
  }

  if (record?.deal?.title) {
    return { type: 'Deal', label: record.deal.title };
  }

  if (record?.contact?.name) {
    return { type: 'Contact', label: record.contact.name };
  }

  return { type: null, label: '-' };
};

const emptyComment = {
  user_id: null,
  comment: '',
};

export default function Activities(props) {
  const { token } = theme.useToken();

  const columns = [
    {
      title: 'Activity',
      dataIndex: 'subject',
      key: 'subject',
      sorter: true,
      width: 300,
      render: (value, record) => (
        <Space align="start" size={10}>
          <Avatar
            size={34}
            icon={<ScheduleOutlined />}
            style={{
              background: token.colorPrimaryBg,
              color: token.colorPrimary,
              flex: '0 0 auto',
            }}
          />

          <Space direction="vertical" size={3}>
            <Text strong style={{ color: token.colorTextHeading }}>
              {value || '-'}
            </Text>

            <Space size={6} wrap>
              <Tag
                bordered={false}
                color="blue"
                style={{ marginInlineEnd: 0, textTransform: 'capitalize' }}
              >
                {labelize(record?.activity_type || 'Activity')}
              </Tag>

              {record?.outcome ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.outcome}
                </Text>
              ) : null}
            </Space>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      sorter: true,
      width: 120,
      render: (value) => (
        <Tag
          bordered={false}
          color={priorityColor[value] || 'default'}
          style={{ marginInlineEnd: 0 }}
        >
          {labelize(value || 'medium')}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      width: 150,
      render: (value) => (
        <Badge
          status={statusBadge[value] || 'default'}
          text={<Text>{labelize(value || 'pending')}</Text>}
        />
      ),
    },
    {
      title: 'Assigned To',
      key: 'assigned_to',
      width: 180,
      render: (_, record) => {
        const assignedName = record?.assigned_to?.name || record?.assignedTo?.name;

        return assignedName ? (
          <Space size={8}>
            <Avatar size={24} icon={<UserOutlined />} />
            <Text>{assignedName}</Text>
          </Space>
        ) : (
          <Text type="secondary">Unassigned</Text>
        );
      },
    },
    {
      title: 'Related Record',
      key: 'related',
      width: 210,
      render: (_, record) => {
        const related = getRelatedRecord(record);

        if (!related.type) {
          return <Text type="secondary">No linked record</Text>;
        }

        return (
          <Space direction="vertical" size={2}>
            <Space size={6}>
              <LinkOutlined style={{ color: token.colorTextTertiary }} />
              <Text>{related.label}</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {related.type}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_at',
      key: 'due_at',
      sorter: true,
      width: 150,
      render: (value) => {
        const state = getDateState(value);

        return value ? (
          <Tooltip title={state.label}>
            <Tag icon={<CalendarOutlined />} color={state.color} style={{ marginInlineEnd: 0 }}>
              {formatDisplayDate(value)}
            </Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: 'Follow-up',
      dataIndex: 'next_follow_up_at',
      key: 'next_follow_up_at',
      sorter: true,
      width: 155,
      render: (value) =>
        value ? (
          <Tag icon={<ClockCircleOutlined />} bordered={false} style={{ marginInlineEnd: 0 }}>
            {formatDisplayDate(value)}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  const fields = [
    {
      type: 'group',
      label: 'Core Information',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true,
          col: 16,
          placeholder: 'e.g. Follow up with client about quotation',
        },
        {
          name: 'activity_type',
          label: 'Activity Type',
          type: 'select',
          col: 8,
          placeholder: 'Select type',
          options: activityTypeOptions,
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
          name: 'outcome',
          label: 'Outcome',
          type: 'text',
          col: 8,
          placeholder: 'e.g. Waiting for confirmation',
        },
      ],
    },
    {
      type: 'group',
      label: 'Related Records & Ownership',
      col: 24,
      accordion: false,
      children: [
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
      label: 'Schedule & Reminders',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'due_at',
          label: 'Due Date',
          type: 'datePicker',
          col: 8,
          placeholder: 'Select due date',
        },
        {
          name: 'next_follow_up_at',
          label: 'Next Follow Up',
          type: 'datePicker',
          col: 8,
          placeholder: 'Select follow-up date',
        },
        {
          name: 'reminder_at',
          label: 'Reminder Date',
          type: 'datePicker',
          col: 8,
          placeholder: 'Select reminder date',
        },
      ],
    },
    {
      type: 'group',
      label: 'Notes & Collaboration',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          col: 24,
          rows: 4,
          placeholder: 'Add clear activity details, context, or next steps...',
        },
        {
          name: 'comments',
          label: 'Comments',
          type: 'objectArray',
          col: 24,
          headerBg: token.colorFillAlter,
          headerColor: token.colorTextHeading,
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
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    subject: Yup.string().trim().required('Subject is required').max(180),
    outcome: Yup.string().nullable().max(255),
    lead_id: Yup.mixed().nullable(),
    deal_id: Yup.mixed().nullable(),
    contact_id: Yup.mixed().nullable(),
    assigned_to_id: Yup.mixed().nullable(),
    status: Yup.string().nullable().oneOf(['pending', 'in_progress', 'completed', 'cancelled', null]),
    priority: Yup.string().nullable().oneOf(['low', 'medium', 'high', 'urgent', null]),
    activity_type: Yup.string().nullable().oneOf(['call', 'email', 'meeting', 'task', 'note', 'follow_up', null]),
    due_at: Yup.mixed().nullable(),
    next_follow_up_at: Yup.mixed().nullable(),
    reminder_at: Yup.mixed().nullable(),
    description: Yup.string().nullable(),
    comments: Yup.array().of(
      Yup.object().shape({
        user_id: Yup.mixed().nullable(),
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
    const payload = { ...values };

    payload.subject = payload.subject?.trim() || null;
    payload.outcome = payload.outcome?.trim() || null;
    payload.description = payload.description?.trim() || null;
    payload.lead_id = normalizeSelectValue(payload.lead_id);
    payload.deal_id = normalizeSelectValue(payload.deal_id);
    payload.contact_id = normalizeSelectValue(payload.contact_id);
    payload.assigned_to_id = normalizeSelectValue(payload.assigned_to_id);
    payload.due_at = formatDate(payload.due_at);
    payload.next_follow_up_at = formatDate(payload.next_follow_up_at);
    payload.reminder_at = formatDate(payload.reminder_at);
    payload.comments = Array.isArray(payload.comments)
      ? payload.comments
          .map((comment) => ({
            ...comment,
            user_id: normalizeSelectValue(comment.user_id),
            comment: comment.comment?.trim() || null,
          }))
          .filter((comment) => comment.user_id || comment.comment)
      : [];

    payload.deleted_item_ids = Array.isArray(payload.deleted_item_ids)
      ? payload.deleted_item_ids
      : [];

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' && key !== 'comments' && key !== 'deleted_item_ids') {
        payload[key] = null;
      }
    });

    return payload;
  };

  const pageHeader = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Avatar
        size={38}
        icon={<ScheduleOutlined />}
        style={{
          background: token.colorPrimaryBg,
          color: token.colorPrimary,
        }}
      />

      <div>
        <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
          Activities
        </Typography.Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Track CRM calls, meetings, tasks, reminders, and follow-ups.
        </Text>
      </div>
    </div>
  );

  return (
    <AuthenticatedLayout user={props.auth?.user} header={pageHeader}>
      <Head title="Activities" />

      <div
        style={{
          background: token.colorBgLayout,
          minHeight: '100%',
          padding: token.paddingLG,
        }}
      >
        <div
          style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
            boxShadow: token.boxShadowTertiary,
            overflow: 'hidden',
          }}
        >
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
                const target = event.target;
                const isInteractiveElement =
                  target instanceof Element &&
                  target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger');

                if (isInteractiveElement) return;

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
        </div>
      </div>
    </AuthenticatedLayout>
  );
}