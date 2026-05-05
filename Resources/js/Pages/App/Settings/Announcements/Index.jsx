import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { NotificationOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Announcements(props) {
  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: true },
    { title: 'Description', dataIndex: 'description', key: 'description', sorter: true },
  ];

  const fields = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ];

  const validationSchema = Yup.object().shape({
    title: Yup.string().required('Title is required'),
    description: Yup.string().nullable(),
  });

  const crudInitialValues = {
    title: '',
    description: '',
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.title = payload.title?.trim() || null;
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Announcements" />
      <ReusableCrud
        icon={<NotificationOutlined />}
        title="Announcements"
        apiUrl={api('/api/master/announcements/')}
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
