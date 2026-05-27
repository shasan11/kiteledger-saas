import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Button, Space, Row, Col, Select, Switch, Table, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import { applyDefaultCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
};
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const nullIfEmpty = (v) => (v === undefined || v === null || v === '' ? null : v);
const formatMoney = (n) => Number(toNumber(n)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyAlloc = () => ({
    _key: Math.random().toString(36).slice(2),
    purchase_bill_id: null,
    purchase_bill_detail: null,
    allocated_amount: 0,
});

export default function SupplierPaymentAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([]);
    const [bankChargesEnabled, setBankChargesEnabled] = useState(false);
    const [tdsEnabled, setTdsEnabled] = useState(false);
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const defaultCurrency = useDefaultCurrency(!isEdit && !initialRecord);

    useEffect(() => {
        if (initialRecord) {
            const hasBC = toNumber(initialRecord.bank_charges) > 0 || !!initialRecord.bank_charges_account_id;
            const hasTDS = toNumber(initialRecord.tds_charges) > 0 || !!initialRecord.tds_charges_account_id;
            setBankChargesEnabled(hasBC);
            setTdsEnabled(hasTDS);
            form.setFieldsValue({
                payment_no: displayDocumentNumber(initialRecord, initialRecord.supplier_payment_no ? 'supplier_payment_no' : 'payment_no'),
                payment_date: initialRecord.payment_date ? dayjs(initialRecord.payment_date) : dayjs(),
                contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
                account_id: initialRecord.account_id ?? initialRecord.account?.id ?? null,
                method: initialRecord.method || null,
                currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
                exchange_rate: initialRecord.exchange_rate ?? 1,
                amount: toNumber(initialRecord.amount),
                bank_charges_account_id: initialRecord.bank_charges_account_id ?? null,
                bank_charges: toNumber(initialRecord.bank_charges),
                tds_charges_account_id: initialRecord.tds_charges_account_id ?? null,
                tds_charges: toNumber(initialRecord.tds_charges),
                reference: initialRecord.reference || '',
                notes: initialRecord.notes || '',
                remarks: initialRecord.remarks || '',
            });
            const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
            setItems(lines.map((l) => ({
                _key: Math.random().toString(36).slice(2),
                id: l.id,
                purchase_bill_id: l.purchase_bill_id ?? l.purchase_bill?.id ?? null,
                purchase_bill_detail: l.purchase_bill || l.purchase_bill_id_detail || null,
                allocated_amount: toNumber(l.allocated_amount),
            })));
        } else {
            try {
                const raw = sessionStorage.getItem('kiteledger_supplier_payment_prefill');
                if (raw) {
                    const p = JSON.parse(raw);
                    form.setFieldsValue({
                        payment_no: '#DRAFT',
                        payment_date: dayjs(),
                        contact_id: p.contact_id || null,
                        currency_id: p.currency_id || null,
                        exchange_rate: toNumber(p.exchange_rate) || 1,
                        amount: toNumber(p.amount),
                        reference: p._source_no || '',
                    });
                    if (Array.isArray(p.items)) {
                        setItems(p.items.map((l) => ({
                            _key: Math.random().toString(36).slice(2),
                            purchase_bill_id: l.purchase_bill_id ?? l.purchase_bill?.id ?? null,
                            purchase_bill_detail: l.purchase_bill || l.purchase_bill_id_detail || null,
                            allocated_amount: toNumber(l.allocated_amount),
                        })));
                    }
                    sessionStorage.removeItem('kiteledger_supplier_payment_prefill');
                    return;
                }
            } catch {}
            form.setFieldsValue({ payment_date: dayjs(), exchange_rate: 1, amount: 0, payment_no: '#DRAFT' });
        }
    }, [initialRecord, form]);

    useEffect(() => {
        if (!initialRecord) applyDefaultCurrency(form, defaultCurrency);
    }, [defaultCurrency, form, initialRecord]);

    const updateItem = (idx, patch) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx], ...patch }; return n; });
    const addItem = () => setItems((p) => [...p, emptyAlloc()]);
    const removeItem = (idx) => setItems((prev) => {
        const l = prev[idx];
        if (l?.id) setDeletedItemIds((ids) => [...ids, l.id]);
        return prev.filter((_, i) => i !== idx);
    });

    const allocated = useMemo(() => items.reduce((s, r) => s + toNumber(r.allocated_amount), 0), [items]);

    const onSubmit = async () => {
        const v = await form.validateFields().catch(() => null);
        if (!v) return;

        const payload = {
            payment_no: v.payment_no === '#DRAFT' ? null : nullIfEmpty(v.payment_no),
            payment_date: v.payment_date ? v.payment_date.format('YYYY-MM-DD') : null,
            contact_id: v.contact_id,
            account_id: v.account_id || null,
            currency_id: v.currency_id || null,
            exchange_rate: toNumber(v.exchange_rate) || 1,
            amount: toNumber(v.amount),
            method: nullIfEmpty(v.method),
            bank_charges_account_id: bankChargesEnabled ? (v.bank_charges_account_id || null) : null,
            bank_charges: bankChargesEnabled && toNumber(v.bank_charges) ? toNumber(v.bank_charges) : null,
            tds_charges_account_id: tdsEnabled ? (v.tds_charges_account_id || null) : null,
            tds_charges: tdsEnabled && toNumber(v.tds_charges) ? toNumber(v.tds_charges) : null,
            reference: nullIfEmpty(v.reference),
            notes: nullIfEmpty(v.notes),
            remarks: nullIfEmpty(v.remarks),
            items: items.filter((l) => l.purchase_bill_id).map((l) => ({
                ...(l.id ? { id: l.id } : {}),
                purchase_bill_id: l.purchase_bill_id,
                allocated_amount: toNumber(l.allocated_amount),
            })),
            deleted_item_ids: deletedItemIds,
        };

        setSubmitting(true);
        try {
            const url = isEdit ? api(`/api/supplier-payments/${recordId}/`) : api('/api/supplier-payments/');
            const res = await axios({ method: isEdit ? 'patch' : 'post', url, data: payload, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
            message.success(isEdit ? 'Payment updated' : 'Payment created');
            const id = res?.data?.id;
            if (id) router.visit(route('payment-out.supplier-payments.show', id));
            else router.visit(route('payment-out.supplier-payments.index'));
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

    const itemColumns = [
        {
            title: 'Purchase Bill', dataIndex: 'purchase_bill_id',
            render: (val, row, idx) => (
                <BackendSelect
                    value={val}
                    detailValue={row.purchase_bill_detail}
                    fkUrl="/api/purchase-bills/"
                    labelKey="bill_no"
                    placeholder="Select bill"
                    style={{ width: '100%' }}
                    variant="borderless"
                    onChange={(v, raw) => updateItem(idx, { purchase_bill_id: v, purchase_bill_detail: raw })}
                />
            ),
        },
        {
            title: 'Allocated Amount', dataIndex: 'allocated_amount', width: 200, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateItem(idx, { allocated_amount: v ?? 0 })} />
            ),
        },
        {
            title: '', key: 'remove', width: 50,
            render: (_, __, idx) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
            ),
        },
    ];

    return (
        <TransactionFormShell
            auth={props.auth}
            title={isEdit ? 'Edit Supplier Payment' : 'New Supplier Payment'}
            headTitle={isEdit ? 'Edit Supplier Payment' : 'New Supplier Payment'}
            onBack={() => router.visit(route('payment-out.supplier-payments.index'))}
            onCancel={() => router.visit(route('payment-out.supplier-payments.index'))}
            onSubmit={onSubmit}
            submitting={submitting}
            submitLabel={isEdit ? 'Update' : 'Save'}
        >
            <Form form={form} layout="vertical" requiredMark>
                <FormSection title="Payment details">
                    <Row gutter={16}>
                        <Col xs={24} sm={16}>
                            <Form.Item label="Supplier" name="contact_id" rules={[{ required: true, message: 'Supplier is required' }]}>
                                <BackendSelect fkUrl="/api/contacts/" extraParams={{ contact_type: 'supplier' }} placeholder="Select supplier" quickAddContact quickAddContactTitle="Supplier" quickAddContactDefaults={{ contact_type: 'supplier' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Payment No" name="payment_no">
                                <Input placeholder="Auto-generated" disabled />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Payment Date" name="payment_date" rules={[{ required: true, message: 'Date is required' }]}>
                                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Payment Account" name="account_id" rules={[{ required: true, message: 'Payment account is required' }]}>
                                <BackendSelect fkUrl="/api/accounts/" labelFn={(r) => [r?.code, r?.name].filter(Boolean).join(' - ')} placeholder="Select account" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Payment Method" name="method">
                                <Select allowClear placeholder="Select method" options={[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'cheque', label: 'Cheque' },
                                    { value: 'bank_transfer', label: 'Bank Transfer' },
                                    { value: 'online', label: 'Online' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Currency" name="currency_id">
                                <BackendSelect fkUrl="/api/currencies/" labelFn={(r) => r?.name || r?.code || ''} placeholder="Currency" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Exchange Rate" name="exchange_rate">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Payment Amount" name="amount" rules={[{ required: true, message: 'Amount is required' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Reference" name="reference">
                                <Input placeholder="Reference" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>

                <FormSection title="Adjustments">
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Space>
                                <Switch checked={bankChargesEnabled} onChange={(v) => { setBankChargesEnabled(v); if (!v) form.setFieldsValue({ bank_charges_account_id: null, bank_charges: 0 }); }} />
                                <Text>Bank charges applicable</Text>
                            </Space>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Space>
                                <Switch checked={tdsEnabled} onChange={(v) => { setTdsEnabled(v); if (!v) form.setFieldsValue({ tds_charges_account_id: null, tds_charges: 0 }); }} />
                                <Text>TDS applicable</Text>
                            </Space>
                        </Col>
                        {bankChargesEnabled && (
                            <>
                                <Col xs={24} sm={12}>
                                    <Form.Item label="Bank Charges Account" name="bank_charges_account_id">
                                        <BackendSelect fkUrl="/api/accounts/" extraParams={{ active: true }} placeholder="Select account" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item label="Bank Charges" name="bank_charges">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </>
                        )}
                        {tdsEnabled && (
                            <>
                                <Col xs={24} sm={12}>
                                    <Form.Item label="TDS Account" name="tds_charges_account_id">
                                        <BackendSelect fkUrl="/api/accounts/" extraParams={{ active: true }} placeholder="Select account" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item label="TDS Amount" name="tds_charges">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </>
                        )}
                    </Row>
                </FormSection>

                <FormSection title="Bill allocations">
                    <Table rowKey="_key" size="small" columns={itemColumns} dataSource={items} pagination={false} bordered
                        locale={{ emptyText: 'No bill allocations yet — payment will be unallocated' }}
                        footer={() => (
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Button icon={<PlusOutlined />} onClick={addItem} type="dashed">Add Bill</Button>
                                <Text>Allocated total: <b>{formatMoney(allocated)}</b></Text>
                            </Space>
                        )}
                    />
                </FormSection>

                <FormSection title="Description &amp; Remarks">
                    <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
                </FormSection>
            </Form>
        </TransactionFormShell>
    );
}
