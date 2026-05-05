import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { ExceptionOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

export default function TaxExemptions({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Exemption Code', dataIndex: 'exemption_code', key: 'exemption_code' },
    { title: 'Tax Class', dataIndex: ['taxClass', 'name'], key: 'tax_class', render: (v) => v || '-' },
    { title: 'Effective From', dataIndex: 'effective_from', key: 'effective_from', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Effective To', dataIndex: 'effective_to', key: 'effective_to', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Exemption Name', type: 'text', col: 12, required: true },
    { name: 'exemption_code', label: 'Exemption Code', type: 'text', col: 8 },
    { name: 'tax_class_id', label: 'Tax Class', type: 'fkSelect', col: 8, fkUrl: api('/api/tax/tax-classes/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'effective_from', label: 'Effective From', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'effective_to', label: 'Effective To', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', exemption_code: '', tax_class_id: null, effective_from: null, effective_to: null, description: '' };

  const transformPayload = (values) => ({ ...values, effective_from: formatDate(values.effective_from), effective_to: formatDate(values.effective_to) });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Tax Exemptions" />
      <ReusableCrud
        title="Tax Exemptions"
        icon={<ExceptionOutlined />}
        apiUrl={api('/api/tax/tax-exemptions/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true}
        hasActions={true} hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
