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
const cleanText = (v) => { if (v === undefined || v === null) return ''; return String(v); };
const nullIfEmpty = (v) => { if (v === undefined || v === null || v === '') return null; return v; };
const formatDate = (v) => {
    if (!v) return null;
    if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
    const p = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
    if (p.isValid()) return p.format('YYYY-MM-DD');
    const f = dayjs(v);
    return f.isValid() ? f.format('YYYY-MM-DD') : null;
};
const calcLine = (l) => Math.max(toNumber(l.qty) * toNumber(l.unit_price) - toNumber(l.qty) * toNumber(l.unit_price) * (toNumber(l.discount_percent) / 100) + toNumber(l.tax_amount), 0);
const emptyLine = { id: undefined, product_id: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_amount: 0, line_total: 0 };
const normalizeLine = (l = {}) => {
    const n = { ...(l.id ? { id: l.id } : {}), product_id: asId(l.product_id ?? l.product), product_name: cleanText(l.product_name ?? l.custom_product_name), description: nullIfEmpty(l.description), qty: toNumber(l.qty) || 0, unit_price: toNumber(l.unit_price), discount_percent: toNumber(l.discount_percent), tax_rate_id: asId(l.tax_rate_id ?? l.taxRate ?? l.tax_rate), tax_amount: toNumber(l.tax_amount) };
    n.line_total = calcLine(n);
    return n;
};

export default function CreditNoteAdd(props) {
    const fields = useMemo(() => [
        { name: 'contact_id', label: 'Customer', type: 'fkSelect', required: true, col: 16, placeholder: 'Select Customer', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'sales_return_no', label: 'Credit Note No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'sales_return_date', label: 'Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, placeholder: 'Select Warehouse', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
        {
            name: 'items', label: '', type: 'objectArray', col: 24, addButtonLabel: 'Add Product', defaultItem: { ...emptyLine }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'product_id', name: 'product_id', label: 'Product / Service', type: 'fkSelect', width: '3fr', placeholder: 'Select Product', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
                { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
                { key: 'unit_price', name: 'unit_price', label: 'Rate', type: 'number', width: '120px', min: 0 },
                { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax', type: 'fkSelect', width: '130px', placeholder: 'No VAT', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
                { key: 'line_total', name: 'line_total', label: 'Amount', type: 'number', width: '130px', min: 0, disabled: true },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        contact_id: Yup.mixed().test('req', 'Customer is required', (v) => !!asId(v)).required(),
        sales_return_date: Yup.mixed().required('Date is required'),
        items: Yup.array().of(Yup.object().shape({ qty: Yup.number().typeError('Number').moreThan(0).required(), unit_price: Yup.number().typeError('Number').min(0).required() }).test('prod', 'Product required', (l) => !!asId(l?.product_id) || !!cleanText(l?.product_name).trim())).min(1).required(),
    }), []);

    const crudInitialValues = useMemo(() => ({
        sales_return_no: '', sales_return_date: dayjs(), contact_id: null, warehouse_id: null, currency_id: null, reference: '', notes: '', items: [{ ...emptyLine }], deleted_item_ids: [],
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).map(normalizeLine).filter((l) => !!asId(l.product_id) || !!cleanText(l.product_name).trim());
        return {
            sales_return_no: nullIfEmpty(values.sales_return_no),
            sales_return_date: formatDate(values.sales_return_date),
            contact_id: asId(values.contact_id ?? values.contact),
            warehouse_id: asId(values.warehouse_id ?? values.warehouse),
            currency_id: asId(values.currency_id ?? values.currency),
            reference: nullIfEmpty(values.reference),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="New Credit Note" />
            <ReusableCrud
                title="Credit Notes"
                addTitle="New Credit Note"
                apiUrl={api('/api/credit-notes/')}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                ui_type="add form"
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onAddSuccess={(record) => router.visit(route('payment-in.credit-notes.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
