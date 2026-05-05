import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Avatar, Space, Tag, Typography } from 'antd';
import { ContactsOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const avatarColors = [
  '#1677ff', '#52c41a', '#fa8c16', '#722ed1',
  '#eb2f96', '#13c2c2', '#fa541c', '#2f54eb',
];

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const getAvatarColor = (id = '') => {
  const text = String(id || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const capitalizeFirst = (value) => {
  if (!value) return '-';
  const text = String(value).trim();
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export default function Contacts(props) {
  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      sorter: true,
      width: 100,
      render: (val) => val || '-',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val, record) => (
        <Space size={10}>
          <Avatar
            size={34}
            style={{
              backgroundColor: getAvatarColor(record?.id),
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {getInitials(val)}
          </Avatar>
          <Text strong>{val || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'contact_type',
      key: 'contact_type',
      sorter: true,
      render: (val) => {
        const colors = { customer: 'green', vendor: 'orange', both: 'blue' };
        return val ? (
          <Tag color={colors[val] || 'default'}>{capitalizeFirst(val)}</Tag>
        ) : '-';
      },
    },
    {
      title: 'Tax Reg. No',
      dataIndex: 'tax_registration_no',
      key: 'tax_registration_no',
      render: (val) => val || '-',
    },
    {
      title: 'Tax Reg. Type',
      dataIndex: 'tax_registration_type',
      key: 'tax_registration_type',
      render: (val) => val ? capitalizeFirst(val) : '-',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (val) => val || '-',
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Contact Name',
      type: 'text',
      required: true,
      col: 12,
      placeholder: 'e.g. John Doe',
    },
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      col: 6,
      placeholder: 'Auto or manual',
    },
    {
      name: 'contact_type',
      label: 'Contact Type',
      type: 'select',
      col: 6,
      placeholder: 'Select type',
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'both', label: 'Both' },
      ],
    },
    {
      name: 'pan',
      label: 'PAN',
      type: 'text',
      col: 6,
      placeholder: 'PAN number',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'text',
      col: 6,
      placeholder: '+977 9800000000',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      col: 6,
      placeholder: 'email@example.com',
    },
    {
      name: 'contact_group_id',
      label: 'Contact Group',
      type: 'fkSelect',
      col: 6,
      placeholder: 'Select group',
      fkUrl: api('/api/contact-groups/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    {
      name: 'account_id',
      label: 'Account',
      type: 'fkSelect',
      col: 8,
      placeholder: 'Select account',
      fkUrl: api('/api/accounts/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    {
      name: 'tax_registration_no',
      label: 'Tax Registration No',
      type: 'text',
      col: 8,
      placeholder: 'Tax reg. number',
    },
    {
      name: 'tax_registration_type',
      label: 'Tax Registration Type',
      type: 'select',
      col: 8,
      placeholder: 'Select type',
      options: [
        { value: 'pan', label: 'PAN' },
        { value: 'vat', label: 'VAT' },
        { value: 'none', label: 'None' },
      ],
    },
    {
      name: 'credit_term_id',
      label: 'Credit Term',
      type: 'fkSelect',
      col: 8,
      placeholder: 'Select credit term',
      fkUrl: api('/api/credit-terms/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    {
      name: 'credit_limit',
      label: 'Credit Limit',
      type: 'number',
      col: 8,
      min: 0,
      placeholder: '0.00',
    },
    {
      name: 'accept_purchase',
      label: 'Accept Purchase',
      type: 'switch',
      col: 8,
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      col: 24,
      rows: 2,
      placeholder: 'Full address',
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(180),
    code: Yup.string().nullable().max(50),
    pan: Yup.string().nullable().max(80),
    phone: Yup.string().nullable().max(40),
    email: Yup.string().nullable().email('Invalid email').max(120),
    contact_group_id: Yup.string().nullable(),
    account_id: Yup.string().nullable(),
    tax_registration_no: Yup.string().nullable().max(80),
    tax_registration_type: Yup.string().nullable().oneOf(['pan', 'vat', 'none', null]),
    credit_term_id: Yup.string().nullable(),
    credit_limit: Yup.number().nullable().min(0),
    contact_type: Yup.string().nullable().oneOf(['customer', 'vendor', 'both', null]),
    accept_purchase: Yup.boolean().nullable(),
    address: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    pan: '',
    phone: '',
    email: '',
    contact_group_id: null,
    account_id: null,
    tax_registration_no: '',
    tax_registration_type: null,
    credit_term_id: null,
    credit_limit: null,
    contact_type: 'customer',
    accept_purchase: false,
    address: '',
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.code = p.code?.trim() || null;
    p.pan = p.pan?.trim() || null;
    p.phone = p.phone?.trim() || null;
    p.email = p.email?.trim() || null;
    p.address = p.address?.trim() || null;
    p.tax_registration_no = p.tax_registration_no?.trim() || null;
    p.contact_group_id = p.contact_group_id || null;
    p.account_id = p.account_id || null;
    p.credit_term_id = p.credit_term_id || null;
    p.credit_limit = p.credit_limit != null ? Number(p.credit_limit) : null;
    p.accept_purchase = Boolean(p.accept_purchase);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Contacts" />
      <ReusableCrud
        icon={<ContactsOutlined />}
        title="Contacts"
        apiUrl={api('/api/contacts/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1000}
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
        anchorFilters={[
          { key: 'all', label: 'All', title: 'Contacts', params: {} },
          { key: 'customer', label: 'Customers', title: 'Customers', params: { contact_type: 'customer' } },
          { key: 'vendor', label: 'Vendors', title: 'Vendors', params: { contact_type: 'vendor' } },
          { key: 'both', label: 'Both', title: 'Both', params: { contact_type: 'both' } },
        ]}
        defaultAnchorKey="all"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
