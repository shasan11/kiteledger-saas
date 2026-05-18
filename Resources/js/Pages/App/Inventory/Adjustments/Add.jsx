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

export default function AdjustmentAdd(props) {
    const fields = useMemo(() => [
        { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', required: true, col: 16, placeholder: 'Select Warehouse', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'adjustment_no', label: 'Adjustment No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'adjustment_date', label: 'Adjustment Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'reason', label: 'Reason', type: 'text', col: 16, placeholder: 'Reason for adjustment' },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 2, placeholder: 'Notes' },
        {
            name: 'items', label: 'Adjustment Lines', type: 'objectArray', col: 24, addButtonLabel: 'Add Product', defaultItem: { product_id: null, adjustment_type: 'increase', qty: 0, unit_cost: 0, remarks: '' }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', placeholder: 'Select Product', fkUrl: api('/api/products/search'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'label' },
                { key: 'adjustment_type', name: 'adjustment_type', label: 'Type', type: 'select', width: '130px', options: [{ value: 'increase', label: 'Increase' }, { value: 'decrease', label: 'Decrease' }] },
                { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '100px', min: 0 },
                { key: 'unit_cost', name: 'unit_cost', label: 'Unit Cost', type: 'number', width: '130px', min: 0 },
                { key: 'remarks', name: 'remarks', label: 'Remarks', type: 'text', width: '2fr' },
            ],
        },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        warehouse_id: Yup.mixed().test('req', 'Warehouse is required', (v) => !!asId(v)).required(),
        adjustment_date: Yup.mixed().required('Date is required'),
        items: Yup.array().min(1, 'At least one product is required').required(),
    }), []);

    const crudInitialValues = useMemo(() => ({
        adjustment_no: '', adjustment_date: dayjs(), warehouse_id: null, reason: '', notes: '', items: [{ product_id: null, adjustment_type: 'increase', qty: 0, unit_cost: 0, remarks: '' }], deleted_item_ids: [],
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).filter((l) => !!asId(l?.product_id)).map((l) => ({ ...(l.id ? { id: l.id } : {}), product_id: asId(l.product_id), adjustment_type: l.adjustment_type || 'increase', qty: toNumber(l.qty), unit_cost: toNumber(l.unit_cost) || null, remarks: nullIfEmpty(l.remarks) }));
        return {
            adjustment_no: nullIfEmpty(values.adjustment_no),
            adjustment_date: formatDate(values.adjustment_date),
            warehouse_id: asId(values.warehouse_id ?? values.warehouse),
            reason: nullIfEmpty(values.reason),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="New Inventory Adjustment" />
            <ReusableCrud
                title="Inventory Adjustments"
                addTitle="New Inventory Adjustment"
                apiUrl={api('/api/inventory-adjustments/')}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                ui_type="add form"
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onAddSuccess={(record) => router.visit(route('inventory.adjustments.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
