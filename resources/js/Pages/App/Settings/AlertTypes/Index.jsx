import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, TimePicker } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const MEDIUM_OPTIONS = [
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'In App', value: 'in_app' },
];

const SCHEDULE_OPTIONS = [
  { label: 'Immediate', value: 'immediate' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const MEDIUM_COLORS = {
  email: 'blue',
  sms: 'purple',
  whatsapp: 'green',
  in_app: 'cyan',
};

const SCHEDULE_COLORS = {
  immediate: 'red',
  daily: 'blue',
  weekly: 'geekblue',
  monthly: 'gold',
};

const labelFor = (options, value) => options.find((option) => option.value === value)?.label || value || '-';
const timeValue = (value) => {
  if (!value) return null;
  if (typeof value?.format === 'function') return value;
  return dayjs(`2000-01-01 ${value}`);
};

export default function AlertTypes(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Alert Key', dataIndex: 'alert_type', key: 'alert_type', sorter: true },
    {
      title: 'Medium',
      dataIndex: 'medium',
      key: 'medium',
      sorter: true,
      render: (value) => <Tag color={MEDIUM_COLORS[value] || 'default'}>{labelFor(MEDIUM_OPTIONS, value)}</Tag>,
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      key: 'schedule',
      sorter: true,
      render: (value) => <Tag color={SCHEDULE_COLORS[value] || 'default'}>{labelFor(SCHEDULE_OPTIONS, value)}</Tag>,
    },
    { title: 'Sync Time', dataIndex: 'sync_time', key: 'sync_time', sorter: true, render: (value) => value || '-' },
    { title: 'Recipient', dataIndex: 'recipient', key: 'recipient', sorter: true },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'System',
      dataIndex: 'is_system_generated',
      key: 'is_system_generated',
      sorter: true,
      render: (value) => <Tag color={value ? 'processing' : 'default'}>{value ? 'System' : 'Custom'}</Tag>,
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'alert_type', label: 'Alert Key', type: 'text', required: true },
    {
      name: 'medium',
      label: 'Medium',
      type: 'select',
      required: true,
      options: MEDIUM_OPTIONS,
    },
    {
      name: 'schedule',
      label: 'Schedule',
      type: 'select',
      required: true,
      options: SCHEDULE_OPTIONS,
    },
    {
      name: 'sync_time',
      label: 'Sync Time',
      type: 'custom',
      render: ({ value, setFieldValue, readOnly }) => (
        <TimePicker
          style={{ width: '100%' }}
          value={timeValue(value)}
          format="HH:mm:ss"
          disabled={readOnly}
          allowClear
          onChange={(nextValue) => setFieldValue('sync_time', nextValue)}
        />
      ),
    },
    { name: 'recipient', label: 'Recipient', type: 'textarea', rows: 2 },
    { name: 'active', label: 'Active', type: 'switch' },
    { name: 'is_system_generated', label: 'System Generated', type: 'switch', readOnly: true },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    alert_type: Yup.string().required('Alert key is required'),
    medium: Yup.string().oneOf(MEDIUM_OPTIONS.map((option) => option.value)).required('Medium is required'),
    schedule: Yup.string().oneOf(SCHEDULE_OPTIONS.map((option) => option.value)).required('Schedule is required'),
    sync_time: Yup.mixed().nullable(),
    recipient: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
    is_system_generated: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    alert_type: '',
    sync_time: null,
    medium: 'email',
    schedule: 'immediate',
    recipient: '',
    active: true,
    is_system_generated: false,
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.alert_type = payload.alert_type?.trim() || null;
    payload.recipient = payload.recipient?.trim() || null;
    payload.active = payload.active ?? true;
    payload.is_system_generated = payload.is_system_generated ?? false;

    if (payload.sync_time && typeof payload.sync_time?.format === 'function') {
      payload.sync_time = payload.sync_time.format('HH:mm:ss');
    } else if (typeof payload.sync_time === 'string' && /^\d{2}:\d{2}$/.test(payload.sync_time)) {
      payload.sync_time = `${payload.sync_time}:00`;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = null;
      }
    });

    return payload;
  };

  return (
    <>
      <Head title="Alert Types" />
      <ReusableCrud
        icon={<BellOutlined />}
        title="Alert Types"
        apiUrl={api('/api/alert-types/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={900}
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
      />
 </>
  );
}
