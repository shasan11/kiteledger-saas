import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Col, Row } from 'antd';
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
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const emptyLine = { id: undefined, product_id: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_amount: 0, line_total: 0 };
const calculateLineTotal = (line = {}) => {
    const gross = toNumber(line.qty) * toNumber(line.unit_price);
    const discount = gross * (toNumber(line.discount_percent) / 100);
    return Math.max(gross - discount, 0) + toNumber(line.tax_amount);
};
const calculateSummary = (items = []) => {
    let subTotal = 0, discount = 0, nonTaxableTotal = 0, taxableTotal = 0, vat = 0;
    items.forEach((item) => {
        const gross = toNumber(item.qty) * toNumber(item.unit_price);
        const discountAmount = gross * (toNumber(item.discount_percent) / 100);
        const net = Math.max(gross - discountAmount, 0);
        const tax = toNumber(item.tax_amount);
        subTotal += gross; discount += discountAmount; vat += tax;
        if (asId(item.tax_rate_id) || tax > 0) { taxableTotal += net; } else { nonTaxableTotal += net; }
    });
    return { subTotal, discount, nonTaxableTotal, taxableTotal, vat, grandTotal: subTotal - discount + vat };
};
const normalizeLine = (line = {}) => {
    const n = { ...(line.id ? { id: line.id } : {}), product_id: asId(line.product_id ?? line.product), product_name: cleanText(line.product_name), description: nullIfEmpty(line.description), qty: toNumber(line.qty) || 0, unit_price: toNumber(line.unit_price), discount_percent: toNumber(line.discount_percent), tax_rate_id: asId(line.tax_rate_id ?? line.taxRate ?? line.tax_rate), tax_amount: toNumber(line.tax_amount) };
    n.line_total = Number(calculateLineTotal(n).toFixed(2));
    return n;
};

const QuotationTotals = ({ values = {} }) => {
    const summary = calculateSummary(values.items || []);
    return (
        <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
            <Col xs={24} lg={12}><div /></Col>
            <Col xs={24} lg={12}>
                <div className="quotation-total-card">
                    <div className="quotation-total-row"><span>Sub Total</span><strong>{money(summary.subTotal)}</strong></div>
                    <div className="quotation-total-row"><span>Discount</span><strong>{summary.discount > 0 ? money(summary.discount) : '-'}</strong></div>
                    <div className="quotation-total-row"><span>Non-Taxable Total</span><strong>{summary.nonTaxableTotal > 0 ? money(summary.nonTaxableTotal) : '-'}</strong></div>
                    <div className="quotation-total-row"><span>Taxable Total</span><strong>{summary.taxableTotal > 0 ? money(summary.taxableTotal) : '-'}</strong></div>
                    <div className="quotation-total-row"><span>VAT</span><strong>{summary.vat > 0 ? money(summary.vat) : '-'}</strong></div>
                    <div className="quotation-total-row quotation-total-grand"><span>Grand Total</span><strong>{money(summary.grandTotal)}</strong></div>
                </div>
            </Col>
        </Row>
    );
};

