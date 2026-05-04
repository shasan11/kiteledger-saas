import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
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
      width:"30%",
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Parent Group',
      dataIndex: 'parent',
      key: 'parent',
      width: '30%',
      render: (_, record) => record?.parent?.name || '-',
    },
     
    
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: '15%',
      sorter: true,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
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
      fkUrl: api('/api/contact-groups'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.name || '',
      fkExtraParams: { active: true },
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
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    parent_id: null,
    description: '',
    active: true,
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.parent_id = p.parent_id || null;
    p.active = Boolean(p.active);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Contact Groups</h2>}
    >
      <Head title="Contact Groups" />
      <ReusableCrud
        icon={<TeamOutlined />}
        title="Contact Groups"
        apiUrl={api('/api/contact-groups/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="modal"
        modalWidth={500}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination={true}
        enableInactiveDrawer={true}
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
