import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete, Input } from 'antd';
import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const buildUrl = (url, params = {}) => {
  const full = /^https?:\/\//i.test(url) ? url : `${BACKEND_BASE}${url}`;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  if (!qs) return full;
  return full.includes('?') ? `${full}&${qs}` : `${full}?${qs}`;
};

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (v) => {
  if (!v) return '';
  const parsed = new Date(v);
  if (Number.isNaN(parsed.getTime())) return String(v);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Reference autocomplete supporting one or more backend sources.
 *
 * Props:
 *   value, onChange — current text value (the reference string the user sees)
 *   sources: [{
 *     key: 'quotation',
 *     label: 'Quotation',
 *     url: '/api/quotations/',
 *     searchParam: 'search',
 *     pageSize: 10,
 *     numberField: 'quotation_no',
 *     contactField: 'contact',
 *     dateField: 'quotation_date',
 *     totalField: 'grand_total',
 *     extraParams: {},
 *   }, ...]
 *   onPick(record, source) — fires when an option is chosen
 *   placeholder
 */
export default function ReferenceAutocomplete({
  value,
  onChange,
  sources = [],
  onPick,
  placeholder = 'Search reference…',
  disabled = false,
  style,
  allowFreeText = true,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const seqRef = useRef(0);
  const recordsRef = useRef({});

  const fetchAll = async (search = '') => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const results = await Promise.all(
        (sources || []).map(async (src) => {
          try {
            const url = buildUrl(src.url, {
              [src.searchParam || 'search']: search,
              page: 1,
              page_size: src.pageSize || 10,
              active: true,
              ...(src.extraParams || {}),
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
            return { src, rows };
          } catch {
            return { src, rows: [] };
          }
        }),
      );
      if (seq !== seqRef.current) return;
      const opts = [];
      const recMap = {};
      results.forEach(({ src, rows }) => {
        rows.forEach((row) => {
          const docNo = row[src.numberField] || row.number || row.code || `#${row.id}`;
          const contact = src.contactField
            ? (row[src.contactField]?.name || row[`${src.contactField}_name`] || '')
            : '';
          const date = src.dateField ? formatDate(row[src.dateField] || '') : '';
          const total = src.totalField ? row[src.totalField] : null;
          const parts = [`${src.label}: ${docNo}`];
          if (contact) parts.push(contact);
          if (date) parts.push(date);
          if (total !== null && total !== undefined) parts.push(money(total));
          const labelStr = parts.join(' • ');
          const key = `${src.key || src.label}:${row.id}`;
          recMap[key] = { record: row, source: src };
          opts.push({ value: key, label: labelStr, raw: row, source: src });
        });
      });
      recordsRef.current = recMap;
      setOptions(opts);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  const handleSearch = (txt) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAll(txt || ''), 300);
  };

  const handleSelect = (selectedKey) => {
    const entry = recordsRef.current[selectedKey];
    if (!entry) return;
    const { record, source } = entry;
    const docNo = record[source.numberField] || record.number || record.code || '';
    if (typeof onChange === 'function') onChange(docNo);
    if (typeof onPick === 'function') onPick(record, source);
  };

  return (
    <AutoComplete
      value={value || ''}
      options={options}
      onSearch={handleSearch}
      onChange={(v) => {
        if (allowFreeText && typeof onChange === 'function') onChange(v);
      }}
      onSelect={handleSelect}
      onFocus={() => {
        if (!options.length) fetchAll('');
      }}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      notFoundContent={loading ? 'Searching…' : 'No matches'}
      filterOption={false}
    >
      <Input allowClear />
    </AutoComplete>
  );
}
