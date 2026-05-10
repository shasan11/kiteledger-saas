import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Switch, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ReusableCrud';
import { STATUS_TABS_BY_MODULE, buildStandardFilters, formatMoney, renderApprovedTag, renderOverdueTag, renderStatusTag } from '@/Pages/App/FinanceConfigs';

const { Text } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => formatMoney(v, 'en-US');
const fmtDate = (v) => {
    if (!v) return null;
    const d = dayjs(v, 'DD-MM-YYYY', true);
    if (d.isValid()) return d.format('YYYY-MM-DD');
    const d2 = dayjs(v);
    return d2.isValid() ? d2.format('YYYY-MM-DD') : v;
};

const PAYMENT_METHOD_OPTIONS = [
    { value: 'cash',          label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque',        label: 'Cheque' },
    { value: 'online',        label: 'Online Payment' },
    { value: 'card',          label: 'Card' },
];

const TDS_TYPE_OPTIONS = [
    { value: 'percent', label: 'Percentage (%)' },
    { value: 'amount',  label: 'Fixed Amount' },
];

const STATUS_COLORS = { draft: 'default', posted: 'blue', cancelled: 'red' };

const CANONICAL_SERIALIZER_KEYS = {
    header: ['payment_no', 'payment_date', 'contact_id', 'account_id', 'currency_id', 'exchange_rate', 'amount', 'payment_method', 'reference', 'notes', 'status'],
    optionalCharges: ['bank_charges_account_id', 'bank_charges', 'tds_charges_account_id', 'tds_type', 'tds_charges'],
    lines: 'payment_lines',
    lineKeys: ['purchase_bill_id', 'allocated_amount'],
};

const emptyItem = { purchase_bill_id: null, purchase_bill_id_detail: null, bill_label: '', allocated_amount: 0 };

const initialValues = {
    payment_no:               '',
    payment_date:             dayjs().format('YYYY-MM-DD'),
    contact_id:               null,
    contact_id_detail:        null,
    contact_label:            '',
    account_id:               null,
    account_id_detail:        null,
    account_label:            '',
    currency_id:              null,
    currency_id_detail:       null,
    currency_label:           '',
    exchange_rate:            1,
    amount:                   0,
    method:                   null,
    reference:                '',
    notes:                    '',
    status:                   'draft',
    // bank charges
    _bank_charges_on:         false,
    bank_charges_account_id:  null,
    bank_charges_account_id_detail: null,
    bank_charges_account_label: '',
    bank_charges:             0,
    // tds
    _tds_on:                  false,
    tds_charges_account_id:   null,
    tds_charges_account_id_detail: null,
    tds_charges_account_label: '',
    tds_type:                 null,
    tds_charges:              0,
    // lines
    items: [{ ...emptyItem }],
    deleted_item_ids: [],
};

const validationSchema = Yup.object().shape({
    contact_id:   Yup.string().nullable().required('Supplier is required'),
    account_id:   Yup.string().nullable().required('Account is required'),
    payment_date: Yup.string().required('Date is required'),
    amount:       Yup.number().typeError('Amount required').min(0.0001, 'Must be > 0').required('Amount is required'),
    exchange_rate: Yup.number().typeError('Exchange rate required').min(0.0001, 'Must be > 0').required(),
    bank_charges_account_id: Yup.string().nullable().when('_bank_charges_on', {
        is: true, then: s => s.required('Bank charges account required'), otherwise: s => s.nullable(),
    }),
    bank_charges: Yup.number().when('_bank_charges_on', {
        is: true, then: s => s.min(0).required('Bank charges amount required'), otherwise: s => s.nullable(),
    }),
    tds_charges_account_id: Yup.string().nullable().when('_tds_on', {
        is: true, then: s => s.required('TDS account required'), otherwise: s => s.nullable(),
    }),
    tds_type: Yup.string().nullable().when('_tds_on', {
        is: true, then: s => s.required('TDS type required'), otherwise: s => s.nullable(),
    }),
    tds_charges: Yup.number().when('_tds_on', {
        is: true, then: s => s.min(0).required('TDS amount required'), otherwise: s => s.nullable(),
    }),
    items: Yup.array().of(
        Yup.object().shape({
            purchase_bill_id: Yup.string().nullable().required('Bill is required'),
            allocated_amount: Yup.number().typeError('Amount required').min(0.0001, 'Must be > 0').required('Amount required'),
        })
    ).min(1, 'At least one bill line is required'),
});

export default function SupplierPayments() {
    const columns = useMemo(() => [
        {
            title: 'Payment #',
            dataIndex: 'payment_no',
            key: 'payment_no',
            width: 150,
            sorter: true,
            render: v => <Text strong style={{ color: '#7c3aed' }}>{v || 'DRAFT'}</Text>,
        },
        {
            title: 'Date',
            dataIndex: 'payment_date',
            key: 'payment_date',
            width: 120,
            sorter: true,
            render: v => v ? dayjs(v).format('DD-MM-YYYY') : '-',
        },
        {
            title: 'Supplier',
            dataIndex: 'contact',
            key: 'contact',
            width: 220,
            render: (_, r) => r?.contact?.display_name || r?.contact?.company_name || r?.contact?.name || '-',
        },
        {
            title: 'Paid From',
            dataIndex: 'account',
            key: 'account',
            width: 180,
            render: (_, r) => r?.account?.name || r?.account?.display_name || '-',
        },
        {
            title: 'Method',
            dataIndex: 'method',
            key: 'method',
            width: 130,
            render: v => PAYMENT_METHOD_OPTIONS.find(o => o.value === v)?.label || (v || '-'),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 140,
            align: 'right',
            sorter: true,
            render: v => <Text strong>{money(v)}</Text>,
        },
        {
            title: 'Bank Charges',
            dataIndex: 'bank_charges',
            key: 'bank_charges',
            width: 120,
            align: 'right',
            render: v => toNum(v) > 0 ? money(v) : <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: 'TDS',
            dataIndex: 'tds_charges',
            key: 'tds_charges',
            width: 100,
            align: 'right',
            render: v => toNum(v) > 0 ? money(v) : <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: renderStatusTag(STATUS_COLORS, 'draft'),
        },
        {
            title: 'Approved',
            dataIndex: 'approved',
            key: 'approved',
            width: 100,
            render: renderApprovedTag,
        },
        {
            title: 'Overdue',
            dataIndex: 'due_date',
            key: 'overdue',
            width: 100,
            render: renderOverdueTag,
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 110,
            sorter: true,
            render: v => v ? dayjs(v).format('DD-MM-YYYY') : '-',
        },
    ], []);

    const fields = useMemo(() => [
        // ── Header row ─────────────────────────────────────────────────────
        {
            name: 'contact_id',
            label: 'Supplier',
            type: 'fkSelect',
            required: true,
            col: 12,
            placeholder: 'Select supplier…',
            fkUrl: api('/api/contacts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'display_name',
            labelField: 'contact_label',
            fkExtraParams: { active: true },
            fkLabel: r => r?.display_name || r?.company_name || r?.person_name || r?.name || '',
        },
        {
            name: 'account_id',
            label: 'Paid From Account',
            type: 'fkSelect',
            required: true,
            col: 12,
            placeholder: 'Select account…',
            fkUrl: api('/api/accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            labelField: 'account_label',
            fkLabel: r => r?.name || r?.display_name || r?.account_name || '',
        },
        {
            name: 'payment_no',
            label: 'Payment #',
            col: 8,
            placeholder: 'Auto-generated or enter manually',
        },
        {
            name: 'payment_date',
            label: 'Payment Date',
            type: 'datePicker',
            required: true,
            col: 8,
            format: 'DD-MM-YYYY',
            placeholder: 'Select date',
        },
        {
            name: 'method',
            label: 'Payment Method',
            type: 'select',
            col: 8,
            placeholder: 'Select method',
            options: PAYMENT_METHOD_OPTIONS,
        },
        {
            name: 'amount',
            label: 'Amount Paid',
            type: 'number',
            required: true,
            col: 8,
            min: 0,
            placeholder: '0.00',
        },
        {
            name: 'currency_id',
            label: 'Currency',
            type: 'fkSelect',
            col: 8,
            placeholder: 'Currency',
            fkUrl: api('/api/currencies/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            labelField: 'currency_label',
            fkLabel: r => `${r?.code || ''} – ${r?.name || ''}`.trim().replace(/^–\s*/, ''),
        },
        {
            name: 'exchange_rate',
            label: 'Exchange Rate',
            type: 'number',
            col: 8,
            min: 0,
            placeholder: '1.00',
        },
        {
            name: 'reference',
            label: 'Reference',
            col: 24,
            placeholder: 'Cheque no, transaction ID, etc.',
        },

        // ── Bank Charges ──────────────────────────────────────────────────
        {
            name: '_bank_charges_on',
            type: 'custom',
            col: 24,
            render: ({ values, setFieldValue }) => (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Switch
                        size="small"
                        checked={!!values._bank_charges_on}
                        onChange={v => setFieldValue('_bank_charges_on', v)}
                    />
                    <Text strong style={{ fontSize: 13 }}>Bank Charges</Text>
                </div>
            ),
        },
        {
            name: 'bank_charges_account_id',
            label: 'Bank Charges Account',
            type: 'fkSelect',
            col: 12,
            placeholder: 'Select charges account…',
            fkUrl: api('/api/chart-of-accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            labelField: 'bank_charges_account_label',
            fkLabel: r => r?.name || r?.display_name || '',
            condition: v => !!v._bank_charges_on,
        },
        {
            name: 'bank_charges',
            label: 'Bank Charges Amount',
            type: 'number',
            col: 12,
            min: 0,
            placeholder: '0.00',
            condition: v => !!v._bank_charges_on,
        },

        // ── TDS ───────────────────────────────────────────────────────────
        {
            name: '_tds_on',
            type: 'custom',
            col: 24,
            render: ({ values, setFieldValue }) => (
                <div style={{ paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Switch
                        size="small"
                        checked={!!values._tds_on}
                        onChange={v => setFieldValue('_tds_on', v)}
                    />
                    <Text strong style={{ fontSize: 13 }}>TDS (Tax Deducted at Source)</Text>
                </div>
            ),
        },
        {
            name: 'tds_charges_account_id',
            label: 'TDS Account',
            type: 'fkSelect',
            col: 8,
            placeholder: 'Select TDS account…',
            fkUrl: api('/api/chart-of-accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            labelField: 'tds_charges_account_label',
            fkLabel: r => r?.name || r?.display_name || '',
            condition: v => !!v._tds_on,
        },
        {
            name: 'tds_type',
            label: 'TDS Type',
            type: 'select',
            col: 8,
            placeholder: 'Select type',
            options: TDS_TYPE_OPTIONS,
            condition: v => !!v._tds_on,
        },
        {
            name: 'tds_charges',
            label: 'TDS Amount',
            type: 'number',
            col: 8,
            min: 0,
            placeholder: '0.00',
            condition: v => !!v._tds_on,
        },

        // ── Bill Allocation Lines ─────────────────────────────────────────
        {
            name: '_lines_title',
            type: 'custom',
            col: 24,
            render: () => (
                <div style={{ borderTop: '2px solid #f0f0f0', marginTop: 16, paddingTop: 16, fontWeight: 700, fontSize: 14, color: '#374151' }}>
                    Bill Allocation
                </div>
            ),
        },
        {
            name: '_allocation_actions_hint',
            type: 'custom',
            col: 24,
            render: () => (
                <div style={{ marginTop: -2, marginBottom: 8, color: '#6b7280', fontSize: 12 }}>
                    Actions: Print Payment Voucher • Auto Allocate Oldest First
                </div>
            ),
        },
        {
            name: 'items',
            label: '',
            type: 'objectArray',
            col: 24,
            headerBg: '#3b1f6b',
            headerColor: '#ffffff',
            addButtonLabel: '+ Add Allocation Line',
            defaultItem: { ...emptyItem },
            columns: [
                {
                    key: 'purchase_bill_id',
                    name: 'purchase_bill_id',
                    label: 'Purchase Bill',
                    type: 'fkSelect',
                    width: '3fr',
                    placeholder: 'Select bill…',
                    fkUrl: api('/api/purchase-bills/'),
                    fkSearchParam: 'search',
                    fkPageSize: 20,
                    fkValueKey: 'id',
                    fkLabelKey: 'bill_no',
                    labelField: 'bill_label',
                    fkLabel: r => {
                        const no   = r?.bill_no || '';
                        const date = r?.bill_date ? dayjs(r.bill_date).format('DD-MM-YYYY') : '';
                        const total = r?.total ? money(r.total) : '';
                        return [no, date, total].filter(Boolean).join(' | ');
                    },
                },
                {
                    key: 'allocated_amount',
                    name: 'allocated_amount',
                    label: 'Allocated Amount',
                    type: 'number',
                    width: '160px',
                    min: 0,
                    placeholder: '0.00',
                },
            ],
        },

        // ── Totals summary ─────────────────────────────────────────────────
        {
            name: '_totals_summary',
            type: 'custom',
            col: 24,
            render: ({ values }) => {
                const totalAllocated = (values.items || []).reduce((s, r) => s + toNum(r.allocated_amount), 0);
                const paymentAmt     = toNum(values.amount);
                const unallocated    = paymentAmt - totalAllocated;
                const over           = unallocated < 0;
                return (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, padding: '12px 0', borderTop: '1px solid #f0f0f0', marginTop: 4 }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>PAYMENT AMOUNT</div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{money(paymentAmt)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>TOTAL ALLOCATED</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: over ? '#ef4444' : '#374151' }}>{money(totalAllocated)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>UNALLOCATED</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: over ? '#ef4444' : '#16a34a' }}>
                                {over ? '-' : ''}{money(Math.abs(unallocated))}
                            </div>
                        </div>
                    </div>
                );
            },
        },

        // ── Notes ─────────────────────────────────────────────────────────
        {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
            col: 24,
            rows: 3,
            placeholder: 'Internal notes (will appear on print)',
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            col: 8,
            options: [
                { value: 'draft',     label: 'Draft' },
                { value: 'posted',    label: 'Posted' },
                { value: 'cancelled', label: 'Cancelled' },
            ],
        },
    ], []);

    const transformPayload = (v) => {
        // UI-form keys are normalized into serializer canonical keys using ReusableCrud submit hooks.
        const bankChargesOn = !!v._bank_charges_on;
        const tdsOn         = !!v._tds_on;
        return {
            payment_no:              v.payment_no && v.payment_no !== 'DRAFT' ? v.payment_no : null,
            payment_date:            fmtDate(v.payment_date),
            contact_id:              v.contact_id,
            account_id:              v.account_id,
            currency_id:             v.currency_id || null,
            exchange_rate:           toNum(v.exchange_rate || 1),
            amount:                  toNum(v.amount),
            method:                  v.method || null,
            reference:               v.reference?.trim() || null,
            notes:                   v.notes?.trim() || null,
            status:                  v.status || 'draft',
            bank_charges_account_id: bankChargesOn ? v.bank_charges_account_id : null,
            bank_charges:            bankChargesOn ? toNum(v.bank_charges) : 0,
            tds_charges_account_id:  tdsOn ? v.tds_charges_account_id : null,
            tds_type:                tdsOn ? v.tds_type : null,
            tds_charges:             tdsOn ? toNum(v.tds_charges) : 0,
            items: (v.items || []).map(row => ({
                ...(row.id ? { id: row.id } : {}),
                purchase_bill_id: row.purchase_bill_id,
                allocated_amount: toNum(row.allocated_amount),
            })),
            deleted_item_ids: Array.isArray(v.deleted_item_ids) ? v.deleted_item_ids : [],
        };
    };

    const transformRecord = (record) => {
        const r = { ...record };
        r._bank_charges_on = toNum(r.bank_charges) > 0 || !!r.bank_charges_account_id;
        r._tds_on          = toNum(r.tds_charges)  > 0 || !!r.tds_charges_account_id;
        r.exchange_rate    = toNum(r.exchange_rate || 1);
        if (!r.items || r.items.length === 0) r.items = [{ ...emptyItem }];
        return r;
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Supplier Payments</h2>}>
            <Head title="Supplier Payments" />
            <ReusableCrud
                title="Supplier Payments"
                apiUrl={api('/api/supplier-payments/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={initialValues}
                transformPayload={transformPayload}
                beforeCreatePayload={(payload) => payload}
                beforeUpdatePayload={(payload) => payload}
                transformRecord={transformRecord}
                form_ui="drawer"
                drawerWidth="calc(100vw - 28px)"
                enableServerPagination
                pageParam="page"
                pageSizeParam="page_size"
                searchParam="search"
                activeParam="active"
                sortMode="ordering"
                orderingParam="ordering"
                defaultSortField="created_at"
                defaultSortOrder="descend"
                anchorFilters={[
                    { key: 'approved', label: 'Approved', params: { approved: true } },
                    { key: 'draft',  label: 'Draft',  params: { approved: false } },
                    { key: 'all',    label: 'All',    params: {} },
                ]}
                defaultAnchorKey="approved"
                anchorSyncWithHash
                showViewColumn
                viewPathBuilder={(record) => route('payment-out.supplier-payments.show', record.id)}
                showSearch
                serverFilters={buildStandardFilters()}
                canAdd canEdit canDelete canView hasActions hasActionColumns
            />
        </AuthenticatedLayout>
    );
}
