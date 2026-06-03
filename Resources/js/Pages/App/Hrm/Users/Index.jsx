import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Avatar, Input, Select, Tag } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import AccessControlTabs from '../AccessControlTabs';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const STATUS_COLORS = {
  Active: 'green',
  Probation: 'orange',
  Resigned: 'volcano',
  Terminated: 'red',
  Suspended: 'red',
  Inactive: 'default',
};

const BLOOD_GROUP_OPTIONS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
].map((value) => ({
  label: value,
  value,
}));

const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
].map((value) => ({
  label: value,
  value,
}));

const nullableString = () =>
  Yup.string()
    .nullable()
    .transform((value) => (value === '' ? null : value));

const optionalPassword = () =>
  Yup.string()
    .nullable()
    .notRequired()
    .transform((value) => (value === '' ? null : value))
    .min(6, 'Password must be at least 6 characters')
    .max(255);

const fmtDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString();
};

const assetUrl = (path) => {
  if (!path) return null;

  if (String(path).startsWith('http')) {
    return path;
  }

  return `${BACKEND}${path}`;
};

const getFullName = (record) => {
  return [record?.first_name, record?.last_name].filter(Boolean).join(' ') || record?.username || '-';
};

const getInitials = (record) => {
  const initials = [record?.first_name?.[0], record?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return initials || 'U';
};

const getRoleName = (record) => {
  return (
    record?.roles?.[0]?.name ||
    record?.role?.name ||
    record?.role_id_detail?.label ||
    record?.role_id_detail?.name ||
    '-'
  );
};

const getStatusName = (record) => {
  return (
    record?.employment_status?.name ||
    record?.employment_status_id_detail?.label ||
    record?.employment_status_id_detail?.name ||
    ''
  );
};

const getDepartmentName = (record) => {
  return (
    record?.department?.name ||
    record?.department_id_detail?.label ||
    record?.department_id_detail?.name ||
    '-'
  );
};

const getShiftName = (record) => {
  return record?.shift?.name || record?.shift_id_detail?.label || record?.shift_id_detail?.name || '-';
};

const renderEmailInput = ({ field, value, values, setFieldValue, readOnly }) => (
  <Input
    type="email"
    value={value || ''}
    disabled={readOnly}
    placeholder={field.placeholder || ''}
    onChange={(event) => {
      const nextEmail = event.target.value;
      setFieldValue(field.name, nextEmail);

      const currentUsername = String(values?.username || '').trim();
      const localPart = String(nextEmail || '').split('@')[0]?.trim();
      if (!currentUsername && localPart) {
        setFieldValue('username', localPart);
      }
    }}
  />
);

const renderPasswordInput = ({ field, value, setFieldValue, readOnly }) => (
  <Input.Password
    value={value || ''}
    disabled={readOnly}
    placeholder={field.placeholder || ''}
    onChange={(event) => setFieldValue(field.name, event.target.value)}
  />
);

const renderTimeInput = ({ field, value, setFieldValue, readOnly }) => (
  <Input
    type="time"
    value={formatTimeValue(value, false) || ''}
    disabled={readOnly}
    placeholder={field.placeholder || ''}
    onChange={(event) => setFieldValue(field.name, event.target.value)}
  />
);

const formatTimeValue = (value, withSeconds = true) => {
  if (!value) return null;
  if (typeof value?.format === 'function') return value.format(withSeconds ? 'HH:mm:ss' : 'HH:mm');

  const stringValue = String(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(stringValue)) return withSeconds ? stringValue : stringValue.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(stringValue)) return withSeconds ? `${stringValue}:00` : stringValue;

  return stringValue;
};

const shiftWorkHours = (startTime, endTime) => {
  const start = formatTimeValue(startTime, false);
  const end = formatTimeValue(endTime, false);
  if (!start || !end) return null;

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null;

  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;

  return Number(((endMinutes - startMinutes) / 60).toFixed(2));
};

