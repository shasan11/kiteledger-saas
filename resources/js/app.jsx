import 'antd/dist/reset.css';
import '../css/app.css';
import './bootstrap';

import React, { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import {
  fetchBrandSettings,
  getStoredBrandSettings,
  resolveMediaUrl,
  subscribeToBrandSettings,
} from './brandSettings';

import { createThemeConfig } from './theme';

const appName = import.meta.env.VITE_APP_NAME || 'KiteLedger';

const syncFavicon = (settings) => {
  const faviconUrl = resolveMediaUrl(settings?.favicon_url || settings?.favicon);
  const selectors = [
    'link[data-kiteledger-favicon="icon"]',
    'link[data-kiteledger-favicon="shortcut"]',
    'link[data-kiteledger-favicon="apple"]',
  ];

  const mimeType = (() => {
    const cleanUrl = (faviconUrl || '').split('?')[0].toLowerCase();

    if (cleanUrl.endsWith('.ico')) return 'image/x-icon';
    if (cleanUrl.endsWith('.svg')) return 'image/svg+xml';
    if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
    if (cleanUrl.endsWith('.png')) return 'image/png';
    if (cleanUrl.endsWith('.webp')) return 'image/webp';

    return null;
  })();

  if (!faviconUrl) {
    selectors.forEach((selector) => document.querySelector(selector)?.remove());
    return;
  }

  const upsertLink = (key, rel, withType = true) => {
    let link = document.querySelector(`link[data-kiteledger-favicon="${key}"]`);

    if (!link) {
      link = document.createElement('link');
      link.dataset.kiteledgerFavicon = key;
      document.head.appendChild(link);
    }

    link.rel = rel;
    link.href = faviconUrl;

    if (withType && mimeType) {
      link.type = mimeType;
    } else {
      link.removeAttribute('type');
    }
  };

  document.querySelector('link[data-kiteledger-favicon="true"]')?.remove();

  upsertLink('icon', 'icon');
  upsertLink('shortcut', 'shortcut icon');
  upsertLink('apple', 'apple-touch-icon', false);
};

function RootApp({ App, props }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'light';
  });

  const [brandSettings, setBrandSettings] = useState(() => {
    return getStoredBrandSettings();
  });

  useEffect(() => {
    let mounted = true;

    syncFavicon(brandSettings);

    fetchBrandSettings()
      .then((settings) => {
        if (!mounted) return;

        setBrandSettings(settings);
        syncFavicon(settings);
      })
      .catch((error) => {
        console.error('Failed to load company brand settings:', error);
      });

    const unsubscribe = subscribeToBrandSettings((settings) => {
      setBrandSettings(settings);
      syncFavicon(settings);
    });

    const handleStorage = (event) => {
      if (event.key === 'themeMode') {
        setMode(event.newValue || 'light');
      }

      if (event.key === 'kiteledger_brand_settings') {
        const settings = getStoredBrandSettings();
        setBrandSettings(settings);
        syncFavicon(settings);
      }
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
      <AntdApp>
        <App {...props} />
      </AntdApp>
    </ConfigProvider>
  );
}

createInertiaApp({
  title: (title) => `${title} - ${appName}`,

  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.jsx`,
      import.meta.glob('./Pages/**/*.jsx')
    ),

  setup({ el, App, props }) {
    createRoot(el).render(
      <React.StrictMode>
        <RootApp App={App} props={props} />
      </React.StrictMode>
    );
  },

  progress: {
    color: '#16a34a',
  },
});
