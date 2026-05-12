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
const roundMoney = (v) => Number(toNumber(v).toFixed(2));
const getTaxPercent = (v) => { if (!v || typeof v !== 'object') return 0; return toNumber(v.rate_percent ?? v.ratePercent ?? v.rate ?? 0); };
const getTaxJurisdictionId = (v) => { if (!v || typeof v !== 'object') return null; return v.tax_jurisdiction_id ?? v.taxJurisdiction?.id ?? v.tax_jurisdiction?.id ?? null; };
const isTaxInclusive = (v) => { if (!v || typeof v !== 'object') return false; return v.inclusive === true || v.inclusive === 1 || v.inclusive === '1'; };
const getTaxLabel = (v) => { if (!v || typeof v !== 'object') return null; return v.name || v.code || null; };
const calculateLine = (l = {}) => {
    const gross = roundMoney(toNumber(l.qty) * toNumber(l.unit_price));
    const discPercent = Math.min(Math.max(toNumber(l.discount_percent), 0), 100);
    const discAmount = roundMoney(gross * discPercent / 100);
    const amountAfterDiscount = Math.max(gross - discAmount, 0);
    const taxObj = typeof l.tax_rate_id === 'object' ? l.tax_rate_id : (l.taxRate || l.tax_rate || null);
    const taxPercent = getTaxPercent(taxObj);
    let taxAmount = 0, lineTotal = amountAfterDiscount;
    if (taxPercent > 0) {
        if (isTaxInclusive(taxObj)) { taxAmount = roundMoney(amountAfterDiscount - amountAfterDiscount / (1 + taxPercent / 100)); lineTotal = amountAfterDiscount; }
        else { taxAmount = roundMoney(amountAfterDiscount * taxPercent / 100); lineTotal = amountAfterDiscount + taxAmount; }
    }
    const taxableAmount = (isTaxInclusive(taxObj) && taxPercent > 0) ? roundMoney(amountAfterDiscount - taxAmount) : amountAfterDiscount;
    return { discount_amount: discAmount, tax_jurisdiction_id: getTaxJurisdictionId(taxObj), tax_amount: taxAmount, tax_breakup: taxPercent > 0 ? JSON.stringify({ tax_rate_id: asId(taxObj), tax_name: getTaxLabel(taxObj), rate_percent: roundMoney(taxPercent), inclusive: isTaxInclusive(taxObj), taxable_amount: taxableAmount, tax_amount: taxAmount }) : null, line_total: roundMoney(lineTotal) };
};
const emptyLine = { id: undefined, product_id: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, discount_amount: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, tax_breakup: null, line_total: 0 };
const normalizeLine = (l = {}) => {
    const calc = calculateLine(l);
    return { ...(l.id ? { id: l.id } : {}), product_id: asId(l.product_id ?? l.product), product_name: cleanText(l.product_name ?? l.custom_product_name ?? ''), description: nullIfEmpty(l.description), qty: toNumber(l.qty) || 0, unit_price: toNumber(l.unit_price), discount_percent: toNumber(l.discount_percent), discount_amount: calc.discount_amount, tax_rate_id: asId(l.tax_rate_id ?? l.taxRate ?? l.tax_rate), tax_jurisdiction_id: calc.tax_jurisdiction_id || asId(l.tax_jurisdiction_id ?? l.taxJurisdiction), tax_amount: calc.tax_amount, tax_breakup: calc.tax_breakup, line_total: calc.line_total };
};