const renderWeekDaysSelect = ({ field, value, setFieldValue, readOnly }) => (
  <Select
    mode="multiple"
    allowClear
    style={{ width: '100%' }}
    value={Array.isArray(value) ? value : []}
    disabled={readOnly}
    placeholder={field.placeholder || 'Select days'}
    options={WEEK_DAYS}
    onChange={(nextValue) => setFieldValue(field.name, nextValue)}
  />
);

const fkFilter = ({ title, paramName, url }) => ({
  title,
  type: 'autocomplete',
  paramName,
  fkUrl: api(url),
  fkSearchParam: 'search',
  fkPageParam: 'page',
  fkPageSizeParam: 'page_size',
  fkPageSize: 20,
  fkValueKey: 'id',
  fkLabelKey: 'name',
  fkLabel: (record) => record?.name || record?.label || '',
});

const fkField = ({
  name,
  label,
  url,
  col = 12,
  quickAdd = null,
  required = false,
}) => ({
  name,
  label,
  type: 'fkSelect',
  col,
  required,
  fkUrl: api(url),
  fkSearchParam: 'search',
  fkPageSize: 20,
  fkValueKey: 'id',
  fkLabelKey: 'name',
  fkLabel: (record) => record?.name || record?.label || '',
  quickAdd,
});

const quickAddRole = {
  title: 'Role',
  apiUrl: api('/api/hrm/roles'),
  allowEdit: false,
  initialValues: {
    name: '',
    guard_name: 'web',
    permissions: [],
  },
  fields: [
    {
      name: 'name',
      label: 'Role Name',
      type: 'text',
      required: true,
      col: 24,
    },
    {
      name: 'guard_name',
      label: 'Guard Name',
      type: 'text',
      required: true,
      col: 24,
    },
  ],
  validationSchema: Yup.object().shape({
    name: Yup.string().required('Role name is required').max(80),
    guard_name: Yup.string().required('Guard name is required').max(40),
  }),
  transformPayload: (values) => ({
    name: values.name?.trim(),
    guard_name: values.guard_name || 'web',
    permissions: values.permissions || [],
  }),
};

const quickAddEmploymentStatus = {
  title: 'Employment Status',
  apiUrl: api('/api/hrm/employment-statuses'),
  initialValues: {
    name: '',
    colour_value: 'green',
    active: true,
  },
  fields: [
    {
      name: 'name',
      label: 'Status Name',
      type: 'text',
      required: true,
      col: 24,
    },
    {
      name: 'colour_value',
      label: 'Color',
      type: 'select',
      col: 24,
      options: [
        { label: 'Green', value: 'green' },
        { label: 'Orange', value: 'orange' },
        { label: 'Red', value: 'red' },
        { label: 'Volcano', value: 'volcano' },
        { label: 'Blue', value: 'blue' },
        { label: 'Default', value: 'default' },
      ],
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 24,
    },
  ],
  validationSchema: Yup.object().shape({
    name: Yup.string().required('Status name is required').max(80),
    colour_value: nullableString(),
    active: Yup.boolean().nullable(),
  }),
  transformPayload: (values) => ({
    name: values.name?.trim(),
    colour_value: values.colour_value || 'default',
    active: Boolean(values.active),
  }),
};

const quickAddDepartment = {
  title: 'Department',
  apiUrl: api('/api/hrm/departments'),
  initialValues: {
    name: '',
    code: '',
    active: true,
  },
  fields: [
    {
      name: 'name',
      label: 'Department Name',
      type: 'text',
      required: true,
      col: 24,
    },
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      col: 24,
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 24,
    },
  ],
  validationSchema: Yup.object().shape({
    name: Yup.string().required('Department name is required').max(100),
    code: nullableString().max(40),
    active: Yup.boolean().nullable(),
  }),
  transformPayload: (values) => ({
    name: values.name?.trim(),
    code: values.code?.trim() || null,
    active: Boolean(values.active),
  }),
};

