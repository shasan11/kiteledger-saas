import axios from 'axios';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';

export const BRAND_SETTINGS_EVENT = 'kiteledger:brand-settings-updated';
export const BRAND_SETTINGS_STORAGE_KEY = 'kiteledger_brand_settings';

export const api = (path = '') => {
  if (!path) return BACKEND;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${BACKEND}${path.startsWith('/') ? path : `/${path}`}`;
};

export const resolveMediaUrl = (url) => {
  if (!url) return null;

  const value = String(url).trim();

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  let path = value.replace(/^\/+/, '');

  if (path.startsWith('public/')) {
    path = path.slice('public/'.length);
  }

  if (!path.startsWith('storage/') && !path.startsWith('build/') && !path.startsWith('images/')) {
    path = `storage/${path}`;
  }

  return api(`/${path}`);
};

export const getStoredBrandSettings = () => {
  try {
    const raw = localStorage.getItem(BRAND_SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeBrandSettings = (settings) => {
  if (!settings) return;

  localStorage.setItem(BRAND_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const fetchBrandSettings = async () => {
  let settings;

  try {
    // Authenticated screens get the full app-settings record.
    const response = await axios.get(api('/api/app-settings/current'));
    settings = response.data || {};
  } catch (error) {
    // Guests (e.g. the login page) can't read the gated endpoint — fall back to
    // the public brand endpoint so the logo/favicon still render.
    const response = await axios.get(api('/api/brand'));
    settings = response.data || {};
  }

  storeBrandSettings(settings);

  return settings;
};

export const publishBrandSettings = (settings) => {
  if (!settings) return;

  storeBrandSettings(settings);

  window.dispatchEvent(
    new CustomEvent(BRAND_SETTINGS_EVENT, {
      detail: settings,
    })
  );
};

export const subscribeToBrandSettings = (callback) => {
  const handler = (event) => {
    callback(event.detail);
  };

  window.addEventListener(BRAND_SETTINGS_EVENT, handler);

  return () => {
    window.removeEventListener(BRAND_SETTINGS_EVENT, handler);
  };
};
