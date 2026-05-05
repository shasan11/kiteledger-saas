import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { NodeIndexOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function TaxRules({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Tax Class', dataIndex: ['taxClass', 'name'], key: 'tax_class', render: (v) => v || '-' },
    { title: 'Tax Rate', dataIndex: ['taxRate', 'name'], key: 'tax_rate', render: (v) => v || '-' },
    { title: 'Transaction Type', dataIndex: 'transaction_type', key: 'transaction_type', render: (v) => v ? <Tag>{v}</Tag> : '-' },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', align: 'right' },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Rule Name', type: 'text', col: 12, required: true },
    { name: 'tax_class_id', label: 'Tax Class', type: 'fkSelect', col: 8, fkUrl: api('/api/tax/tax-classes/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'tax_rate_id', label: 'Tax Rate', type: 'fkSelect', col: 8, fkUrl: api('/api/tax/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'transaction_type', label: 'Transaction Type', type: 'select', col: 8, options: [
      { value: 'sales', label: 'Sales' },
      { value: 'purchase', label: 'Purchase' },
      { value: 'both', label: 'Both' },
    ]},
    { name: 'priority', label: 'Priority', type: 'number', col: 6, min: 0 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', tax_class_id: null, tax_rate_id: null, transaction_type: 'both', priority: 0, description: '' };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Tax Rules" />
      <ReusableCrud
        title="Tax Rules"
        icon={<NodeIndexOutlined />}
        apiUrl={api('/api/tax/tax-rules/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        form_ui="drawer"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true}
        hasActions={true} hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
