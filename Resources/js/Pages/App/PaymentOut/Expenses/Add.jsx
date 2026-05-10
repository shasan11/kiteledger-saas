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

const emptyLine = { id: undefined, chart_of_account_id: null, description: '', tax_rate_id: null, amount: 0, tax_amount: 0, line_total: 0 };

export default function ExpenseAdd(props) {
    const fields = useMemo(() => [
        { name: 'contact_id', label: 'Party / Vendor', type: 'fkSelect', col: 16, placeholder: 'Select Party', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'expense_no', label: 'Expense No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'expense_date', label: 'Expense Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'due_date', label: 'Due Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'tds_charges_account_id', label: 'TDS Account', type: 'fkSelect', col: 8, placeholder: 'Select Account', fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        {
            name: 'items', label: 'Expense Lines', type: 'objectArray', col: 24, addButtonLabel: 'Add Expense Line', defaultItem: { ...emptyLine }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'chart_of_account_id', name: 'chart_of_account_id', label: 'Account', type: 'fkSelect', width: '3fr', placeholder: 'Select Account', fkUrl: api('/api/chart-of-accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
                { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax', type: 'fkSelect', width: '130px', placeholder: 'No VAT', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '130px', min: 0 },
                { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
                { key: 'line_total', name: 'line_total', label: 'Total', type: 'number', width: '130px', min: 0, disabled: true },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        expense_date: Yup.mixed().required('Date is required'),
        items: Yup.array().of(Yup.object().shape({ amount: Yup.number().typeError('Amount required').min(0).required() }).test('acct', 'Account is required', (l) => !!asId(l?.chart_of_account_id))).min(1, 'At least one expense line is required').required(),
    }), []);

    const crudInitialValues = useMemo(() => ({
        expense_no: '', expense_date: dayjs(), due_date: null, contact_id: null, currency_id: null, tds_charges_account_id: null, notes: '', items: [{ ...emptyLine }], deleted_item_ids: [],
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).filter((l) => !!asId(l?.chart_of_account_id)).map((l) => ({
            ...(l.id ? { id: l.id } : {}),
            chart_of_account_id: asId(l.chart_of_account_id),
            description: nullIfEmpty(l.description),
            tax_rate_id: asId(l.tax_rate_id),
            amount: toNumber(l.amount),
            tax_amount: toNumber(l.tax_amount) || null,
            line_total: toNumber(l.amount) + toNumber(l.tax_amount),
        }));
        return {
            expense_no: nullIfEmpty(values.expense_no),
            expense_date: formatDate(values.expense_date),
            due_date: formatDate(values.due_date),
            contact_id: asId(values.contact_id ?? values.contact),
            currency_id: asId(values.currency_id ?? values.currency),
            tds_charges_account_id: asId(values.tds_charges_account_id),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="New Expense" />
            <ReusableCrud
                title="Expenses"
                addTitle="New Expense"
                apiUrl={api('/api/expenses/')}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                ui_type="add form"
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onAddSuccess={(record) => router.visit(route('payment-out.expenses.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
