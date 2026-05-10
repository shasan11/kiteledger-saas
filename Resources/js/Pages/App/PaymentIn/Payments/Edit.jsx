import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
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

export default function PaymentEdit({ id, ...props }) {
    const fields = useMemo(() => [
        { name: 'contact_id', label: 'Customer', type: 'fkSelect', required: true, col: 16, placeholder: 'Select Customer', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'payment_no', label: 'Payment No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'payment_date', label: 'Payment Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'account_id', label: 'Payment Account', type: 'fkSelect', col: 8, placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'payment_method', label: 'Payment Method', type: 'select', col: 8, options: [{ value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'online', label: 'Online' }] },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'amount', label: 'Payment Amount', type: 'number', required: true, col: 8, min: 0 },
        { name: 'bank_charges_account_id', label: 'Bank Charges Account', type: 'fkSelect', col: 8, placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'bank_charges', label: 'Bank Charges', type: 'number', col: 8, min: 0 },
        { name: 'tds_charges_account_id', label: 'TDS Account', type: 'fkSelect', col: 8, placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'tds_charges', label: 'TDS Amount', type: 'number', col: 8, min: 0 },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
        {
            name: 'items', label: 'Invoice Allocations', type: 'objectArray', col: 24, addButtonLabel: 'Add Invoice', defaultItem: { invoice_id: null, allocated_amount: 0 }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'invoice_id', name: 'invoice_id', label: 'Invoice', type: 'fkSelect', width: '3fr', placeholder: 'Select Invoice', fkUrl: api('/api/invoices/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'invoice_no' },
                { key: 'allocated_amount', name: 'allocated_amount', label: 'Allocated Amount', type: 'number', width: '200px', min: 0 },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        contact_id: Yup.mixed().test('req', 'Customer is required', (v) => !!asId(v)).required(),
        payment_date: Yup.mixed().required('Date is required'),
        amount: Yup.number().typeError('Amount required').min(0).required('Amount is required'),
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).filter((l) => !!asId(l?.invoice_id)).map((l) => ({ ...(l.id ? { id: l.id } : {}), invoice_id: asId(l.invoice_id), allocated_amount: toNumber(l.allocated_amount) }));
        return {
            payment_no: nullIfEmpty(values.payment_no),
            payment_date: formatDate(values.payment_date),
            contact_id: asId(values.contact_id ?? values.contact),
            account_id: asId(values.account_id ?? values.account),
            currency_id: asId(values.currency_id ?? values.currency),
            amount: toNumber(values.amount),
            payment_method: nullIfEmpty(values.payment_method),
            bank_charges_account_id: asId(values.bank_charges_account_id),
            bank_charges: toNumber(values.bank_charges) || null,
            tds_charges_account_id: asId(values.tds_charges_account_id),
            tds_charges: toNumber(values.tds_charges) || null,
            reference: nullIfEmpty(values.reference),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Edit Customer Payment" />
            <ReusableCrud
                title="Customer Payments"
                editTitle="Edit Customer Payment"
                apiUrl={api('/api/customer-payments/')}
                fields={fields}
                validationSchema={validationSchema}
                transformPayload={transformPayload}
                ui_type="edit form"
                look_up_var={id}
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onEditSuccess={(record) => router.visit(route('payment-in.payments.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
