import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from 'antd';
import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';

const buildUrl = (url, params = {}) => {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    if (!qs) return url;
    return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function BackendSelect({
    value,
    onChange,
    fkUrl,
    valueKey = 'id',
    labelKey = 'name',
    labelFn,
    extraParams = {},
    placeholder = 'Search and select…',
    disabled = false,
    allowClear = true,
    pageSize = 20,
    searchParam = 'search',
    pageParam = 'page',
    pageSizeParam = 'page_size',
    detailValue = null,
    onDetailChange,
    size = 'middle',
    variant,
    style,
}) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef(null);
    const seqRef = useRef(0);

    const fullUrl = useMemo(() => {
        if (!fkUrl) return '';
        if (/^https?:\/\//i.test(fkUrl)) return fkUrl;
        return `${BACKEND_BASE}${fkUrl}`;
    }, [fkUrl]);

    const toOption = (row) => {
        if (!row || typeof row !== 'object') return null;
        const v = row[valueKey] ?? row.id ?? row.value;
        if (v === undefined || v === null || v === '') return null;
        const label = typeof labelFn === 'function'
            ? labelFn(row)
            : row[labelKey] ?? row.name ?? row.code ?? String(v);
        return { value: v, label: String(label ?? v), raw: row };
    };

    const fetchOptions = async (search = '') => {
        if (!fullUrl) return;
        const seq = ++seqRef.current;
        setLoading(true);
        try {
            const url = buildUrl(fullUrl, {
                [pageParam]: 1,
                [pageSizeParam]: pageSize,
                [searchParam]: search,
                ...extraParams,
            });
            const res = await axios.get(url, { headers: getAuthHeaders() });
            const payload = res?.data;
            const rows = Array.isArray(payload?.results)
                ? payload.results
                : Array.isArray(payload?.data)
                    ? payload.data
                    : Array.isArray(payload)
                        ? payload
                        : [];
            if (seq !== seqRef.current) return;
            const opts = rows.map(toOption).filter(Boolean);
            setOptions(opts);
        } catch (e) {
            if (seq !== seqRef.current) return;
            setOptions([]);
        } finally {
            if (seq === seqRef.current) setLoading(false);
        }
    };

    // Hydrate label for existing value when detail is missing
    useEffect(() => {
        if (value == null || value === '') return;
        const found = options.some((o) => String(o.value) === String(value));
        if (found) return;
        if (detailValue && typeof detailValue === 'object') return;
        let cancelled = false;
        (async () => {
            try {
                const base = String(fullUrl || '').replace(/\/+$/, '');
                const url = `${base}/${encodeURIComponent(value)}/`;
                const res = await axios.get(url, { headers: getAuthHeaders() });
                if (cancelled) return;
                const opt = toOption(res?.data);
                if (opt) {
                    setOptions((prev) =>
                        prev.some((p) => String(p.value) === String(opt.value)) ? prev : [opt, ...prev]
                    );
                    if (typeof onDetailChange === 'function') onDetailChange(opt.raw);
                }
            } catch {
                /* swallow */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [value, fullUrl]);

    const mergedOptions = useMemo(() => {
        if (value == null || value === '') return options;
        const found = options.some((o) => String(o.value) === String(value));
        if (found) return options;
        const ghost = detailValue && typeof detailValue === 'object'
            ? toOption(detailValue)
            : { value, label: String(value), raw: null };
        return ghost ? [ghost, ...options] : options;
    }, [options, value, detailValue]);

    return (
        <Select
            showSearch
            value={value ?? undefined}
            placeholder={placeholder}
            disabled={disabled}
            allowClear={allowClear}
            loading={loading}
            size={size}
            variant={variant}
            style={style}
            open={open}
            filterOption={false}
            options={mergedOptions.map((o) => ({ value: o.value, label: o.label, raw: o.raw }))}
            notFoundContent={loading ? 'Loading…' : 'No results'}
            onDropdownVisibleChange={(visible) => {
                setOpen(visible);
                if (visible) fetchOptions('');
            }}
            onFocus={() => {
                if (!options.length) fetchOptions('');
            }}
            onSearch={(txt) => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => fetchOptions(txt || ''), 300);
            }}
            onChange={(v, opt) => {
                const picked = Array.isArray(opt) ? opt[0] : opt;
                onChange?.(v ?? null, picked?.raw ?? null);
                if (typeof onDetailChange === 'function') onDetailChange(picked?.raw ?? null);
            }}
            onClear={() => {
                onChange?.(null, null);
                if (typeof onDetailChange === 'function') onDetailChange(null);
            }}
        />
    );
}
