import { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import axios from 'axios';
import { createThemeConfig } from '@/themeMain';
import {
  getStoredBrandSettings,
  publishBrandSettings,
  subscribeBrandSettings,
} from '@/brandSettings';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';

const api = (path) => {
  if (!path) return BACKEND;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${BACKEND}${path.startsWith('/') ? path : `/${path}`}`;
};

export default function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(
    localStorage.getItem('theme_mode') || 'light'
  );

  const [brandSettings, setBrandSettings] = useState(() => getStoredBrandSettings());

  useEffect(() => {
    let mounted = true;

    const loadBrandSettings = async () => {
      try {
        const response = await axios.get(api('/api/app-settings/current'));

        if (!mounted) return;

        const settings = response.data || {};

        setBrandSettings(settings);
        publishBrandSettings(settings);
      } catch (error) {
        console.error('Failed to load brand settings', error);
      }
    };

    loadBrandSettings();

    const unsubscribe = subscribeBrandSettings((settings) => {
      setBrandSettings(settings);
    });

    const handleStorage = () => {
      setMode(localStorage.getItem('theme_mode') || 'light');
      setBrandSettings(getStoredBrandSettings());
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const themeConfig = useMemo(() => {
    return createThemeConfig(mode, brandSettings);
  }, [mode, brandSettings]);

  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}