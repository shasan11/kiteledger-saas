import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Button, Space, Row, Col, Table, Select, Typography, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import { displayDocumentNumber, isApproved } from '@/Components/Transactions/documentNumber.js';
import { useBaseCurrency } from '@/Components/Transactions/defaultCurrency.js';
import { currencySymbolOf, moneyWithSymbol } from '@/Components/Transactions/transactionCalculations.js';

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

const emptyLine = () => ({
    _key: Math.random().toString(36).slice(2),
    product_id: null,
    product_detail: null,
    adjustment_type: 'increase',
    qty: 0,
    unit_cost: 0,
    remarks: '',
});

import ReportingTagsPanel, { reportingTagsToMap, mapToReportingTagsPayload } from '@/Components/ReportingTagsPanel.jsx';

export default function AdjustmentAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
    const [form] = Form.useForm();
  const [reportingTags, setReportingTags] = useState(() => reportingTagsToMap(initialRecord));
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([emptyLine()]);
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const [purchaseOrderId, setPurchaseOrderId] = useState(null);
    const [purchaseOrderDetail, setPurchaseOrderDetail] = useState(null);
    const [loadingPurchaseOrder, setLoadingPurchaseOrder] = useState(false);
    const baseCurrency = useBaseCurrency(true);
    const warehouseId = Form.useWatch('warehouse_id', form);
    const baseCurrencySymbol = currencySymbolOf(baseCurrency);

    const fetchWarehouseItem = async (productId, selectedWarehouseId) => {
        if (!productId || !selectedWarehouseId) return null;

        const { data } = await axios.get(api('/api/warehouse-items/'), {
            params: {
                product_id: productId,
                warehouse_id: selectedWarehouseId,
                include_zero_stock: 1,
                include_inactive: 1,
                page_size: 1,
            },
            headers: authHeaders(),
        });

        return data?.results?.[0] || null;
    };

    useEffect(() => {
        if (initialRecord) {
            form.setFieldsValue({
                adjustment_no: displayDocumentNumber(initialRecord, 'adjustment_no'),
                adjustment_date: initialRecord.adjustment_date ? dayjs(initialRecord.adjustment_date) : dayjs(),
                warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
                reason: initialRecord.reason || '',
                notes: initialRecord.notes || '',
                remarks: initialRecord.remarks || '',
            });
            if (initialRecord.source_type === 'purchase_order' || initialRecord.purchase_order_id) {
                setPurchaseOrderId(initialRecord.source_id || initialRecord.purchase_order_id || null);
                setPurchaseOrderDetail(initialRecord.purchase_order || initialRecord.purchaseOrder || null);
            }
            const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
            if (lines.length) {
                setItems(lines.map((l) => ({
                    _key: Math.random().toString(36).slice(2),
                    id: l.id,
                    product_id: l.product_id ?? l.product?.id ?? null,
                    product_detail: l.product || l.product_id_detail || null,
                    adjustment_type: l.adjustment_type || 'increase',
                    qty: toNumber(l.qty),
                    unit_cost: toNumber(l.unit_cost),
                    remarks: l.remarks || '',
                })));
            }
        } else {
            const raw = sessionStorage.getItem('kiteledger_inventory_adjustment_prefill');
            if (raw) {
                try {
                    const prefill = JSON.parse(raw);
                    setPurchaseOrderId(prefill.purchase_order_id || prefill.source_id || prefill._source_id || null);
                    setPurchaseOrderDetail(prefill.purchase_order_detail || null);
                    form.setFieldsValue({
                        adjustment_date: dayjs(),
                        adjustment_no: '#DRAFT',
                        reason: prefill.reason || '',
                        notes: prefill.notes || '',
                    });
                    const prefillLines = Array.isArray(prefill.items) ? prefill.items : [];
                    if (prefillLines.length) {
                        setItems(prefillLines.map((line) => ({
                            _key: Math.random().toString(36).slice(2),
                            product_id: line.product_id ?? line.product?.id ?? null,
                            product_detail: line.product_detail || line.product || null,
                            adjustment_type: line.adjustment_type || 'increase',
                            qty: toNumber(line.qty || line.quantity),
                            unit_cost: toNumber(line.unit_cost ?? line.unit_price ?? 0),
                            remarks: line.remarks || '',
                        })));
                    }
                    sessionStorage.removeItem('kiteledger_inventory_adjustment_prefill');
                    return;
                } catch {
                    sessionStorage.removeItem('kiteledger_inventory_adjustment_prefill');
                }
            }

            form.setFieldsValue({ adjustment_date: dayjs(), adjustment_no: '#DRAFT' });
        }
    }, [initialRecord, form]);

    useEffect(() => {
        if (warehouseId) {
            refreshCurrentStock(warehouseId);
        }
    }, [warehouseId]);

    const updateLine = (idx, patch) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx], ...patch }; return n; });
    const updateLineProduct = async (idx, productId, raw) => {
        updateLine(idx, { product_id: productId, product_detail: raw, current_stock: null });
        const item = await fetchWarehouseItem(productId, form.getFieldValue('warehouse_id')).catch(() => null);
        updateLine(idx, {
            current_stock: item ? toNumber(item.qty_on_hand) : 0,
            unit_cost: toNumber(item?.avg_cost ?? raw?.purchase_price ?? 0),
        });
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
        return null;
    };

    const refreshCurrentStock = async (selectedWarehouseId) => {
        const next = await Promise.all(items.map(async (line) => {
            const item = await fetchWarehouseItem(line.product_id, selectedWarehouseId).catch(() => null);
            return {
                ...line,
                current_stock: item ? toNumber(item.qty_on_hand) : 0,
                unit_cost: toNumber(line.unit_cost) || toNumber(item?.avg_cost),
            };
        }));
        setItems(next);
    };

    const loadFromPurchaseOrder = async () => {
        if (!purchaseOrderId) {
            message.warning('Select a purchase order first.');
            return;
        }

        setLoadingPurchaseOrder(true);
        try {
            const { data: purchaseOrder } = await axios.get(api(`/api/purchase-orders/${purchaseOrderId}/`), {
                headers: authHeaders(),
            });
            setPurchaseOrderDetail(purchaseOrder);

            const sourceLines = Array.isArray(purchaseOrder.items)
                ? purchaseOrder.items
                : Array.isArray(purchaseOrder.purchaseOrderLines)
                    ? purchaseOrder.purchaseOrderLines
                    : Array.isArray(purchaseOrder.purchase_order_lines)
                        ? purchaseOrder.purchase_order_lines
                        : [];

            const nextLines = sourceLines
                .filter((line) => line.product_id || line.product?.id)
                .map((line) => ({
                    _key: Math.random().toString(36).slice(2),
                    product_id: line.product_id ?? line.product?.id ?? null,
                    product_detail: line.product || line.product_id_detail || null,
                    adjustment_type: 'increase',
                    qty: toNumber(line.qty || line.quantity),
                    unit_cost: toNumber(line.unit_price ?? line.purchase_price ?? line.product?.purchase_price ?? 0),
                    remarks: line.description || 'Loaded from purchase order',
                }));

            if (!nextLines.length) {
                message.warning('This purchase order has no product lines to load.');
                return;
            }

            setItems(nextLines);
            form.setFieldValue('reason', `Stock received from PO ${purchaseOrder.purchase_order_no || ''}`.trim());
            message.success('Purchase order items loaded.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to load purchase order.');
        } finally {
            setLoadingPurchaseOrder(false);
        }
    };

    const totalItems = items.filter((line) => line.product_id).length;
    const increaseQty = items.filter((line) => line.adjustment_type === 'increase').reduce((sum, line) => sum + toNumber(line.qty), 0);
    const decreaseQty = items.filter((line) => line.adjustment_type === 'decrease').reduce((sum, line) => sum + toNumber(line.qty), 0);
    const totalValue = items.reduce((sum, line) => sum + toNumber(line.qty) * toNumber(line.unit_cost), 0);

    const onSubmit = async () => {
        const v = await form.validateFields().catch(() => null);
        if (!v) return;
        const err = validateLines();
        if (err) { message.error(err); return; }

        const payload = {
      reporting_tags: mapToReportingTagsPayload(reportingTags),
            adjustment_no: v.adjustment_no === '#DRAFT' ? null : nullIfEmpty(v.adjustment_no),
            adjustment_date: v.adjustment_date ? v.adjustment_date.format('YYYY-MM-DD') : null,
            warehouse_id: v.warehouse_id || null,
            reason: nullIfEmpty(v.reason),
            notes: nullIfEmpty(v.notes),
            remarks: nullIfEmpty(v.remarks),
            items: items.map((l) => ({
                ...(l.id ? { id: l.id } : {}),
                product_id: l.product_id,
                adjustment_type: l.adjustment_type || 'increase',
                qty: toNumber(l.qty),
                unit_cost: toNumber(l.unit_cost) || null,
                remarks: nullIfEmpty(l.remarks),
            })),
            deleted_item_ids: deletedItemIds,
        };

        setSubmitting(true);
        try {
            const url = isEdit ? api(`/api/inventory-adjustments/${recordId}/`) : api('/api/inventory-adjustments/');
            const res = await axios({ method: isEdit ? 'patch' : 'post', url, data: payload, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
            message.success(isEdit ? 'Adjustment updated' : 'Adjustment created');
            const id = res?.data?.id;
            if (id) router.visit(route('inventory.adjustments.show', id));
            else router.visit(route('inventory.adjustments.index'));
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
            await axios.post(api(`/api/inventory-adjustments/${recordId}/approve`), {}, { headers: authHeaders() });
            message.success('Adjustment approved and posted');
            router.visit(route('inventory.adjustments.show', recordId));
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
                    quickAddProduct
                    quickAddProductDefaults={{ track_inventory: true }}
                />
            ),
        },
        { title: 'Code / SKU', key: 'code', width: 130, render: (_, row) => productCode(row.product_detail) },
        { title: 'Current Stock', dataIndex: 'current_stock', width: 130, align: 'right', render: (v) => v === null || v === undefined ? '-' : fmtQty(v) },
        {
            title: 'Type', dataIndex: 'adjustment_type', width: 130,
            render: (val, _, idx) => (
                <Select
                    variant="borderless"
                    value={val}
                    style={{ width: '100%' }}
                    options={[{ value: 'increase', label: 'Increase' }, { value: 'decrease', label: 'Decrease' }]}
                    onChange={(v) => updateLine(idx, { adjustment_type: v })}
                />
            ),
        },
        {
            title: 'Qty', dataIndex: 'qty', width: 100, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateLine(idx, { qty: v ?? 0 })} />
            ),
        },
        {
            title: 'Unit Cost', dataIndex: 'unit_cost', width: 130, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateLine(idx, { unit_cost: v ?? 0 })} />
            ),
        },
        { title: 'Value', key: 'value', width: 120, align: 'right', render: (_, row) => moneyWithSymbol(toNumber(row.qty) * toNumber(row.unit_cost), baseCurrencySymbol) },
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
            title={isEdit ? 'Edit Inventory Adjustment' : 'New Inventory Adjustment'}
            headTitle={isEdit ? 'Edit Inventory Adjustment' : 'New Inventory Adjustment'}
            onBack={() => router.visit(route('inventory.adjustments.index'))}
            onCancel={() => router.visit(route('inventory.adjustments.index'))}
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
                <FormSection title="Adjustment details">
                    <Row gutter={16}>
                        <Col xs={24} sm={12} md={16}>
                            <Form.Item label="Warehouse" name="warehouse_id" rules={[{ required: true, message: 'Warehouse is required' }]}>
                                <BackendSelect fkUrl="/api/warehouses/" placeholder="Select warehouse" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Adjustment No" name="adjustment_no">
                                <Input placeholder="Auto-generated" disabled />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Adjustment Date" name="adjustment_date" rules={[{ required: true, message: 'Date is required' }]}>
                                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={16}>
                            <Form.Item label="Reason" name="reason">
                                <Input placeholder="Reason for adjustment" />
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <Form.Item label="Link Purchase Order">
                                <Row gutter={8}>
                                    <Col flex="1">
                                        <BackendSelect
                                            value={purchaseOrderId}
                                            detailValue={purchaseOrderDetail}
                                            fkUrl="/api/purchase-orders/"
                                            labelKey="purchase_order_no"
                                            placeholder="Search purchase order"
                                            extraParams={{ active: true }}
                                            onChange={(value, raw) => {
                                                setPurchaseOrderId(value);
                                                setPurchaseOrderDetail(raw);
                                            }}
                                            allowClear={!isEdit}
                                        />
                                    </Col>
                                    <Col>
                                        <Tooltip title="Load PO product lines as stock increase rows">
                                            <Button
                                                icon={<DownloadOutlined />}
                                                onClick={loadFromPurchaseOrder}
                                                loading={loadingPurchaseOrder}
                                                disabled={!purchaseOrderId || isApproved(initialRecord)}
                                            >
                                                Load PO Items
                                            </Button>
                                        </Tooltip>
                                    </Col>
                                </Row>
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
                        </Col>
                    </Row>
                </FormSection>

                <FormSection title="Adjustment lines">
                    <Table rowKey="_key" size="small" columns={lineColumns} dataSource={items} pagination={false} bordered
                        footer={() => (
                            <Button icon={<PlusOutlined />} onClick={addLine} type="dashed">Add Line</Button>
                        )}
                        summary={() => (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={3}>
                                    <Typography.Text strong>Total Items: {totalItems}</Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3}>
                                    <Typography.Text strong>Increase: {fmtQty(increaseQty)}</Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4}>
                                    <Typography.Text strong>Decrease: {fmtQty(decreaseQty)}</Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} colSpan={2} align="right">
                                    <Typography.Text strong>Total Value: {moneyWithSymbol(totalValue, baseCurrencySymbol)}</Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={7} colSpan={2} />
                            </Table.Summary.Row>
                        )}
                    />
                </FormSection>
              <div style={{ marginTop: 16 }}>
          <ReportingTagsPanel value={reportingTags} onChange={setReportingTags} />
        </div>
      </Form>
        </TransactionFormShell>
    );
}
