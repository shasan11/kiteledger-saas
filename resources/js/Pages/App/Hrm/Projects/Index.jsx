import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import {
  Avatar,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const PROJECT_STATUS_COLORS = {
  PENDING: 'default',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
  ON_HOLD: 'orange',
};

const STATUS_OPTIONS = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ON_HOLD',
].map((v) => ({
  label: v.replace(/_/g, ' '),
  value: v,
}));

const PROJECT_STATUS_ANCHORS = [
  { key: 'all', label: 'All', params: {} },
  ...STATUS_OPTIONS.map(({ label, value }) => ({
    key: value.toLowerCase(),
    label,
    params: { status: value },
  })),
];

const ACTIVE_OPTIONS = [
  { label: 'Active', value: true },
  { label: 'Inactive', value: false },
];

const fmtDate = (value) => {
  if (!value) return '-';

  const date = dayjs(value);
  return date.isValid() ? date.format('DD MMM YYYY') : '-';
};

const normalizeDate = (value) => {
  if (!value) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null;
  }

  const date = dayjs(value);
  return date.isValid() ? date : null;
};

const toApiDate = (value) => {
  const date = normalizeDate(value);
  return date ? date.format('YYYY-MM-DD') : null;
};

const dateValidation = (label) =>
  Yup.mixed()
    .test('required-date', `${label} is required`, (value) => {
      return !!normalizeDate(value);
    })
    .test('valid-date', `${label} must be a valid date`, (value) => {
      return !!normalizeDate(value);
    });

const getUserName = (user) => {
  if (!user) return '-';

  return (
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    user.email ||
    '-'
  );
};

const getInitials = (name) => {
  if (!name || name === '-') return '?';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};

const getDuration = (start, end) => {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);

  if (!startDate || !endDate) return '-';

  const diff = endDate.startOf('day').diff(startDate.startOf('day'), 'day') + 1;

  if (diff <= 0) return '-';

  return `${diff} day${diff > 1 ? 's' : ''}`;
};

