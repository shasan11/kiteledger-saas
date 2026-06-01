import axios from 'axios';
import { notification } from 'antd';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.axios.interceptors.request.use((config) => {
    const appContext = window.__KITELEDGER_APP_CONTEXT__ || {};

    if (appContext.branchId) {
        config.headers['X-Branch-ID'] = appContext.branchId;
    }

    if (appContext.fiscalYearId) {
        config.headers['X-Fiscal-Year-ID'] = appContext.fiscalYearId;
    }

    return config;
});

window.axios.interceptors.response.use(
    (response) => {
        const rules = response?.data?.business_rules;
        if (rules?.has_warnings) {
            notification.warning({
                message: response?.data?.message || 'Transaction has warnings but can continue.',
            });
        }

        return response;
    },
    (error) => {
        const rules = error?.response?.data?.business_rules;
        if (rules?.has_errors) {
            const first = Array.isArray(rules.checks)
                ? rules.checks.find((check) => check?.status === 'error')?.message
                : null;
            notification.error({
                message: error?.response?.data?.message || 'Transaction blocked by business rules.',
                description: first || undefined,
            });
        }

        return Promise.reject(error);
    }
);