export default function InvoiceEdit({ id, ...props }) {
    const fields = useMemo(() => [
        { name: 'contact_id', label: 'Customer', type: 'fkSelect', required: true, col: 16, placeholder: 'Select Customer', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'invoice_no', label: 'Invoice No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'invoice_date', label: 'Invoice Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'due_date', label: 'Due Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
        { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, placeholder: 'Select Warehouse', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'credit_term_id', label: 'Credit Terms', type: 'fkSelect', col: 8, placeholder: 'Credit Terms', fkUrl: api('/api/credit-terms/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'exchange_rate', label: 'Exchange Rate To NPR', type: 'number', required: true, col: 8, min: 0 },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
        {
            name: 'items', label: '', type: 'objectArray', col: 24, addButtonLabel: 'Add Product', defaultItem: { ...emptyLine }, headerBg: '#4b5563', headerColor: '#ffffff',
            recalculateRow: (row) => { const calc = calculateLine(row); return { ...row, discount_amount: calc.discount_amount, tax_jurisdiction_id: calc.tax_jurisdiction_id, tax_amount: calc.tax_amount, tax_breakup: calc.tax_breakup, line_total: calc.line_total }; },
            columns: [
                { key: 'product_id', name: 'product_id', label: 'Product / Service', type: 'fkSelect', width: '3fr', placeholder: 'Select Product', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', onSelectRecord: (record, row) => { const unitPrice = toNumber(record?.selling_price ?? record?.sale_price ?? record?.price ?? row?.unit_price); const defaultTaxRate = record?.default_tax_rate ?? null; const baseRow = { ...row, product_id: record?.id ?? null, product_name: record?.name || '', description: row?.description || record?.description || '', unit_price: unitPrice, tax_rate_id: defaultTaxRate ?? row.tax_rate_id ?? null, tax_jurisdiction_id: defaultTaxRate ? getTaxJurisdictionId(defaultTaxRate) : (row.tax_jurisdiction_id ?? null) }; const calc = calculateLine(baseRow); return { ...baseRow, tax_amount: calc.tax_amount, tax_breakup: calc.tax_breakup, line_total: calc.line_total }; } },
                { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
                { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
                { key: 'unit_price', name: 'unit_price', label: 'Rate', type: 'number', width: '120px', min: 0 },
                { key: 'discount_percent', name: 'discount_percent', label: 'Disc%', type: 'number', width: '90px', min: 0, max: 100 },
                { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax', type: 'fkSelect', width: '150px', placeholder: 'No VAT', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', storeFullObject: true, allowClear: true, fkLabel: (r) => [r?.name, r?.rate_percent ? `${toNumber(r.rate_percent)}%` : null].filter(Boolean).join(' - '), onSelectRecord: (record, row) => { const calc = calculateLine({ ...row, tax_rate_id: record, tax_jurisdiction_id: getTaxJurisdictionId(record) }); return { ...row, tax_rate_id: record, tax_jurisdiction_id: calc.tax_jurisdiction_id, tax_amount: calc.tax_amount, tax_breakup: calc.tax_breakup, line_total: calc.line_total }; } },
                { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0, disabled: true, formula: (row) => calculateLine(row).tax_amount },
                { key: 'line_total', name: 'line_total', label: 'Amount', type: 'number', width: '130px', min: 0, disabled: true, formula: (row) => calculateLine(row).line_total },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Notes (appears on print)' },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        contact_id: Yup.mixed().test('req', 'Customer is required', (v) => !!asId(v)).required(),
        invoice_date: Yup.mixed().required('Date is required'),
        exchange_rate: Yup.number().typeError('Required').moreThan(0).required(),
        items: Yup.array().of(Yup.object().shape({ qty: Yup.number().typeError('Number').moreThan(0).required(), unit_price: Yup.number().typeError('Number').min(0).required() }).test('prod', 'Product required', (l) => !!asId(l?.product_id) || !!cleanText(l?.product_name).trim())).min(1).required(),
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).map(normalizeLine).filter((l) => !!asId(l.product_id) || !!cleanText(l.product_name).trim());
        return {
            invoice_no: nullIfEmpty(values.invoice_no),
            invoice_date: formatDate(values.invoice_date),
            due_date: formatDate(values.due_date),
            contact_id: asId(values.contact_id ?? values.contact),
            warehouse_id: asId(values.warehouse_id ?? values.warehouse),
            credit_term_id: asId(values.credit_term_id ?? values.creditTerm ?? values.credit_term),
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
            <Head title="Edit Invoice" />
            <ReusableCrud
                title="Invoices"
                editTitle="Edit Invoice"
                apiUrl={api('/api/invoices/')}
                fields={fields}
                validationSchema={validationSchema}
                transformPayload={transformPayload}
                ui_type="edit form"
                look_up_var={id}
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onEditSuccess={(record) => router.visit(route('payment-in.invoices.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
