import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const emptyExpenseLine = { chart_of_account_id: null, description: '', tax_rate_id: null, amount: 0, tax_amount: 0 };

const statusColors = { draft: 'default', posted: 'green', cancelled: 'red' };

export default function Expenses({ auth }) {
  const columns = useMemo(() => [
    { title: 'Expense No', dataIndex: 'expense_no', key: 'expense_no' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={statusColors[v] || 'default'}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'}</Tag>,
    },
    { title: 'Expense Date', dataIndex: 'expense_date', key: 'expense_date' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date' },
    { title: 'Contact', dataIndex: ['contact', 'name'], key: 'contact_name', render: (v) => v || '-' },
    { title: 'Reference', dataIndex: 'reference', key: 'reference' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v) => money(v), align: 'right' },
  ], []);

  const fields = useMemo(() => [
    { name: 'expense_no', label: 'Expense No', type: 'text', col: 8 },
    { name: 'expense_date', label: 'Expense Date', type: 'datePicker', col: 8, required: true },
    { name: 'due_date', label: 'Due Date', type: 'datePicker', col: 8 },
    {
      name: 'status', label: 'Status', type: 'select', col: 8,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'posted', label: 'Posted' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'approved', label: 'Approved', type: 'switch', col: 6 },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 10, fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 6, fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'reference', label: 'Reference', type: 'text', col: 8 },
    { name: 'tds_type', label: 'TDS Type', type: 'text', col: 8 },
    { name: 'tds_charges', label: 'TDS Charges', type: 'number', col: 8, min: 0 },
    { name: 'tds_charges_account_id', label: 'TDS Charges Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 6, min: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
    {
      name: 'items', label: 'Expense Lines', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Line',
      defaultItem: { ...emptyExpenseLine },
      columns: [
        { key: 'chart_of_account_id', name: 'chart_of_account_id', label: 'Account', type: 'fkSelect', width: '3fr', required: true, fkUrl: api('/api/chart-of-accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
        { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax Rate', type: 'fkSelect', width: '150px', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '130px', min: 0, required: true },
        { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
      ],
    },
  ], []);

  const validationSchema = Yup.object({
    expense_date: Yup.string().required('Expense date is required'),
  });

  const crudInitialValues = {
    expense_no: '',
    expense_date: dayjs().format('YYYY-MM-DD'),
    due_date: null,
    status: 'draft',
    approved: false,
    contact_id: null,
    currency_id: null,
    reference: '',
    tds_type: '',
    tds_charges: 0,
    tds_charges_account_id: null,
    exchange_rate: 1,
    notes: '',
    items: [{ ...emptyExpenseLine }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    expense_date: formatDate(values.expense_date),
    due_date: formatDate(values.due_date),
    exchange_rate: toNumber(values.exchange_rate),
    tds_charges: toNumber(values.tds_charges),
    items: (values.items || []).map((item) => ({
      ...item,
      amount: toNumber(item.amount),
      tax_amount: toNumber(item.tax_amount),
    })),
    deleted_item_ids: values.deleted_item_ids || [],
  });

  const anchorFilters = [
    { key: 'approved', label: 'Approved', params: { approved: true } },
    { key: 'draft', label: 'Draft', params: { approved: false } },
    { key: 'all', label: 'All', params: {} },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Expenses" />
      <ReusableCrud
        title="Expenses"
        icon={<CreditCardOutlined />}
        apiUrl={api('/api/expenses/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        anchorFilters={anchorFilters}
        defaultAnchorKey="approved"
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
        showViewColumn
        viewPathBuilder={(record) => route('payment-out.expenses.show', record.id)}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
            router.visit(route('payment-out.expenses.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
        hasActions={true}
        hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
