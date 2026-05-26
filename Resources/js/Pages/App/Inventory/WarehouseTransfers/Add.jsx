import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Button, Row, Col, Table, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import { displayDocumentNumber, isApproved } from '@/Components/Transactions/documentNumber.js';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
};
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const nullIfEmpty = (v) => (v === undefined || v === null || v === '' ? null : v);
const fmtQty = (v) => Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const productCode = (product) => product?.code || product?.sku || product?.barcode || '-';
const productUnit = (product) => product?.product_unit?.name || product?.productUnit?.name || product?.unit?.name || '-';

const emptyLine = () => ({
    _key: Math.random().toString(36).slice(2),
    product_id: null,
    product_detail: null,
    qty: 1,
    remarks: '',
});

export default function WarehouseTransferAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([emptyLine()]);
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const fromWarehouseId = Form.useWatch('from_warehouse_id', form);

    const fetchAvailableStock = async (productId, warehouseId) => {
        if (!productId || !warehouseId) return null;

        const { data } = await axios.get(api('/api/warehouse-items/'), {
            params: {
                product_id: productId,
                warehouse_id: warehouseId,
                include_zero_stock: 1,
                include_inactive: 1,
                page_size: 1,
            },
            headers: authHeaders(),
        });

        return toNumber(data?.results?.[0]?.qty_on_hand);
    };

    useEffect(() => {
        if (initialRecord) {
            form.setFieldsValue({
                transfer_no: displayDocumentNumber(initialRecord, initialRecord.warehouse_transfer_no ? 'warehouse_transfer_no' : 'transfer_no'),
                transfer_date: initialRecord.transfer_date ? dayjs(initialRecord.transfer_date) : dayjs(),
                from_warehouse_id: initialRecord.from_warehouse_id ?? initialRecord.from_warehouse?.id ?? null,
                to_warehouse_id: initialRecord.to_warehouse_id ?? initialRecord.to_warehouse?.id ?? null,
                notes: initialRecord.notes || '',
            });
            const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
            if (lines.length) {
                setItems(lines.map((l) => ({
                    _key: Math.random().toString(36).slice(2),
                    id: l.id,
                    product_id: l.product_id ?? l.product?.id ?? null,
                    product_detail: l.product || l.product_id_detail || null,
                    qty: toNumber(l.qty) || 1,
                    remarks: l.remarks || '',
                })));
            }
        } else {
            form.setFieldsValue({ transfer_date: dayjs(), transfer_no: '#DRAFT' });
        }
    }, [initialRecord, form]);

    useEffect(() => {
        if (fromWarehouseId) {
            refreshAvailableStock(fromWarehouseId);
        }
    }, [fromWarehouseId]);

    const updateLine = (idx, patch) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx], ...patch }; return n; });
    const updateLineProduct = async (idx, productId, raw) => {
        updateLine(idx, { product_id: productId, product_detail: raw, available_stock: null });
        const warehouseId = form.getFieldValue('from_warehouse_id');
        const available = await fetchAvailableStock(productId, warehouseId).catch(() => null);
        updateLine(idx, { available_stock: available });
    };
    const addLine = () => setItems((p) => [...p, emptyLine()]);
    const removeLine = (idx) => setItems((prev) => {
        const line = prev[idx];
        if (line?.id) setDeletedItemIds((ids) => [...ids, line.id]);
        const next = prev.filter((_, i) => i !== idx);
        return next.length ? next : [emptyLine()];
    });

    const validateLines = () => {
        if (!items.length) return 'At least one product is required.';
        for (const l of items) {
            if (!l.product_id) return 'Every line must have a product.';
            if (toNumber(l.qty) <= 0) return 'Every line must have qty > 0.';
        }
        const from = form.getFieldValue('from_warehouse_id');
        const to = form.getFieldValue('to_warehouse_id');
        if (from && to && String(from) === String(to)) return 'From and To warehouse cannot be the same.';
        return null;
    };

    const refreshAvailableStock = async (warehouseId) => {
        const next = await Promise.all(items.map(async (line) => ({
            ...line,
            available_stock: await fetchAvailableStock(line.product_id, warehouseId).catch(() => null),
        })));
        setItems(next);
    };

    const totalItems = items.filter((line) => line.product_id).length;
    const totalQty = items.reduce((sum, line) => sum + toNumber(line.qty), 0);

    const onSubmit = async () => {
        const v = await form.validateFields().catch(() => null);
        if (!v) return;
        const err = validateLines();
        if (err) { message.error(err); return; }

        const payload = {
            transfer_no: v.transfer_no === '#DRAFT' ? null : nullIfEmpty(v.transfer_no),
            transfer_date: v.transfer_date ? v.transfer_date.format('YYYY-MM-DD') : null,
            from_warehouse_id: v.from_warehouse_id,
            to_warehouse_id: v.to_warehouse_id,
            notes: nullIfEmpty(v.notes),
            items: items.map((l) => ({
                ...(l.id ? { id: l.id } : {}),
                product_id: l.product_id,
                qty: toNumber(l.qty),
                remarks: nullIfEmpty(l.remarks),
            })),
            deleted_item_ids: deletedItemIds,
        };

        setSubmitting(true);
        try {
            const url = isEdit ? api(`/api/warehouse-transfers/${recordId}/`) : api('/api/warehouse-transfers/');
            const res = await axios({ method: isEdit ? 'patch' : 'post', url, data: payload, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
            message.success(isEdit ? 'Transfer updated' : 'Transfer created');
            const id = res?.data?.id;
            if (id) router.visit(route('inventory.warehouse-transfers.show', id));
            else router.visit(route('inventory.warehouse-transfers.index'));
        } catch (e) {
            const data = e?.response?.data;
            if (data && typeof data === 'object') {
                const errs = data.errors || data;
                const remain = [];
                Object.entries(errs).forEach(([f, msgs]) => {
                    const m = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
                    if (form.getFieldInstance(f)) form.setFields([{ name: f, errors: [m] }]);
                    else remain.push(`${f}: ${m}`);
                });
                if (remain.length) message.error(remain.join(' | '));
                else if (data.message) message.error(data.message);
                else message.error('Validation failed');
            } else message.error('Save failed');
        } finally { setSubmitting(false); }
    };

    const onApprove = async () => {
        if (!recordId) return;
        setSubmitting(true);
        try {
            await axios.post(api(`/api/warehouse-transfers/${recordId}/approve`), {}, { headers: authHeaders() });
            message.success('Transfer approved and posted');
            router.visit(route('inventory.warehouse-transfers.show', recordId));
        } catch (e) {
            const data = e?.response?.data;
            const first = data && typeof data === 'object' ? Object.values(data).flat().filter(Boolean)[0] : null;
            message.error(first || data?.message || 'Approval failed');
        } finally {
            setSubmitting(false);
        }
    };

    const lineColumns = [
        {
            title: 'Product', dataIndex: 'product_id',
            render: (val, row, idx) => (
                <BackendSelect
                    value={val}
                    detailValue={row.product_detail}
                    fkUrl="/api/products/search"
                    labelKey="label"
                    placeholder="Select product"
                    style={{ width: '100%' }}
                    variant="borderless"
                    onChange={(v, raw) => updateLineProduct(idx, v, raw)}
                />
            ),
        },
        { title: 'Code / SKU', key: 'code', width: 130, render: (_, row) => productCode(row.product_detail) },
        { title: 'Available', dataIndex: 'available_stock', width: 120, align: 'right', render: (v) => v === null || v === undefined ? '-' : fmtQty(v) },
        {
            title: 'Qty', dataIndex: 'qty', width: 130, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateLine(idx, { qty: v ?? 0 })} />
            ),
        },
        { title: 'Unit', key: 'unit', width: 90, render: (_, row) => productUnit(row.product_detail) },
        {
            title: 'Remarks', dataIndex: 'remarks',
            render: (val, _, idx) => (
                <Input variant="borderless" value={val} onChange={(e) => updateLine(idx, { remarks: e.target.value })} placeholder="Optional" />
            ),
        },
        {
            title: '', key: 'remove', width: 50,
            render: (_, __, idx) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeLine(idx)} disabled={items.length <= 1} />
            ),
        },
    ];

    return (
        <TransactionFormShell
            auth={props.auth}
            title={isEdit ? 'Edit Warehouse Transfer' : 'New Warehouse Transfer'}
            headTitle={isEdit ? 'Edit Warehouse Transfer' : 'New Warehouse Transfer'}
            onBack={() => router.visit(route('inventory.warehouse-transfers.index'))}
            onCancel={() => router.visit(route('inventory.warehouse-transfers.index'))}
            onSubmit={onSubmit}
            submitting={submitting}
            submitLabel={isEdit ? 'Update' : 'Save'}
            actions={isEdit && initialRecord && !isApproved(initialRecord) ? (
                <Button icon={<CheckCircleOutlined />} onClick={onApprove} loading={submitting}>
                    Approve
                </Button>
            ) : null}
        >
            <Form form={form} layout="vertical" requiredMark>
                <FormSection title="Transfer details">
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item label="From Warehouse" name="from_warehouse_id" rules={[{ required: true, message: 'From Warehouse is required' }]}>
                                <BackendSelect fkUrl="/api/warehouses/" placeholder="Select warehouse" onChange={(value) => refreshAvailableStock(value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="To Warehouse" name="to_warehouse_id" rules={[{ required: true, message: 'To Warehouse is required' }]}>
                                <BackendSelect fkUrl="/api/warehouses/" placeholder="Select warehouse" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Transfer No" name="transfer_no">
                                <Input placeholder="Auto-generated" disabled />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Transfer Date" name="transfer_date" rules={[{ required: true, message: 'Date is required' }]}>
                                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <Form.Item label="Notes" name="notes">
                                <Input.TextArea rows={2} placeholder="Notes" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>

                <FormSection title="Transfer lines">
                    <Table rowKey="_key" size="small" columns={lineColumns} dataSource={items} pagination={false} bordered
                        footer={() => (
                            <Button icon={<PlusOutlined />} onClick={addLine} type="dashed">Add Line</Button>
                        )}
                        summary={() => (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={3}>
                                    <Typography.Text strong>Total Items: {totalItems}</Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right">
                                    <Typography.Text strong>{fmtQty(totalQty)}</Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4} colSpan={3} />
                            </Table.Summary.Row>
                        )}
                    />
                </FormSection>
            </Form>
        </TransactionFormShell>
    );
}
