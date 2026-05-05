import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { TagsOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function ProductTaxCategories({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Tax Class', dataIndex: ['taxClass', 'name'], key: 'tax_class', render: (v) => v || '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Category Name', type: 'text', col: 12, required: true },
    { name: 'tax_class_id', label: 'Tax Class', type: 'fkSelect', col: 12, fkUrl: api('/api/tax/tax-classes/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', tax_class_id: null, description: '' };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Product Tax Categories" />
      <ReusableCrud
        title="Product Tax Categories"
        icon={<TagsOutlined />}
        apiUrl={api('/api/tax/product-tax-categories/')}
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
