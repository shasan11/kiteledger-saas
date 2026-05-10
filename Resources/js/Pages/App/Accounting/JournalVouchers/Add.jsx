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

export default function JournalVoucherAdd(props) {
    const fields = useMemo(() => [
        { name: 'voucher_no', label: 'Voucher No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'voucher_date', label: 'Voucher Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 8, min: 0 },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
        { name: 'narration', label: 'Narration', type: 'textarea', col: 24, rows: 2, placeholder: 'Narration' },
        {
            name: 'items', label: 'Journal Lines', type: 'objectArray', col: 24, addButtonLabel: 'Add Line', defaultItem: { chart_of_account_id: null, description: '', debit: 0, credit: 0 }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'chart_of_account_id', name: 'chart_of_account_id', label: 'Account', type: 'fkSelect', width: '3fr', placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
                { key: 'debit', name: 'debit', label: 'Debit', type: 'number', width: '140px', min: 0 },
                { key: 'credit', name: 'credit', label: 'Credit', type: 'number', width: '140px', min: 0 },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        voucher_date: Yup.mixed().required('Date is required'),
        items: Yup.array().min(1, 'At least one journal line is required').required(),
    }), []);

    const crudInitialValues = useMemo(() => ({
        voucher_no: '', voucher_date: dayjs(), currency_id: null, exchange_rate: 1, reference: '', narration: '', notes: '', items: [{ chart_of_account_id: null, description: '', debit: 0, credit: 0 }], deleted_item_ids: [],
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).filter((l) => !!asId(l?.chart_of_account_id)).map((l) => ({ ...(l.id ? { id: l.id } : {}), chart_of_account_id: asId(l.chart_of_account_id), description: nullIfEmpty(l.description), debit: toNumber(l.debit), credit: toNumber(l.credit) }));
        return {
            voucher_no: nullIfEmpty(values.voucher_no),
            voucher_date: formatDate(values.voucher_date),
            currency_id: asId(values.currency_id ?? values.currency),
            exchange_rate: toNumber(values.exchange_rate) || null,
            reference: nullIfEmpty(values.reference),
            narration: nullIfEmpty(values.narration),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="New Journal Voucher" />
            <ReusableCrud
                title="Journal Vouchers"
                addTitle="New Journal Voucher"
                apiUrl={api('/api/journal-vouchers/')}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                ui_type="add form"
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onAddSuccess={(record) => router.visit(route('accounting.journal-vouchers.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
