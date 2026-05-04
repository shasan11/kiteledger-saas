import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Contacts(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'contact_type',
      key: 'contact_type',
      render: (val) => {
        const colors = { customer: 'green', supplier: 'orange', lead: 'blue' };
        return val ? <Tag color={colors[val] || 'default'}>{val ? String(val).charAt(0).toUpperCase() + String(val).slice(1) : ''}</Tag> : '-';
      },
    },
    {
      title: 'Group',
      dataIndex: 'contactGroup',
      key: 'contactGroup',
      render: (_, record) =>
        record?.contactGroup?.name || record?.contact_group?.name || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (val) => val || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
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
      name: 'contact_type',
      label: 'Contact Type',
      type: 'radio',
      required: true,
      col: 24,
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'supplier', label: 'Supplier' },
        { value: 'lead',     label: 'Lead' },
      ],
    },
    {
      name: 'name',
      label: 'Contact Name',
      type: 'text',
      required: true,
      col: 24,
      placeholder: 'e.g. John Doe',
    },
     { name: 'address', label: 'Address', type: 'textarea', col: 24, rows: 2, placeholder: 'Full address', },
    { name: 'code', label: 'Code', type: 'text', col: 12, placeholder: 'CUST-001' },
    
    {
      name: 'contact_group_id',
      label: 'Contact Group',
      type: 'fkSelect',
      col: 12,
      placeholder: 'Select group',
      fkUrl: api('/api/contact-groups'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.name || '',
      fkExtraParams: { active: true },
    },
    { name: 'phone', label: 'Phone', type: 'text', col: 12, placeholder: '+977 9800000000' },
    { name: 'email', label: 'Email', type: 'text', col: 12, placeholder: 'contact@example.com' },
    { name: 'pan', label: 'PAN / Tax No', type: 'text', col: 12, placeholder: 'PAN number' },
    { name: 'credit_limit', label: 'Credit Limit', type: 'number', col: 12, min: 0, placeholder: '0.00' },
    
    { name: 'accept_purchase', label: 'Accept Purchase', type: 'switch', col: 8 },
   ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(180),
    code: Yup.string().nullable().max(50),
    contact_type: Yup.string().required('Contact type is required').oneOf(['customer', 'supplier', 'lead']),
    contact_group_id: Yup.string().nullable(),
    phone: Yup.string().nullable().max(40),
    email: Yup.string().nullable().email('Invalid email').max(120),
    pan: Yup.string().nullable().max(80),
    credit_limit: Yup.number().nullable().min(0),
    address: Yup.string().nullable(),
    accept_purchase: Yup.boolean().nullable(),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    contact_type: 'customer',
    contact_group_id: null,
    phone: '',
    email: '',
    pan: '',
    credit_limit: null,
    address: '',
    accept_purchase: false,
    active: true,
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.code = p.code?.trim() || null;
    p.phone = p.phone?.trim() || null;
    p.email = p.email?.trim() || null;
    p.pan = p.pan?.trim() || null;
    p.address = p.address?.trim() || null;
    p.contact_group_id = p.contact_group_id || null;
    p.credit_limit = p.credit_limit != null ? Number(p.credit_limit) : null;
    p.accept_purchase = Boolean(p.accept_purchase);
    p.active = Boolean(p.active);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
     >
      <Head title="Contacts" />
      <ReusableCrud
        icon={<UserOutlined />}
        title="Contacts"
        apiUrl={api('/api/contacts')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="modal"
        modalWidth={700}
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
        anchorFilters={[
          { key: 'all',      label: 'All',       title: 'Contacts', params: {} },
          { key: 'customer', label: 'Customers', title: 'Contacts', params: { contact_type: 'customer' } },
          { key: 'supplier', label: 'Suppliers', title: 'Contacts', params: { contact_type: 'supplier' } },
          { key: 'lead',     label: 'Leads',     title: 'Contacts', params: { contact_type: 'lead' } },
        ]}
        defaultAnchorKey="all"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
