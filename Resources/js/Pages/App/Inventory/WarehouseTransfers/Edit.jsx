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

export default function WarehouseTransferEdit({ id, ...props }) {
    const fields = useMemo(() => [
        { name: 'from_warehouse_id', label: 'From Warehouse', type: 'fkSelect', required: true, col: 12, placeholder: 'Select Warehouse', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'to_warehouse_id', label: 'To Warehouse', type: 'fkSelect', required: true, col: 12, placeholder: 'Select Warehouse', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'transfer_no', label: 'Transfer No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
        { name: 'transfer_date', label: 'Transfer Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 2, placeholder: 'Notes' },
        {
            name: 'items', label: 'Transfer Lines', type: 'objectArray', col: 24, addButtonLabel: 'Add Product', defaultItem: { product_id: null, qty: 1, remarks: '' }, headerBg: '#4b5563', headerColor: '#ffffff',
            columns: [
                { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', placeholder: 'Select Product', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
                { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '120px', min: 0 },
                { key: 'remarks', name: 'remarks', label: 'Remarks', type: 'text', width: '2fr' },
            ],
        },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        from_warehouse_id: Yup.mixed().test('req', 'From Warehouse is required', (v) => !!asId(v)).required(),
        to_warehouse_id: Yup.mixed().test('req', 'To Warehouse is required', (v) => !!asId(v)).required(),
        transfer_date: Yup.mixed().required('Date is required'),
        items: Yup.array().min(1, 'At least one product is required').required(),
    }), []);

    const transformPayload = (values = {}) => {
        const items = (Array.isArray(values.items) ? values.items : []).filter((l) => !!asId(l?.product_id)).map((l) => ({ ...(l.id ? { id: l.id } : {}), product_id: asId(l.product_id), qty: toNumber(l.qty), remarks: nullIfEmpty(l.remarks) }));
        return {
            transfer_no: nullIfEmpty(values.transfer_no),
            transfer_date: formatDate(values.transfer_date),
            from_warehouse_id: asId(values.from_warehouse_id ?? values.fromWarehouse),
            to_warehouse_id: asId(values.to_warehouse_id ?? values.toWarehouse),
            notes: nullIfEmpty(values.notes),
            items,
            deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
        };
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Edit Warehouse Transfer" />
            <ReusableCrud
                title="Warehouse Transfers"
                editTitle="Edit Warehouse Transfer"
                apiUrl={api('/api/warehouse-transfers/')}
                fields={fields}
                validationSchema={validationSchema}
                transformPayload={transformPayload}
                ui_type="edit form"
                look_up_var={id}
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                onEditSuccess={(record) => router.visit(route('inventory.warehouse-transfers.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
