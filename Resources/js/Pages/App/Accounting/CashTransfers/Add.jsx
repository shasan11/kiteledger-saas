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
const transferTotal = (items = []) => (Array.isArray(items) ? items : []).reduce((sum, row) => sum + toNumber(row?.amount), 0);
const currencyLabel = (values = {}) => (
    values.currency_id_detail?.code ||
    values.currency_id_detail?.name ||
    values.currency?.code ||
    values.currency?.name ||
    values.currency_name ||
    ''
);
const formatMoney = (amount) => Number(toNumber(amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TransferTotal = ({ values }) => (
    <div style={{ marginTop: -4, fontWeight: 700, color: '#111827', textAlign: 'right' }}>
        Total {currencyLabel(values)} {formatMoney(transferTotal(values?.items))}
    </div>
);
const formatDate = (v) => {
    if (!v) return null;
    if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
    const p = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
    if (p.isValid()) return p.format('YYYY-MM-DD');
    const f = dayjs(v);
    return f.isValid() ? f.format('YYYY-MM-DD') : null;
};

export default function CashTransferAdd(props) {
    const fields = useMemo(() => [
        { name: 'from_account_id', label: 'From Account', type: 'fkSelect', required: true, col: 16, placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkExtraParams: { active: true } },
        { name: 'transfer_no', label: 'Transfer No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'transfer_date', label: 'Transfer Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', required: true, col: 8, placeholder: 'Select Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 8, min: 0 },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
        {
            name: 'items', label: 'Transfer Lines', type: 'objectArray', col: 24, addButtonLabel: 'Add Line', defaultItem: { to_account_id: null, amount: 0, description: '' }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'to_account_id', name: 'to_account_id', label: 'To Account', type: 'fkSelect', width: '3fr', placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkStoreScope: 'shared', fkExtraParams: { active: true } },
                { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '160px', min: 0, align: 'right' },
            ],
            collapsedFields: [
                { key: 'description', name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2, placeholder: 'Transfer line description' },
            ],
        },
        { name: 'transfer_total', label: '', type: 'custom', col: 24, render: TransferTotal },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        from_account_id: Yup.mixed().test('req', 'From Account is required', (v) => !!asId(v)).required(),
        transfer_date: Yup.mixed().required('Date is required'),
        currency_id: Yup.mixed().test('req', 'Currency is required', (v) => !!asId(v)).required(),
        items: Yup.array()
            .min(1, 'At least one transfer line is required')
            .test('different-accounts', 'From account and to account cannot be the same.', function (items = []) {
                const fromAccount = asId(this.parent?.from_account_id);
                return !fromAccount || !items.some((item) => asId(item?.to_account_id) === fromAccount);
            })
            .required(),
    }), []);

    const crudInitialValues = useMemo(() => ({
        transfer_no: '', transfer_date: dayjs(), from_account_id: null, currency_id: null, exchange_rate: 1, reference: '', notes: '', items: [{ to_account_id: null, amount: 0, description: '' }], deleted_item_ids: [],
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).filter((l) => !!asId(l?.to_account_id)).map((l) => ({ ...(l.id ? { id: l.id } : {}), to_account_id: asId(l.to_account_id), amount: toNumber(l.amount), description: nullIfEmpty(l.description) }));
        return {
            transfer_no: nullIfEmpty(values.transfer_no),
            transfer_date: formatDate(values.transfer_date),
            from_account_id: asId(values.from_account_id ?? values.fromAccount),
            currency_id: asId(values.currency_id ?? values.currency),
            exchange_rate: toNumber(values.exchange_rate) || 1,
            reference: nullIfEmpty(values.reference),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="New Cash Transfer" />
            <ReusableCrud
                title="Cash Transfers"
                addTitle="New Cash Transfer"
                apiUrl={api('/api/cash-transfers/')}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                ui_type="add form"
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onAddSuccess={(record) => router.visit(route('accounting.cash-transfers.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
