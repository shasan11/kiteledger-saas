import { useMemo, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Button, Tag, Typography, message, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import axios from 'axios';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const asId = (v) => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'object') return v?.id ?? v?.value ?? null;
    return v;
};
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => {
    if (!v) return null;
    if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
    const parsed = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
    const fallback = dayjs(v);
    return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

const lineTotal = (row = {}) => toNumber(row.quantity) * toNumber(row.unit_cost);
const calcSummary = (values = {}) => {
    const rawMaterialCost = (values.raw_materials || []).reduce((s, r) => s + lineTotal(r), 0);
    const expenseCost = (values.expenses || []).reduce((s, r) => s + toNumber(r.amount), 0);
    const totalProductionCost = rawMaterialCost + expenseCost;
    const byproductCost = (values.byproducts || []).reduce((s, r) => s + totalProductionCost * (toNumber(r.cost_share_percent) / 100), 0);
    const finishedGoodsCost = Math.max(totalProductionCost - byproductCost, 0);
    const outputQty = toNumber(values.output_quantity);
    return {
        rawMaterialCost,
        expenseCost,
        totalProductionCost,
        byproductCost,
        finishedGoodsCost,
        unitCost: outputQty > 0 ? finishedGoodsCost / outputQty : 0,
    };
};

const emptyRaw = {
    product_id: null, product_id_detail: null,
    warehouse_id: null, product_unit_id: null,
    quantity: 1, unit_cost: 0, total_cost: 0, notes: '',
};
const emptyByproduct = {
    product_id: null, product_id_detail: null,
    warehouse_id: null, product_unit_id: null,
    quantity: 1, cost_share_percent: 0, allocated_cost: 0, unit_cost: 0, notes: '',
};
const emptyExpense = { expense_account_id: null, name: '', amount: 0, notes: '' };

const STATUS_COLORS = {
    draft: 'default',
    approved: 'blue',
    released: 'cyan',
    in_progress: 'orange',
    partially_produced: 'gold',
    completed: 'green',
    cancelled: 'red',
    void: 'red',
};
const STATUS_LABELS = {
    draft: 'Draft',
    approved: 'Approved',
    released: 'Released',
    in_progress: 'In Progress',
    partially_produced: 'Partial',
    completed: 'Completed',
    cancelled: 'Cancelled',
    void: 'Void',
};

export default function Index({ auth }) {
    const columns = useMemo(() => [
        {
            title: 'PO No',
            dataIndex: 'code',
            key: 'code',
            width: 160,
            backendSort: true,
            sortField: 'code',
            render: (v) => <Text strong>{v?.startsWith('#draft') ? 'DRAFT' : (v || 'DRAFT')}</Text>,
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            width: 110,
            backendSort: true,
            sortField: 'date',
            render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-',
        },
        {
            title: 'Finished Product',
            key: 'finished_product',
            width: 220,
            render: (_, r) => r?.finishedProduct?.name || r?.finished_product?.name || '-',
        },
        {
            title: 'Warehouse',
            key: 'warehouse',
            width: 140,
            render: (_, r) => r?.warehouse?.name || '-',
        },
        {
            title: 'Planned Qty',
            dataIndex: 'output_quantity',
            key: 'output_quantity',
            width: 120,
            align: 'right',
            render: (v) => <Text>{toNumber(v).toLocaleString()}</Text>,
        },
        {
            title: 'Est. Cost',
            dataIndex: 'total_production_cost',
            key: 'total_production_cost',
            width: 130,
            align: 'right',
            render: (v) => <Text>{money(v)}</Text>,
        },
        {
            title: 'Unit Cost',
            dataIndex: 'finished_goods_unit_cost',
            key: 'finished_goods_unit_cost',
            width: 110,
            align: 'right',
            render: (v) => <Text>{money(v)}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (v, r) => {
                const s = r?.void ? 'void' : (v || 'draft');
                return <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>;
            },
        },
    ], []);

    const fields = useMemo(() => [
        { name: 'date', label: 'Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
        { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference No.' },
        { name: 'code', label: 'PO Code', type: 'text', col: 8, placeholder: 'Auto on approval', disabled: true },

        {
            name: '_bom_loader',
            label: '',
            type: 'custom',
            col: 24,
            render: ({ values, setFieldValue }) => {
                const loadFromBom = async () => {
                    const bomId = values.bill_of_material_id;
                    if (!bomId) { message.warning('Please select a Bill of Materials first.'); return; }
                    try {
                        const res = await axios.get(api(`/api/bills-of-material/${bomId}`));
                        const bom = res.data;
                        const outputQty = toNumber(values.output_quantity) || toNumber(bom.output_quantity) || 1;
                        const bomOutputQty = toNumber(bom.output_quantity) || 1;
                        const scale = outputQty / bomOutputQty;

                        if (bom.product_id) {
                            setFieldValue('finished_product_id', bom.product_id, false);
                        }

                        const rawLines = (bom.raw_materials || [])
                            .filter((r) => r.product_id)
                            .map((r) => ({
                                ...emptyRaw,
                                product_id: r.product_id,
                                product_id_detail: r.product,
                                quantity: Math.round(toNumber(r.quantity) * scale * 10000) / 10000,
                                unit_cost: 0,
                                total_cost: 0,
                                notes: r.notes || '',
                            }));

                        if (rawLines.length > 0) setFieldValue('raw_materials', rawLines, false);

                        const byproductLines = (bom.by_products || [])
                            .filter((r) => r.product_id)
                            .map((r) => ({
                                ...emptyByproduct,
                                product_id: r.product_id,
                                product_id_detail: r.product,
                                quantity: Math.round(toNumber(r.quantity) * scale * 10000) / 10000,
                                cost_share_percent: toNumber(r.cost_percent),
                                notes: r.notes || '',
                            }));

                        if (byproductLines.length > 0) setFieldValue('byproducts', byproductLines, false);

                        message.success('Materials loaded from BOM.');
                    } catch (e) {
                        message.error('Failed to load BOM. ' + (e?.response?.data?.message || e.message || ''));
                    }
                };

                return (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 4 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Bill of Materials</div>
                            {/* BOM is just a reference — the fkSelect below handles the ID via onFormValuesChange */}
                        </div>
                        <Tooltip title="Load raw materials and by-products from the selected BOM">
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={loadFromBom}
                                style={{ marginBottom: 4 }}
                            >
                                Load from BOM
                            </Button>
                        </Tooltip>
                    </div>
                );
            },
        },
        {
            name: 'bill_of_material_id',
            label: 'Bill of Materials',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/bills-of-material/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'bom_number',
            fkExtraParams: { approved: true, active: true },
            fkLabel: (row) => {
                const no = row?.bom_number || row?.code || '';
                const name = row?.product?.name || row?.finished_product?.name || '';
                return [no, name ? `— ${name}` : ''].filter(Boolean).join(' ');
            },
            placeholder: 'Select BOM (optional)',
        },
        {
            name: 'finished_product_id',
            label: 'Finished Product',
            type: 'fkSelect',
            required: true,
            col: 12,
            fkUrl: api('/api/products/search'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'label',
            fkExtraParams: { active: true, product_type: 'goods' },
            fkLabel: (row) => [row?.name || row?.display_name || '', row?.sku || row?.code ? `(${row.sku || row.code})` : ''].filter(Boolean).join(' '),
        },
        {
            name: 'warehouse_id',
            label: 'Warehouse',
            type: 'fkSelect',
            required: true,
            col: 8,
            fkUrl: api('/api/warehouses/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            fkExtraParams: { active: true },
        },
        {
            name: 'product_unit_id',
            label: 'Unit',
            type: 'fkSelect',
            col: 4,
            fkUrl: api('/api/product-units/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
        },
        { name: 'output_quantity', label: 'Output Quantity', type: 'number', required: true, col: 6, min: 0.0001 },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            col: 6,
            options: [
                { value: 'draft', label: 'Draft' },
                { value: 'approved', label: 'Approve' },
                { value: 'released', label: 'Released' },
            ],
        },

        {
            name: '_rm_title',
            label: '',
            type: 'custom',
            col: 24,
            render: () => (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, marginTop: 4, marginBottom: 6, fontWeight: 700, color: '#374151' }}>
                    Raw Materials
                </div>
            ),
        },
        {
            name: 'raw_materials',
            label: '',
            type: 'objectArray',
            col: 24,
            addButtonLabel: 'Add Raw Material',
            defaultItem: { ...emptyRaw },
            headerBg: '#424b59',
            headerColor: '#ffffff',
            columns: [
                {
                    key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr',
                    fkUrl: api('/api/products/search'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'label',
                    fkExtraParams: { active: true, product_type: 'goods', track_inventory: true },
                    fkLabel: (row) => [row?.name || row?.display_name || '', row?.sku || row?.code ? `(${row.sku || row.code})` : ''].filter(Boolean).join(' '),
                },
                {
                    key: 'warehouse_id', name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', width: '2fr',
                    fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
                    fkExtraParams: { active: true },
                },
                { key: 'quantity', name: 'quantity', label: 'Req. Qty', type: 'number', width: '110px', min: 0.0001 },
                { key: 'unit_cost', name: 'unit_cost', label: 'Unit Cost', type: 'number', width: '120px', min: 0 },
                {
                    key: 'total_cost', name: 'total_cost', label: 'Total Cost', type: 'number', width: '120px', readOnly: true,
                    formula: (row) => Number(lineTotal(row).toFixed(2)),
                },
            ],
            collapsedFields: [
                { key: 'notes', name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 2 },
            ],
        },

        {
            name: '_byproduct_title',
            label: '',
            type: 'custom',
            col: 24,
            render: () => (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, marginTop: 4, marginBottom: 6, fontWeight: 700, color: '#374151' }}>
                    By-products
                </div>
            ),
        },
        {
            name: 'byproducts',
            label: '',
            type: 'objectArray',
            col: 24,
            addButtonLabel: 'Add By-product',
            defaultItem: { ...emptyByproduct },
            headerBg: '#424b59',
            headerColor: '#ffffff',
            columns: [
                {
                    key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr',
                    fkUrl: api('/api/products/search'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'label',
                    fkExtraParams: { active: true, product_type: 'goods' },
                    fkLabel: (row) => [row?.name || row?.display_name || '', row?.sku || row?.code ? `(${row.sku || row.code})` : ''].filter(Boolean).join(' '),
                },
                {
                    key: 'warehouse_id', name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', width: '2fr',
                    fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
                    fkExtraParams: { active: true },
                },
                { key: 'quantity', name: 'quantity', label: 'Qty', type: 'number', width: '100px', min: 0 },
                { key: 'cost_share_percent', name: 'cost_share_percent', label: 'Cost %', type: 'number', width: '90px', min: 0, max: 100 },
                {
                    key: 'allocated_cost', name: 'allocated_cost', label: 'Allocated', type: 'number', width: '120px', readOnly: true,
                    formula: (row, values) => {
                        const s = calcSummary(values || {});
                        return Number((s.totalProductionCost * (toNumber(row.cost_share_percent) / 100)).toFixed(2));
                    },
                },
            ],
            collapsedFields: [
                { key: 'notes', name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 2 },
            ],
        },

        {
            name: '_expense_title',
            label: '',
            type: 'custom',
            col: 24,
            render: () => (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, marginTop: 4, marginBottom: 6, fontWeight: 700, color: '#374151' }}>
                    Estimated Expenses
                </div>
            ),
        },
        {
            name: 'expenses',
            label: '',
            type: 'objectArray',
            col: 24,
            addButtonLabel: 'Add Expense',
            defaultItem: { ...emptyExpense },
            headerBg: '#424b59',
            headerColor: '#ffffff',
            columns: [
                { key: 'name', name: 'name', label: 'Name', type: 'text', width: '2fr' },
                {
                    key: 'expense_account_id', name: 'expense_account_id', label: 'Account', type: 'fkSelect', width: '2fr',
                    fkUrl: api('/api/chart-of-accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
                },
                { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '130px', min: 0 },
            ],
            collapsedFields: [
                { key: 'notes', name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 2 },
            ],
        },

        {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
            col: 12,
            rows: 4,
        },
        {
            name: '_summary',
            label: '',
            type: 'custom',
            col: 12,
            render: ({ values }) => {
                const s = calcSummary(values);
                const row = (label, val, strong = false) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e9edf4' }}>
                        <Text>{label}</Text>
                        <Text strong={strong}>{money(val)}</Text>
                    </div>
                );
                return (
                    <div style={{ border: '1px solid #d8dee8', background: '#f4f6fa', padding: '8px 12px', marginTop: 4 }}>
                        {row('Raw Material Cost', s.rawMaterialCost)}
                        {row('Expense Cost', s.expenseCost)}
                        {row('Total Production Cost', s.totalProductionCost)}
                        {row('By-product Allocated Cost', s.byproductCost)}
                        {row('Finished Goods Cost', s.finishedGoodsCost)}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4 }}>
                            <Text strong>Estimated Unit Cost</Text>
                            <Text strong style={{ fontSize: 16 }}>{money(s.unitCost)}</Text>
                        </div>
                    </div>
                );
            },
        },
    ], []);

    const validationSchema = useMemo(() => Yup.object({
        date: Yup.mixed().required('Date is required'),
        finished_product_id: Yup.mixed().required('Finished product is required'),
        warehouse_id: Yup.mixed().required('Warehouse is required'),
        output_quantity: Yup.number().min(0.0001).required('Output quantity is required'),
    }), []);

    const crudInitialValues = useMemo(() => ({
        code: '',
        date: dayjs(),
        reference: '',
        bill_of_material_id: null,
        bill_of_material_id_detail: null,
        finished_product_id: null,
        warehouse_id: null,
        product_unit_id: null,
        output_quantity: 1,
        status: 'draft',
        approved: false,
        raw_materials: [{ ...emptyRaw }],
        byproducts: [],
        expenses: [],
        notes: '',
    }), []);

    const transformPayload = useCallback((values = {}) => ({
        code: values.code || null,
        date: formatDate(values.date),
        reference: values.reference || null,
        bill_of_material_id: asId(values.bill_of_material_id),
        finished_product_id: asId(values.finished_product_id),
        warehouse_id: asId(values.warehouse_id),
        product_unit_id: asId(values.product_unit_id),
        output_quantity: toNumber(values.output_quantity),
        status: values.status || 'draft',
        approved: !!values.approved || values.status === 'approved',
        raw_materials: (values.raw_materials || [])
            .filter((r) => asId(r.product_id))
            .map((r) => ({
                id: r.id,
                product_id: asId(r.product_id),
                warehouse_id: asId(r.warehouse_id),
                product_unit_id: asId(r.product_unit_id),
                quantity: toNumber(r.quantity),
                unit_cost: toNumber(r.unit_cost),
                total_cost: lineTotal(r),
                notes: r.notes || null,
            })),
        byproducts: (values.byproducts || [])
            .filter((r) => asId(r.product_id))
            .map((r) => ({
                id: r.id,
                product_id: asId(r.product_id),
                warehouse_id: asId(r.warehouse_id),
                product_unit_id: asId(r.product_unit_id),
                quantity: toNumber(r.quantity),
                cost_share_percent: toNumber(r.cost_share_percent),
                notes: r.notes || null,
            })),
        expenses: (values.expenses || [])
            .filter((r) => r.name || toNumber(r.amount) > 0)
            .map((r) => ({
                id: r.id,
                expense_account_id: asId(r.expense_account_id),
                name: r.name || '',
                amount: toNumber(r.amount),
                notes: r.notes || null,
            })),
        notes: values.notes || null,
    }), []);

    const handleFormValuesChange = useCallback((values, { setFieldValue }) => {
        // Auto-fill unit cost from warehouse item avg_cost when product changes
        (values.raw_materials || []).forEach((row, index) => {
            const detail = row?.product_id_detail;
            if (!detail) return;
            if ((row.unit_cost === null || row.unit_cost === undefined || toNumber(row.unit_cost) === 0) &&
                (detail.avg_cost || detail.purchase_price || detail.cost_price)) {
                const cost = toNumber(detail.avg_cost || detail.purchase_price || detail.cost_price);
                if (cost > 0) setFieldValue(`raw_materials[${index}].unit_cost`, cost, false);
            }
        });
    }, []);

    const anchorFilters = useMemo(() => [
        { key: 'approved', label: 'Approved', params: { approved: true } },
        { key: 'draft', label: 'Draft', params: { approved: false, status: 'draft' } },
        { key: 'in_progress', label: 'In Progress', params: { status: 'in_progress' } },
        { key: 'completed', label: 'Completed', params: { status: 'completed' } },
        { key: 'all', label: 'All', params: {} },
    ], []);

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Production Orders" />
            <ReusableCrud
                title="Production Orders"
                apiUrl={api('/api/production-orders/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                onFormValuesChange={handleFormValuesChange}
                anchorFilters={anchorFilters}
                defaultAnchorKey="all"
                anchorSyncWithHash
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                searchParam="search"
                pageParam="page"
                pageSizeParam="page_size"
                sortMode="ordering"
                orderingParam="ordering"
                defaultSortField="created_at"
                defaultSortOrder="descend"
                enableServerPagination
                showSearch
                canAdd
                canEdit
                canDelete
                canView
                custom_add
                custom_add_link={route('inventory.production-orders.add')}
                showViewColumn
                hasActions
                hasActionColumns
                viewPathBuilder={(record) => route('inventory.production-orders.show', record.id)}
                editPathBuilder={(record) => route('inventory.production-orders.edit', record.id)}
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                        router.visit(route('inventory.production-orders.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                onAddSuccess={(record) => router.visit(route('inventory.production-orders.show', record.id))}
            />
        </AuthenticatedLayout>
    );
}
