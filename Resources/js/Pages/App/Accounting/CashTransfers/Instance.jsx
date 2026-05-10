import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography, Button } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};

const emptyLine = { to_account_id: null, to_account_id_detail: null, to_account_name: '', description: '', amount: 0 };
const statusColor = (s) => { if (s === 'posted') return 'green'; if (s === 'cancelled') return 'red'; return 'default'; };

export default function CashTransfers(props) {
  const columns = useMemo(() => [
    {
      title: '#No',
      dataIndex: 'transfer_no',
      key: 'transfer_no',
      sorter: true,
      width:50,
      render: (val) => <Text strong>{val || 'DRAFT'}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'transfer_date',
      key: 'transfer_date',
      width:20,
      sorter: true,
      render: (val) => { if (!val) return '-'; const d = dayjs(val); return d.isValid() ? d.format('DD-MM-YYYY') : val; },
    },
    {
      title: 'From Account',
      dataIndex: 'fromAccount',
      key: 'fromAccount',
      width:60,
      render: (_, r) => r?.fromAccount?.name || r?.from_account?.name || '-',
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width:100,
      render: (val) => val || '-',
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
       
      sorter: true,
      width:70,
      render: (val) => <Text strong>{money(val)}</Text>,
    },
   
  ], []);

  const fields = useMemo(() => [
    { name: 'transfer_no', label: 'Transfer No', type: 'text', col: 8, placeholder: 'Auto-generated if blank' },
    { name: 'transfer_date', label: 'Transfer Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY', placeholder: 'Select date' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      col: 8,
      options: [
        { value: 'draft',     label: 'Draft' },
        { value: 'posted',    label: 'Posted' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      name: 'from_account_id',
      label: 'From Account',
      type: 'fkSelect',
      required: true,
      col: 12,
      placeholder: 'Select source account',
      fkUrl: api('/api/bank-accounts/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'account_id',
      fkLabelKey: 'display_name',
      fkLabel: (row) => row?.display_name ? `${row.display_name}${row.code ? ` (${row.code})` : ''}` : '',
      fkExtraParams: { active: true },
    },
    {
      name: 'currency_id',
      label: 'Currency',
      type: 'fkSelect',
      required: true,
      col: 6,
      placeholder: 'Select currency',
      fkUrl: api('/api/currencies/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.code ? `${row.code} - ${row.name}` : row?.name || '',
    },
    { name: 'reference', label: 'Reference', type: 'text', col: 6, placeholder: 'Optional reference' },
    {
      name: 'items',
      label: 'Transfer Lines',
      type: 'objectArray',
      col: 24,
      headerBg: '#424b59',
      headerColor: '#ffffff',
      addButtonLabel: 'Add Destination Account',
      defaultItem: { ...emptyLine },
      columns: [
        {
          key: 'to_account_id',
          name: 'to_account_id',
          label: 'To Account',
          type: 'fkSelect',
          width: '3fr',
          placeholder: 'Select destination account',
          fkUrl: api('/api/bank-accounts/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'account_id',
          fkLabelKey: 'display_name',
          labelField: 'to_account_name',
          fkLabel: (row) => row?.display_name ? `${row.display_name}${row.code ? ` (${row.code})` : ''}` : '',
          fkExtraParams: { active: true },
        },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr', placeholder: 'Optional description' },
        { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '160px', min: 0, placeholder: '0.00' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Transfer notes' },
  ], []);

  const validationSchema = Yup.object().shape({
    transfer_date: Yup.string().required('Date is required'),
    from_account_id: Yup.string().nullable().required('From account is required'),
    currency_id: Yup.string().nullable().required('Currency is required'),
    status: Yup.string().nullable().oneOf(['draft', 'posted', 'cancelled']),
    reference: Yup.string().nullable().max(120),
    notes: Yup.string().nullable(),
    items: Yup.array()
      .of(Yup.object().shape({
        to_account_id: Yup.string().nullable().required('Destination account is required'),
        description: Yup.string().nullable().max(200),
        amount: Yup.number().typeError('Amount required').min(0.01, 'Amount must be > 0').required('Amount required'),
      }))
      .min(1, 'At least one line is required'),
  });

  const crudInitialValues = {
    transfer_no: '',
    transfer_date: dayjs().format('YYYY-MM-DD'),
    from_account_id: null,
    currency_id: null,
    reference: '',
    status: 'draft',
    notes: '',
    items: [{ ...emptyLine }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const items = (values.items || [])
      .filter((row) => row.to_account_id)
      .map((row) => ({
        id: row.id,
        to_account_id: row.to_account_id,
        description: row.description?.trim() || null,
        amount: toNumber(row.amount),
        exchange_rate_to_default: 1,
      }));

    const totalAmount = items.reduce((sum, r) => sum + r.amount, 0);

    return {
      transfer_no: values.transfer_no?.trim() || null,
      transfer_date: formatDate(values.transfer_date),
      from_account_id: values.from_account_id || null,
      currency_id: values.currency_id || null,
      reference: values.reference?.trim() || null,
      status: values.status || 'draft',
      notes: values.notes?.trim() || null,
      total_amount: totalAmount,
      total: totalAmount,
      exchange_rate: 1,
      items,
      deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids : [],
    };
  };

  const renderSaveButton = ({ submitForm, isValid, isSubmitting }) => (
    <Button
      type="primary"
      loading={isSubmitting}
      disabled={!isValid || isSubmitting}
      onClick={submitForm}
      style={{ minWidth: 165, height: 52, borderRadius: 2, background: '#18b957', borderColor: '#18b957', fontWeight: 650, fontSize: 16 }}
    >
      Save Transfer
    </Button>
  );

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
    >
      <Head title="Cash Transfers" />
      <ReusableCrud
        icon={<SwapOutlined />}
        title="Cash Transfers"
        apiUrl={api('/api/cash-transfers/')}
        columns={columns}
        fields={fields}
        ui_type="add fom"
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        renderSubmitButton={renderSaveButton}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
            router.visit(route('accounting.cash-transfers.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
        form_ui="drawer"
        drawerWidth="calc(100vw - 32px)"
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
          { key: 'approved',    label: 'Approved',    title: 'Cash Transfers', params: { approved: true } },
          { key: 'draft',     label: 'Draft',     title: 'Cash Transfers', params: { approved: false  } },
        ]}
        defaultAnchorKey="approved"
        anchorSyncWithHash
        bulkactions={[
          { label: 'Approve selected', actions: { approved: true, status: 'posted' } },
          { label: 'Mark selected as not approved', actions: { approved: false, status: 'draft' } },
          { label: 'Make active', actions: { active: true } },
          { label: 'Make inactive', actions: { active: false } },
        ]}
      />
    </AuthenticatedLayout>
  );
}
