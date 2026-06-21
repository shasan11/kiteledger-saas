import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { BankOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { api, money } from '../Shared/crmApi';

export default function Accounts({ auth }) {
  const statusOptions = ['active', 'inactive', 'prospect', 'customer', 'churned'].map((value) => ({ value, label: value.replace('_', ' ') }));

  const columns = [
    { title: 'Account', dataIndex: 'name', sorter: true, render: (value, row) => <><Typography.Text strong>{value}</Typography.Text><br /><Typography.Text type="secondary">{row.account_no || row.email || '-'}</Typography.Text></> },
    { title: 'Status', dataIndex: 'status', width: 120, render: (value) => <Tag>{String(value || 'prospect').toUpperCase()}</Tag> },
    { title: 'Segment', dataIndex: 'segment', width: 140, render: (value) => value || '-' },
    { title: 'Owner', dataIndex: ['owner', 'name'], width: 160, render: (_, row) => row.owner?.name || '-' },
    { title: 'Credit Limit', dataIndex: 'credit_limit', width: 140, align: 'right', render: money },
  ];

  const fields = [
    { name: 'name', label: 'Account Name', type: 'text', required: true, col: 12 },
    { name: 'account_no', label: 'Account No', type: 'text', col: 6 },
    { name: 'status', label: 'Status', type: 'select', options: statusOptions, col: 6 },
    { name: 'legal_name', label: 'Legal Name', type: 'text', col: 12 },
    { name: 'industry', label: 'Industry', type: 'text', col: 6 },
    { name: 'segment', label: 'Segment', type: 'text', col: 6 },
    { name: 'source', label: 'Source', type: 'text', col: 6 },
    { name: 'website', label: 'Website', type: 'text', col: 6 },
    { name: 'phone', label: 'Phone', type: 'phone', col: 6, placeholder: '+977 9800000000', defaultCountryCode: '+977' },
    { name: 'email', label: 'Email', type: 'text', col: 6 },
    { name: 'owner_id', label: 'Owner', type: 'fkSelect', col: 8, fkUrl: api('/api/hrm/users'), fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
    { name: 'annual_revenue', label: 'Annual Revenue', type: 'number', col: 8 },
    { name: 'employee_count', label: 'Employees', type: 'number', col: 4 },
    { name: 'credit_limit', label: 'Credit Limit', type: 'number', col: 4 },
    { name: 'billing_address', label: 'Billing Address', type: 'textarea', col: 12, rows: 2 },
    { name: 'shipping_address', label: 'Shipping Address', type: 'textarea', col: 12, rows: 2 },
    { name: 'remarks', label: 'Remarks', type: 'textarea', col: 24, rows: 3 },
  ];

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="CRM Accounts" />
      <ReusableCrud
        icon={<BankOutlined />}
        title="CRM Accounts"
        apiUrl={api('/api/crm-accounts/')}
        columns={columns}
        fields={fields}
        validationSchema={Yup.object({ name: Yup.string().required('Name is required') })}
        crudInitialValues={{ name: '', status: 'prospect', active: true }}
        transformPayload={(values) => values}
        form_ui="drawer"
        drawerWidth={1000}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination
        showSearch
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
        activeTableRowFunction={(record) => ({ onClick: () => router.visit(`/crm/accounts/${record.id}`), style: { cursor: 'pointer' } })}
      />
    </AuthenticatedLayout>
  );
}
