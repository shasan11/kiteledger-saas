import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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
    quickAddProduct = false,
    quickAddProductDefaults = {},
}) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickSaving, setQuickSaving] = useState(false);
    const [quickForm] = Form.useForm();
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

    const submitQuickProduct = async () => {
        const values = await quickForm.validateFields();
        setQuickSaving(true);
        try {
            const payload = {
                product_type: 'simple',
                name: values.name,
                code: values.code || null,
                purchase_price: values.purchase_price ?? 0,
                selling_price: values.selling_price ?? 0,
                track_inventory: true,
                allow_sale: true,
                allow_purchase: true,
                active: true,
                ...quickAddProductDefaults,
            };

            const res = await axios.post(`${BACKEND_BASE}/api/products/`, payload, {
                headers: getAuthHeaders(),
            });
            const saved = res?.data;
            const opt = toOption(saved);
            if (!opt) {
                message.error('Product was created but no ID was returned.');
                return;
            }

            setOptions((prev) =>
                prev.some((item) => String(item.value) === String(opt.value))
                    ? prev
                    : [opt, ...prev],
            );
            onChange?.(opt.value, opt.raw);
            if (typeof onDetailChange === 'function') onDetailChange(opt.raw);
            setQuickOpen(false);
            quickForm.resetFields();
            message.success('Product added.');
        } catch (error) {
            const data = error?.response?.data || {};
            const firstError = Object.values(data.errors || {})[0]?.[0];
            message.error(firstError || data.message || 'Failed to add product.');
        } finally {
            setQuickSaving(false);
        }
    };

    const select = (
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

    if (!quickAddProduct) return select;

    return (
        <>
            <Space.Compact style={{ width: '100%' }}>
                {select}
                <Button
                    icon={<PlusOutlined />}
                    disabled={disabled}
                    title="Quick add product"
                    onClick={() => {
                        quickForm.resetFields();
                        quickForm.setFieldsValue({
                            name: '',
                            code: '',
                            purchase_price: 0,
                            selling_price: 0,
                        });
                        setQuickOpen(true);
                    }}
                />
            </Space.Compact>

            <Modal
                title="Quick Add Product"
                open={quickOpen}
                onCancel={() => setQuickOpen(false)}
                onOk={submitQuickProduct}
                confirmLoading={quickSaving}
                destroyOnClose
                okText="Save"
                width={560}
            >
                <Form form={quickForm} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Product Name"
                        rules={[{ required: true, message: 'Product name is required' }]}
                    >
                        <Input placeholder="Product name" />
                    </Form.Item>
                    <Form.Item name="code" label="Code">
                        <Input placeholder="Optional code / SKU" />
                    </Form.Item>
                    <Space size={12} style={{ width: '100%' }}>
                        <Form.Item name="purchase_price" label="Purchase Price" style={{ flex: 1 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="selling_price" label="Selling Price" style={{ flex: 1 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </>
    );
}
