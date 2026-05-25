import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Space, Tag, Typography } from 'antd';
import { PercentageOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const asId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const nullIfEmpty = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

const formatDate = (value) => {
  if (!value) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : null;
  }

  const parsed = dayjs(value, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD');

  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

const labelize = (value) => {
  if (!value) return '-';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRelationLabel = (record, relation, fallbackKey) =>
  record?.[relation]?.label ||
  record?.[relation]?.name ||
  record?.[fallbackKey]?.label ||
  record?.[`${fallbackKey}_detail`]?.label ||
  record?.[`${relation}_name`] ||
  record?.[`${fallbackKey}_name`] ||
  '-';

const rateColor = (value) => {
  const rate = toNumber(value);
  if (rate <= 0) return 'default';
  if (rate <= 5) return 'blue';
  if (rate <= 13) return 'green';
  return 'orange';
};

const appliesOnColor = {
  sale: 'green',
  purchase: 'blue',
  both: 'purple',
  expense: 'gold',
};

const taxTypeOptions = [
  { value: 'vat',          label: 'VAT' },
  { value: 'gst',          label: 'GST' },
  { value: 'sales_tax',    label: 'Sales Tax' },
  { value: 'service_tax',  label: 'Service Tax' },
  { value: 'tds',          label: 'TDS' },
  { value: 'tcs',          label: 'TCS' },
  { value: 'withholding',  label: 'Withholding' },
  { value: 'use_tax',      label: 'Use Tax' },
  { value: 'reverse_charge', label: 'Reverse Charge' },
  { value: 'zero_rated',   label: 'Zero Rated' },
  { value: 'exempt',       label: 'Exempt' },
  { value: 'excise',       label: 'Excise' },
  { value: 'customs',      label: 'Customs' },
  { value: 'custom',       label: 'Custom' },
];

const appliesOnOptions = [
  { value: 'sale', label: 'Sale' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'both', label: 'Both' },
  { value: 'expense', label: 'Expense' },
];

const calculationMethodOptions = [
  { value: 'single', label: 'Single Rate' },
  { value: 'split', label: 'Split / Components' },
  { value: 'compound', label: 'Compound' },
];

// Country options are loaded dynamically from the API (see useEffect below).
// Fallback list used only while the API call is in flight.
const FALLBACK_COUNTRY_OPTIONS = [
  { value: 'NP', label: 'NP - Nepal' },
  { value: 'IN', label: 'IN - India' },
  { value: 'US', label: 'US - United States' },
];

const emptyComponent = {
  id: undefined,
  component_name: '',
  component_type: 'vat',
  rate_percent: 0,
  account_id: null,
  sort_order: 0,
};

// Quick-add forms are built inside the component so they get fresh countryOptions.

export default function TaxRates({ auth }) {
  const [countryOptions, setCountryOptions] = useState(FALLBACK_COUNTRY_OPTIONS);

  useEffect(() => {
    axios
      .get(api('/api/tax-country-options'))
      .then(({ data }) => {
        if (Array.isArray(data) && data.length) {
          setCountryOptions(
            data.map((c) => ({ value: c.value, label: `${c.value} - ${c.label}` }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // ── Quick-add configs (rebuilt when countryOptions changes) ──────────────
  const taxJurisdictionQuickAdd = useMemo(() => ({
    title: 'Tax Jurisdiction',
    buttonLabel: 'Add Tax Jurisdiction',
    apiUrl: api('/api/tax-jurisdictions/'),
    initialValues: {
      country_code: 'NP',
      name: '',
      code: '',
      tax_system: '',
      active: true,
    },
    validationSchema: Yup.object({
      country_code: Yup.string().required('Country is required'),
      name: Yup.string().required('Jurisdiction name is required'),
      code: Yup.string().required('Code is required'),
    }),
    fields: [
      {
        name: 'country_code',
        label: 'Country',
        type: 'select',
        col: 12,
        required: true,
        options: countryOptions,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        col: 12,
        required: true,
        placeholder: 'Nepal VAT',
      },
      {
        name: 'code',
        label: 'Code',
        type: 'text',
        col: 12,
        required: true,
        placeholder: 'NP-VAT',
      },
      {
        name: 'tax_system',
        label: 'Tax System Code',
        type: 'text',
        col: 12,
        placeholder: 'e.g. nepal_vat / france_tva',
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 8,
      },
    ],
    transformPayload: (values) => ({
      country_code: values.country_code || 'NP',
      name: nullIfEmpty(values.name),
      code: nullIfEmpty(values.code),
      tax_system: nullIfEmpty(values.tax_system) || undefined,
      active: values.active !== false,
    }),
  }), [countryOptions]);

  const taxClassQuickAdd = useMemo(() => ({
    title: 'Tax Class',
    buttonLabel: 'Add Tax Class',
    apiUrl: api('/api/tax-classes/'),
    initialValues: {
      tax_jurisdiction_id: null,
      country_code: 'NP',
      name: '',
      code: '',
      tax_type: 'vat',
      tax_behavior: 'standard',
      description: '',
      active: true,
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Tax class name is required'),
      code: Yup.string().required('Code is required'),
      tax_type: Yup.string().required('Tax type is required'),
    }),
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        col: 12,
        required: true,
        placeholder: 'VAT 13%',
      },
      {
        name: 'code',
        label: 'Code',
        type: 'text',
        col: 12,
        required: true,
        placeholder: 'VAT13',
      },
      {
        name: 'tax_jurisdiction_id',
        label: 'Jurisdiction',
        type: 'fkSelect',
        col: 12,
        fkUrl: api('/api/tax-jurisdictions/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        storeFullObject: true,
        quickAdd: taxJurisdictionQuickAdd,
        allowClear: true,
      },
      {
        name: 'tax_type',
        label: 'Tax Type',
        type: 'select',
        col: 12,
        required: true,
        options: taxTypeOptions,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        col: 24,
        rows: 2,
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 8,
      },
    ],
    transformPayload: (values) => ({
      tax_jurisdiction_id: asId(values.tax_jurisdiction_id),
      country_code:
        values.tax_jurisdiction_id?.country_code ||
        values.country_code ||
        'NP',
      name: nullIfEmpty(values.name),
      code: nullIfEmpty(values.code),
      tax_type: values.tax_type || 'vat',
      tax_behavior: values.tax_behavior || 'standard',
      description: nullIfEmpty(values.description),
      active: values.active !== false,
    }),
  }), [countryOptions, taxJurisdictionQuickAdd]);

  const columns = useMemo(
    () => [
      {
        title: 'Tax Rate',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value || '-'}</Text>
            <Text type="secondary">{record?.code || '-'}</Text>
          </Space>
        ),
      },
      {
        title: 'Rate',
        dataIndex: 'rate_percent',
        key: 'rate_percent',
        width: 110,
        align: 'right',
        sorter: true,
        render: (value) => (
          <Tag color={rateColor(value)} style={{ marginInlineEnd: 0 }}>
            {toNumber(value)}%
          </Tag>
        ),
      },
      {
        title: 'Applies On',
        dataIndex: 'applies_on',
        key: 'applies_on',
        width: 130,
        render: (value) => (
          <Tag color={appliesOnColor[value] || 'default'}>
            {labelize(value || 'both')}
          </Tag>
        ),
      },
      {
        title: 'Jurisdiction',
        key: 'tax_jurisdiction',
        render: (_, record) =>
          getRelationLabel(record, 'tax_jurisdiction', 'tax_jurisdiction_id'),
      },
      {
        title: 'Tax Class',
        key: 'tax_class',
        render: (_, record) =>
          getRelationLabel(record, 'tax_class', 'tax_class_id'),
      },
      {
        title: 'Inclusive',
        dataIndex: 'inclusive',
        key: 'inclusive',
        width: 120,
        render: (value) => (
          <Tag color={value ? 'green' : 'default'}>
            {value ? 'Inclusive' : 'Exclusive'}
          </Tag>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'active',
        key: 'active',
        width: 100,
        render: (value) => (
          <Tag color={value !== false ? 'green' : 'red'}>
            {value !== false ? 'Active' : 'Inactive'}
          </Tag>
        ),
      },
    ],
    []
  );

  const fields = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => [
      {
        type: 'group',
        label: 'Tax Rate Details',
        col: 24,
        accordion: false,
        children: [
          {
            name: 'name',
            label: 'Tax Name',
            type: 'text',
            col: 12,
            required: true,
            placeholder: 'VAT 13%',
          },
          {
            name: 'code',
            label: 'Code',
            type: 'text',
            col: 6,
            placeholder: 'VAT13',
          },
          {
            name: 'rate_percent',
            label: 'Rate %',
            type: 'number',
            col: 6,
            required: true,
            min: 0,
            max: 100,
            placeholder: '13',
          },
          {
            name: 'tax_class_id',
            label: 'Tax Class',
            type: 'fkSelect',
            col: 12,
            required: true,
            fkUrl: api('/api/tax-classes/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            storeFullObject: true,
            quickAdd: taxClassQuickAdd,
            allowClear: true,
            placeholder: 'Select tax class',
          },
          {
            name: 'tax_jurisdiction_id',
            label: 'Tax Jurisdiction',
            type: 'fkSelect',
            col: 12,
            required: true,
            fkUrl: api('/api/tax-jurisdictions/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            storeFullObject: true,
            quickAdd: taxJurisdictionQuickAdd,
            allowClear: true,
            placeholder: 'Select jurisdiction',
          },
          {
            name: 'applies_on',
            label: 'Applies On',
            type: 'select',
            col: 8,
            required: true,
            options: appliesOnOptions,
          },
          {
            name: 'calculation_method',
            label: 'Calculation',
            type: 'select',
            col: 8,
            required: true,
            options: calculationMethodOptions,
          },
          {
            name: 'inclusive',
            label: 'Inclusive Tax',
            type: 'switch',
            col: 4,
          },
          {
            name: 'active',
            label: 'Active',
            type: 'switch',
            col: 4,
          },
        ],
      },
      {
        type: 'group',
        label: '+ Add More Details',
        col: 24,
        defaultOpen: false,
        bordered: false,
        children: [
          {
            name: 'tax_type',
            label: 'Tax Type',
            type: 'select',
            col: 8,
            options: taxTypeOptions,
          },
          {
            name: 'effective_from',
            label: 'Effective From',
            type: 'datePicker',
            col: 8,
            format: 'DD-MM-YYYY',
          },
          {
            name: 'effective_to',
            label: 'Effective To',
            type: 'datePicker',
            col: 8,
            format: 'DD-MM-YYYY',
          },
          {
            name: 'report_code',
            label: 'Report Code',
            type: 'text',
            col: 8,
            placeholder: 'Optional',
          },
          {
            name: 'components',
            label: 'Tax Components',
            type: 'objectArray',
            col: 24,
            addButtonLabel: 'Add Component',
            defaultItem: { ...emptyComponent },
            headerBg: '#334155',
            headerColor: '#ffffff',
            rowStartExpanded: false,
            columns: [
              {
                key: 'component_name',
                name: 'component_name',
                label: 'Component',
                type: 'text',
                width: '220px',
                placeholder: 'CGST / SGST',
              },
              {
                key: 'component_type',
                name: 'component_type',
                label: 'Type',
                type: 'select',
                width: '140px',
                options: taxTypeOptions,
              },
              {
                key: 'rate_percent',
                name: 'rate_percent',
                label: 'Rate %',
                type: 'number',
                width: '100px',
                min: 0,
                max: 100,
              },
              {
                key: 'account_id',
                name: 'account_id',
                label: 'Account',
                type: 'fkSelect',
                width: '240px',
                fkUrl: api('/api/accounts/'),
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                allowClear: true,
              },
              {
                key: 'sort_order',
                name: 'sort_order',
                label: 'Sort',
                type: 'number',
                width: '90px',
                min: 0,
              },
            ],
          },
        ],
      },
    ],
    [taxJurisdictionQuickAdd, taxClassQuickAdd]
  );

  const validationSchema = useMemo(
    () =>
      Yup.object({
        name: Yup.string().required('Tax name is required'),
        tax_class_id: Yup.mixed()
          .test('tax-class-required', 'Tax class is required', (value) => !!asId(value))
          .required('Tax class is required'),
        tax_jurisdiction_id: Yup.mixed()
          .test(
            'tax-jurisdiction-required',
            'Tax jurisdiction is required',
            (value) => !!asId(value)
          )
          .required('Tax jurisdiction is required'),
        rate_percent: Yup.number()
          .typeError('Rate must be a number')
          .min(0, 'Rate cannot be negative')
          .max(100, 'Rate cannot exceed 100')
          .required('Rate is required'),
        applies_on: Yup.string().required('Applies on is required'),
        calculation_method: Yup.string().required('Calculation method is required'),
      }),
    []
  );

  const crudInitialValues = useMemo(
    () => ({
      name: '',
      code: '',
      tax_class_id: null,
      tax_jurisdiction_id: null,
      country_code: 'NP',
      tax_type: 'vat',
      rate_percent: 0,
      inclusive: false,
      calculation_method: 'single',
      applies_on: 'both',
      effective_from: null,
      effective_to: null,
      report_code: '',
      active: true,
      components: [],
      deleted_component_ids: [],
    }),
    []
  );

  const transformRecord = (record = {}) => ({
    ...record,
    tax_class_id:
      record.taxClass ||
      record.tax_class ||
      record.tax_class_id_detail ||
      record.tax_class_id ||
      null,
    tax_jurisdiction_id:
      record.taxJurisdiction ||
      record.tax_jurisdiction ||
      record.tax_jurisdiction_id_detail ||
      record.tax_jurisdiction_id ||
      null,
    tax_type: record.tax_type || 'vat',
    calculation_method: record.calculation_method || 'single',
    applies_on: record.applies_on || 'both',
    inclusive: !!record.inclusive,
    active: record.active !== false,
    components: Array.isArray(record.components)
      ? record.components
      : Array.isArray(record.tax_rate_components)
        ? record.tax_rate_components
        : [],
  });

  const transformPayload = (values = {}) => {
    const taxClass = values.tax_class_id;
    const jurisdiction = values.tax_jurisdiction_id;

    const components = Array.isArray(values.components)
      ? values.components
          .filter(
            (component) =>
              component?.component_name ||
              component?.component_type ||
              toNumber(component?.rate_percent) > 0
          )
          .map((component) => ({
            ...(component.id ? { id: component.id } : {}),
            component_name: nullIfEmpty(component.component_name),
            component_type: component.component_type || values.tax_type || 'vat',
            rate_percent: toNumber(component.rate_percent),
            account_id: asId(component.account_id),
            sort_order: toNumber(component.sort_order),
          }))
      : [];

    return {
      name: nullIfEmpty(values.name),
      code: nullIfEmpty(values.code),

      tax_class_id: asId(taxClass),
      tax_jurisdiction_id: asId(jurisdiction),

      country_code:
        jurisdiction?.country_code ||
        taxClass?.country_code ||
        values.country_code ||
        'NP',

      tax_type: values.tax_type || taxClass?.tax_type || 'vat',
      rate_percent: toNumber(values.rate_percent),
      inclusive: !!values.inclusive,
      calculation_method: values.calculation_method || 'single',
      applies_on: values.applies_on || 'both',

      effective_from: formatDate(values.effective_from),
      effective_to: formatDate(values.effective_to),
      report_code: nullIfEmpty(values.report_code),

      active: values.active !== false,

      components,
      deleted_component_ids: Array.isArray(values.deleted_component_ids)
        ? values.deleted_component_ids.filter(Boolean)
        : [],
    };
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Tax Rates" />

      <style>
        {`
          .tax-rate-drawer .ant-drawer-header {
            min-height: 42px;
            padding: 0 16px;
            border-bottom: 1px solid #e2e8f0;
          }

          .tax-rate-drawer .ant-drawer-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }

          .tax-rate-drawer .ant-drawer-body {
            padding: 16px;
            background: #f8fafc;
          }

          .tax-rate-drawer .ant-form {
            max-width: 980px;
            margin: 0 auto;
            padding: 16px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
          }

          .tax-rate-drawer .ant-form-item {
            margin-bottom: 14px;
          }

          .tax-rate-drawer .ant-form-item-label {
            padding-bottom: 4px;
          }

          .tax-rate-drawer .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 650;
            color: #334155;
          }

          .tax-rate-drawer .ant-input,
          .tax-rate-drawer .ant-input-number,
          .tax-rate-drawer .ant-picker,
          .tax-rate-drawer .ant-select-selector {
            min-height: 34px;
            border-radius: 6px !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }

          .tax-rate-drawer .ant-input-number {
            width: 100%;
          }

          .tax-rate-drawer textarea.ant-input {
            min-height: 76px;
          }

          .tax-rate-drawer .ant-table {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }

          .tax-rate-drawer .ant-table-thead > tr > th {
            background: #334155 !important;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
          }

          .tax-rate-drawer .ant-table-tbody > tr > td {
            padding: 8px;
            vertical-align: top;
          }
        `}
      </style>

      <ReusableCrud
        title="Tax Rates"
        addTitle="New Tax Rate"
        editTitle="Edit Tax Rate"
        icon={<PercentageOutlined />}
        apiUrl={api('/api/tax-rates/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformRecord={transformRecord}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1040}
        drawerClassName="tax-rate-drawer"
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination
        showSearch
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
      />
    </AuthenticatedLayout>
  );
}