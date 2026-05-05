import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { DatabaseOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function MasterData(props) {
  const columns = [
    { title: 'Type', dataIndex: 'type', key: 'type', sorter: true },
    { title: 'Group', dataIndex: 'group', key: 'group', sorter: true },
    { title: 'Key', dataIndex: 'key', key: 'key', sorter: true },
    { title: 'Value', dataIndex: 'value', key: 'value', sorter: true },
    { title: 'Meta', dataIndex: 'meta', key: 'meta', sorter: true },
  ];

  const fields = [
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'Country', value: 'country' },
        { label: 'State', value: 'state' },
        { label: 'City', value: 'city' },
        { label: 'Industry', value: 'industry' },
      ],
    },
    { name: 'group', label: 'Group', type: 'text' },
    { name: 'key', label: 'Key', type: 'text', required: true },
    { name: 'value', label: 'Value', type: 'text' },
    { name: 'meta', label: 'Meta', type: 'textarea' },
  ];

  const validationSchema = Yup.object().shape({
    type: Yup.string().nullable(),
    group: Yup.string().nullable(),
    key: Yup.string().required('Key is required'),
    value: Yup.string().nullable(),
    meta: Yup.string().nullable(),
  });

  const crudInitialValues = {
    type: '',
    group: '',
    key: '',
    value: '',
    meta: '',
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.key = payload.key?.trim() || null;
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Master Data" />
      <ReusableCrud
        icon={<DatabaseOutlined />}
        title="Master Data"
        apiUrl={api('/api/master/master-datas/')}
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
