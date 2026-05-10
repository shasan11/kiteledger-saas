import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography, Button } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMoneyFormatter } from '@/Pages/App/Accounting/Shared/currency';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};

const statusColor = (s) => {
  if (s === 'posted') return 'green';
  if (s === 'cancelled') return 'red';
  return 'default';
};

const emptyLine = { chart_of_account_id: null, description: '', debit: 0, credit: 0 };

export default function JournalVouchers(props) {
  const { formatMoney } = useMoneyFormatter();
  const columns = useMemo(() => [
    {
      title: 'Voucher No',
      dataIndex: 'voucher_no',
      key: 'voucher_no',
      sorter: true,
      width: 130,
      render: (val) => <Text strong>{val || 'DRAFT'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val) => val ? <Tag color={statusColor(val)}>{val}</Tag> : '-',
    },
    {
      title: 'Voucher Date',
      dataIndex: 'voucher_date',
      key: 'voucher_date',
      sorter: true,
      width: 120,
      render: (val) => { if (!val) return '-'; const d = dayjs(val); return d.isValid() ? d.format('DD-MM-YYYY') : val; },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      sorter: true,
      width: 140,
      render: (val, record) => <Text strong>{formatMoney(record?.total_debit ?? val)}</Text>,
    },
    {
      title: 'Approval',
      dataIndex: 'approved',
      key: 'approved',
      width: 130,
      render: (value) => <Tag color={value ? 'green' : 'orange'}>{value ? 'Approved' : 'Not Approved'}</Tag>,
    },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 140, render: (val) => val || '-' },
    { title: 'Narration', dataIndex: 'narration', key: 'narration', ellipsis: true, render: (val) => val || '-' },
  ], [formatMoney]);

  const fields = useMemo(() => [
    { name: 'voucher_no', label: 'Voucher No', type: 'text', col: 8, placeholder: 'Auto-generated if blank' },
    {
      name: 'currency_id',
      label: 'Currency',
      type: 'fkSelect',
      col: 8,
      placeholder: 'Select currency',
      fkUrl: api('/api/currencies/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      col: 8,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'posted', label: 'Posted' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'voucher_date', label: 'Voucher Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY', placeholder: 'Select date' },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 8, placeholder: '1.00' },
    { name: 'narration', label: 'Narration', type: 'textarea', col: 24, rows: 2, placeholder: 'Narration' },
    {
      name: 'items',
      label: 'Journal Lines',
      type: 'objectArray',
      col: 24,
      headerBg: '#424b59',
      headerColor: '#ffffff',
      addButtonLabel: 'Add Line',
      defaultItem: { ...emptyLine },
      columns: [
        {
          key: 'chart_of_account_id',
          name: 'chart_of_account_id',
          label: 'Chart of Account',
          type: 'fkSelect',
          width: '3fr',
          required: true,
          placeholder: 'Select account',
          fkUrl: api('/api/chart-of-accounts/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
        },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr', placeholder: 'Description' },
        { key: 'debit', name: 'debit', label: 'Debit', type: 'number', width: '160px', min: 0, placeholder: '0.00' },
        { key: 'credit', name: 'credit', label: 'Credit', type: 'number', width: '160px', min: 0, placeholder: '0.00' },
      ],
    },
    {
      name: '_balance_status',
      label: '',
      type: 'custom',
      col: 24,
      render: ({ values }) => {
        const items = values?.items || [];
        const totalDebit = items.reduce((sum, row) => sum + toNumber(row?.debit), 0);
        const totalCredit = items.reduce((sum, row) => sum + toNumber(row?.credit), 0);
        const difference = Number(Math.abs(totalDebit - totalCredit).toFixed(2));
        const balanced = totalDebit > 0 && totalCredit > 0 && difference === 0;
        const color = balanced ? '#0f8a3b' : '#c62828';
        const bg = balanced ? '#f0fff4' : '#fff5f5';
        const border = balanced ? '#9be7b2' : '#ffc9c9';

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              border: `1px solid ${border}`,
              background: bg,
              color,
              padding: '14px 16px',
              borderRadius: 4,
              fontWeight: 650,
            }}
          >
            <span>{balanced ? 'Balanced' : 'Not balanced'}</span>
            <span>Debit: {formatMoney(totalDebit)}</span>
            <span>Credit: {formatMoney(totalCredit)}</span>
            <span>Difference: {formatMoney(difference)}</span>
          </div>
        );
      },
    },
  ], [formatMoney]);

  const validationSchema = Yup.object().shape({
    voucher_no: Yup.string().nullable(),
    currency_id: Yup.string().nullable(),
    reference: Yup.string().nullable().max(120),
    status: Yup.string().nullable().oneOf(['draft', 'posted', 'cancelled']),
    voucher_date: Yup.string().required('Voucher date is required'),
    exchange_rate: Yup.number().nullable(),
    narration: Yup.string().nullable(),
    items: Yup.array()
      .of(Yup.object().shape({
        chart_of_account_id: Yup.string().nullable().required('Account is required'),
        description: Yup.string().nullable(),
        debit: Yup.number().nullable().min(0),
        credit: Yup.number().nullable().min(0),
      }))
      .min(2, 'At least two lines are required')
      .test('balanced', 'Journal voucher is not balanced. Debit and credit totals must be equal.', (items = []) => {
        const totalDebit = items.reduce((sum, row) => sum + toNumber(row?.debit), 0);
        const totalCredit = items.reduce((sum, row) => sum + toNumber(row?.credit), 0);

        return totalDebit > 0 && totalCredit > 0 && Number(Math.abs(totalDebit - totalCredit).toFixed(2)) === 0;
      }),
  });

  const crudInitialValues = {
    voucher_no: '',
    currency_id: null,
    reference: '',
    status: 'draft',
    voucher_date: dayjs().format('YYYY-MM-DD'),
    exchange_rate: 1,
    narration: '',
    items: [{ ...emptyLine }, { ...emptyLine }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const items = (values.items || [])
      .filter((row) => row.chart_of_account_id)
      .map((row) => ({
        id: row.id,
        chart_of_account_id: row.chart_of_account_id,
        description: row.description?.trim() || null,
        debit: toNumber(row.debit),
        credit: toNumber(row.credit),
      }));

    const totalDebit = items.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = items.reduce((sum, r) => sum + r.credit, 0);

    return {
      voucher_no: values.voucher_no?.trim() || null,
      currency_id: values.currency_id || null,
      reference: values.reference?.trim() || null,
      status: values.status || 'draft',
      voucher_date: formatDate(values.voucher_date),
      exchange_rate: toNumber(values.exchange_rate) || 1,
      narration: values.narration?.trim() || null,
      total: totalDebit,
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
      Save Voucher
    </Button>
  );

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Journal Vouchers" />
      <ReusableCrud
        icon={<FileTextOutlined />}
        title="Journal Vouchers"
        apiUrl={api('/api/journal-vouchers/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        renderSubmitButton={renderSaveButton}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
            router.visit(route('accounting.journal-vouchers.show', record.id));
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
          { key: 'approved', label: 'Approved', title: 'Journal Vouchers', params: { approved: true } },
          { key: 'draft',    label: 'Draft',    title: 'Draft Vouchers',   params: { approved: false } },
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
