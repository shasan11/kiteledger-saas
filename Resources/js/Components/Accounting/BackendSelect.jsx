import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Row, Col, Select, Space, Switch, message } from 'antd';
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

const COUNTRY_CODE_OPTIONS = [
    { value: '+977', label: '+977' },
    { value: '+91', label: '+91' },
    { value: '+1', label: '+1' },
    { value: '+44', label: '+44' },
    { value: '+61', label: '+61' },
    { value: '+971', label: '+971' },
    { value: '+974', label: '+974' },
    { value: '+966', label: '+966' },
];

const splitPhoneValue = (value, defaultCode = '+977') => {
    const text = String(value || '').trim();
    const match = text.match(/^(\+\d{1,4})\s*(.*)$/);

    return {
        code: match?.[1] || defaultCode,
        number: match ? match[2] || '' : text,
    };
};

const buildPhoneValue = (code, number) => {
    const cleanNumber = String(number || '').trim().replace(/^(\+\d{1,4})\s*/, '');
    return cleanNumber ? `${code || '+977'} ${cleanNumber}` : '';
};

export default function BackendSelect({
    value,
    onChange,
    fkUrl,
    valueKey = 'id',
    labelKey = 'name',
    labelFn,
    extraParams = {},
    activeOnly = true,
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
    quickAddContact = false,
    quickAddContactDefaults = {},
    quickAddContactTitle,
}) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickSaving, setQuickSaving] = useState(false);
    const [unitOptions, setUnitOptions] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [quickForm] = Form.useForm();
    const quickAddMode = quickAddProduct ? 'product' : (quickAddContact ? 'contact' : null);
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
                ...(activeOnly ? { active: true } : {}),
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

    useEffect(() => {
        if (!quickOpen || !quickAddProduct) return;
        let cancelled = false;
        const load = async (url, setter) => {
            try {
                const res = await axios.get(`${BACKEND_BASE}${url}`, { params: { page_size: 200 }, headers: getAuthHeaders() });
                if (cancelled) return;
                const payload = res?.data;
                const rows = Array.isArray(payload?.results)
                    ? payload.results
                    : Array.isArray(payload?.data)
                        ? payload.data
                        : Array.isArray(payload)
                            ? payload
                            : [];
                setter(rows.filter((r) => r && r.id != null).map((r) => ({ value: r.id, label: r.name || r.code || String(r.id) })));
            } catch { /* best-effort */ }
        };
        void load('/api/product-units/', setUnitOptions);
        void load('/api/product-categories/', setCategoryOptions);
        return () => { cancelled = true; };
    }, [quickOpen, quickAddProduct]);

    const submitQuickProduct = async () => {
        const values = await quickForm.validateFields();
        setQuickSaving(true);
        try {
            const payload = {
                product_type: 'simple',
                name: values.name,
                code: values.code || null,
                barcode: values.barcode || null,
                description: values.description || null,
                product_unit_id: values.product_unit_id,
                product_category_id: values.product_category_id,
                purchase_price: values.purchase_price ?? 0,
                selling_price: values.selling_price ?? 0,
                track_inventory: values.track_inventory ?? false,
                allow_sale: values.allow_sale ?? true,
                allow_purchase: values.allow_purchase ?? true,
                active: true,
                ...quickAddProductDefaults,
            };

            const res = await axios.post(`${BACKEND_BASE}/api/products/`, payload, {
                headers: getAuthHeaders(),
            });
            const saved = res?.data?.data || res?.data;
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

    const submitQuickContact = async () => {
        const values = await quickForm.validateFields();
        setQuickSaving(true);
        try {
            const trim = (v) => {
                if (v === undefined || v === null) return null;
                const t = String(v).trim();
                return t || null;
            };
            const payload = {
                contact_type: 'customer',
                ...quickAddContactDefaults,
                name: trim(values.name),
                code: trim(values.code),
                phone: trim(values.phone),
                email: trim(values.email),
                address: trim(values.address),
                pan: trim(values.pan),
                active: true,
            };

            const res = await axios.post(`${BACKEND_BASE}/api/contacts/`, payload, {
                headers: getAuthHeaders(),
            });
            const saved = res?.data?.data || res?.data;
            const opt = toOption(saved);
            if (!opt) {
                message.error('Contact was created but no ID was returned.');
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
            message.success(`${quickAddContactTitle || 'Contact'} added.`);
        } catch (error) {
            const data = error?.response?.data || {};
            const firstError = Object.values(data.errors || {})[0]?.[0];
            message.error(firstError || data.message || 'Failed to add contact.');
        } finally {
            setQuickSaving(false);
        }
    };

    const submitQuickAdd = () => {
        if (quickAddMode === 'product') return submitQuickProduct();
        if (quickAddMode === 'contact') return submitQuickContact();
        return null;
    };

    const openQuickAdd = () => {
        quickForm.resetFields();
        if (quickAddMode === 'product') {
            quickForm.setFieldsValue({
                name: '',
                code: '',
                barcode: '',
                description: '',
                product_unit_id: null,
                product_category_id: null,
                purchase_price: 0,
                selling_price: 0,
                track_inventory: false,
                allow_sale: quickAddProductDefaults.allow_sale ?? true,
                allow_purchase: quickAddProductDefaults.allow_purchase ?? true,
            });
        } else if (quickAddMode === 'contact') {
            quickForm.setFieldsValue({
                name: '',
                code: '',
                phone: '',
                email: '',
                address: '',
                pan: '',
            });
        }
        setQuickOpen(true);
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

    const quickPhoneValue = Form.useWatch('phone', quickForm);
    const quickPhoneParts = splitPhoneValue(quickPhoneValue);

    if (!quickAddMode) return select;

    const contactLabel = quickAddContactTitle
        || (quickAddContactDefaults?.contact_type === 'supplier' ? 'Supplier' : 'Contact');

    const missingLookups = quickAddMode === 'product'
        && quickOpen
        && (!unitOptions.length || !categoryOptions.length);

    return (
        <>
            <Space.Compact style={{ width: '100%' }}>
                {select}
                <Button
                    icon={<PlusOutlined />}
                    disabled={disabled}
                    title={quickAddMode === 'product' ? 'Quick add product' : `Quick add ${contactLabel.toLowerCase()}`}
                    onClick={openQuickAdd}
                />
            </Space.Compact>

            <Modal
                title={quickAddMode === 'product' ? 'Quick Add Product' : `Quick Add ${contactLabel}`}
                open={quickOpen}
                onCancel={() => setQuickOpen(false)}
                onOk={submitQuickAdd}
                confirmLoading={quickSaving}
                destroyOnClose
                okText="Save"
                width={quickAddMode === 'contact' ? 620 : 560}
            >
                {quickAddMode === 'product' ? (
                    <Form form={quickForm} layout="vertical">
                        {missingLookups && (
                            <Alert
                                type="warning"
                                showIcon
                                style={{ marginBottom: 12 }}
                                message={!unitOptions.length && !categoryOptions.length
                                    ? 'No product units or categories exist. Create them in Inventory settings first.'
                                    : !unitOptions.length
                                        ? 'No product units exist. Create at least one in Inventory settings.'
                                        : 'No product categories exist. Create at least one in Inventory settings.'}
                            />
                        )}
                        <Form.Item
                            name="name"
                            label="Product Name"
                            rules={[{ required: true, message: 'Product name is required' }]}
                        >
                            <Input placeholder="Product name" />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item
                                    name="product_category_id"
                                    label="Category"
                                    rules={[{ required: true, message: 'Category is required' }]}
                                >
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select category"
                                        options={categoryOptions}
                                        filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="product_unit_id"
                                    label="Unit"
                                    rules={[{ required: true, message: 'Unit is required' }]}
                                >
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select unit"
                                        options={unitOptions}
                                        filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item name="code" label="SKU">
                                    <Input placeholder="Optional" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="barcode" label="Barcode">
                                    <Input placeholder="Optional" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item name="selling_price" label="Selling Price">
                                    <InputNumber min={0} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="purchase_price" label="Purchase Price">
                                    <InputNumber min={0} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="description" label="Description">
                            <Input.TextArea rows={2} placeholder="Optional" />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col span={8}>
                                <Form.Item name="track_inventory" label="Track Inventory" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="allow_sale" label="Allow Sale" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="allow_purchase" label="Allow Purchase" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                ) : (
                    <Form form={quickForm} layout="vertical">
                        <Form.Item
                            name="name"
                            label={`${contactLabel} Name`}
                            rules={[{ required: true, message: `${contactLabel} name is required` }]}
                        >
                            <Input placeholder={`${contactLabel} name`} />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item name="code" label="Code"><Input placeholder="Auto if blank" /></Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="phone" label="Phone">
                                    <Input
                                        placeholder="9800000000"
                                        addonBefore={(
                                            <Select
                                                value={quickPhoneParts.code}
                                                style={{ width: 92 }}
                                                options={COUNTRY_CODE_OPTIONS}
                                                onChange={(code) => quickForm.setFieldValue('phone', buildPhoneValue(code, quickPhoneParts.number))}
                                            />
                                        )}
                                        value={quickPhoneParts.number}
                                        onChange={(event) => quickForm.setFieldValue('phone', buildPhoneValue(quickPhoneParts.code, event.target.value))}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item name="email" label="Email"><Input placeholder="email@example.com" /></Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="pan" label="PAN / Tax No"><Input placeholder="Optional" /></Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="address" label="Address">
                            <Input.TextArea rows={2} placeholder="Address" />
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        </>
    );
}
