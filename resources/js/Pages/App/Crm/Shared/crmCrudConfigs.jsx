import * as Yup from 'yup';
import dayjs from 'dayjs';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
export const api = (path) => `${BACKEND_BASE}${path}`;

const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};

const formatDateTime = (value) => {
  if (!value) return null;
  const strictDateTime = dayjs(value, 'YYYY-MM-DD HH:mm:ss', true);
  if (strictDateTime.isValid()) return strictDateTime.format('YYYY-MM-DD HH:mm:ss');
  const strictDate = dayjs(value, 'DD-MM-YYYY', true);
  if (strictDate.isValid()) return strictDate.format('YYYY-MM-DD 00:00:00');
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format('YYYY-MM-DD HH:mm:ss') : value;
};

const stripEmpty = (p, exclude = []) => {
  Object.keys(p).forEach((k) => {
    if (p[k] === '' && !exclude.includes(k)) p[k] = null;
  });
  return p;
};

const leadStatusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const dealStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];

const activityStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const activityTypeOptions = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'follow_up', label: 'Follow Up' },
];

export const LEAD_STATUS_OPTIONS = leadStatusOptions;
export const PRIORITY_OPTIONS = priorityOptions;
export const DEAL_STATUS_OPTIONS = dealStatusOptions;
export const ACTIVITY_STATUS_OPTIONS = activityStatusOptions;
export const ACTIVITY_TYPE_OPTIONS = activityTypeOptions;

