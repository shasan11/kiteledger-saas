import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Typography } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function ContactGroups(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Parent Group',
      dataIndex: 'parent',
      key: 'parent',
      render: (_, record) => record?.parent?.name || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val) => val || '-',
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Group Name',
      type: 'text',
      required: true,
      col: 24,
      placeholder: 'e.g. Customers - Retail',
    },
    {
      name: 'parent_id',
      label: 'Parent Group',
      type: 'fkSelect',
      col: 24,
      placeholder: 'Select parent group',
      fkUrl: api('/api/crm/contact-groups/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Optional description',
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(120),
    parent_id: Yup.string().nullable(),
    description: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    parent_id: null,
    description: '',
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.parent_id = p.parent_id || null;
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Contact Groups" />
      <ReusableCrud
        icon={<TeamOutlined />}
        title="Contact Groups"
        apiUrl={api('/api/crm/contact-groups/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={600}
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
