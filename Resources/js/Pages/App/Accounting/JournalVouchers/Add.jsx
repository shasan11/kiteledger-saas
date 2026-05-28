import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Form,
    Input,
    InputNumber,
    DatePicker,
    Button,
    Space,
    Row,
    Col,
    Table,
    message,
    Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import { applyDefaultCurrency, exchangeRateLabel, useBaseCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
const nullIfEmpty = (v) => (v === undefined || v === null || v === '' ? null : v);

const lineTotals = (items = []) => {
    const debit = items.reduce((s, r) => s + toNumber(r?.debit), 0);
    const credit = items.reduce((s, r) => s + toNumber(r?.credit), 0);
    const difference = Math.round((debit - credit) * 100) / 100;
    return { debit, credit, difference };
};

const formatMoney = (n) =>
    Number(toNumber(n)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyLine = () => ({
    _key: Math.random().toString(36).slice(2),
    account_id: null,
    account_detail: null,
    description: '',
    debit: 0,
    credit: 0,
});

export default function JournalVoucherAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([emptyLine(), emptyLine()]);
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const [currencyDetail, setCurrencyDetail] = useState(null);
    const defaultCurrency = useDefaultCurrency(true);
    const baseCurrency = useBaseCurrency(true);

    useEffect(() => {
        if (initialRecord) {
            form.setFieldsValue({
                voucher_no: initialRecord.voucher_no || '',
                voucher_date: initialRecord.voucher_date ? dayjs(initialRecord.voucher_date) : dayjs(),
                currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
                exchange_rate: initialRecord.exchange_rate ?? 1,
                reference: initialRecord.reference || '',
                narration: initialRecord.narration || '',
                remarks: initialRecord.remarks || '',
            });
            setCurrencyDetail(initialRecord.currency || initialRecord.currency_id_detail || null);
            const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
            if (lines.length) {
                setItems(lines.map((l) => ({
                    _key: Math.random().toString(36).slice(2),
                    id: l.id,
                    account_id: l.account_id ?? l.account?.id ?? null,
                    account_detail: l.account || l.account_id_detail || null,
                    description: l.description || '',
                    debit: toNumber(l.debit),
                    credit: toNumber(l.credit),
                })));
            }
        } else {
            form.setFieldsValue({ voucher_date: dayjs(), exchange_rate: 1 });
        }
    }, [initialRecord, form]);

    useEffect(() => {
        if (!initialRecord) applyDefaultCurrency(form, defaultCurrency, setCurrencyDetail);
    }, [defaultCurrency, form, initialRecord]);

    const updateLine = (index, patch) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const removeLine = (index) => {
        setItems((prev) => {
            const line = prev[index];
            if (line?.id) setDeletedItemIds((ids) => [...ids, line.id]);
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [emptyLine()];
        });
    };

    const addLine = () => {
        const { difference } = lineTotals(items);
        const amount = Math.abs(difference);
        const line = emptyLine();
        if (amount >= 0.01) {
            line.debit = difference < 0 ? amount : 0;
            line.credit = difference > 0 ? amount : 0;
        }
        setItems((prev) => [...prev, line]);
    };

    const totals = useMemo(() => lineTotals(items), [items]);
    const balanced = Math.abs(totals.difference) < 0.01;

    const validateLines = () => {
        if (!items.length) return 'At least one journal line is required.';
        for (const line of items) {
            if (!line.account_id) return 'Every journal line must have an account.';
            const d = toNumber(line.debit), c = toNumber(line.credit);
            if (d <= 0 && c <= 0) return 'Each journal line must have a debit or credit amount.';
            if (d > 0 && c > 0) return 'A journal line cannot have both debit and credit.';
        }
        if (!balanced) return `Journal voucher is not balanced. Difference: ${formatMoney(totals.difference)}.`;
        return null;
    };

    const onSubmit = async () => {
        const fieldValues = await form.validateFields().catch(() => null);
        if (!fieldValues) return;
        const lineErr = validateLines();
        if (lineErr) { message.error(lineErr); return; }

        const payload = {
            voucher_no: nullIfEmpty(fieldValues.voucher_no),
            voucher_date: fieldValues.voucher_date ? fieldValues.voucher_date.format('YYYY-MM-DD') : null,
            currency_id: fieldValues.currency_id || null,
            exchange_rate: toNumber(fieldValues.exchange_rate) || null,
            reference: nullIfEmpty(fieldValues.reference),
            narration: nullIfEmpty(fieldValues.narration),
            remarks: nullIfEmpty(fieldValues.remarks),
            notes: nullIfEmpty(fieldValues.notes),
            items: items.map((l) => ({
                ...(l.id ? { id: l.id } : {}),
                account_id: l.account_id,
                description: nullIfEmpty(l.description),
                debit: toNumber(l.debit),
                credit: toNumber(l.credit),
            })),
            deleted_item_ids: deletedItemIds,
        };

        setSubmitting(true);
        try {
            const url = isEdit ? api(`/api/journal-vouchers/${recordId}/`) : api('/api/journal-vouchers/');
            const res = await axios({ method: isEdit ? 'patch' : 'post', url, data: payload, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
            message.success(isEdit ? 'Voucher updated' : 'Voucher created');
            const id = res?.data?.id;
            if (id) router.visit(route('accounting.journal-vouchers.show', id));
            else router.visit(route('accounting.journal-vouchers.index'));
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
            } else { message.error('Save failed'); }
        } finally { setSubmitting(false); }
    };

    const lineColumns = [
        {
            title: 'Account',
            dataIndex: 'account_id',
            render: (val, row, idx) => (
                <BackendSelect
                    value={val}
                    detailValue={row.account_detail}
                    fkUrl="/api/accounts/"
                    labelFn={(r) => [r?.code, r?.name].filter(Boolean).join(' - ')}
                    placeholder="Select account"
                    style={{ width: '100%' }}
                    variant="borderless"
                    onChange={(v, raw) => updateLine(idx, { account_id: v, account_detail: raw })}
                />
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            width: 240,
            render: (val, _, idx) => (
                <Input variant="borderless" value={val} onChange={(e) => updateLine(idx, { description: e.target.value })} placeholder="Optional" />
            ),
        },
        {
            title: 'Debit', dataIndex: 'debit', width: 140, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%', textAlign: 'right' }} onChange={(v) => updateLine(idx, { debit: v ?? 0 })} />
            ),
        },
        {
            title: 'Credit', dataIndex: 'credit', width: 140, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%', textAlign: 'right' }} onChange={(v) => updateLine(idx, { credit: v ?? 0 })} />
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
            title={isEdit ? 'Edit Journal Voucher' : 'New Journal Voucher'}
            headTitle={isEdit ? 'Edit Journal Voucher' : 'New Journal Voucher'}
            onBack={() => router.visit(route('accounting.journal-vouchers.index'))}
            onCancel={() => router.visit(route('accounting.journal-vouchers.index'))}
            onSubmit={onSubmit}
            submitting={submitting}
            submitLabel={isEdit ? 'Update' : 'Save'}
        >
            <Form form={form} layout="vertical" requiredMark>
                <FormSection title="Voucher details">
                    <Row gutter={16}>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Voucher No" name="voucher_no">
                                <Input placeholder="Auto-generated" disabled />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Voucher Date" name="voucher_date" rules={[{ required: true, message: 'Date is required' }]}>
                                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Currency" name="currency_id">
                                <BackendSelect
                                    fkUrl="/api/currencies/"
                                    labelFn={(r) => [r?.code, r?.name].filter(Boolean).join(' - ')}
                                    placeholder="Select currency"
                                    detailValue={currencyDetail}
                                    onChange={(v, raw) => {
                                        form.setFieldValue('currency_id', v);
                                        setCurrencyDetail(raw);
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label={exchangeRateLabel(baseCurrency)} name="exchange_rate">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Reference" name="reference">
                                <Input placeholder="Reference" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>

                <FormSection>
                    <Table
                        rowKey="_key"
                        size="small"
                        columns={lineColumns}
                        dataSource={items}
                        pagination={false}
                       
                        footer={() => (
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Button icon={<PlusOutlined />} onClick={addLine} type="dashed">Add Line</Button>
                                <Space size="large">
                                    <Text>Total Debit: <b>{formatMoney(totals.debit)}</b></Text>
                                    <Text>Total Credit: <b>{formatMoney(totals.credit)}</b></Text>
                                    <Text style={{ color: balanced ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                                        Difference: {formatMoney(Math.abs(totals.difference))}
                                    </Text>
                                </Space>
                            </Space>
                        )}
                    />
                </FormSection>

                <FormSection title="Description &amp; Remarks">
                    <DescriptionRemarksCollapse descriptionName="narration" remarksName="remarks" />
                </FormSection>
            </Form>
        </TransactionFormShell>
    );
}
