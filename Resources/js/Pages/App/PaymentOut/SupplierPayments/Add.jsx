import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Space, Switch, Typography } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const asId = (v) => { if (v === undefined || v === null || v === '') return null; if (typeof v === 'object') return v.id ?? v.value ?? null; return v; };
const nullIfEmpty = (v) => { if (v === undefined || v === null || v === '') return null; return v; };
const formatDate = (v) => {
    if (!v) return null;
    if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
    const p = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
    if (p.isValid()) return p.format('YYYY-MM-DD');
    const f = dayjs(v);
    return f.isValid() ? f.format('YYYY-MM-DD') : null;
};

const { Text } = Typography;

const bankChargesEnabled = (values = {}) =>
    values._bank_charges_applicable ?? (toNumber(values.bank_charges) > 0 || !!asId(values.bank_charges_account_id));

const tdsEnabled = (values = {}) =>
    values._tds_applicable ?? (toNumber(values.tds_charges) > 0 || !!asId(values.tds_charges_account_id));

export default function SupplierPaymentAdd(props) {
    const [prefillData, setPrefillData] = useState(null);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('kiteledger_supplier_payment_prefill');
            if (raw) {
                sessionStorage.removeItem('kiteledger_supplier_payment_prefill');
                setPrefillData(JSON.parse(raw));
            }
        } catch {}
    }, []);

    const fields = useMemo(() => [
        {
            name: 'contact_id', label: 'Supplier', type: 'fkSelect', required: true, col: 16,
            placeholder: 'Select Supplier',
            fkUrl: api('/api/contacts/?contact_type=supplier'),
            fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
            quickAdd: {
                title: 'Supplier',
                buttonLabel: 'Add New Supplier',
                apiUrl: api('/api/contacts/'),
                initialValues: { contact_type: 'supplier', type: 'supplier', name: '', phone: '', email: '', address: '', active: true },
                validationSchema: Yup.object({ name: Yup.string().required('Supplier name is required') }),
                fields: [
                    { name: 'name', label: 'Supplier Name', type: 'text', col: 24, required: true },
                    { name: 'phone', label: 'Phone', type: 'phone', col: 12, defaultCountryCode: '+977' },
                    { name: 'email', label: 'Email', type: 'text', col: 12 },
                    { name: 'address', label: 'Address', type: 'textarea', col: 24, rows: 2 },
                ],
                transformPayload: (v) => ({ ...v, contact_type: v.contact_type || 'supplier', type: v.type || 'supplier', active: true }),
            },
        },
        { name: 'payment_no', label: 'Payment No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'payment_date', label: 'Payment Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'account_id', label: 'Payment Account', type: 'fkSelect', col: 8, placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'method', label: 'Payment Method', type: 'select', col: 8, options: [{ value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'online', label: 'Online' }] },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '', onSelectRecord: (r, v) => ({ ...v, currency_id: r, exchange_rate: toNumber(r?.exchange_rate) || toNumber(v?.exchange_rate) || 1 }) },
        { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 8, min: 0.000001 },
        { name: 'amount', label: 'Payment Amount', type: 'number', required: true, col: 8, min: 0.000001 },
        {
            name: '_bank_charges_applicable',
            label: 'Bank Charges',
            type: 'custom',
            col: 8,
            render: ({ values, setFieldValue }) => (
                <Space align="center">
                    <Switch
                        checked={!!bankChargesEnabled(values)}
                        onChange={(checked) => {
                            setFieldValue('_bank_charges_applicable', checked);
                            if (!checked) {
                                setFieldValue('bank_charges_account_id', null);
                                setFieldValue('bank_charges_account_id_detail', null, false);
                                setFieldValue('bank_charges', 0);
                            }
                        }}
                    />
                    <Text>Bank Charges Applicable</Text>
                </Space>
            ),
        },
        {
            name: '_tds_applicable',
            label: 'TDS',
            type: 'custom',
            col: 8,
            render: ({ values, setFieldValue }) => (
                <Space align="center">
                    <Switch
                        checked={!!tdsEnabled(values)}
                        onChange={(checked) => {
                            setFieldValue('_tds_applicable', checked);
                            if (!checked) {
                                setFieldValue('tds_charges_account_id', null);
                                setFieldValue('tds_charges_account_id_detail', null, false);
                                setFieldValue('tds_charges', 0);
                            }
                        }}
                    />
                    <Text>TDS Applicable</Text>
                </Space>
            ),
        },
        {
            name: 'bank_charges_account_id', label: 'Bank Charges Account', type: 'fkSelect', col: 8,
            condition: bankChargesEnabled,
            placeholder: 'Select Account',
            fkUrl: api('/api/accounts/?active=true'),
            fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', allowClear: true,
        },
        { name: 'bank_charges', label: 'Bank Charges', type: 'number', col: 8, min: 0, condition: bankChargesEnabled },
        {
            name: 'tds_charges_account_id', label: 'TDS Account', type: 'fkSelect', col: 8,
            condition: tdsEnabled,
            placeholder: 'Select Account',
            fkUrl: api('/api/accounts/?active=true'),
            fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', allowClear: true,
        },
        { name: 'tds_charges', label: 'TDS Amount', type: 'number', col: 8, min: 0, condition: tdsEnabled },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
        {
            name: 'items', label: 'Bill Allocations', type: 'objectArray', col: 24, addButtonLabel: 'Add Bill',
            defaultItem: { purchase_bill_id: null, allocated_amount: 0 },
            headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'purchase_bill_id', name: 'purchase_bill_id', label: 'Purchase Bill', type: 'fkSelect', width: '60%', placeholder: 'Select Bill', fkUrl: api('/api/purchase-bills/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'bill_no' },
                { key: 'allocated_amount', name: 'allocated_amount', label: 'Allocated Amount', type: 'number', width: '25%', min: 0.000001 },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        contact_id: Yup.mixed().test('req', 'Supplier is required', (v) => !!asId(v)).required(),
        payment_date: Yup.mixed().required('Date is required'),
        exchange_rate: Yup.number().typeError('Exchange rate required').moreThan(0, 'Must be > 0').nullable(),
        amount: Yup.number().typeError('Amount required').moreThan(0, 'Must be > 0').required('Amount is required'),
    }), []);

    const crudInitialValues = useMemo(() => {
        const base = {
            payment_no: '', payment_date: dayjs(), contact_id: null, account_id: null,
            currency_id: null, exchange_rate: 1, amount: 0, method: null,
            _bank_charges_applicable: false,
            bank_charges_account_id: null, bank_charges: 0,
            _tds_applicable: false,
            tds_charges_account_id: null, tds_charges: 0,
            reference: '', notes: '', items: [], deleted_item_ids: [],
        };
        if (!prefillData) return base;
        const items = Array.isArray(prefillData.items) && prefillData.items.length > 0
            ? prefillData.items.map((alloc) => ({
                purchase_bill_id: alloc.purchase_bill_id_detail ?? alloc.purchase_bill_id ?? null,
                allocated_amount: toNumber(alloc.allocated_amount ?? 0),
            }))
            : [];
        return {
            ...base,
            contact_id: prefillData.contact_id_detail ?? prefillData.contact_id ?? null,
            currency_id: prefillData.currency_id_detail ?? prefillData.currency_id ?? null,
            exchange_rate: toNumber(prefillData.exchange_rate) || 1,
            amount: toNumber(prefillData.amount ?? 0),
            items,
        };
    }, [prefillData]);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : [])
            .filter((l) => !!asId(l?.purchase_bill_id))
            .map((l) => ({ ...(l.id ? { id: l.id } : {}), purchase_bill_id: asId(l.purchase_bill_id), allocated_amount: toNumber(l.allocated_amount) }));
        return {
            payment_no: nullIfEmpty(values.payment_no),
            payment_date: formatDate(values.payment_date),
            contact_id: asId(values.contact_id ?? values.contact),
            account_id: asId(values.account_id ?? values.account),
            currency_id: asId(values.currency_id ?? values.currency),
            exchange_rate: toNumber(values.exchange_rate) || 1,
            amount: toNumber(values.amount),
            method: nullIfEmpty(values.method),
            bank_charges_account_id: bankChargesEnabled(values) ? asId(values.bank_charges_account_id) : null,
            bank_charges: bankChargesEnabled(values) && toNumber(values.bank_charges) ? toNumber(values.bank_charges) : null,
            tds_charges_account_id: tdsEnabled(values) ? asId(values.tds_charges_account_id) : null,
            tds_charges: tdsEnabled(values) && toNumber(values.tds_charges) ? toNumber(values.tds_charges) : null,
            reference: nullIfEmpty(values.reference),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="New Supplier Payment" />
            <ReusableCrud
                key={prefillData?._source_id ?? 'supplier-payment-add'}
                title="Supplier Payments"
                addTitle="New Supplier Payment"
                apiUrl={api('/api/supplier-payments/')}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                ui_type="add form"
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onAddSuccess={(record) => router.visit(route('payment-out.supplier-payments.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
