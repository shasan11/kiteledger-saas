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

const toNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const asId = (value) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'object') return value.id ?? value.value ?? null;
    return value;
};
const cleanText = (value) => { if (value === undefined || value === null) return ''; return String(value); };
const nullIfEmpty = (value) => { if (value === undefined || value === null || value === '') return null; return value; };
const formatDate = (value) => {
    if (!value) return null;
    if (dayjs.isDayjs(value)) return value.isValid() ? value.format('YYYY-MM-DD') : null;
    const parsed = dayjs(value, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
    const fallback = dayjs(value);
    return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

const calculateLineTotal = (line) => {
    const qty = toNumber(line.qty);
    const rate = toNumber(line.unit_price);
    const discountPercent = toNumber(line.discount_percent);
    const taxAmount = toNumber(line.tax_amount);
    const gross = qty * rate;
    const discount = gross * (discountPercent / 100);
    return Math.max(gross - discount + taxAmount, 0);
};

const emptyLine = { id: undefined, product_id: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_amount: 0, line_total: 0 };

const normalizeLine = (line = {}) => {
    const normalized = {
        ...(line.id ? { id: line.id } : {}),
        product_id: asId(line.product_id ?? line.product),
        product_name: cleanText(line.product_name ?? line.custom_product_name),
        description: nullIfEmpty(line.description),
        qty: toNumber(line.qty) || 0,
        unit_price: toNumber(line.unit_price),
        discount_percent: toNumber(line.discount_percent),
        tax_rate_id: asId(line.tax_rate_id ?? line.taxRate ?? line.tax_rate),
        tax_amount: toNumber(line.tax_amount),
    };
    normalized.line_total = calculateLineTotal(normalized);
    return normalized;
};

export default function BillAdd(props) {
    const fields = useMemo(() => [
        { name: 'contact_id', label: 'Customer', type: 'fkSelect', required: true, col: 16, placeholder: 'Select Customer', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'invoice_no', label: 'Bill No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'invoice_date', label: 'Bill Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'due_date', label: 'Due Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
        { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, placeholder: 'Select Warehouse', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'exchange_rate', label: 'Exchange Rate To NPR', type: 'number', required: true, col: 8, min: 0 },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
        {
            name: 'items', label: '', type: 'objectArray', col: 24, addButtonLabel: 'Add Product', defaultItem: { ...emptyLine }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'product_id', name: 'product_id', label: 'Product / Service', type: 'fkSelect', width: '3fr', placeholder: 'Select Product', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
                { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
                { key: 'unit_price', name: 'unit_price', label: 'Rate', type: 'number', width: '120px', min: 0 },
                { key: 'discount_percent', name: 'discount_percent', label: 'Disc%', type: 'number', width: '90px', min: 0, max: 100 },
                { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax', type: 'fkSelect', width: '130px', placeholder: 'No VAT', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
                { key: 'line_total', name: 'line_total', label: 'Amount', type: 'number', width: '130px', min: 0, disabled: true },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes (appears on print)' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        contact_id: Yup.mixed().test('required', 'Customer is required', (v) => !!asId(v)).required('Customer is required'),
        invoice_date: Yup.mixed().required('Date is required'),
        exchange_rate: Yup.number().typeError('Exchange rate required').moreThan(0, 'Must be > 0').required('Required'),
        items: Yup.array().of(
            Yup.object().shape({
                qty: Yup.number().typeError('Qty must be a number').moreThan(0, 'Qty must be > 0').required('Required'),
                unit_price: Yup.number().typeError('Rate must be a number').min(0).required('Required'),
            }).test('product-or-name', 'Product is required', (line) => !!asId(line?.product_id) || !!cleanText(line?.product_name).trim())
        ).min(1, 'At least one item is required').required('Required'),
    }), []);

    const crudInitialValues = useMemo(() => ({
        invoice_no: '',
        invoice_date: dayjs(),
        due_date: null,
        contact_id: null,
        warehouse_id: null,
        currency_id: null,
        exchange_rate: 1,
        reference: '',
        notes: '',
        items: [{ ...emptyLine }],
        deleted_item_ids: [],
    }), []);

    const transformPayload = (values = {}) => {
        const rawItems = Array.isArray(values.items) ? values.items : [];
        const items = rawItems.map(normalizeLine).filter((l) => !!asId(l.product_id) || !!cleanText(l.product_name).trim());
        return {
            invoice_no: nullIfEmpty(values.invoice_no),
            invoice_date: formatDate(values.invoice_date),
            due_date: formatDate(values.due_date),
            contact_id: asId(values.contact_id ?? values.contact),
            warehouse_id: asId(values.warehouse_id ?? values.warehouse),
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
            <Head title="New Bill" />
            <ReusableCrud
                title="Bills"
                addTitle="New Bill"
                apiUrl={api('/api/invoices/')}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                ui_type="add form"
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onAddSuccess={(record) => router.visit(route('payment-in.bills.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
