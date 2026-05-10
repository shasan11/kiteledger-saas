import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { SettingOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function ApplicationSettings(props) {
  const columns = [
    { title: 'Key', dataIndex: 'key', key: 'key', sorter: true },
    { title: 'Value', dataIndex: 'value', key: 'value', sorter: true },
    { title: 'Group', dataIndex: 'group', key: 'group', sorter: true },
  ];

  const fields = [
    { name: 'key', label: 'Key', type: 'text', required: true },
    { name: 'group', label: 'Group', type: 'text' },
    { name: 'value', label: 'Value', type: 'textarea' },
  ];

  const validationSchema = Yup.object().shape({
    key: Yup.string().required('Key is required'),
    group: Yup.string().nullable(),
    value: Yup.string().nullable(),
  });

  const crudInitialValues = {
    key: '',
    group: '',
    value: '',
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.key = payload.key?.trim() || null;
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Application Settings" />
      <ReusableCrud
        icon={<SettingOutlined />}
        title="Application Settings"
        apiUrl={api('/api/application-settings/')}
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