const quickAddShift = {
  title: 'Shift',
  apiUrl: api('/api/hrm/shifts'),
  initialValues: {
    name: '',
    start_time: '',
    end_time: '',
    active: true,
  },
  fields: [
    {
      name: 'name',
      label: 'Shift Name',
      type: 'text',
      required: true,
      col: 24,
    },
    {
      name: 'start_time',
      label: 'Start Time',
      type: 'custom',
      required: true,
      col: 12,
      render: renderTimeInput,
    },
    {
      name: 'end_time',
      label: 'End Time',
      type: 'custom',
      required: true,
      col: 12,
      render: renderTimeInput,
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 24,
    },
  ],
  validationSchema: Yup.object().shape({
    name: Yup.string().required('Shift name is required').max(100),
    start_time: Yup.string().required('Start time is required'),
    end_time: Yup.string().required('End time is required'),
    active: Yup.boolean().nullable(),
  }),
  transformPayload: (values) => ({
    name: values.name?.trim(),
    start_time: formatTimeValue(values.start_time),
    end_time: formatTimeValue(values.end_time),
    work_hour: shiftWorkHours(values.start_time, values.end_time),
    active: Boolean(values.active),
  }),
};

const quickAddLeavePolicy = {
  title: 'Leave Policy',
  apiUrl: api('/api/hrm/leave-policies'),
  initialValues: {
    name: '',
    annual_leave: 0,
    sick_leave: 0,
    casual_leave: 0,
    active: true,
  },
  fields: [
    {
      name: 'name',
      label: 'Policy Name',
      type: 'text',
      required: true,
      col: 24,
    },
    {
      name: 'annual_leave',
      label: 'Annual Leave',
      type: 'number',
      col: 8,
      min: 0,
    },
    {
      name: 'sick_leave',
      label: 'Sick Leave',
      type: 'number',
      col: 8,
      min: 0,
    },
    {
      name: 'casual_leave',
      label: 'Casual Leave',
      type: 'number',
      col: 8,
      min: 0,
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 24,
    },
  ],
  validationSchema: Yup.object().shape({
    name: Yup.string().required('Policy name is required').max(100),
    annual_leave: Yup.number().nullable().min(0),
    sick_leave: Yup.number().nullable().min(0),
    casual_leave: Yup.number().nullable().min(0),
    active: Yup.boolean().nullable(),
  }),
  transformPayload: (values) => ({
    name: values.name?.trim(),
    annual_leave: Number(values.annual_leave || 0),
    sick_leave: Number(values.sick_leave || 0),
    casual_leave: Number(values.casual_leave || 0),
    active: Boolean(values.active),
  }),
};

const quickAddWeeklyHoliday = {
  title: 'Weekly Holiday',
  apiUrl: api('/api/hrm/weekly-holidays'),
  initialValues: {
    name: '',
    days: [],
    active: true,
  },
  fields: [
    {
      name: 'name',
      label: 'Holiday Name',
      type: 'text',
      required: true,
      col: 24,
    },
    {
      name: 'days',
      label: 'Days',
      type: 'custom',
      col: 24,
      render: renderWeekDaysSelect,
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 24,
    },
  ],
  validationSchema: Yup.object().shape({
    name: Yup.string().required('Holiday name is required').max(100),
    days: Yup.array().nullable(),
    active: Yup.boolean().nullable(),
  }),
  transformPayload: (values) => ({
    name: values.name?.trim(),
    days: Array.isArray(values.days) ? values.days : [],
    active: Boolean(values.active),
  }),
};

