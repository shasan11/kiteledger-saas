import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function CreditTerms(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Days',
      dataIndex: 'days',
      key: 'days',
      sorter: true,
      render: (val) => (val != null ? val : '-'),
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
      label: 'Name',
      type: 'text',
      required: true,
      col: 12,
      placeholder: 'e.g. Net 30',
    },
    {
      name: 'days',
      label: 'Days',
      type: 'number',
      required: true,
      col: 12,
      min: 0,
      placeholder: '30',
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
    days: Yup.number().required('Days is required').min(0, 'Must be 0 or more').integer(),
    description: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    days: null,
    description: '',
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.days = p.days != null ? Number(p.days) : null;
    p.description = p.description?.trim() || null;
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Credit Terms" />
      <ReusableCrud
        icon={<ClockCircleOutlined />}
        title="Credit Terms"
        apiUrl={api('/api/credit-terms/')}
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
