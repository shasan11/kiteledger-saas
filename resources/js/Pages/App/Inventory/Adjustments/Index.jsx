import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import { Button, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ResuableCrud';
const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const money = (value) =>
    toNumber(value).toLocaleString('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatDateForBackend = (value) => {
    if (!value) return null;

    const display = dayjs(value, 'DD-MM-YYYY', true);
    if (display.isValid()) return display.format('YYYY-MM-DD');

    const normal = dayjs(value);
    if (normal.isValid()) return normal.format('YYYY-MM-DD');

    return value;
};

const adjustmentTypeOptions = [
    { value: 'increase', label: 'Increase' },
    { value: 'decrease', label: 'Decrease' },
];

const emptyAdjustmentItem = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    product_code: '',
    qty: 1,
    adjustment_type: 'increase',
    unit_cost: 0,
    amount: 0,
    remarks: '',
};

const calculateLine = (row = {}) => {
    const quantity = toNumber(row.qty);
    const rate = toNumber(row.unit_cost);

    return {
        amount: quantity * rate,
        signedQuantity: row.adjustment_type === 'decrease' ? quantity * -1 : quantity,
    };
};

const initialValues = {
    adjustment_no: '',
    adjustment_date: dayjs().format('YYYY-MM-DD'),
    reason: '',

    warehouse_id: null,
    warehouse_id_detail: null,
    warehouse_name: '',

    items: [{ ...emptyAdjustmentItem }],

    notes: '',
    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    adjustment_date: Yup.string().required('Date is required'),

    warehouse_id: Yup.string()
        .nullable()
        .required('Warehouse is required'),

    items: Yup.array()
        .of(
            Yup.object().shape({
                product_id: Yup.string()
                    .nullable()
                    .required('Product is required'),

                qty: Yup.number()
                    .typeError('Qty is required')
                    .min(0.0001, 'Qty must be greater than 0')
                    .required('Qty is required'),

                adjustment_type: Yup.string()
                    .oneOf(['increase', 'decrease'])
                    .required('Type is required'),

                unit_cost: Yup.number()
                    .typeError('Unit cost is required')
                    .min(0, 'Unit cost cannot be negative')
                    .required('Unit cost is required'),
            }),
        )
        .min(1, 'At least one product is required'),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'adjustment_no',
                label: '#ADJUSTMENT',
                col: 8,
                placeholder: 'IA-0001',
            },
            {
                name: 'adjustment_date',
                label: 'Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Date',
            },
            {
                name: 'reason',
                label: 'Reason',
                col: 8,
                placeholder: 'Reference',
            },

            {
                name: 'warehouse_id',
                label: 'Warehouse',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Select Warehouse',
                fkUrl: '/api/warehouses/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'warehouse_name',
                fkExtraParams: {
                    active: true,
                },
                fkLabel: (row) =>
                    row?.name ||
                    row?.display_name ||
                    row?.code ||
                    '',
            },
            {
                name: '_warehouse_empty_space_1',
                type: 'custom',
                col: 8,
                render: () => null,
            },
            {
                name: '_warehouse_empty_space_2',
                type: 'custom',
                col: 8,
                render: () => null,
            },

            {
                name: 'items',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Add Code or Product',
                defaultItem: { ...emptyAdjustmentItem },
                columns: [
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product',
                        type: 'fkSelect',
                        width: '3fr',
                        placeholder: 'Add Code or Product',
                        fkUrl: '/api/products/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'product_name',
                        fkExtraParams: (values) => ({
                            active: true,
                            product_type: 'simple',
                            track_inventory: true,
                            warehouse_id: values?.warehouse_id || '',
                        }),
                        fkLabel: (row) => {
                            const name =
                                row?.name ||
                                row?.display_name ||
                                row?.title ||
                                '';

                            const code =
                                row?.code ||
                                row?.sku ||
                                '';

                            return [name, code ? `(${code})` : '']
                                .filter(Boolean)
                                .join(' ');
                        },
                    },
                    {
                        key: 'qty',
                        name: 'qty',
                        label: 'Quantity',
                        type: 'number',
                        width: '120px',
                        min: 0,
                        placeholder: 'Qty',
                    },
                    {
                        key: 'adjustment_type',
                        name: 'adjustment_type',
                        label: 'Type',
                        type: 'select',
                        width: '115px',
                        options: adjustmentTypeOptions,
                    },
                    {
                        key: 'unit_cost',
                        name: 'unit_cost',
                        label: 'Unit Cost',
                        type: 'number',
                        width: '150px',
                        min: 0,
                        placeholder: '0',
                    },
                    {
                        key: 'amount',
                        name: 'amount',
                        label: 'Amount',
                        type: 'number',
                        width: '150px',
                        readOnly: true,
                        formula: (row) => Number(calculateLine(row).amount.toFixed(2)),
                    },
                ],
                collapsedFields: [
                    {
                        key: 'remarks',
                        name: 'remarks',
                        label: 'Line Remarks',
                        type: 'textarea',
                        col: 24,
                        rows: 2,
                        placeholder: 'Line notes',
                    },
                ],
            },

            {
                name: 'notes',
                label: 'Notes',
                type: 'textarea',
                col: 24,
                rows: 6,
                placeholder: 'Notes',
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: '#ADJUSTMENT',
                dataIndex: 'adjustment_no',
                key: 'adjustment_no',
                width: 170,
                backendSort: true,
                sortField: 'adjustment_no',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Date',
                dataIndex: 'adjustment_date',
                key: 'adjustment_date',
                width: 130,
                backendSort: true,
                sortField: 'adjustment_date',
                render: (value) => {
                    if (!value) return '-';
                    const parsed = dayjs(value);
                    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
                },
            },
            {
                title: 'Reason',
                dataIndex: 'reason',
                key: 'reason',
                width: 170,
                render: (value) => value || '-',
            },
            {
                title: 'Warehouse',
                dataIndex: 'warehouse_name',
                key: 'warehouse_name',
                width: 220,
                render: (_, record) =>
                    record?.warehouse_name ||
                    record?.warehouse?.name ||
                    record?.warehouse?.code ||
                    '-',
            },
            {
                title: 'Items',
                dataIndex: 'items',
                key: 'items',
                width: 100,
                align: 'right',
                render: (value, record) => {
                    const items = Array.isArray(value)
                        ? value
                        : Array.isArray(record?.inventoryAdjustmentLines)
                            ? record.inventoryAdjustmentLines
                            : [];

                    return items.length;
                },
            },
            {
                title: 'Total Amount',
                dataIndex: 'total',
                key: 'total',
                width: 150,
                align: 'right',
                render: (_, record) => {
                    const total =
                        record?.total ??
                        (record?.items || record?.lines || []).reduce(
                            (sum, row) => sum + (toNumber(row?.qty) * toNumber(row?.unit_cost)),
                            0,
                        );

                    return <Text strong>{money(total)}</Text>;
                },
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (value, record) => {
                    const status = value || (record?.approved ? 'approved' : 'draft');

                    if (status === 'approved') return <Tag color="green">Approved</Tag>;
                    if (status === 'posted') return <Tag color="green">Posted</Tag>;
                    if (status === 'cancelled') return <Tag color="red">Cancelled</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const items = (values.items || [])
            .filter((row) => row.product_id)
            .map((row) => {
                return {
                    id: row.id,
                    product_id: row.product_id,
                    qty: toNumber(row.qty),
                    adjustment_type: row.adjustment_type || 'increase',
                    unit_cost: toNumber(row.unit_cost),
                    remarks: row.remarks || '',
                    active: row.active !== false,
                };
            });

        const total = items.reduce(
            (sum, row) => sum + (toNumber(row.qty) * toNumber(row.unit_cost)),
            0,
        );

        return {
            adjustment_no: values.adjustment_no?.trim() || null,
            adjustment_date: formatDateForBackend(values.adjustment_date),
            reason: values.reason || '',

            warehouse_id: values.warehouse_id,

            notes: values.notes || '',

            total: Number(total.toFixed(2)),

            status: values.status || 'draft',

            items,
        };
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const warehouse = values?.warehouse_id_detail;

        if (warehouse) {
            const name =
                warehouse.name ||
                warehouse.display_name ||
                warehouse.code ||
                '';

            if (name && values.warehouse_name !== name) {
                setFieldValue('warehouse_name', name, false);
            }
        }

        (values.items || []).forEach((row, index) => {
            const product = row?.product_id_detail;

            if (!product) return;

            const productName =
                product.name ||
                product.display_name ||
                product.title ||
                '';

            const productCode =
                product.code ||
                product.sku ||
                '';

            const rate =
                product.purchase_price ??
                product.purchase_rate ??
                product.cost_price ??
                product.rate ??
                row.unit_cost ??
                0;

            if (productName && values.items?.[index]?.product_name !== productName) {
                setFieldValue(`items[${index}].product_name`, productName, false);
            }

            if (productCode && values.items?.[index]?.product_code !== productCode) {
                setFieldValue(`items[${index}].product_code`, productCode, false);
            }

            if (
                (row.unit_cost === null ||
                    row.unit_cost === undefined ||
                    Number(row.unit_cost) === 0) &&
                rate
            ) {
                setFieldValue(`items[${index}].unit_cost`, Number(rate), false);
            }

            const nextAmount = Number(calculateLine(row).amount.toFixed(2));

            if (Number(row.amount || 0) !== nextAmount) {
                setFieldValue(`items[${index}].amount`, nextAmount, false);
            }
        });
    };

    const renderSaveButton = ({ submitForm, isValid, isSubmitting }) => (
        <Button
            type="primary"
            loading={isSubmitting}
            disabled={!isValid || isSubmitting}
            onClick={submitForm}
            style={{
                minWidth: 165,
                height: 52,
                borderRadius: 2,
                background: '#18b957',
                borderColor: '#18b957',
                fontWeight: 650,
                fontSize: 16,
            }}
        >
            Save
        </Button>
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Inventory Adjustment
                </h2>
            }
        >
            <Head title="Inventory Adjustment" />

            <ReusableCrud
                title="Inventory Adjustment"
                apiUrl={api('/api/inventory-adjustments/')}
                fields={fields}
                columns={columns}
                validationSchema={validationSchema}
                crudInitialValues={initialValues}
                form_ui="drawer"
                drawerWidth="calc(100vw - 32px)"
                modalWidth={1300}
                enableServerPagination
                pageParam="page"
                pageSizeParam="page_size"
                searchParam="search"
                activeParam="active"
                sortMode="ordering"
                orderingParam="ordering"
                defaultSortField="created_at"
                defaultSortOrder="descend"
                transformPayload={transformPayload}
                onFormValuesChange={handleFormValuesChange}
                renderSubmitButton={renderSaveButton}
                anchorFilters={[
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Inventory Adjustment',
                        params: { approved: true },
                    },
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Inventory Adjustment',
                        params: { approved: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Inventory Adjustment',
                        params: {},
                    },
                ]}
                defaultAnchorKey="approved"
                anchorSyncWithHash
                showSearch
                canAdd
                canEdit
                canDelete
                canView
                showViewColumn
                viewPathBuilder={(record) => route('inventory.adjustments.show', record.id)}
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                        router.visit(route('inventory.adjustments.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                hasActions
                hasActionColumns
            />
        </AuthenticatedLayout>
    );
}
