import dayjs from 'dayjs';

export const humanize = (value = '') => String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatMoney = (value, currency = 'USD', compact = false) => {
    const amount = Number(value || 0);
    try {
        return new Intl.NumberFormat('en', {
            style: 'currency', currency, maximumFractionDigits: compact ? 1 : 2,
            notation: compact ? 'compact' : 'standard',
        }).format(amount);
    } catch {
        return `${currency} ${amount.toLocaleString()}`;
    }
};

export const formatDate = (value, withTime = false) => {
    if (!value) return '—';
    const date = dayjs(value);
    return date.isValid() ? date.format(withTime ? 'DD MMM YYYY, HH:mm' : 'DD MMM YYYY') : value;
};

export const initials = (value = '') => value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'KL';
