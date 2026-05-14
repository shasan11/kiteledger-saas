import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';

export const api = (path) => `${BACKEND_BASE}${path}`;

export const authHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getJson = async (path, params = {}) => {
  const response = await axios.get(api(path), { headers: authHeaders(), params });
  return response.data?.data ?? response.data;
};

export const postJson = async (path, payload = {}) => {
  const response = await axios.post(api(path), payload, { headers: authHeaders() });
  return response.data?.data ?? response.data;
};

export const rowsFrom = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const money = (value) => {
  if (value === null || value === undefined || value === '') return '-';

  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const labelize = (value) => {
  if (!value) return '-';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const dateText = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};
