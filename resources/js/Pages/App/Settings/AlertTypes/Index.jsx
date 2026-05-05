import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { BellOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function AlertTypes(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Medium', dataIndex: 'medium', key: 'medium', sorter: true },
    { title: 'Alert Type', dataIndex: 'alert_type', key: 'alert_type', sorter: true },
    { title: 'Schedule', dataIndex: 'schedule', key: 'schedule', sorter: true },
    { title: 'Sync Time', dataIndex: 'sync_time', key: 'sync_time', sorter: true },
    { title: 'Recipient', dataIndex: 'recipient', key: 'recipient', sorter: true },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'alert_type', label: 'Alert Type', type: 'text' },
    { name: 'sync_time', label: 'Sync Time', type: 'timePicker' },
    {
      name: 'medium',
      label: 'Medium',
      type: 'select',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
        { label: 'Push', value: 'push' },
      ],
    },
    {
      name: 'schedule',
      label: 'Schedule',
      type: 'select',
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
      ],
    },
    { name: 'recipient', label: 'Recipient', type: 'textarea' },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    alert_type: Yup.string().nullable(),
    sync_time: Yup.string().nullable(),
    medium: Yup.string().nullable(),
    schedule: Yup.string().nullable(),
    recipient: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    alert_type: '',
    sync_time: null,
    medium: '',
    schedule: '',
    recipient: '',
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Alert Types" />
      <ReusableCrud
        icon={<BellOutlined />}
        title="Alert Types"
        apiUrl={api('/api/master/alert-types/')}
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
    </AuthenticatedLayout>
  );
}
