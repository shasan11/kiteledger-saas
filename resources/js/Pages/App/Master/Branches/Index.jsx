import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { BankOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Branches(props) {
  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', sorter: true },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', sorter: true },
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: true },
    { title: 'Address', dataIndex: 'address', key: 'address', sorter: true },
    {
      title: 'Head Office',
      dataIndex: 'is_head_office',
      key: 'is_head_office',
      render: (val) => (
        <Tag color={val ? 'blue' : 'default'}>{val ? 'Yes' : 'No'}</Tag>
      ),
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'code', label: 'Code', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'is_head_office', label: 'Head Office', type: 'switch' },
    { name: 'is_transaction_enabled', label: 'Transaction Enabled', type: 'switch' },
    { name: 'is_pos_enabled', label: 'POS Enabled', type: 'switch' },
    { name: 'is_warehouse_enabled', label: 'Warehouse Enabled', type: 'switch' },
    { name: 'is_ai_enabled', label: 'AI Enabled', type: 'switch' },
    { name: 'is_billing_location_enabled', label: 'Billing Location Enabled', type: 'switch' },
    { name: 'abbreviated_tax_enabled', label: 'Abbreviated Tax Enabled', type: 'switch' },
    { name: 'track_location', label: 'Track Location', type: 'switch' },
    { name: 'logo', label: 'Logo', type: 'text' },
    { name: 'favicon', label: 'Favicon', type: 'text' },
    { name: 'address', label: 'Address', type: 'textarea' },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    code: Yup.string().required('Code is required'),
    phone: Yup.string().nullable(),
    email: Yup.string().email('Invalid email').nullable(),
    is_head_office: Yup.boolean().nullable(),
    is_transaction_enabled: Yup.boolean().nullable(),
    is_pos_enabled: Yup.boolean().nullable(),
    is_warehouse_enabled: Yup.boolean().nullable(),
    is_ai_enabled: Yup.boolean().nullable(),
    is_billing_location_enabled: Yup.boolean().nullable(),
    abbreviated_tax_enabled: Yup.boolean().nullable(),
    track_location: Yup.boolean().nullable(),
    logo: Yup.string().nullable(),
    favicon: Yup.string().nullable(),
    address: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    phone: '',
    email: '',
    is_head_office: false,
    is_transaction_enabled: false,
    is_pos_enabled: false,
    is_warehouse_enabled: false,
    is_ai_enabled: false,
    is_billing_location_enabled: false,
    abbreviated_tax_enabled: false,
    track_location: false,
    logo: '',
    favicon: '',
    address: '',
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.code = payload.code?.trim() || null;
    payload.is_head_office = Boolean(payload.is_head_office);
    payload.is_transaction_enabled = Boolean(payload.is_transaction_enabled);
    payload.is_pos_enabled = Boolean(payload.is_pos_enabled);
    payload.is_warehouse_enabled = Boolean(payload.is_warehouse_enabled);
    payload.is_ai_enabled = Boolean(payload.is_ai_enabled);
    payload.is_billing_location_enabled = Boolean(payload.is_billing_location_enabled);
    payload.abbreviated_tax_enabled = Boolean(payload.abbreviated_tax_enabled);
    payload.track_location = Boolean(payload.track_location);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <>
      <Head title="Branches" />
      <ReusableCrud
        icon={<BankOutlined />}
        title="Branches"
        apiUrl={api('/api/branches/')}
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
    </>
  );
}
