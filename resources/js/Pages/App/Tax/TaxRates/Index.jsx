import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { PercentageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const emptyComponent = { component_name: '', component_type: null, rate_percent: 0, account_id: null, sort_order: 0 };

export default function TaxRates({ auth }) {
  const columns = useMemo(() => [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Country Code', dataIndex: 'country_code', key: 'country_code' },
    { title: 'Tax Type', dataIndex: 'tax_type', key: 'tax_type' },
    {
      title: 'Rate %', dataIndex: 'rate_percent', key: 'rate_percent',
      render: (v) => v != null ? `${v}%` : '-',
    },
    {
      title: 'Inclusive', dataIndex: 'inclusive', key: 'inclusive',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag>,
    },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Name', type: 'text', col: 12, required: true },
    { name: 'code', label: 'Code', type: 'text', col: 6 },
    { name: 'tax_class_id', label: 'Tax Class', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/tax-classes/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'tax_jurisdiction_id', label: 'Tax Jurisdiction', type: 'fkSelect', col: 12, fkUrl: api('/api/tax-jurisdictions/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
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
    { name: 'rate_percent', label: 'Rate %', type: 'number', col: 6, required: true, min: 0 },
    { name: 'inclusive', label: 'Inclusive', type: 'switch', col: 6 },
    {
      name: 'calculation_method', label: 'Calculation Method', type: 'select', col: 8,
      options: [
        { value: 'single', label: 'Single' },
        { value: 'split', label: 'Split' },
        { value: 'compound', label: 'Compound' },
      ],
    },
    {
      name: 'applies_on', label: 'Applies On', type: 'select', col: 8,
      options: [
        { value: 'sale', label: 'Sale' },
        { value: 'purchase', label: 'Purchase' },
        { value: 'both', label: 'Both' },
        { value: 'expense', label: 'Expense' },
      ],
    },
    { name: 'effective_from', label: 'Effective From', type: 'datePicker', col: 8 },
    { name: 'effective_to', label: 'Effective To', type: 'datePicker', col: 8 },
    { name: 'report_code', label: 'Report Code', type: 'text', col: 8 },
    {
      name: 'components', label: 'Tax Components', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Component',
      defaultItem: { ...emptyComponent },
      columns: [
        { key: 'component_name', name: 'component_name', label: 'Component Name', type: 'text', width: '2fr', required: true },
        {
          key: 'component_type', name: 'component_type', label: 'Type', type: 'select', width: '160px',
          options: [
            { value: 'vat', label: 'VAT' },
            { value: 'cgst', label: 'CGST' },
            { value: 'sgst', label: 'SGST' },
            { value: 'igst', label: 'IGST' },
            { value: 'state_tax', label: 'State Tax' },
            { value: 'county_tax', label: 'County Tax' },
            { value: 'city_tax', label: 'City Tax' },
            { value: 'special_tax', label: 'Special Tax' },
            { value: 'tds', label: 'TDS' },
            { value: 'tcs', label: 'TCS' },
            { value: 'withholding', label: 'Withholding' },
          ],
        },
        { key: 'rate_percent', name: 'rate_percent', label: 'Rate %', type: 'number', width: '100px', min: 0 },
        { key: 'account_id', name: 'account_id', label: 'Account', type: 'fkSelect', width: '2fr', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'sort_order', name: 'sort_order', label: 'Sort', type: 'number', width: '90px', min: 0 },
      ],
    },
  ], []);

  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    tax_class_id: Yup.mixed().required('Tax class is required'),
    rate_percent: Yup.number().required('Rate % is required').min(0),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    tax_class_id: null,
    tax_jurisdiction_id: null,
    country_code: null,
    tax_type: null,
    rate_percent: 0,
    inclusive: false,
    calculation_method: 'single',
    applies_on: 'both',
    effective_from: null,
    effective_to: null,
    report_code: '',
    components: [],
    deleted_component_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    rate_percent: toNumber(values.rate_percent),
    effective_from: formatDate(values.effective_from),
    effective_to: formatDate(values.effective_to),
    components: (values.components || []).map((c) => ({
      ...c,
      rate_percent: toNumber(c.rate_percent),
      sort_order: toNumber(c.sort_order),
    })),
    deleted_component_ids: values.deleted_component_ids || [],
  });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Tax Rates" />
      <ReusableCrud
        title="Tax Rates"
        icon={<PercentageOutlined />}
        apiUrl={api('/api/tax-rates/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1100}
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
