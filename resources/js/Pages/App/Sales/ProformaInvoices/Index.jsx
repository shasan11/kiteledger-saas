import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function ProformaInvoices(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'active', label: 'Active', type: 'switch' },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    active: true,
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.active = Boolean(payload.active);
    payload.deleted_item_ids = Array.isArray(payload.deleted_item_ids) ? payload.deleted_item_ids : [];
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="ProformaInvoices" />
      <ReusableCrud
        icon={<AppstoreOutlined />}
        title="ProformaInvoices"
        endpoint={api('/api/sales/proformainvoices')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        initialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1100}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination={true}
        enableInactiveDrawer={true}
        backendFilter={{ active: 'active' }}
        backendSort={{ name: 'name', active: 'active' }}
      />
    </AuthenticatedLayout>
  );
}
