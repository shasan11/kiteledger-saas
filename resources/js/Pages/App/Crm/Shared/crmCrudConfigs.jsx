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
  { value: 'lost', label: 'Lost' },
  { value: 'converted', label: 'Converted' },
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
  { value: 'follow_up', label: 'Follow Up' },
];

export const LEAD_STATUS_OPTIONS = leadStatusOptions;
export const PRIORITY_OPTIONS = priorityOptions;
export const DEAL_STATUS_OPTIONS = dealStatusOptions;
export const ACTIVITY_STATUS_OPTIONS = activityStatusOptions;
export const ACTIVITY_TYPE_OPTIONS = activityTypeOptions;

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
        { name: 'phone', label: 'Phone', type: 'text', col: 8, placeholder: 'Phone number' },
        { name: 'website', label: 'Website', type: 'text', col: 8, placeholder: 'https://example.com' },
      ],
    },
    {
      type: 'group',
      label: 'Lead Classification',
      col: 24,
      children: [
        { name: 'lead_source', label: 'Source', type: 'text', col: 8, placeholder: 'e.g. Website, Referral' },
        { name: 'expected_value', label: 'Expected Value', type: 'number', col: 8, min: 0, placeholder: '0.00' },
        {
          name: 'deal_pipeline_id', label: 'Pipeline', type: 'fkSelect', col: 8, placeholder: 'Select pipeline (default if blank)',
          fkUrl: api('/api/deal-pipelines/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        {
          name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 8, placeholder: 'Link contact',
          fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        {
          name: 'assigned_to_id', label: 'Assigned To', type: 'fkSelect', col: 8, placeholder: 'Select user',
          fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
        },
        { name: 'status', label: 'Status', type: 'select', col: 4, placeholder: 'Status', options: leadStatusOptions },
        { name: 'priority', label: 'Priority', type: 'select', col: 4, placeholder: 'Priority', options: priorityOptions },
        { name: 'next_follow_up_at', label: 'Next Follow-up', type: 'datePicker', col: 8 },
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
    p.next_follow_up_at = formatDate(p.next_follow_up_at);
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
        },
        {
          name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 8, placeholder: 'Select contact',
          fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
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
        { name: 'due_at', label: 'Due At', type: 'datePicker', col: 6 },
        { name: 'completed_at', label: 'Completed At', type: 'datePicker', col: 6 },
        { name: 'next_follow_up_at', label: 'Next Follow Up', type: 'datePicker', col: 6 },
        { name: 'reminder_at', label: 'Reminder At', type: 'datePicker', col: 6 },
      ],
    },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
    {
      name: 'comments', label: 'Comments', type: 'objectArray', col: 24,
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
    due_at: null, completed_at: null, next_follow_up_at: null, reminder_at: null,
    description: '', comments: [], deleted_item_ids: [],
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
    p.due_at = formatDate(p.due_at);
    p.completed_at = formatDate(p.completed_at);
    p.next_follow_up_at = formatDate(p.next_follow_up_at);
    p.reminder_at = formatDate(p.reminder_at);
    p.comments = Array.isArray(p.comments)
      ? p.comments.map((c) => ({
          ...c,
          user_id: c.user_id || null,
          comment: c.comment?.trim() || null,
        }))
      : [];
    p.deleted_item_ids = Array.isArray(p.deleted_item_ids) ? p.deleted_item_ids : [];
    return stripEmpty(p, ['comments', 'deleted_item_ids']);
  };

  return { apiUrl: api('/api/crm-activities/'), fields, validationSchema, crudInitialValues, transformPayload };
}
