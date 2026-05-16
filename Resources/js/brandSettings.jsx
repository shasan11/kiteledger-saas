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

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  return api(url.startsWith('/') ? url : `/${url}`);
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
  const response = await axios.get(api('/api/app-settings/current'));
  const settings = response.data || {};

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