export default function Projects(props) {
  const columns = [
    {
      title: 'Project',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      width: 310,
      render: (value, record) => (
        <Space align="start" size={10}>
          <Avatar
            size={34}
            icon={<ProjectOutlined />}
            style={{
              background: '#f0f5ff',
              color: '#1677ff',
              flex: '0 0 auto',
            }}
          />

          <div style={{ minWidth: 0 }}>
            <Tooltip title={value}>
              <Text
                strong
                ellipsis
                style={{
                  maxWidth: 230,
                  display: 'block',
                  lineHeight: 1.25,
                }}
              >
                {value || '-'}
              </Text>
            </Tooltip>

            <Tooltip title={record.description}>
              <Text
                type="secondary"
                ellipsis
                style={{
                  maxWidth: 230,
                  display: 'block',
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {record.description || 'No description'}
              </Text>
            </Tooltip>
          </div>
        </Space>
      ),
    },
    {
      title: 'Project Manager',
      key: 'project_manager',
      sorter: true,
      width: 220,
      render: (_, record) => {
        const user = record.project_manager || record.projectManager;
        const name = getUserName(user);

        return (
          <Space size={8}>
            <Avatar
              size={28}
              icon={!user ? <UserOutlined /> : null}
              style={{
                background: '#fafafa',
                color: '#555',
                border: '1px solid #d9d9d9',
              }}
            >
              {user ? getInitials(name) : null}
            </Avatar>

            <Tooltip title={name}>
              <Text ellipsis style={{ maxWidth: 150 }}>
                {name}
              </Text>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Start Date',
      dataIndex: 'start_date',
      key: 'start_date',
      sorter: true,
      width: 135,
      render: (value) => (
        <Space size={6}>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text>{fmtDate(value)}</Text>
        </Space>
      ),
    },
    {
      title: 'End Date',
      dataIndex: 'end_date',
      key: 'end_date',
      sorter: true,
      width: 135,
      render: (value) => (
        <Space size={6}>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text>{fmtDate(value)}</Text>
        </Space>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 115,
      render: (_, record) => (
        <Space size={6}>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <Text>{getDuration(record.start_date, record.end_date)}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      width: 145,
      render: (value) => (
        <Tag color={PROJECT_STATUS_COLORS[value] || 'default'}>
          {value ? value.replace(/_/g, ' ') : '—'}
        </Tag>
      ),
    },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      width: 95,
      render: (value) => (
        <Tag
          color={value ? 'green' : 'red'}
          icon={value ? <CheckCircleOutlined /> : null}
        >
          {value ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Project Name',
      type: 'text',
      required: false,
      col: 24,
    },
    {
      name: 'project_manager_id',
      label: 'Project Manager',
      type: 'fkSelect',
      required: true,
      col: 12,
      fkUrl: api('/api/hrm/users'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'first_name',
      fkLabel: (record) => getUserName(record),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      col: 12,
      options: STATUS_OPTIONS,
    },
    {
      name: 'start_date',
      label: 'Start Date',
      type: 'datePicker',
      required: true,
      col: 12,
      format: 'YYYY-MM-DD',
    },
    {
      name: 'end_date',
      label: 'End Date',
      type: 'datePicker',
      required: true,
      col: 12,
      format: 'YYYY-MM-DD',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      col: 24,
      rows: 4,
    },
  
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .required('Project name is required')
      .min(3, 'Project name must be at least 3 characters')
      .max(180, 'Project name cannot exceed 180 characters'),

    project_manager_id: Yup.mixed()
      .required('Project manager is required')
      .test('valid-project-manager', 'Project manager is required', (value) => {
        if (!value) return false;
        if (typeof value === 'object') return !!(value.id || value.value);
        return true;
      }),

    status: Yup.string()
      .required('Status is required')
      .oneOf(
        ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'],
        'Invalid project status'
      ),

    start_date: dateValidation('Start date'),

    end_date: dateValidation('End date').test(
      'end-after-start',
      'End date cannot be before start date',
      function (value) {
        const startDate = normalizeDate(this.parent.start_date);
        const endDate = normalizeDate(value);

        if (!startDate || !endDate) return false;

        return (
          endDate.startOf('day').isSame(startDate.startOf('day')) ||
          endDate.startOf('day').isAfter(startDate.startOf('day'))
        );
      }
    ),

    description: Yup.string()
      .trim()
      .nullable()
      .max(1000, 'Description cannot exceed 1000 characters'),

    active: Yup.boolean()
      .required('Active status is required')
      .typeError('Active status is required'),
  });

  const initialValues = {
    name: '',
    project_manager_id: null,
    status: 'PENDING',
    start_date: null,
    end_date: null,
    description: '',
    active: true,
  };

  const transformPayload = (values) => {
    const payload = { ...values };

    if (
      payload.project_manager_id &&
      typeof payload.project_manager_id === 'object'
    ) {
      payload.project_manager_id =
        payload.project_manager_id.id ?? payload.project_manager_id.value;
    }

    payload.start_date = toApiDate(payload.start_date);
    payload.end_date = toApiDate(payload.end_date);
    payload.active = Boolean(payload.active);

    Object.keys(payload).forEach((key) => {
      if (typeof payload[key] === 'string') {
        payload[key] = payload[key].trim();
      }

      if (payload[key] === '') {
        payload[key] = null;
      }
    });

    return payload;
  };

  const filters = [
    {
      name: 'project_manager_id',
      label: 'Project Manager',
      type: 'fkSelect',
      fkUrl: api('/api/hrm/users'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'first_name',
      fkLabel: (record) => getUserName(record),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
    },
    {
      name: 'active',
      label: 'Active Status',
      type: 'select',
      options: ACTIVE_OPTIONS,
    },
    {
      name: 'start_date_from',
      label: 'Start Date From',
      type: 'datePicker',
      format: 'YYYY-MM-DD',
    },
    {
      name: 'start_date_to',
      label: 'Start Date To',
      type: 'datePicker',
      format: 'YYYY-MM-DD',
    },
    {
      name: 'end_date_from',
      label: 'End Date From',
      type: 'datePicker',
      format: 'YYYY-MM-DD',
    },
    {
      name: 'end_date_to',
      label: 'End Date To',
      type: 'datePicker',
      format: 'YYYY-MM-DD',
    },
  ];

  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Projects" />

      <div style={{ minHeight: 'calc(100vh - 64px)' }}>
        <ReusableCrud
          icon={<ProjectOutlined />}
          title="Projects"
          apiUrl={api('/api/hrm/projects')}
          columns={columns}
          fields={fields}
          filters={filters}
          validationSchema={validationSchema}
          crudInitialValues={initialValues}
          transformPayload={transformPayload}
          activeTableRowFunction={(record) => ({
            onClick: (event) => {
              if (
                event.target?.closest(
                  'button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select-selector,.ant-picker'
                )
              ) {
                return;
              }

              router.visit(route('hrm.projects.show', record.id));
            },
            style: { cursor: 'pointer' },
          })}
          form_ui="modal"
          modalWidth={760}
          searchParam="search"
          pageParam="page"
          pageSizeParam="page_size"
          sortMode="ordering"
          orderingParam="ordering"
          activeParam="active"
          enableServerPagination
          enableInactiveDrawer
          anchorFilters={PROJECT_STATUS_ANCHORS}
          defaultAnchorKey="all"
          anchorSyncWithHash
          showSearch
          canAdd
          canEdit
          canDelete
          hasActions
          hasActionColumns
          tableProps={{
            rowKey: 'id',
            size: 'middle',
            scroll: { x: 1150 },
          }}
        />
      </div>
    </AuthenticatedLayout>
  );
}
