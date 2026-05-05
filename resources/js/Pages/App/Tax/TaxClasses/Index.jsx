import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Typography } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

export default function TaxClasses({ auth }) {
  const columns = useMemo(() => [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Country Code', dataIndex: 'country_code', key: 'country_code' },
    { title: 'Tax Type', dataIndex: 'tax_type', key: 'tax_type' },
    { title: 'Tax Behavior', dataIndex: 'tax_behavior', key: 'tax_behavior' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Name', type: 'text', col: 12, required: true },
    { name: 'code', label: 'Code', type: 'text', col: 6, required: true },
    { name: 'tax_jurisdiction_id', label: 'Tax Jurisdiction', type: 'fkSelect', col: 12, fkUrl: api('/api/tax/tax-jurisdictions/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    {
      name: 'country_code', label: 'Country Code', type: 'select', col: 8,
      options: [
        { value: 'NP', label: 'NP - Nepal' },
        { value: 'IN', label: 'IN - India' },
        { value: 'US', label: 'US - United States' },
      ],
    },
    {
      name: 'tax_type', label: 'Tax Type', type: 'select', col: 8,
      options: [
        { value: 'vat', label: 'VAT' },
        { value: 'gst', label: 'GST' },
        { value: 'igst', label: 'IGST' },
        { value: 'cgst', label: 'CGST' },
        { value: 'sgst', label: 'SGST' },
        { value: 'sales_tax', label: 'Sales Tax' },
        { value: 'service_tax', label: 'Service Tax' },
      ],
    },
    {
      name: 'tax_behavior', label: 'Tax Behavior', type: 'select', col: 8,
      options: [
        { value: 'inclusive', label: 'Inclusive' },
        { value: 'exclusive', label: 'Exclusive' },
      ],
    },
    { name: 'description', label: 'Description', type: 'textarea', col: 24 },
  ], []);

  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    code: Yup.string().required('Code is required'),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    tax_jurisdiction_id: null,
    country_code: null,
    tax_type: null,
    tax_behavior: null,
    description: '',
  };

  const transformPayload = (values) => ({ ...values });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Tax Classes" />
      <ReusableCrud
        title="Tax Classes"
        icon={<AuditOutlined />}
        apiUrl={api('/api/tax/tax-class/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
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
