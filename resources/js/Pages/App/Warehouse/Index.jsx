import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Warehouses(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (val) => val ? <Tag color="blue">{val}</Tag> : '-',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (val) => val || '-',
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Warehouse Name',
      type: 'text',
      required: true,
      col: 12,
      placeholder: 'e.g. Main Warehouse',
    },
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      col: 12,
      placeholder: 'e.g. WH-001',
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Warehouse address',
    },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Warehouse name is required').max(150),
    code: Yup.string().nullable().max(50),
    address: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    address: '',
    active: true,
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.code = p.code?.trim() || null;
    p.address = p.address?.trim() || null;
    p.active = Boolean(p.active);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Warehouses</h2>}
    >
      <Head title="Warehouses" />
      <ReusableCrud
        icon={<HomeOutlined />}
        title="Warehouses"
        apiUrl={api('/api/warehouses')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="modal"
        modalWidth={780}
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
