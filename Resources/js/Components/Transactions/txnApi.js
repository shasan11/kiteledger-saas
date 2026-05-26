import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';

export const api = (path) => `${BACKEND_BASE}${path}`;

export const authHeaders = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    Accept: 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
};

export const getJson = (path, config = {}) =>
  axios.get(api(path), { headers: { ...authHeaders(), ...(config.headers || {}) }, ...config });

export const postJson = (path, data, config = {}) =>
  axios.post(api(path), data, { headers: { ...authHeaders(), 'Content-Type': 'application/json', ...(config.headers || {}) }, ...config });

export const patchJson = (path, data, config = {}) =>
  axios.patch(api(path), data, { headers: { ...authHeaders(), 'Content-Type': 'application/json', ...(config.headers || {}) }, ...config });

export const deleteJson = (path, config = {}) =>
  axios.delete(api(path), { headers: { ...authHeaders(), ...(config.headers || {}) }, ...config });

// Apply Laravel-style {errors: {field: [msg]}} response onto Ant Design form
export const applyServerErrors = (e, form, fallback = 'Save failed') => {
  const data = e?.response?.data;
  if (data && typeof data === 'object') {
    const errs = data.errors || data;
    const remain = [];
    Object.entries(errs).forEach(([f, msgs]) => {
      const m = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
      try {
        if (form && form.getFieldInstance && form.getFieldInstance(f)) {
          form.setFields([{ name: f, errors: [m] }]);
          return;
        }
      } catch {}
      remain.push(`${f}: ${m}`);
    });
    if (remain.length) return remain.join(' | ');
    if (data.message) return data.message;
    return 'Validation failed';
  }
  return fallback;
};

export default { api, authHeaders, getJson, postJson, patchJson, deleteJson, applyServerErrors };
