import 'antd/dist/reset.css';
import '../css/app.css';
import './bootstrap';

import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import { createThemeConfig } from './theme';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),

    setup({ el, App, props }) {
        const root = createRoot(el);

        const mode = localStorage.getItem('themeMode') || 'light';

        root.render(
            <React.StrictMode>
                <ConfigProvider theme={createThemeConfig(mode)}>
                    <AntdApp>
                        <App {...props} />
                    </AntdApp>
                </ConfigProvider>
            </React.StrictMode>,
        );
    },

    progress: {
        color: '#16a34a',
    },
});