import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { AppstoreOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function LeaveTypes({ auth, embedded = false }) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Days Allowed', dataIndex: 'days_allowed', key: 'days_allowed', sorter: true },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', col: 12, required: true },
    { name: 'days_allowed', label: 'Days Allowed', type: 'number', col: 12, required: true },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    days_allowed: Yup.number().required('Days allowed is required').min(0),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    days_allowed: 0,
    active: true,
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.days_allowed =
      payload.days_allowed === '' || payload.days_allowed === null
        ? null
        : Number(payload.days_allowed);
    payload.active = Boolean(payload.active);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  const crud = (
    <ReusableCrud
      icon={<AppstoreOutlined />}
      title="Leave Types"
      apiUrl={api('/api/hrm/leave-types')}
      columns={columns}
      fields={fields}
      validationSchema={validationSchema}
      crudInitialValues={crudInitialValues}
      transformPayload={transformPayload}
      form_ui="drawer"
      drawerWidth={720}
      searchParam="search"
      pageParam="page"
      pageSizeParam="page_size"
      sortMode="ordering"
      orderingParam="ordering"
      activeParam="active"
      enableServerPagination={true}
      enableInactiveDrawer={true}
      backendFilter={{ active: 'active' }}
      backendSort={{ name: 'name', days_allowed: 'days_allowed', active: 'active' }}
      showSearch={true}
      canAdd={true}
      canEdit={true}
      canDelete={true}
      hasActions={true}
      hasActionColumns={true}
    />
  );

  if (embedded) return crud;

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Leave Types" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
        {crud}
      </div>
    </AuthenticatedLayout>
  );
}
