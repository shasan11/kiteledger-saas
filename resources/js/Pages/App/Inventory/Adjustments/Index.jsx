import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
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

const unitOptions = [
    { value: 'PCS', label: 'PCS' },
    { value: 'PC', label: 'PC' },
    { value: 'CC', label: 'CC' },
    { value: 'BX', label: 'BX' },
    { value: 'KG', label: 'KG' },
    { value: 'LTR', label: 'LTR' },
];

const adjustmentTypeOptions = [
    { value: 'in', label: 'In' },
    { value: 'out', label: 'Out' },
];

const emptyAdjustmentItem = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    product_code: '',
    quantity: 1,
    unit_code: '',
    adjustment_type: 'in',
    rate: 0,
    amount: 0,
    notes: '',
};

const calculateLine = (row = {}) => {
    const quantity = toNumber(row.quantity);
    const rate = toNumber(row.rate);

    return {
        amount: quantity * rate,
        signedQuantity: row.adjustment_type === 'out' ? quantity * -1 : quantity,
    };
};

const initialValues = {
    adjustment_number: 'DRAFT',
    date: dayjs().format('YYYY-MM-DD'),
    reference: '',

    warehouse_id: null,
    warehouse_id_detail: null,
    warehouse_name: '',

    items: [{ ...emptyAdjustmentItem }],

    notes: '',
    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    date: Yup.string().required('Date is required'),

    warehouse_id: Yup.string()
        .nullable()
        .required('Warehouse is required'),

    items: Yup.array()
        .of(
            Yup.object().shape({
                product_id: Yup.string()
                    .nullable()
                    .required('Product is required'),

                quantity: Yup.number()
                    .typeError('Qty is required')
                    .min(0.0001, 'Qty must be greater than 0')
                    .required('Qty is required'),

                adjustment_type: Yup.string()
                    .oneOf(['in', 'out'])
                    .required('Type is required'),

                rate: Yup.number()
                    .typeError('Rate is required')
                    .min(0, 'Rate cannot be negative')
                    .required('Rate is required'),
            }),
        )
        .min(1, 'At least one product is required'),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'adjustment_number',
                label: '#ADJUSTMENT',
                col: 8,
                readOnly: true,
                placeholder: '#ADJUSTMENT',
            },
            {
                name: 'date',
                label: 'Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Date',
            },
            {
                name: 'reference',
                label: 'Reference',
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
                            product_type: 'goods',
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
                        key: 'quantity',
                        name: 'quantity',
                        label: 'Quantity',
                        type: 'number',
                        width: '120px',
                        min: 0,
                        placeholder: 'Qty',
                    },
                    {
                        key: 'unit_code',
                        name: 'unit_code',
                        label: '',
                        type: 'select',
                        width: '95px',
                        options: unitOptions,
                        placeholder: 'Unit',
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
                        key: 'rate',
                        name: 'rate',
                        label: 'RATE',
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
                        key: 'notes',
                        name: 'notes',
                        label: 'Line Notes',
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
                dataIndex: 'adjustment_number',
                key: 'adjustment_number',
                width: 170,
                backendSort: true,
                sortField: 'adjustment_number',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Date',
                dataIndex: 'date',
                key: 'date',
                width: 130,
                backendSort: true,
                sortField: 'date',
                render: (value) => {
                    if (!value) return '-';
                    const parsed = dayjs(value);
                    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
                },
            },
            {
                title: 'Reference',
                dataIndex: 'reference',
                key: 'reference',
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
                        : Array.isArray(record?.lines)
                            ? record.lines
                            : [];

                    return items.length;
                },
            },
            {
                title: 'Total Amount',
                dataIndex: 'total_amount',
                key: 'total_amount',
                width: 150,
                align: 'right',
                render: (_, record) => {
                    const total =
                        record?.total_amount ??
                        (record?.items || record?.lines || []).reduce(
                            (sum, row) => sum + toNumber(row?.amount),
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
                    if (status === 'adjusted') return <Tag color="blue">Adjusted</Tag>;
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
                const line = calculateLine(row);

                return {
                    id: row.id,
                    product_id: row.product_id,
                    quantity: toNumber(row.quantity),
                    signed_quantity: line.signedQuantity,
                    unit_code: row.unit_code || '',
                    adjustment_type: row.adjustment_type || 'in',
                    rate: toNumber(row.rate),
                    amount: Number(line.amount.toFixed(2)),
                    notes: row.notes || '',
                };
            });

        const totalAmount = items.reduce(
            (sum, row) => sum + toNumber(row.amount),
            0,
        );

        return {
            adjustment_number: values.adjustment_number || 'DRAFT',
            date: formatDateForBackend(values.date),
            reference: values.reference || '',

            warehouse_id: values.warehouse_id,

            notes: values.notes || '',

            total_amount: Number(totalAmount.toFixed(2)),

            approved: !!values.approved,
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

            const unitCode =
                product.unit_code ||
                product.primary_unit?.short_name ||
                product.primary_unit?.name ||
                product.unit?.short_name ||
                product.unit?.name ||
                row.unit_code ||
                '';

            const rate =
                product.purchase_price ??
                product.purchase_rate ??
                product.cost_price ??
                product.rate ??
                row.rate ??
                0;

            if (productName && values.items?.[index]?.product_name !== productName) {
                setFieldValue(`items[${index}].product_name`, productName, false);
            }

            if (productCode && values.items?.[index]?.product_code !== productCode) {
                setFieldValue(`items[${index}].product_code`, productCode, false);
            }

            if (unitCode && values.items?.[index]?.unit_code !== unitCode) {
                setFieldValue(`items[${index}].unit_code`, unitCode, false);
            }

            if (
                (row.rate === null ||
                    row.rate === undefined ||
                    Number(row.rate) === 0) &&
                rate
            ) {
                setFieldValue(`items[${index}].rate`, Number(rate), false);
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
                        key: 'draft',
                        label: 'Draft',
                        title: 'Inventory Adjustment',
                        params: { approved: false },
                    },
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Inventory Adjustment',
                        params: { approved: true },
                    },
                    {
                        key: 'adjusted',
                        label: 'Adjusted',
                        title: 'Inventory Adjustment',
                        params: { status: 'adjusted' },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Inventory Adjustment',
                        params: {},
                    },
                ]}
                defaultAnchorKey="draft"
                anchorSyncWithHash
                showSearch
                canAdd
                canEdit
                canDelete
                canView
                hasActions
                hasActionColumns
            />
        </AuthenticatedLayout>
    );
}