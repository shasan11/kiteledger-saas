import axios from 'axios';

export const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
export const api = (path) => `${BACKEND_BASE}${path}`;

export async function fetchList(path, params = {}) {
  const { data } = await axios.get(api(path), { params });
  return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
}

export function cleanPayload(values) {
  const payload = { ...values };
  Object.keys(payload).forEach((key) => {
    if (payload[key] === '') payload[key] = null;
  });
  return payload;
}
