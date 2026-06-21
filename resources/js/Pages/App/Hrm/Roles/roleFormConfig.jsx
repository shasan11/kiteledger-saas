import PermissionAccordionMatrix from './PermissionAccordionMatrix';
import * as Yup from 'yup';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export const roleFields = [
  { name: 'name', label: 'Role Name', type: 'text', required: true, col: 12, placeholder: 'e.g. HR Manager, Accountant' },
  { name: 'active', label: 'Active', type: 'switch', col: 12 },
  { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
  {
    name: 'permissions',
    label: 'Permissions',
    type: 'custom',
    col: 24,
    fkUrl: api('/api/hrm/permissions'),
    component: PermissionAccordionMatrix,
    placeholder: 'Select permissions...',
  },
];

export const roleInitialValues = {
  name: '',
  description: '',
  permissions: [],
  active: true,
};

export const roleValidationSchema = Yup.object().shape({
  name: Yup.string().required('Role name is required').max(150),
  description: Yup.string().nullable().max(255),
  active: Yup.boolean().nullable(),
});

export const transformRoleRecord = (record) => ({
  ...record,
  permissions: Array.isArray(record.permissions) ? record.permissions.map((permission) => permission.id) : [],
});

export const transformRolePayload = (values) => {
  const payload = { ...values };

  payload.name = payload.name?.trim() || null;
  payload.guard_name = payload.guard_name || 'web';
  payload.active = Boolean(payload.active);
  payload.permissions = Array.isArray(payload.permissions)
    ? payload.permissions.map((item) => (typeof item === 'object' ? item.id ?? item.value : item)).filter(Boolean)
    : [];

  Object.keys(payload).forEach((key) => {
    if (payload[key] === '') payload[key] = null;
  });

  return payload;
};

export { api as roleApi };