const quickPipelineConfig = {
  title: 'Deal Pipeline',
  apiUrl: api('/api/deal-pipelines/'),
  fields: [
    { name: 'name', label: 'Pipeline Name', type: 'text', required: true, col: 24, placeholder: 'e.g. Sales Pipeline' },
    { name: 'is_default', label: 'Default Pipeline', type: 'switch', col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
  ],
  initialValues: { name: '', is_default: false, active: true, description: '' },
  validationSchema: Yup.object({
    name: Yup.string().required('Pipeline name is required').max(120),
    is_default: Yup.boolean().nullable(),
    active: Yup.boolean().nullable(),
    description: Yup.string().nullable(),
  }),
  transformPayload: (values = {}) => ({
    name: values.name?.trim() || null,
    is_default: Boolean(values.is_default),
    active: values.active !== false,
    description: values.description?.trim() || null,
  }),
};

const quickContactGroupConfig = {
  title: 'Contact Group',
  apiUrl: api('/api/contact-groups/'),
  fields: [
    { name: 'name', label: 'Group Name', type: 'text', required: true, col: 24, placeholder: 'Group name' },
    {
      name: 'parent_id', label: 'Parent Group', type: 'fkSelect', col: 24, placeholder: 'Parent group',
      fkUrl: api('/api/contact-groups/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
    },
    { name: 'active', label: 'Active', type: 'switch', col: 24 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
  ],
  initialValues: { name: '', parent_id: null, active: true, description: '' },
  validationSchema: Yup.object({
    name: Yup.string().required('Group name is required').max(120),
    parent_id: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
    description: Yup.string().nullable(),
  }),
  transformPayload: (values = {}) => ({
    name: values.name?.trim() || null,
    parent_id: values.parent_id || null,
    active: values.active !== false,
    description: values.description?.trim() || null,
  }),
};

const quickContactConfig = {
  title: 'Contact',
  apiUrl: api('/api/contacts/'),
  fields: [
    { name: 'contact_type', label: 'Contact Type', type: 'select', required: true, col: 12, options: [{ value: 'customer', label: 'Customer' }, { value: 'supplier', label: 'Supplier' }, { value: 'lead', label: 'Lead' }] },
    { name: 'name', label: 'Contact Name', type: 'text', required: true, col: 12, placeholder: 'Contact name' },
    { name: 'code', label: 'Code', type: 'text', col: 12, placeholder: 'Auto-generate if blank' },
    { name: 'phone', label: 'Phone', type: 'phone', col: 12, placeholder: '9800000000', defaultCountryCode: '+977' },
    { name: 'email', label: 'Email', type: 'text', col: 12, placeholder: 'email@example.com' },
    {
      name: 'contact_group_id', label: 'Contact Group', type: 'fkSelect', col: 12, placeholder: 'Select group',
      fkUrl: api('/api/contact-groups/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
      quickAdd: quickContactGroupConfig,
    },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ],
  initialValues: { contact_type: 'lead', name: '', code: '', phone: '', email: '', contact_group_id: null, active: true },
  validationSchema: Yup.object({
    contact_type: Yup.string().required('Contact type is required'),
    name: Yup.string().required('Contact name is required').max(180),
    code: Yup.string().nullable().max(60),
    email: Yup.string().nullable().email('Invalid email').max(120),
    phone: Yup.string().nullable().max(40),
    contact_group_id: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  }),
  transformPayload: (values = {}) => ({
    contact_type: values.contact_type || 'lead',
    name: values.name?.trim() || null,
    code: values.code?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    contact_group_id: values.contact_group_id || null,
    active: values.active !== false,
  }),
};

const quickLeadConfig = {
  title: 'Lead',
  apiUrl: api('/api/leads/'),
  fields: [
    { name: 'name', label: 'Lead Name', type: 'text', required: true, col: 12, placeholder: 'Enter lead name' },
    { name: 'company_name', label: 'Company Name', type: 'text', col: 12, placeholder: 'Company name' },
    { name: 'email', label: 'Email', type: 'text', col: 12, placeholder: 'email@example.com' },
    { name: 'phone', label: 'Phone', type: 'phone', col: 12, placeholder: '+977 9800000000', defaultCountryCode: '+977' },
    { name: 'status', label: 'Status', type: 'select', col: 12, options: leadStatusOptions },
    { name: 'priority', label: 'Priority', type: 'select', col: 12, options: priorityOptions },
  ],
  initialValues: { name: '', company_name: '', email: '', phone: '', status: 'new', priority: 'medium' },
  validationSchema: Yup.object({
    name: Yup.string().required('Name is required').max(180),
    company_name: Yup.string().nullable().max(180),
    email: Yup.string().nullable().email('Invalid email').max(120),
    phone: Yup.string().nullable().max(40),
    status: Yup.string().nullable(),
    priority: Yup.string().nullable(),
  }),
  transformPayload: (values = {}) => ({
    name: values.name?.trim() || null,
    company_name: values.company_name?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    status: values.status || 'new',
    priority: values.priority || 'medium',
  }),
};

const quickUserConfig = {
  title: 'User',
  apiUrl: api('/api/hrm/users'),
  fields: [
    { name: 'first_name', label: 'First Name', type: 'text', required: true, col: 12 },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true, col: 12 },
    { name: 'email', label: 'Email', type: 'text', required: true, col: 12 },
    { name: 'username', label: 'Username', type: 'text', required: true, col: 12 },
    { name: 'password', label: 'Password', type: 'password', required: true, col: 12 },
    { name: 'phone', label: 'Phone', type: 'phone', col: 12, placeholder: '+977 9800000000', defaultCountryCode: '+977' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ],
  initialValues: { first_name: '', last_name: '', email: '', username: '', password: '', phone: '', active: true },
  validationSchema: Yup.object({
    first_name: Yup.string().required('First name is required').max(80),
    last_name: Yup.string().required('Last name is required').max(80),
    email: Yup.string().required('Email is required').email().max(120),
    username: Yup.string().required('Username is required').max(80),
    password: Yup.string().required('Password is required').min(6).max(255),
    phone: Yup.string().nullable().max(40),
    active: Yup.boolean().nullable(),
  }),
  transformPayload: (values = {}) => ({
    first_name: values.first_name?.trim() || null,
    last_name: values.last_name?.trim() || null,
    email: values.email?.trim() || null,
    username: values.username?.trim() || null,
    password: values.password || null,
    phone: values.phone?.trim() || null,
    active: values.active !== false,
  }),
};

export function buildContactGroupCrud({ locked = {} } = {}) {
  const fields = [
    { name: 'name', label: 'Group Name', type: 'text', required: true, col: 12, placeholder: 'e.g. Enterprise Buyers' },
    {
      name: 'parent_id', label: 'Parent Group', type: 'fkSelect', col: 12, placeholder: 'Select parent group',
      fkUrl: api('/api/contact-groups/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
    },
    { name: 'active', label: 'Active', type: 'switch', col: 6 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3, placeholder: 'Optional description' },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Group name is required').max(120),
    parent_id: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
    description: Yup.string().nullable(),
  });

  const crudInitialValues = { name: '', parent_id: null, active: true, description: '', ...locked };

  const transformPayload = (values) => {
    const p = { ...values, ...locked };
    p.name = p.name?.trim() || null;
    p.parent_id = p.parent_id || null;
    p.description = p.description?.trim() || null;
    p.active = p.active !== false;
    return stripEmpty(p);
  };

  return { apiUrl: api('/api/contact-groups/'), fields, validationSchema, crudInitialValues, transformPayload };
}

export function buildLeadCrud({ locked = {} } = {}) {
  const fields = [
    {
      type: 'group',
      label: 'Basic Information',
      col: 24,
      children: [
        { name: 'name', label: 'Lead Name', type: 'text', required: true, col: 12, placeholder: 'Enter lead name' },
        { name: 'company_name', label: 'Company Name', type: 'text', col: 12, placeholder: 'Company name' },
        { name: 'email', label: 'Email', type: 'text', col: 8, placeholder: 'email@example.com' },
        { name: 'phone', label: 'Phone', type: 'phone', col: 8, placeholder: '+977 9800000000', defaultCountryCode: '+977' },
        { name: 'website', label: 'Website', type: 'text', col: 8, placeholder: 'https://example.com' },
      ],
    },
    {
      type: 'group',
      label: 'Lead Classification',
      col: 24,
      children: [
        { name: 'lead_source', label: 'Source', type: 'text', col: 8, placeholder: 'e.g. Website, Referral' },
        { name: 'expected_value', label: 'Expected Value', type: 'number', col: 8, min: 0, addonBefore: 'NPR', placeholder: '0.00' },
        {
          name: 'deal_pipeline_id', label: 'Pipeline', type: 'fkSelect', col: 8, placeholder: 'Select pipeline (default if blank)',
          fkUrl: api('/api/deal-pipelines/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
          quickAdd: quickPipelineConfig,
        },
        {
          name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 8, placeholder: 'Link contact',
          fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
          quickAdd: quickContactConfig,
        },
        {
          name: 'assigned_to_id', label: 'Assigned To', type: 'fkSelect', col: 8, placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
          quickAdd: quickUserConfig,
        },
        { name: 'status', label: 'Status', type: 'select', col: 4, placeholder: 'Status', options: leadStatusOptions },
        { name: 'priority', label: 'Priority', type: 'select', col: 4, placeholder: 'Priority', options: priorityOptions },
        { name: 'next_follow_up_at', label: 'Next Follow-up', type: 'datePicker', col: 8, showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
      ],
    },
    { name: 'address', label: 'Address', type: 'textarea', col: 24, rows: 2, placeholder: 'Full address' },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Additional notes' },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(180),
    company_name: Yup.string().nullable().max(180),
    email: Yup.string().nullable().email('Invalid email').max(120),
    phone: Yup.string().nullable().max(40),
    website: Yup.string().nullable().max(180),
    lead_source: Yup.string().nullable().max(80),
    expected_value: Yup.number().nullable().min(0),
    deal_pipeline_id: Yup.string().nullable(),
    contact_id: Yup.string().nullable(),
    assigned_to_id: Yup.number().nullable(),
    status: Yup.string().nullable(),
    priority: Yup.string().nullable(),
    next_follow_up_at: Yup.string().nullable(),
    address: Yup.string().nullable(),
    notes: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '', company_name: '', email: '', phone: '', website: '',
    lead_source: '', expected_value: null, deal_pipeline_id: null, contact_id: null,
    assigned_to_id: null, status: 'new', priority: 'medium',
    next_follow_up_at: null, address: '', notes: '',
    ...locked,
  };

  const transformPayload = (values) => {
    const p = { ...values, ...locked };
    p.name = p.name?.trim() || null;
    p.company_name = p.company_name?.trim() || null;
    p.email = p.email?.trim() || null;
    p.phone = p.phone?.trim() || null;
    p.website = p.website?.trim() || null;
    p.lead_source = p.lead_source?.trim() || null;
    p.address = p.address?.trim() || null;
    p.notes = p.notes?.trim() || null;
    p.deal_pipeline_id = p.deal_pipeline_id || null;
    p.contact_id = p.contact_id || null;
    p.assigned_to_id = p.assigned_to_id || null;
    p.expected_value = p.expected_value != null && p.expected_value !== '' ? Number(p.expected_value) : null;
    p.next_follow_up_at = formatDateTime(p.next_follow_up_at);
    return stripEmpty(p);
  };

  return { apiUrl: api('/api/leads/'), fields, validationSchema, crudInitialValues, transformPayload };
}

export function buildPipelineCrud() {
  const emptyStage = { name: 'New', color: '', probability: null, sort_order: null, is_won_stage: false, is_lost_stage: false };

  const fields = [
    { name: 'name', label: 'Pipeline Name', type: 'text', required: true, col: 16, placeholder: 'e.g. Sales Pipeline' },
    { name: 'is_default', label: 'Default Pipeline', type: 'switch', col: 8 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2, placeholder: 'Optional description' },
    {
      name: 'stages', label: 'Pipeline Stages', type: 'objectArray', col: 24,
      headerBg: '#424b59', headerColor: '#ffffff',
      addButtonLabel: 'Add Stage', defaultItem: { ...emptyStage },
      columns: [
        { key: 'name', name: 'name', label: 'Stage Name', type: 'text', width: '2fr', required: true, placeholder: 'e.g. Prospecting' },
        { key: 'color', name: 'color', label: 'Color', type: 'text', width: '100px', placeholder: '#3b82f6' },
        { key: 'probability', name: 'probability', label: 'Probability %', type: 'number', width: '100px', min: 0, max: 100 },
        { key: 'sort_order', name: 'sort_order', label: 'Order', type: 'number', width: '80px', min: 0 },
        { key: 'is_won_stage', name: 'is_won_stage', label: 'Won', type: 'switch', width: '70px' },
        { key: 'is_lost_stage', name: 'is_lost_stage', label: 'Lost', type: 'switch', width: '70px' },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(120),
    is_default: Yup.boolean().nullable(),
    description: Yup.string().nullable(),
    stages: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required('Stage name is required').max(120),
        color: Yup.string().nullable().max(20),
        probability: Yup.number().nullable().min(0).max(100),
        sort_order: Yup.number().nullable().min(0),
      })
    ),
  });

  const crudInitialValues = { name: '', is_default: false, description: '', stages: [], deleted_item_ids: [] };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.is_default = Boolean(p.is_default);
    p.stages = Array.isArray(p.stages)
      ? p.stages.map((s) => ({
          ...s,
          name: s.name?.trim() || 'New',
          color: s.color?.trim() || null,
          probability: s.probability != null && s.probability !== '' ? Number(s.probability) : null,
          sort_order: s.sort_order != null && s.sort_order !== '' ? Number(s.sort_order) : null,
          is_won_stage: Boolean(s.is_won_stage),
          is_lost_stage: Boolean(s.is_lost_stage),
        }))
      : [];
    p.deleted_item_ids = Array.isArray(p.deleted_item_ids) ? p.deleted_item_ids : [];
    return stripEmpty(p, ['stages', 'deleted_item_ids']);
  };

  return { apiUrl: api('/api/deal-pipelines/'), fields, validationSchema, crudInitialValues, transformPayload };
}

export function buildStageCrud({ locked = {} } = {}) {
  const fields = [
    {
      name: 'deal_pipeline_id', label: 'Pipeline', type: 'fkSelect', required: true, col: 12,
      placeholder: 'Select pipeline', fkUrl: api('/api/deal-pipelines/'),
      fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
    },
    { name: 'name', label: 'Stage Name', type: 'text', required: true, col: 12, placeholder: 'e.g. Prospecting' },
    { name: 'color', label: 'Color', type: 'text', col: 6, placeholder: '#3b82f6' },
    { name: 'probability', label: 'Probability %', type: 'number', col: 6, min: 0, max: 100 },
    { name: 'sort_order', label: 'Sort Order', type: 'number', col: 6, min: 0 },
    { name: 'is_won_stage', label: 'Won Stage', type: 'switch', col: 3 },
    { name: 'is_lost_stage', label: 'Lost Stage', type: 'switch', col: 3 },
  ];

  const validationSchema = Yup.object().shape({
    deal_pipeline_id: Yup.string().required('Pipeline is required'),
    name: Yup.string().required('Name is required').max(120),
    color: Yup.string().nullable().max(20),
    probability: Yup.number().nullable().min(0).max(100),
    sort_order: Yup.number().nullable().min(0),
  });

  const crudInitialValues = {
    deal_pipeline_id: null, name: 'New', color: '', probability: null, sort_order: null,
    is_won_stage: false, is_lost_stage: false, ...locked,
  };

  const transformPayload = (values) => {
    const p = { ...values, ...locked };
    p.name = p.name?.trim() || 'New';
    p.color = p.color?.trim() || null;
    p.probability = p.probability != null && p.probability !== '' ? Number(p.probability) : null;
    p.sort_order = p.sort_order != null && p.sort_order !== '' ? Number(p.sort_order) : null;
    p.is_won_stage = Boolean(p.is_won_stage);
    p.is_lost_stage = Boolean(p.is_lost_stage);
    return stripEmpty(p);
  };

  return { apiUrl: api('/api/deal-stages/'), fields, validationSchema, crudInitialValues, transformPayload };
}

export function buildDealCrud({ locked = {} } = {}) {
  const fields = [
    {
      type: 'group', label: 'Deal Details', col: 24,
      children: [
        { name: 'title', label: 'Title', type: 'text', required: true, col: 12, placeholder: 'Deal title' },
        { name: 'status', label: 'Status', type: 'select', col: 6, options: dealStatusOptions, placeholder: 'Select status' },
        { name: 'priority', label: 'Priority', type: 'select', col: 6, options: priorityOptions, placeholder: 'Select priority' },
        {
          name: 'lead_id', label: 'Lead', type: 'fkSelect', col: 8, placeholder: 'Select lead',
          fkUrl: api('/api/leads/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
          quickAdd: quickLeadConfig,
        },
        {
          name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 8, placeholder: 'Select contact',
          fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
          quickAdd: quickContactConfig,
        },
        {
          name: 'assigned_to_id', label: 'Assigned To', type: 'fkSelect', col: 8, placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        {
          name: 'deal_pipeline_id', label: 'Pipeline', type: 'fkSelect', col: 8, placeholder: 'Default if blank',
          fkUrl: api('/api/deal-pipelines/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        {
          name: 'deal_stage_id', label: 'Stage', type: 'fkSelect', col: 8, placeholder: 'First stage if blank',
          fkUrl: api('/api/deal-stages/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
      ],
    },
    {
      type: 'group', label: 'Financial & Dates', col: 24,
      children: [
        { name: 'amount', label: 'Amount', type: 'number', col: 6, min: 0, placeholder: '0.00' },
        { name: 'probability', label: 'Probability (%)', type: 'number', col: 6, min: 0, max: 100 },
        { name: 'committed', label: 'Committed', type: 'switch', col: 4 },
        { name: 'source', label: 'Source', type: 'text', col: 8, placeholder: 'e.g. Referral' },
        { name: 'expected_close_date', label: 'Expected Close', type: 'datePicker', col: 8 },
      ],
    },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ];

  const validationSchema = Yup.object().shape({
    title: Yup.string().required('Title is required').max(180),
    amount: Yup.number().nullable().min(0),
    probability: Yup.number().nullable().min(0).max(100),
  });

  const crudInitialValues = {
    title: '', lead_id: null, contact_id: null, deal_pipeline_id: null, deal_stage_id: null,
    assigned_to_id: null, priority: 'medium', status: 'open', probability: null, committed: false,
    source: '', expected_close_date: null, amount: null, description: '',
    ...locked,
  };

  const transformPayload = (values) => {
    const p = { ...values, ...locked };
    p.title = p.title?.trim() || null;
    p.source = p.source?.trim() || null;
    p.description = p.description?.trim() || null;
    p.lead_id = p.lead_id || null;
    p.contact_id = p.contact_id || null;
    p.deal_pipeline_id = p.deal_pipeline_id || null;
    p.deal_stage_id = p.deal_stage_id || null;
    p.assigned_to_id = p.assigned_to_id || null;
    p.amount = p.amount != null && p.amount !== '' ? Number(p.amount) : null;
    p.probability = p.probability != null && p.probability !== '' ? Number(p.probability) : null;
    p.committed = Boolean(p.committed);
    p.expected_close_date = formatDate(p.expected_close_date);
    return stripEmpty(p);
  };

  return { apiUrl: api('/api/deals/'), fields, validationSchema, crudInitialValues, transformPayload };
}

export function buildActivityCrud({ locked = {} } = {}) {
  const emptyComment = { user_id: null, comment: '' };

  const fields = [
    {
      type: 'group', label: 'Activity Details', col: 24,
      children: [
        { name: 'subject', label: 'Subject', type: 'text', required: true, col: 16, placeholder: 'Activity subject' },
        { name: 'activity_type', label: 'Type', type: 'select', col: 8, options: activityTypeOptions, placeholder: 'Select type' },
        { name: 'status', label: 'Status', type: 'select', col: 8, options: activityStatusOptions, placeholder: 'Select status' },
        { name: 'priority', label: 'Priority', type: 'select', col: 8, options: priorityOptions, placeholder: 'Select priority' },
        {
          name: 'lead_id', label: 'Lead', type: 'fkSelect', col: 8, placeholder: 'Select lead',
          fkUrl: api('/api/leads/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        {
          name: 'deal_id', label: 'Deal', type: 'fkSelect', col: 8, placeholder: 'Select deal',
          fkUrl: api('/api/deals/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'title',
        },
        {
          name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 8, placeholder: 'Select contact',
          fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        {
          name: 'assigned_to_id', label: 'Assigned To', type: 'fkSelect', col: 8, placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        { name: 'outcome', label: 'Outcome', type: 'text', col: 8 },
      ],
    },
    {
      type: 'group', label: 'Dates', col: 24,
      children: [
        { name: 'due_at', label: 'Due At', type: 'datePicker', col: 6, showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
        { name: 'next_follow_up_at', label: 'Next Follow Up', type: 'datePicker', col: 6, showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
        { name: 'reminder_at', label: 'Reminder At', type: 'datePicker', col: 6, showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
      ],
    },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
    {
      name: 'comments', label: 'Comments', type: 'objectArray', col: 24,
      deletedFieldName: 'deleted_comment_ids',
      headerBg: '#424b59', headerColor: '#ffffff',
      addButtonLabel: 'Add Comment', defaultItem: { ...emptyComment },
      columns: [
        {
          key: 'user_id', name: 'user_id', label: 'User', type: 'fkSelect', width: '1fr', placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        { key: 'comment', name: 'comment', label: 'Comment', type: 'textarea', width: '2fr', placeholder: 'Enter comment' },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    subject: Yup.string().required('Subject is required').max(180),
    outcome: Yup.string().nullable().max(255),
    comments: Yup.array().of(
      Yup.object().shape({
        user_id: Yup.number().nullable(),
        comment: Yup.string().nullable(),
      })
    ),
  });

  const crudInitialValues = {
    subject: '', outcome: '', lead_id: null, deal_id: null, contact_id: null, assigned_to_id: null,
    status: 'pending', priority: 'medium', activity_type: 'follow_up',
    due_at: null, next_follow_up_at: null, reminder_at: null,
    description: '', comments: [], deleted_comment_ids: [],
    ...locked,
  };

  const transformPayload = (values) => {
    const p = { ...values, ...locked };
    p.subject = p.subject?.trim() || null;
    p.outcome = p.outcome?.trim() || null;
    p.description = p.description?.trim() || null;
    p.lead_id = p.lead_id || null;
    p.deal_id = p.deal_id || null;
    p.contact_id = p.contact_id || null;
    p.assigned_to_id = p.assigned_to_id || null;
    p.due_at = formatDateTime(p.due_at);
    p.next_follow_up_at = formatDateTime(p.next_follow_up_at);
    p.reminder_at = formatDateTime(p.reminder_at);
    p.comments = Array.isArray(p.comments)
      ? p.comments.map((c) => ({
          ...c,
          user_id: c.user_id || null,
          comment: c.comment?.trim() || null,
        }))
      : [];
    p.deleted_comment_ids = Array.isArray(p.deleted_comment_ids) ? p.deleted_comment_ids : [];
    delete p.deleted_item_ids;
    return stripEmpty(p, ['comments', 'deleted_comment_ids']);
  };

  return { apiUrl: api('/api/crm-activities/'), fields, validationSchema, crudInitialValues, transformPayload };
}

export function buildSmsConfigCrud() {
  const fields = [
    { name: 'name', label: 'Config Name', type: 'text', col: 12, required: true, placeholder: 'e.g. Default Twilio' },
    {
      name: 'provider', label: 'Provider', type: 'select', col: 12, required: true,
      options: [
        { value: 'twilio', label: 'Twilio' },
        { value: 'infobip', label: 'Infobip' },
      ],
    },

    // Twilio fields — shown only when provider === 'twilio'
    {
      name: 'account_sid', label: 'Account SID', type: 'text', col: 12,
      condition: (v) => v?.provider === 'twilio',
    },
    {
      name: 'auth_token', label: 'Auth Token', type: 'password', col: 12,
      condition: (v) => v?.provider === 'twilio',
      placeholder: 'Leave blank to keep existing',
    },
    {
      name: 'from_number', label: 'From Number', type: 'text', col: 12,
      condition: (v) => v?.provider === 'twilio',
      placeholder: '+1XXXXXXXXXX',
    },

    // Infobip fields — shown only when provider === 'infobip'
    {
      name: 'api_key', label: 'API Key', type: 'password', col: 12,
      condition: (v) => v?.provider === 'infobip',
      placeholder: 'Leave blank to keep existing',
    },
    {
      name: 'base_url', label: 'Base URL', type: 'text', col: 12,
      condition: (v) => v?.provider === 'infobip',
      placeholder: 'https://xxxxx.api.infobip.com',
    },
    {
      name: 'sender_id', label: 'Sender ID', type: 'text', col: 12,
      condition: (v) => v?.provider === 'infobip',
      placeholder: 'e.g. KITELEDGER',
    },

    { name: 'is_default', label: 'Default', type: 'switch', col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(120),
    provider: Yup.string().required().oneOf(['twilio', 'infobip']),
    account_sid: Yup.string().nullable().max(255),
    auth_token: Yup.string().nullable().max(255),
    from_number: Yup.string().nullable().max(60),
    api_key: Yup.string().nullable().max(255),
    base_url: Yup.string().nullable().max(255),
    sender_id: Yup.string().nullable().max(60),
    active: Yup.boolean().nullable(),
    is_default: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    provider: 'twilio',
    account_sid: '',
    auth_token: '',
    from_number: '',
    api_key: '',
    base_url: '',
    sender_id: '',
    active: true,
    is_default: false,
  };

  const transformPayload = (values) => {
    const p = { ...values };
    // The backend ignores empty-string secret fields on update so the user
    // can resave a row without re-typing credentials. Don't force them to
    // null on the client.
    Object.keys(p).forEach((k) => {
      if (p[k] === '' && !['auth_token', 'api_key'].includes(k)) p[k] = null;
    });
    return p;
  };

  return { apiUrl: api('/api/sms-configs/'), fields, validationSchema, crudInitialValues, transformPayload };
}
