import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const withPhonePrefix = (value) => {
  const phone = String(value || '').trim();
  if (!phone) return null;
  return phone.startsWith('+') ? phone : `+977 ${phone}`;
};

export default function Branches(props) {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    fetch('/localization/languages', { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : { languages: [] }))
      .then((data) => setLanguages(data.languages || []))
      .catch(() => setLanguages([]));
  }, []);

  const languageOptions = languages.map((lang) => ({
    value: lang.id,
    label: lang.native || lang.native_name || lang.name || lang.code,
  }));

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', sorter: true },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', sorter: true },
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: true },
    { title: 'Address', dataIndex: 'address', key: 'address', sorter: true },
    {
      title: 'Head Office',
      dataIndex: 'is_head_office',
      key: 'is_head_office',
      render: (val) => (
        <Tag color={val ? 'blue' : 'default'}>{val ? 'Yes' : 'No'}</Tag>
      ),
    },
  ];

  const fields = [
    { type: 'group', label: 'Basic Info', col: 24, children: [
      { name: 'name', label: 'Branch Name', type: 'text', required: true, col: 12 },
      { name: 'code', label: 'Branch Code', type: 'text', required: true, col: 12 },
      { name: 'is_head_office', label: 'Head Office', type: 'switch', col: 12 },
      { name: 'active', label: 'Active', type: 'switch', col: 12 },
    ] },
    { type: 'group', label: 'Address & Contact', col: 24, children: [
      { name: 'phone', label: 'Phone', type: 'text', col: 12, placeholder: '+977 9800000000' },
      { name: 'email', label: 'Email', type: 'text', col: 12 },
      { name: 'address', label: 'Address', type: 'textarea', col: 24 },
    ] },
    { type: 'group', label: 'Branch Capabilities', col: 24, children: [
      { name: 'is_transaction_enabled', label: 'Transaction Enabled', type: 'switch', col: 8 },
      { name: 'is_pos_enabled', label: 'POS Enabled', type: 'switch', col: 8 },
      { name: 'is_warehouse_enabled', label: 'Warehouse Enabled', type: 'switch', col: 8 },
      { name: 'is_billing_location_enabled', label: 'Billing Location Enabled', type: 'switch', col: 8 },
      { name: 'abbreviated_tax_enabled', label: 'Abbreviated Tax Enabled', type: 'switch', col: 8 },
      { name: 'track_location', label: 'Track Location', type: 'switch', col: 8 },
    ] },
    { type: 'group', label: 'Branding', col: 24, children: [
      { name: 'logo', label: 'Logo', type: 'text', col: 12 },
      { name: 'favicon', label: 'Favicon', type: 'text', col: 12 },
    ] },
    { type: 'group', label: 'Language', col: 24, children: [
      { name: 'language_id', label: 'Branch Default Language', type: 'select', col: 12, options: languageOptions, placeholder: 'Use company default' },
      { name: 'enabled_languages_text', label: 'Enabled Language Codes', type: 'text', col: 12, placeholder: 'e.g. en,es,fr (blank = all)' },
    ] },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    code: Yup.string().required('Code is required'),
    phone: Yup.string().nullable(),
    email: Yup.string().email('Invalid email').nullable(),
    is_head_office: Yup.boolean().nullable(),
    is_transaction_enabled: Yup.boolean().nullable(),
    is_pos_enabled: Yup.boolean().nullable(),
    is_warehouse_enabled: Yup.boolean().nullable(),
    is_ai_enabled: Yup.boolean().nullable(),
    is_billing_location_enabled: Yup.boolean().nullable(),
    abbreviated_tax_enabled: Yup.boolean().nullable(),
    track_location: Yup.boolean().nullable(),
    active: Yup.boolean().nullable(),
    logo: Yup.string().nullable(),
    favicon: Yup.string().nullable(),
    address: Yup.string().nullable(),
    language_id: Yup.string().nullable(),
    enabled_languages_text: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    phone: '',
    email: '',
    is_head_office: false,
    active: true,
    is_transaction_enabled: false,
    is_pos_enabled: false,
    is_warehouse_enabled: false,
    is_ai_enabled: false,
    is_billing_location_enabled: false,
    abbreviated_tax_enabled: false,
    track_location: false,
    logo: '',
    favicon: '',
    address: '',
    language_id: null,
    enabled_languages_text: '',
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.code = payload.code?.trim() || null;
    payload.phone = withPhonePrefix(payload.phone);
    payload.is_head_office = Boolean(payload.is_head_office);
    payload.is_transaction_enabled = Boolean(payload.is_transaction_enabled);
    payload.is_pos_enabled = Boolean(payload.is_pos_enabled);
    payload.is_warehouse_enabled = Boolean(payload.is_warehouse_enabled);
    payload.is_ai_enabled = Boolean(payload.is_ai_enabled);
    payload.is_billing_location_enabled = Boolean(payload.is_billing_location_enabled);
    payload.abbreviated_tax_enabled = Boolean(payload.abbreviated_tax_enabled);
    payload.track_location = Boolean(payload.track_location);
    payload.enabled_languages = String(payload.enabled_languages_text || '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean);
    if (!payload.enabled_languages.length) payload.enabled_languages = null;
    delete payload.enabled_languages_text;
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <>
      <Head title="Branches" />
      <ReusableCrud
        icon={<BankOutlined />}
        title="Branches"
        apiUrl={api('/api/branches/')}
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
    </>
  );
}
