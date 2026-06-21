import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Button, Space, Row, Col, Table, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import { applyDefaultCurrency, exchangeRateLabel, useBaseCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

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

const emptyLine = () => ({
    _key: Math.random().toString(36).slice(2),
    chart_of_account_id: null,
    account_detail: null,
    description: '',
    tax_rate_id: null,
    tax_detail: null,
    amount: 0,
    tax_amount: 0,
});

import ReportingTagsPanel, { reportingTagsToMap, mapToReportingTagsPayload } from '@/Components/ReportingTagsPanel.jsx';

export default function ExpenseAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
    const [form] = Form.useForm();
  const [reportingTags, setReportingTags] = useState(() => reportingTagsToMap(initialRecord));
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([emptyLine()]);
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const defaultCurrency = useDefaultCurrency(true);
    const baseCurrency = useBaseCurrency(true);

    useEffect(() => {
        if (initialRecord) {
            form.setFieldsValue({
                expense_no: displayDocumentNumber(initialRecord, 'expense_no'),
                expense_date: initialRecord.expense_date ? dayjs(initialRecord.expense_date) : dayjs(),
                due_date: initialRecord.due_date ? dayjs(initialRecord.due_date) : null,
                contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
                currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
                exchange_rate: initialRecord.exchange_rate ?? 1,
                tds_charges_account_id: initialRecord.tds_charges_account_id ?? null,
                notes: initialRecord.notes || '',
                remarks: initialRecord.remarks || '',
            });
            const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
            if (lines.length) {
                setItems(lines.map((l) => ({
                    _key: Math.random().toString(36).slice(2),
                    id: l.id,
                    chart_of_account_id: l.chart_of_account_id ?? l.account?.id ?? null,
                    account_detail: l.account || l.chart_of_account_id_detail || null,
                    description: l.description || '',
                    tax_rate_id: l.tax_rate_id ?? l.tax_rate?.id ?? null,
                    tax_detail: l.tax_rate || l.tax_rate_id_detail || null,
                    amount: toNumber(l.amount),
                    tax_amount: toNumber(l.tax_amount),
                })));
            }
        } else {
            form.setFieldsValue({ expense_date: dayjs(), exchange_rate: 1, expense_no: '#DRAFT' });
        }
    }, [initialRecord, form]);

    useEffect(() => {
        if (!initialRecord) applyDefaultCurrency(form, defaultCurrency);
    }, [defaultCurrency, form, initialRecord]);

    const updateLine = (idx, patch) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx], ...patch }; return n; });
    const addLine = () => setItems((p) => [...p, emptyLine()]);
    const removeLine = (idx) => setItems((prev) => {
        const line = prev[idx];
        if (line?.id) setDeletedItemIds((ids) => [...ids, line.id]);
        const next = prev.filter((_, i) => i !== idx);
        return next.length ? next : [emptyLine()];
    });

    const total = useMemo(() => items.reduce((s, r) => s + toNumber(r?.amount) + toNumber(r?.tax_amount), 0), [items]);

    const validateLines = () => {
        if (!items.length) return 'At least one expense line is required.';
        for (const l of items) {
            if (!l.chart_of_account_id) return 'Every line must have an account.';
            if (toNumber(l.amount) <= 0) return 'Every line must have amount > 0.';
        }
        return null;
    };

    const onSubmit = async () => {
        const v = await form.validateFields().catch(() => null);
        if (!v) return;
        const err = validateLines();
        if (err) { message.error(err); return; }

        const payload = {
      reporting_tags: mapToReportingTagsPayload(reportingTags),
            expense_no: v.expense_no === '#DRAFT' ? null : nullIfEmpty(v.expense_no),
            expense_date: v.expense_date ? v.expense_date.format('YYYY-MM-DD') : null,
            due_date: v.due_date ? v.due_date.format('YYYY-MM-DD') : null,
            contact_id: v.contact_id || null,
            currency_id: v.currency_id || null,
            exchange_rate: toNumber(v.exchange_rate) || 1,
            tds_charges_account_id: v.tds_charges_account_id || null,
            notes: nullIfEmpty(v.notes),
            remarks: nullIfEmpty(v.remarks),
            items: items.map((l) => ({
                ...(l.id ? { id: l.id } : {}),
                chart_of_account_id: l.chart_of_account_id,
                description: nullIfEmpty(l.description),
                tax_rate_id: l.tax_rate_id || null,
                amount: toNumber(l.amount),
                tax_amount: toNumber(l.tax_amount) || null,
                line_total: toNumber(l.amount) + toNumber(l.tax_amount),
            })),
            deleted_item_ids: deletedItemIds,
        };

        setSubmitting(true);
        try {
            const url = isEdit ? api(`/api/expenses/${recordId}/`) : api('/api/expenses/');
            const res = await axios({ method: isEdit ? 'patch' : 'post', url, data: payload, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
            message.success(isEdit ? 'Expense updated' : 'Expense created');
            const id = res?.data?.id;
            if (id) router.visit(route('payment-out.expenses.show', id));
            else router.visit(route('payment-out.expenses.index'));
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

    const lineColumns = [
        {
            title: 'Account', dataIndex: 'chart_of_account_id',
            render: (val, row, idx) => (
                <BackendSelect
                    value={val}
                    detailValue={row.account_detail}
                    fkUrl="/api/chart-of-accounts/"
                    extraParams={{ type: 'expense' }}
                    labelFn={(r) => [r?.code, r?.name].filter(Boolean).join(' - ')}
                    placeholder="Select account"
                    style={{ width: '100%' }}
                    variant="borderless"
                    onChange={(v, raw) => updateLine(idx, { chart_of_account_id: v, account_detail: raw })}
                />
            ),
        },
        {
            title: 'Tax', dataIndex: 'tax_rate_id', width: 180,
            render: (val, row, idx) => (
                <BackendSelect
                    value={val}
                    detailValue={row.tax_detail}
                    fkUrl="/api/tax-rates/"
                    placeholder="No VAT"
                    style={{ width: '100%' }}
                    variant="borderless"
                    onChange={(v, raw) => updateLine(idx, { tax_rate_id: v, tax_detail: raw })}
                />
            ),
        },
        {
            title: 'Amount', dataIndex: 'amount', width: 140, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateLine(idx, { amount: v ?? 0 })} />
            ),
        },
        {
            title: 'Tax Amt', dataIndex: 'tax_amount', width: 130, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateLine(idx, { tax_amount: v ?? 0 })} />
            ),
        },
        {
            title: 'Total', key: 'line_total', width: 130, align: 'right',
            render: (_, row) => <Text>{formatMoney(toNumber(row.amount) + toNumber(row.tax_amount))}</Text>,
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
            title={isEdit ? 'Edit Expense' : 'New Expense'}
            headTitle={isEdit ? 'Edit Expense' : 'New Expense'}
            onBack={() => router.visit(route('payment-out.expenses.index'))}
            onCancel={() => router.visit(route('payment-out.expenses.index'))}
            onSubmit={onSubmit}
            submitting={submitting}
            submitLabel={isEdit ? 'Update' : 'Save'}
        >
            <Form form={form} layout="vertical" requiredMark>
                <FormSection title="Expense details">
                    <Row gutter={16}>
                        <Col xs={24} sm={16}>
                            <Form.Item label="Party / Vendor" name="contact_id">
                                <BackendSelect fkUrl="/api/contacts/" extraParams={{ contact_type: 'supplier', accept_purchase: true }} placeholder="Select party" quickAddContact quickAddContactTitle="Contact" quickAddContactDefaults={{ contact_type: 'supplier', accept_purchase: true }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Expense No" name="expense_no">
                                <Input placeholder="Auto-generated" disabled />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Expense Date" name="expense_date" rules={[{ required: true, message: 'Date is required' }]}>
                                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Due Date" name="due_date">
                                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Currency" name="currency_id">
                                <BackendSelect fkUrl="/api/currencies/" labelFn={(r) => r?.name || r?.code || ''} placeholder="Currency" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label={exchangeRateLabel(baseCurrency)} name="exchange_rate">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item label="TDS Account" name="tds_charges_account_id">
                                <BackendSelect fkUrl="/api/chart-of-accounts/" labelFn={(r) => [r?.code, r?.name].filter(Boolean).join(' - ')} placeholder="Select TDS account" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>

                <FormSection title="Expense lines">
                    <Table rowKey="_key" size="small" columns={lineColumns} dataSource={items} pagination={false} bordered
                        footer={() => (
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Button icon={<PlusOutlined />} onClick={addLine} type="dashed">Add Line</Button>
                                <Text style={{ fontWeight: 700 }}>Total: {formatMoney(total)}</Text>
                            </Space>
                        )}
                    />
                </FormSection>

                <FormSection title="Description &amp; Remarks">
                    <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
                </FormSection>
              <div style={{ marginTop: 16 }}>
          <ReportingTagsPanel value={reportingTags} onChange={setReportingTags} />
        </div>
      </Form>
        </TransactionFormShell>
    );
}