export default function Users(props) {
  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      width: 240,
      sorter: false,
      render: (_, record) => {
        const fullName = getFullName(record);
        const imageUrl = assetUrl(record?.image);

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {imageUrl ? (
              <Avatar src={imageUrl} size={36} />
            ) : (
              <Avatar
                size={36}
                style={{
                  background: '#1677ff',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {getInitials(record)}
              </Avatar>
            )}

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 170,
                }}
              >
                {fullName}
              </div>

              <div style={{ fontSize: 11, color: '#888' }}>
                {record?.username || '-'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: true,
      backendSort: true,
      width: 220,
      render: (value) => value || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (value) => value || '-',
    },
    {
      title: 'Department',
      key: 'department',
      width: 150,
      backendFilter: fkFilter({
        title: 'Department',
        paramName: 'department_id',
        url: '/api/hrm/departments',
      }),
      render: (_, record) => getDepartmentName(record),
    },
    {
      title: 'Role',
      key: 'role',
      width: 140,
      backendFilter: fkFilter({
        title: 'Role',
        paramName: 'role_id',
        url: '/api/hrm/roles',
      }),
      render: (_, record) => {
        const roleName = getRoleName(record);

        return roleName !== '-' ? <Tag>{roleName}</Tag> : '-';
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      backendFilter: fkFilter({
        title: 'Status',
        paramName: 'employment_status_id',
        url: '/api/hrm/employment-statuses',
      }),
      render: (_, record) => {
        const status = getStatusName(record);

        if (!status) return '-';

        const color =
          record?.employment_status?.colour_value ||
          record?.employment_status_id_detail?.colour_value ||
          STATUS_COLORS[status] ||
          'default';

        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Shift',
      key: 'shift',
      width: 130,
      backendFilter: fkFilter({
        title: 'Shift',
        paramName: 'shift_id',
        url: '/api/hrm/shifts',
      }),
      render: (_, record) => getShiftName(record),
    },
    {
      title: 'Join Date',
      dataIndex: 'join_date',
      key: 'join_date',
      sorter: true,
      backendSort: true,
      width: 120,
      render: fmtDate,
    },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      backendSort: true,
      width: 90,
      render: (value) => (
        <Tag color={value ? 'green' : 'red'}>
          {value ? 'Yes' : 'No'}
        </Tag>
      ),
    },
  ];

  const fields = [
    {
      type: 'group',
      label: 'Basic Information',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'first_name',
          label: 'First Name',
          type: 'text',
          required: true,
          col: 12,
        },
        {
          name: 'last_name',
          label: 'Last Name',
          type: 'text',
          required: true,
          col: 12,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'custom',
          required: true,
          col: 12,
          render: renderEmailInput,
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'text',
          col: 12,
        },
      ],
    },

    {
      type: 'group',
      label: 'Login & Access',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          col: 12,
        },
        {
          name: 'password',
          label: 'Password',
          type: 'custom',
          required: true,
          col: 12,
          placeholder: 'Required for new users',
          render: renderPasswordInput,
        },
        fkField({
          name: 'role_id',
          label: 'Role',
          url: '/api/hrm/roles',
          quickAdd: quickAddRole,
          required: true,
        }),
        {
          name: 'active',
          label: 'Active',
          type: 'switch',
          col: 12,
        },
      ],
    },

    {
      type: 'group',
      label: 'Employment Details',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'join_date',
          label: 'Join Date',
          type: 'date',
          col: 12,
        },
        {
          name: 'leave_date',
          label: 'Leave Date',
          type: 'date',
          col: 12,
        },
        fkField({
          name: 'branch_id',
          label: 'Branch',
          url: '/api/branches',
          required: true,
        }),
        fkField({
          name: 'department_id',
          label: 'Department',
          url: '/api/hrm/departments',
          quickAdd: quickAddDepartment,
        }),
        fkField({
          name: 'employment_status_id',
          label: 'Employment Status',
          url: '/api/hrm/employment-statuses',
          quickAdd: quickAddEmploymentStatus,
        }),
        fkField({
          name: 'shift_id',
          label: 'Shift',
          url: '/api/hrm/shifts',
          quickAdd: quickAddShift,
        }),
        fkField({
          name: 'leave_policy_id',
          label: 'Leave Policy',
          url: '/api/hrm/leave-policies',
          quickAdd: quickAddLeavePolicy,
        }),
        fkField({
          name: 'weekly_holiday_id',
          label: 'Weekly Holiday',
          url: '/api/hrm/weekly-holidays',
          quickAdd: quickAddWeeklyHoliday,
        }),
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required('First name is required').max(80),
    last_name: Yup.string().required('Last name is required').max(80),
    username: Yup.string().required('Username is required').max(80),
    email: Yup.string().required('Email is required').email().max(120),
    password: optionalPassword(),
    phone: nullableString().max(40),
    blood_group: nullableString().max(10),
    street: nullableString().max(255),
    city: nullableString().max(80),
    state: nullableString().max(80),
    zip_code: nullableString().max(40),
    country: nullableString().max(80),
    join_date: nullableString(),
    leave_date: nullableString(),
    branch_id: Yup.mixed().required('Branch is required'),
    employment_status_id: Yup.mixed().nullable(),
    department_id: Yup.mixed().nullable(),
    role_id: Yup.mixed().nullable(),
    shift_id: Yup.mixed().nullable(),
    leave_policy_id: Yup.mixed().nullable(),
    weekly_holiday_id: Yup.mixed().nullable(),
    active: Yup.boolean().nullable(),
  });

  const initialValues = {
    image: null,

    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    blood_group: '',

    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',

    username: '',
    password: '',
    role_id: null,
    active: true,

    join_date: '',
    leave_date: '',
    branch_id: null,
    employment_status_id: null,
    department_id: null,
    shift_id: null,
    leave_policy_id: null,
    weekly_holiday_id: null,
  };

  const transformRecord = (record) => ({
    ...record,
    role_id: record?.role_id || record?.roles?.[0]?.id || record?.role?.id || null,
    employment_status_id: record?.employment_status_id || record?.employment_status?.id || null,
    department_id: record?.department_id || record?.department?.id || null,
    shift_id: record?.shift_id || record?.shift?.id || null,
    leave_policy_id: record?.leave_policy_id || record?.leave_policy?.id || null,
    weekly_holiday_id: record?.weekly_holiday_id || record?.weekly_holiday?.id || null,
    password: '',
    active: record?.active ?? true,
  });

  const transformPayload = (values, meta = {}) => {
    const payload = { ...values };

    Object.keys(payload).forEach((key) => {
      if (key.endsWith('_detail')) {
        delete payload[key];
      }
    });

    [
      'first_name',
      'last_name',
      'username',
      'email',
      'phone',
      'street',
      'city',
      'state',
      'zip_code',
      'country',
    ].forEach((key) => {
      if (typeof payload[key] === 'string') {
        payload[key] = payload[key].trim();
      }
    });

    if (meta?.isEditMode && !payload.password) {
      delete payload.password;
    }

    delete payload.employee_id;

    payload.active = Boolean(payload.active);

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = null;
      }
    });

    return payload;
  };

  const handleEmployeeRowClick = (record) => ({
    style: {
      cursor: 'pointer',
    },
    onClick: (event) => {
      const target = event.target;

      const clickedControl = target?.closest?.(
        [
          'button',
          'a',
          'input',
          'textarea',
          'select',
          '.ant-btn',
          '.ant-checkbox',
          '.ant-checkbox-wrapper',
          '.ant-table-selection-column',
          '.ant-dropdown-trigger',
          '.ant-switch',
          '.ant-select',
          '.ant-picker',
          '[data-no-row-click]',
        ].join(',')
      );

      if (clickedControl) return;

      router.visit(route('hrm.users.show', record.id));
    },
  });

  const content = (
    <>
      <Head title="Employees" />
      <div style={{ padding: props.embedded ? 0 : 16, minHeight: props.embedded ? 'auto' : 'calc(100vh - 64px)' }}>
        <ReusableCrud
          icon={<TeamOutlined />}
          title="Employee"
          apiUrl={api('/api/hrm/users')}
          columns={columns}
          fields={fields}
          validationSchema={validationSchema}
          crudInitialValues={initialValues}
          transformRecord={transformRecord}
          transformPayload={transformPayload}
          form_ui="drawer"
          drawerWidth={880}
          searchParam="search"
          pageParam="page"
          pageSizeParam="page_size"
          sortMode="ordering"
          orderingParam="ordering"
          activeParam="active"
          enableServerPagination
          enableInactiveDrawer
          showSearch
          canAdd
          canEdit
          canDelete
          hasActions
          hasActionColumns
          activeTableRowFunction={handleEmployeeRowClick}
        />
      </div>
    </>
  );

  if (props.embedded) {
    return content;
  }

  return (
    <AuthenticatedLayout
      auth={props.auth}
      user={props.auth?.user}
      header={<AccessControlTabs activeKey="users" />}
    >
      {content}
    </AuthenticatedLayout>
  );
}
