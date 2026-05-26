import axios from 'axios';
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
