import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { AccountBookOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Accounts(props) {
  const columns = useMemo(() => [
    { title: 'Code', dataIndex: 'code', key: 'code', sorter: true, width: 120 },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      sorter: true,
      width: 150,
      render: (val) => <Text strong>{money(val)}</Text>,
    },
    {
      title: 'Nature',
      dataIndex: 'nature',
      key: 'nature',
      width: 100,
      render: (val) => val ? <Tag>{val}</Tag> : '-',
    },
    { title: 'Swift Code', dataIndex: 'swift_code', key: 'swift_code', width: 120, render: (val) => val || '-' },
    {
      title: 'Dr Amount',
      dataIndex: 'dr_amount',
      key: 'dr_amount',
      width: 150,
      render: (val) => <Text>{money(val)}</Text>,
    },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Name', type: 'text', required: true, col: 12, placeholder: 'Account name' },
    { name: 'code', label: 'Code', type: 'text', col: 12, placeholder: 'Account code' },
    {
      name: 'parent_id',
      label: 'Parent Account',
      type: 'fkSelect',
      col: 12,
      placeholder: 'Select parent account',
      fkUrl: api('/api/accounting/accounts/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    {
      name: 'currency_id',
      label: 'Currency',
      type: 'fkSelect',
      col: 12,
      placeholder: 'Select currency',
      fkUrl: api('/api/master/currencies/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    { name: 'swift_code', label: 'Swift Code', type: 'text', col: 12, placeholder: 'Swift code' },
    { name: 'dr_amount', label: 'Dr Amount', type: 'number', col: 8, placeholder: '0.00' },
    { name: 'cr_amount', label: 'Cr Amount', type: 'number', col: 8, placeholder: '0.00' },
    { name: 'balance', label: 'Balance', type: 'number', col: 8, placeholder: '0.00' },
    {
      name: 'nature',
      label: 'Nature',
      type: 'select',
      col: 12,
      options: [
        { value: 'debit', label: 'Debit' },
        { value: 'credit', label: 'Credit' },
        { value: 'both', label: 'Both' },
      ],
    },
  ], []);

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    code: Yup.string().nullable(),
    parent_id: Yup.string().nullable(),
    currency_id: Yup.string().nullable(),
    swift_code: Yup.string().nullable(),
    dr_amount: Yup.number().nullable(),
    cr_amount: Yup.number().nullable(),
    balance: Yup.number().nullable(),
    nature: Yup.string().nullable().oneOf(['debit', 'credit', 'both']),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    parent_id: null,
    currency_id: null,
    swift_code: '',
    dr_amount: 0,
    cr_amount: 0,
    balance: 0,
    nature: null,
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.code = payload.code?.trim() || null;
    payload.swift_code = payload.swift_code?.trim() || null;
    payload.dr_amount = toNumber(payload.dr_amount);
    payload.cr_amount = toNumber(payload.cr_amount);
    payload.balance = toNumber(payload.balance);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Accounts" />
      <ReusableCrud
        icon={<AccountBookOutlined />}
        title="Accounts"
        apiUrl={api('/api/accounting/accounts/')}
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
