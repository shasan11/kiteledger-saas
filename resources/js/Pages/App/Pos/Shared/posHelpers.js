import axios from 'axios';
import dayjs from 'dayjs';

export const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
export const api = (path) => `${BACKEND_BASE}${path}`;

export const money = (value) =>
    Number(value || 0).toLocaleString('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export const boolQuery = (value) =>
    value === undefined || value === null ? undefined : value ? 'true' : 'false';

export const defaultRangeForKey = (key) => {
    const today = dayjs();

    if (key === 'today') {
        return [today.startOf('day'), today.endOf('day')];
    }

    if (key === 'week') {
        return [today.startOf('week'), today.endOf('week')];
    }

    if (key === 'month') {
        return [today.startOf('month'), today.endOf('month')];
    }

    return null;
};

export const rangeParams = (range) => {
    if (!range || range.length !== 2 || !range[0] || !range[1]) {
        return {};
    }

    return {
        date_from: range[0].format('YYYY-MM-DD'),
        date_to: range[1].format('YYYY-MM-DD'),
    };
};

export async function fetchList(path, params = {}) {
    const response = await axios.get(api(path), { params });
    const payload = response.data || {};

    if (Array.isArray(payload)) {
        return { results: payload, count: payload.length };
    }

    if (Array.isArray(payload.results)) {
        return { results: payload.results, count: payload.count ?? payload.results.length };
    }

    if (Array.isArray(payload.data)) {
        return { results: payload.data, count: payload.total ?? payload.data.length };
    }

    return { results: [], count: 0 };
}

export function getApiValidationErrors(error) {
    const errors = error?.response?.data?.errors || {};

    return Object.entries(errors).reduce((messages, [field, value]) => {
        if (Array.isArray(value) && value.length > 0) {
            messages[field] = value[0];
        } else if (typeof value === 'string') {
            messages[field] = value;
        }

        return messages;
    }, {});
}

export function getApiError(error, fallback = 'Something went wrong.') {
    const status = error?.response?.status;
    const data = error?.response?.data || {};
    const validationErrors = getApiValidationErrors(error);
    const firstValidationError = Object.values(validationErrors)[0];

    if (data.message) return data.message;
    if (firstValidationError) return firstValidationError;
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 422) return 'Please correct the highlighted POS details and try again.';
    if (status >= 500) return 'The server could not complete this POS action. Please try again or contact support.';
    if (error?.request && !error?.response) return 'Network error. Please check your connection and try again.';

    return fallback;
}

export function showApiError(messageApi, error, fallback = 'Something went wrong.') {
    const text = getApiError(error, fallback);
    messageApi.error(text);
    return text;
}

export function saleStatusColor(status) {
    if (['completed', 'paid'].includes(status)) return 'green';
    if (['held'].includes(status)) return 'gold';
    if (['part_refunded'].includes(status)) return 'orange';
    if (['refunded', 'cancelled'].includes(status)) return 'red';
    return 'default';
}
