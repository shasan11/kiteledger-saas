import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { OrderedListOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function DocumentNumberings(props) {
  const columns = [
    { title: 'Document Type', dataIndex: 'document_type', key: 'document_type', sorter: true },
    { title: 'Prefix', dataIndex: 'prefix', key: 'prefix', sorter: true },
    { title: 'Next Number', dataIndex: 'next_number', key: 'next_number', sorter: true },
    { title: 'Account Type', dataIndex: 'type_of_account', key: 'type_of_account', sorter: true },
    {
      title: 'Reset Every FY',
      dataIndex: 'reset_every_fiscal_year',
      key: 'reset_every_fiscal_year',
      render: (val) => (
        <Tag color={val ? 'blue' : 'default'}>{val ? 'Yes' : 'No'}</Tag>
      ),
    },
  ];

  const fields = [
    { name: 'prefix', label: 'Prefix', type: 'text' },
    { name: 'next_number', label: 'Next Number', type: 'number' },
    {
      name: 'document_type',
      label: 'Document Type',
      type: 'select',
      options: [
        { label: 'Invoice', value: 'invoice' },
        { label: 'Bill', value: 'bill' },
        { label: 'Receipt', value: 'receipt' },
        { label: 'Journal', value: 'journal' },
        { label: 'Credit Note', value: 'credit_note' },
        { label: 'Debit Note', value: 'debit_note' },
        { label: 'Payment', value: 'payment' },
        { label: 'Purchase Order', value: 'purchase_order' },
        { label: 'Sales Order', value: 'sales_order' },
        { label: 'Quotation', value: 'quotation' },
        { label: 'Expense', value: 'expense' },
      ],
    },
    {
      name: 'type_of_account',
      label: 'Account Type',
      type: 'select',
      options: [
        { label: 'Receivable', value: 'receivable' },
        { label: 'Payable', value: 'payable' },
        { label: 'Both', value: 'both' },
      ],
    },
    { name: 'reset_every_fiscal_year', label: 'Reset Every Fiscal Year', type: 'switch' },
    { name: 'add_fiscal_year_in_code', label: 'Add Fiscal Year in Code', type: 'switch' },
    { name: 'enable_fiscal_year_next_number', label: 'Enable Fiscal Year Next Number', type: 'switch' },
  ];

  const validationSchema = Yup.object().shape({
    prefix: Yup.string().nullable(),
    next_number: Yup.number().nullable(),
    document_type: Yup.string().nullable(),
    type_of_account: Yup.string().nullable(),
    reset_every_fiscal_year: Yup.boolean().nullable(),
    add_fiscal_year_in_code: Yup.boolean().nullable(),
    enable_fiscal_year_next_number: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    prefix: '',
    next_number: 1,
    document_type: '',
    type_of_account: '',
    reset_every_fiscal_year: false,
    add_fiscal_year_in_code: false,
    enable_fiscal_year_next_number: false,
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.reset_every_fiscal_year = Boolean(payload.reset_every_fiscal_year);
    payload.add_fiscal_year_in_code = Boolean(payload.add_fiscal_year_in_code);
    payload.enable_fiscal_year_next_number = Boolean(payload.enable_fiscal_year_next_number);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Document Numberings" />
      <ReusableCrud
        icon={<OrderedListOutlined />}
        title="Document Numberings"
        apiUrl={api('/api/master/document-numberings/')}
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
