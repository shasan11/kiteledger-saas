import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
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
import { exchangeRateLabel, useBaseCurrency } from '@/Components/Transactions/defaultCurrency.js';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const nullIfEmpty = (v) => (v === undefined || v === null || v === '' ? null : v);
const formatMoney = (n) => Number(toNumber(n)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyLine = () => ({
    _key: Math.random().toString(36).slice(2),
    to_account_id: null,
    to_account_detail: null,
    amount: 0,
    description: '',
});

import ReportingTagsPanel, { reportingTagsToMap, mapToReportingTagsPayload } from '@/Components/ReportingTagsPanel.jsx';

export default function CashTransferAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
    const [form] = Form.useForm();
  const [reportingTags, setReportingTags] = useState(() => reportingTagsToMap(initialRecord));
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([emptyLine()]);
    const [fromAccountId, setFromAccountId] = useState(null);
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const baseCurrency = useBaseCurrency(true);

    useEffect(() => {
        if (initialRecord) {
            form.setFieldsValue({
                transfer_no: initialRecord.transfer_no || '',
                transfer_date: initialRecord.transfer_date ? dayjs(initialRecord.transfer_date) : dayjs(),
                from_account_id: initialRecord.from_account_id ?? initialRecord.from_account?.id ?? null,
                currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
                exchange_rate: initialRecord.exchange_rate ?? 1,
                reference: initialRecord.reference || '',
                notes: initialRecord.notes || '',
            });
            setFromAccountId(initialRecord.from_account_id ?? initialRecord.from_account?.id ?? null);
            const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
            if (lines.length) {
                setItems(lines.map((l) => ({
                    _key: Math.random().toString(36).slice(2),
                    id: l.id,
                    to_account_id: l.to_account_id ?? l.to_account?.id ?? null,
                    to_account_detail: l.to_account || l.to_account_id_detail || null,
                    amount: toNumber(l.amount),
                    description: l.description || '',
                })));
            }
        } else {
            form.setFieldsValue({ transfer_date: dayjs(), exchange_rate: 1 });
        }
    }, [initialRecord, form]);

    const updateLine = (idx, patch) => {
        setItems((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    };
    const addLine = () => setItems((p) => [...p, emptyLine()]);
    const removeLine = (idx) => setItems((prev) => {
        const line = prev[idx];
        if (line?.id) setDeletedItemIds((ids) => [...ids, line.id]);
        const next = prev.filter((_, i) => i !== idx);
        return next.length ? next : [emptyLine()];
    });

    const total = useMemo(() => items.reduce((s, r) => s + toNumber(r?.amount), 0), [items]);

    const validateLines = () => {
        if (!items.length) return 'At least one transfer line is required.';
        for (const line of items) {
            if (!line.to_account_id) return 'Every transfer line must have a To Account.';
            if (toNumber(line.amount) <= 0) return 'Each transfer line must have an amount > 0.';
            if (fromAccountId && String(line.to_account_id) === String(fromAccountId)) {
                return 'From account and To account cannot be the same.';
            }
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
            transfer_no: nullIfEmpty(v.transfer_no),
            transfer_date: v.transfer_date ? v.transfer_date.format('YYYY-MM-DD') : null,
            from_account_id: v.from_account_id || null,
            currency_id: v.currency_id || null,
            exchange_rate: toNumber(v.exchange_rate) || 1,
            reference: nullIfEmpty(v.reference),
            notes: nullIfEmpty(v.notes),
            items: items.map((l) => ({
                ...(l.id ? { id: l.id } : {}),
                to_account_id: l.to_account_id,
                amount: toNumber(l.amount),
                description: nullIfEmpty(l.description),
            })),
            deleted_item_ids: deletedItemIds,
        };

        setSubmitting(true);
        try {
            const url = isEdit ? api(`/api/cash-transfers/${recordId}/`) : api('/api/cash-transfers/');
            const res = await axios({ method: isEdit ? 'patch' : 'post', url, data: payload, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
            message.success(isEdit ? 'Transfer updated' : 'Transfer created');
            const id = res?.data?.id;
            if (id) router.visit(route('accounting.cash-transfers.show', id));
            else router.visit(route('accounting.cash-transfers.index'));
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
            title: 'To Account', dataIndex: 'to_account_id',
            render: (val, row, idx) => (
                <BackendSelect
                    value={val}
                    detailValue={row.to_account_detail}
                    fkUrl="/api/accounts/"
                    extraParams={{ active: true, nature: 'bank' }}
                    labelFn={(r) => [r?.code, r?.name].filter(Boolean).join(' - ')}
                    placeholder="Select account"
                    style={{ width: '100%' }}
                    variant="borderless"
                    onChange={(v, raw) => updateLine(idx, { to_account_id: v, to_account_detail: raw })}
                />
            ),
        },
        {
            title: 'Description', dataIndex: 'description', width: 280,
            render: (val, _, idx) => (
                <Input variant="borderless" value={val} onChange={(e) => updateLine(idx, { description: e.target.value })} placeholder="Optional" />
            ),
        },
        {
            title: 'Amount', dataIndex: 'amount', width: 160, align: 'right',
            render: (val, _, idx) => (
                <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateLine(idx, { amount: v ?? 0 })} />
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
            title={isEdit ? 'Edit Cash Transfer' : 'New Cash Transfer'}
            headTitle={isEdit ? 'Edit Cash Transfer' : 'New Cash Transfer'}
            onBack={() => router.visit(route('accounting.cash-transfers.index'))}
            onCancel={() => router.visit(route('accounting.cash-transfers.index'))}
            onSubmit={onSubmit}
            submitting={submitting}
            submitLabel={isEdit ? 'Update' : 'Save'}
        >
            <Form form={form} layout="vertical" requiredMark>
                <FormSection title="Transfer details">
                    <Row gutter={16}>
                        <Col xs={24} sm={12} md={16}>
                            <Form.Item label="From Account" name="from_account_id" rules={[{ required: true, message: 'From Account is required' }]}>
                                <BackendSelect
                                    fkUrl="/api/accounts/"
                                    extraParams={{ active: true, nature: 'bank' }}
                                    labelFn={(r) => [r?.code, r?.name].filter(Boolean).join(' - ')}
                                    placeholder="Select account"
                                    onChange={(v) => { form.setFieldValue('from_account_id', v); setFromAccountId(v); }}
                                />
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
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label="Currency" name="currency_id" rules={[{ required: true, message: 'Currency is required' }]}>
                                <BackendSelect fkUrl="/api/currencies/" labelFn={(r) => r?.name || r?.code || ''} placeholder="Select currency" />
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

                <FormSection title="Transfer lines">
                    <Table
                        rowKey="_key"
                        size="small"
                        columns={lineColumns}
                        dataSource={items}
                        pagination={false}
                        bordered
                        footer={() => (
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Button icon={<PlusOutlined />} onClick={addLine} type="dashed">Add Line</Button>
                                <Text style={{ fontWeight: 700 }}>Total: {formatMoney(total)}</Text>
                            </Space>
                        )}
                    />
                </FormSection>

                <FormSection title="Additional">
                    <Row>
                        <Col xs={24}>
                            <Form.Item label="Notes" name="notes">
                                <Input.TextArea rows={3} placeholder="Notes" />
                            </Form.Item>
                        </Col>
                    </Row>
                </FormSection>
              <div style={{ marginTop: 16 }}>
          <ReportingTagsPanel value={reportingTags} onChange={setReportingTags} />
        </div>
      </Form>
        </TransactionFormShell>
    );
}
