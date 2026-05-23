import axios from 'axios';

window.axios = axios;

const readCookie = (name) => {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
};

const applyAuthHeaders = (config = {}) => {
  const headers = config.headers || {};
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const xsrfToken = readCookie('XSRF-TOKEN');
  const csrfToken = readCookie('csrftoken');

  headers.Accept = headers.Accept || 'application/json';
  headers['X-Requested-With'] = headers['X-Requested-With'] || 'XMLHttpRequest';

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (xsrfToken && !headers['X-XSRF-TOKEN']) {
    headers['X-XSRF-TOKEN'] = xsrfToken;
  }

  if (csrfToken && !headers['X-CSRFToken']) {
    headers['X-CSRFToken'] = csrfToken;
  }

  config.headers = headers;
  config.withCredentials = config.withCredentials !== false;

  return config;
};

window.axios.defaults.withCredentials = true;
window.axios.defaults.headers.common.Accept = 'application/json';
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.axios.interceptors.request.use((config) => applyAuthHeaders(config));

export { applyAuthHeaders };
