import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { UserSwitchOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'lost', label: 'Lost' },
  { value: 'converted', label: 'Converted' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusColor = {
  new: 'blue',
  contacted: 'cyan',
  qualified: 'green',
  proposal: 'geekblue',
  negotiation: 'orange',
  lost: 'red',
  converted: 'purple',
};

export default function Leads(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      width: 200,
      render: (val) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      width: 130,
      render: (val) => (
        <Tag color={statusColor[val] || 'default'}>
          {val ? String(val).replace(/_/g, ' ').toUpperCase() : 'NEW'}
        </Tag>
      ),
    },
    {
      title: 'Next Follow Up',
      dataIndex: 'next_follow_up_date',
      key: 'next_follow_up_date',
      sorter: true,
      width: 150,
      render: (val) => val || '-',
    },
    {
      title: 'Lead No',
      dataIndex: 'lead_no',
      key: 'lead_no',
      sorter: true,
      width: 120,
      render: (val) => val || '-',
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      sorter: true,
      width: 180,
      render: (val) => val || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (val) => val || '-',
    },
  ];

  const fields = [
    {
      type: 'group',
      label: 'Basic Information',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'name',
          label: 'Lead Name',
          type: 'text',
          required: true,
          col: 12,
          placeholder: 'Enter lead name',
        },
        {
          name: 'lead_no',
          label: 'Lead No',
          type: 'text',
          col: 6,
          placeholder: 'Auto or manual',
        },
        {
          name: 'company_name',
          label: 'Company Name',
          type: 'text',
          col: 6,
          placeholder: 'Company name',
        },
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          col: 8,
          placeholder: 'email@example.com',
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'text',
          col: 8,
          placeholder: 'Phone number',
        },
        {
          name: 'mobile',
          label: 'Mobile',
          type: 'text',
          col: 8,
          placeholder: 'Mobile number',
        },
        {
          name: 'website',
          label: 'Website',
          type: 'text',
          col: 8,
          placeholder: 'https://example.com',
        },
        {
          name: 'city',
          label: 'City',
          type: 'text',
          col: 8,
          placeholder: 'City',
        },
        {
          name: 'state',
          label: 'State',
          type: 'text',
          col: 8,
          placeholder: 'State',
        },
        {
          name: 'country',
          label: 'Country',
          type: 'text',
          col: 8,
          placeholder: 'Country',
        },
      ],
    },
    {
      type: 'group',
      label: 'Lead Classification',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'lead_source',
          label: 'Lead Source',
          type: 'text',
          col: 8,
          placeholder: 'e.g. Website, Referral',
        },
        {
          name: 'industry',
          label: 'Industry',
          type: 'text',
          col: 8,
          placeholder: 'e.g. IT, Manufacturing',
        },
        {
          name: 'expected_value',
          label: 'Expected Value',
          type: 'number',
          col: 8,
          min: 0,
          placeholder: '0.00',
        },
        {
          name: 'contact_id',
          label: 'Contact',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select contact',
          fkUrl: api('/api/contacts/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          name: 'assigned_to_id',
          label: 'Assigned To',
          type: 'fkSelect',
          col: 8,
          placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          col: 8,
          placeholder: 'Select status',
          options: statusOptions,
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          col: 8,
          placeholder: 'Select priority',
          options: priorityOptions,
        },
        {
          name: 'next_follow_up_date',
          label: 'Next Follow Up',
          type: 'datePicker',
          col: 8,
          placeholder: 'Select date',
        },
      ],
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      col: 24,
      rows: 2,
      placeholder: 'Full address',
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Additional notes',
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(180),
    lead_no: Yup.string().nullable().max(40),
    company_name: Yup.string().nullable().max(180),
    email: Yup.string().nullable().email('Invalid email').max(120),
    phone: Yup.string().nullable().max(40),
    mobile: Yup.string().nullable().max(40),
    website: Yup.string().nullable().max(180),
    city: Yup.string().nullable().max(80),
    state: Yup.string().nullable().max(80),
    country: Yup.string().nullable().max(80),
    lead_source: Yup.string().nullable().max(80),
    industry: Yup.string().nullable().max(120),
    expected_value: Yup.number().nullable().min(0),
    contact_id: Yup.string().nullable(),
    assigned_to_id: Yup.number().nullable(),
    status: Yup.string().nullable().oneOf(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'lost', 'converted', null]),
    priority: Yup.string().nullable().oneOf(['low', 'medium', 'high', 'urgent', null]),
    next_follow_up_date: Yup.string().nullable(),
    address: Yup.string().nullable(),
    notes: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    lead_no: '',
    company_name: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    city: '',
    state: '',
    country: '',
    lead_source: '',
    industry: '',
    expected_value: null,
    contact_id: null,
    assigned_to_id: null,
    status: 'new',
    priority: 'medium',
    next_follow_up_date: null,
    address: '',
    notes: '',
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.lead_no = p.lead_no?.trim() || null;
    p.company_name = p.company_name?.trim() || null;
    p.email = p.email?.trim() || null;
    p.phone = p.phone?.trim() || null;
    p.mobile = p.mobile?.trim() || null;
    p.website = p.website?.trim() || null;
    p.city = p.city?.trim() || null;
    p.state = p.state?.trim() || null;
    p.country = p.country?.trim() || null;
    p.lead_source = p.lead_source?.trim() || null;
    p.industry = p.industry?.trim() || null;
    p.address = p.address?.trim() || null;
    p.notes = p.notes?.trim() || null;
    p.contact_id = p.contact_id || null;
    p.assigned_to_id = p.assigned_to_id || null;
    p.expected_value = p.expected_value != null ? Number(p.expected_value) : null;
    p.next_follow_up_date = formatDate(p.next_follow_up_date);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  const anchorFilters = [
    { key: 'all', label: 'All', title: 'All Leads', params: {} },
    { key: 'new', label: 'New', title: 'New Leads', params: { status: 'new' } },
    { key: 'contacted', label: 'Contacted', title: 'Contacted Leads', params: { status: 'contacted' } },
    { key: 'qualified', label: 'Qualified', title: 'Qualified Leads', params: { status: 'qualified' } },
    { key: 'lost', label: 'Lost', title: 'Lost Leads', params: { status: 'lost' } },
    { key: 'converted', label: 'Converted', title: 'Converted Leads', params: { status: 'converted' } },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Leads" />
      <ReusableCrud
        icon={<UserSwitchOutlined />}
        title="Leads"
        apiUrl={api('/api/leads/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1100}
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
        anchorFilters={anchorFilters}
        defaultAnchorKey="all"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