export default function QuotationEdit({ id, ...props }) {
    const fields = useMemo(() => [
        { name: 'contact_id', label: 'Customer Name', type: 'fkSelect', required: true, col: 16, placeholder: 'Select Customer', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'quotation_no', label: 'Code', type: 'text', col: 8, placeholder: 'DRAFT', disabled: true },
        { name: 'quotation_date', label: 'Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'expiry_date', label: 'Expiry Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'credit_term_id', label: 'Credit Terms', type: 'fkSelect', col: 8, placeholder: 'Credit Terms', fkUrl: api('/api/credit-terms/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || r?.code || '' },
        { name: 'exchange_rate', label: 'Exchange Rate To NPR', type: 'number', required: true, col: 8, min: 0 },
        {
            name: 'items', label: '', type: 'objectArray', col: 24, addButtonLabel: 'Add Code or Product', defaultItem: { ...emptyLine }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'product_id', name: 'product_id', label: 'Product / service', type: 'fkSelect', width: 'minmax(360px, 3fr)', placeholder: 'Add Code or Product', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'description', name: 'description', label: 'Description', type: 'text', width: '220px', placeholder: 'Description' },
                { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
                { key: 'unit_price', name: 'unit_price', label: 'Rate', type: 'number', width: '120px', min: 0 },
                { key: 'discount_percent', name: 'discount_percent', label: 'Discount', type: 'number', width: '110px', min: 0, max: 100 },
                { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax', type: 'fkSelect', width: '140px', placeholder: 'No VAT', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
                { key: 'line_total', name: 'line_total', label: 'Amount', type: 'number', width: '130px', min: 0, disabled: true, formula: (row) => Number(calculateLineTotal(row).toFixed(2)) },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 12, rows: 5, placeholder: 'Notes', help: 'This will appear on print' },
        { name: '_quotation_totals', label: '', type: 'custom', col: 24, render: ({ values }) => <QuotationTotals values={values} /> },
        { name: 'status', label: 'Status', type: 'select', col: 6, hidden: true, options: [{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'accepted', label: 'Accepted' }, { value: 'rejected', label: 'Rejected' }, { value: 'expired', label: 'Expired' }, { value: 'cancelled', label: 'Cancelled' }] },
        { name: 'approved', label: 'Approved', type: 'switch', col: 6, hidden: true },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        contact_id: Yup.mixed().test('customer-required', 'Customer is required', (v) => !!asId(v)).required('Customer is required'),
        quotation_date: Yup.mixed().required('Date is required'),
        expiry_date: Yup.mixed().required('Expiry date is required'),
        currency_id: Yup.mixed().nullable(),
        exchange_rate: Yup.number().typeError('Exchange rate is required').moreThan(0, 'Exchange rate must be greater than 0').required('Exchange rate is required'),
        items: Yup.array().of(
            Yup.object().shape({
                product_id: Yup.mixed().nullable(),
                product_name: Yup.string().nullable(),
                qty: Yup.number().typeError('Qty must be a number').moreThan(0, 'Qty must be greater than 0').required('Qty is required'),
                unit_price: Yup.number().typeError('Rate must be a number').min(0).required('Rate is required'),
                discount_percent: Yup.number().min(0).max(100).nullable(),
                tax_amount: Yup.number().min(0).nullable(),
            }).test('product-or-name', 'Product / service is required', (line) => !!asId(line?.product_id) || !!cleanText(line?.product_name).trim())
        ).min(1, 'At least one product / service is required').required(),
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).map(normalizeLine).filter((line) => !!asId(line.product_id) || !!cleanText(line.product_name).trim());
        return {
            quotation_no: values.quotation_no && values.quotation_no !== 'DRAFT' ? values.quotation_no : null,
            quotation_date: formatDate(values.quotation_date),
            expiry_date: formatDate(values.expiry_date),
            contact_id: asId(values.contact_id ?? values.contact),
            credit_term_id: asId(values.credit_term_id ?? values.creditTerm ?? values.credit_term),
            currency_id: asId(values.currency_id ?? values.currency),
            exchange_rate: toNumber(values.exchange_rate) || 1,
            status: values.status || 'draft',
            approved: !!values.approved,
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Edit Quotation" />
            <style>{`
                .quotation-total-card { border: 1px solid #d8dee8; background: #eef2f8; }
                .quotation-total-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 12px; font-size: 13px; color: #111827; }
                .quotation-total-row strong { font-weight: 600; }
                .quotation-total-grand { margin-top: 8px; padding-top: 14px; padding-bottom: 14px; border-top: 1px solid #d8dee8; font-size: 15px; font-weight: 700; }
                .quotation-total-grand strong { font-size: 18px; }
            `}</style>
            <ReusableCrud
                title="Quotations"
                editTitle="Edit Quotation"
                apiUrl={api('/api/quotations/')}
                fields={fields}
                validationSchema={validationSchema}
                transformPayload={transformPayload}
                ui_type="edit form"
                look_up_var={id}
                form_ui="drawer"
                drawerWidth="100vw"
                onEditSuccess={(record) => router.visit(route('payment-in.quotations.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
