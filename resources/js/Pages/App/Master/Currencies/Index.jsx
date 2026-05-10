import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { DollarOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Currencies(props) {
  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', sorter: true },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', sorter: true },
    { title: 'Decimal Places', dataIndex: 'decimal_places', key: 'decimal_places', sorter: true },
    {
      title: 'Base Currency',
      dataIndex: 'is_base',
      key: 'is_base',
      render: (val) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Yes' : 'No'}</Tag>
      ),
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'code', label: 'Code', type: 'text', required: true },
    { name: 'symbol', label: 'Symbol', type: 'text' },
    { name: 'decimal_places', label: 'Decimal Places', type: 'number' },
    { name: 'is_base', label: 'Base Currency', type: 'switch' },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    code: Yup.string().required('Code is required'),
    symbol: Yup.string().nullable(),
    decimal_places: Yup.number().nullable(),
    is_base: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    symbol: '',
    decimal_places: 2,
    is_base: false,
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.code = payload.code?.trim() || null;
    payload.is_base = Boolean(payload.is_base);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Currencies" />
      <ReusableCrud
        icon={<DollarOutlined />}
        title="Currencies"
        apiUrl={api('/api/currencies/')}
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
