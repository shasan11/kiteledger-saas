import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import { Button, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ReusableCrud';
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
    { value: 'KGG', label: 'kgg' },
    { value: 'LTR', label: 'LTR' },
];

const emptyRawMaterial = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    product_code: '',
    quantity: 1,
    unit_code: '',
    rate: 0,
    amount: 0,
    notes: '',
};

const emptyProductionExpense = {
    cost_term_id: null,
    cost_term_id_detail: null,
    cost_term_name: '',
    amount: 0,
    notes: '',
};

const emptyByProduct = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    product_code: '',
    cost_percent: 0,
    quantity: 1,
    unit_code: '',
    allocated_cost: 0,
    notes: '',
};

const calculateRawLine = (row = {}) => {
    const quantity = toNumber(row.quantity);
    const rate = toNumber(row.rate);

    return {
        amount: quantity * rate,
    };
};

const calculateTotals = (values = {}) => {
    const rawMaterialCost = (values.raw_materials || []).reduce((sum, row) => {
        return sum + calculateRawLine(row).amount;
    }, 0);

    const productionExpenses = (values.production_expenses || []).reduce((sum, row) => {
        return sum + toNumber(row.amount);
    }, 0);

    const totalCostOfProduction = rawMaterialCost + productionExpenses;

    const costAllocatedToByProduct = (values.by_products || []).reduce((sum, row) => {
        return sum + (totalCostOfProduction * toNumber(row.cost_percent)) / 100;
    }, 0);

    const finishedGoodsCost = Math.max(
        totalCostOfProduction - costAllocatedToByProduct,
        0,
    );

    const outputQuantity = toNumber(values.output_quantity);

    return {
        rawMaterialCost,
        productionExpenses,
        totalCostOfProduction,
        costAllocatedToByProduct,
        finishedGoodsCost,
        costPerUnit: outputQuantity > 0 ? finishedGoodsCost / outputQuantity : 0,
    };
};

const initialValues = {
    code: 'DRAFT',
    date: dayjs().format('YYYY-MM-DD'),
    reference: '',

    finished_product_id: null,
    finished_product_id_detail: null,
    finished_product_name: '',
    finished_product_code: '',

    output_quantity: 1,
    output_unit_code: '',

    warehouse_id: null,
    warehouse_id_detail: null,
    warehouse_name: '',

    raw_materials: [{ ...emptyRawMaterial }],
    production_expenses: [{ ...emptyProductionExpense }],
    by_products: [{ ...emptyByProduct }],

    show_production_expenses: false,
    show_by_products: false,

    notes: '',
    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    date: Yup.string().required('Date is required'),

    finished_product_id: Yup.string()
        .nullable()
        .required('Product is required'),

    output_quantity: Yup.number()
        .typeError('Output quantity is required')
        .min(0.0001, 'Output quantity must be greater than 0')
        .required('Output quantity is required'),

    warehouse_id: Yup.string()
        .nullable()
        .required('Warehouse is required'),

    raw_materials: Yup.array()
        .of(
            Yup.object().shape({
                product_id: Yup.string()
                    .nullable()
                    .required('Raw material product is required'),

                quantity: Yup.number()
                    .typeError('Quantity is required')
                    .min(0.0001, 'Quantity must be greater than 0')
                    .required('Quantity is required'),

                rate: Yup.number()
                    .typeError('Rate is required')
                    .min(0, 'Rate cannot be negative')
                    .required('Rate is required'),
            }),
        )
        .min(1, 'At least one raw material is required'),

    production_expenses: Yup.array().of(
        Yup.object().shape({
            cost_term_id: Yup.string().nullable(),
            amount: Yup.number()
                .typeError('Amount must be a number')
                .min(0, 'Amount cannot be negative'),
        }),
    ),

    by_products: Yup.array().of(
        Yup.object().shape({
            product_id: Yup.string().nullable(),
            cost_percent: Yup.number()
                .typeError('% of cost must be a number')
                .min(0, '% of cost cannot be negative')
                .max(100, '% of cost cannot be greater than 100'),
            quantity: Yup.number()
                .typeError('Quantity must be a number')
                .min(0, 'Quantity cannot be negative'),
        }),
    ),
});

export default function Index() {
    const fields = useMemo(
        () => [
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
                name: 'code',
                label: 'Code',
                col: 8,
                readOnly: true,
                placeholder: 'DRAFT',
            },

            {
                name: '_finished_goods_title',
                label: '',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 18,
                            marginTop: 8,
                            marginBottom: 8,
                            color: '#374151',
                            fontWeight: 700,
                        }}
                    >
                        Finished Goods Input
                    </div>
                ),
            },
            {
                name: 'finished_product_id',
                label: 'Product Name',
                type: 'fkSelect',
                required: true,
                col: 24,
                placeholder: 'Product',
                fkUrl: '/api/products/search',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'label',
                labelField: 'finished_product_name',
                fkExtraParams: {
                    active: true,
                    product_type: 'goods',
                },
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
                name: 'output_quantity',
                label: 'Output Quantity',
                type: 'number',
                required: true,
                col: 12,
                min: 0,
                placeholder: 'Output Quantity',
            },
            {
                name: 'warehouse_id',
                label: 'Warehouse',
                type: 'fkSelect',
                required: true,
                col: 12,
                placeholder: 'Warehouse',
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
                name: '_raw_material_title',
                label: '',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 18,
                            marginTop: 4,
                            marginBottom: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#374151',
                            fontWeight: 700,
                        }}
                    >
                        <span>Raw Material (Input)</span>
                        <span style={{ color: '#8b95a5' }}>⌄</span>
                    </div>
                ),
            },
            {
                name: 'raw_materials',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Add Code or Product',
                defaultItem: { ...emptyRawMaterial },
                columns: [
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product',
                        type: 'fkSelect',
                        width: '4fr',
                        placeholder: 'Add Code or Product',
                        fkUrl: '/api/products/search',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'label',
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
                        width: '130px',
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
                    },
                    {
                        key: 'rate',
                        name: 'rate',
                        label: 'Rate',
                        type: 'number',
                        width: '130px',
                        min: 0,
                        placeholder: 'Rate',
                    },
                    {
                        key: 'amount',
                        name: 'amount',
                        label: 'Amount',
                        type: 'number',
                        width: '140px',
                        readOnly: true,
                        formula: (row) => Number(calculateRawLine(row).amount.toFixed(2)),
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
                name: '_production_expenses_toggle',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        onClick={() =>
                            setFieldValue(
                                'show_production_expenses',
                                !values.show_production_expenses,
                            )
                        }
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 18,
                            marginTop: 4,
                            marginBottom: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#374151',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <span>Production Expenses (Input)</span>
                        <span style={{ color: '#8b95a5' }}>
                            {values.show_production_expenses ? '⌄' : '›'}
                        </span>
                    </div>
                ),
            },
            {
                name: 'production_expenses',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Add Production Cost',
                defaultItem: { ...emptyProductionExpense },
                condition: (values) => !!values.show_production_expenses,
                columns: [
                    {
                        key: 'cost_term_id',
                        name: 'cost_term_id',
                        label: 'Production Cost Terms',
                        type: 'fkSelect',
                        width: '4fr',
                        placeholder: 'Add Production Cost',
                        fkUrl: '/api/production-cost-terms/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'cost_term_name',
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
                        key: 'amount',
                        name: 'amount',
                        label: 'Amount',
                        type: 'number',
                        width: '160px',
                        min: 0,
                        placeholder: 'Amount',
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
                name: '_by_product_toggle',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        onClick={() =>
                            setFieldValue('show_by_products', !values.show_by_products)
                        }
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 18,
                            marginTop: 4,
                            marginBottom: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#374151',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <span>By product (Output)</span>
                        <span style={{ color: '#8b95a5' }}>
                            {values.show_by_products ? '⌄' : '›'}
                        </span>
                    </div>
                ),
            },
            {
                name: 'by_products',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Add Code or Product',
                defaultItem: { ...emptyByProduct },
                condition: (values) => !!values.show_by_products,
                columns: [
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product',
                        type: 'fkSelect',
                        width: '4fr',
                        placeholder: 'Add Code or Product',
                        fkUrl: '/api/products/search',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'label',
                        labelField: 'product_name',
                        fkExtraParams: {
                            active: true,
                            product_type: 'goods',
                        },
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
                        key: 'cost_percent',
                        name: 'cost_percent',
                        label: '% of Cost',
                        type: 'number',
                        width: '140px',
                        min: 0,
                        max: 100,
                        placeholder: '%',
                    },
                    {
                        key: 'quantity',
                        name: 'quantity',
                        label: 'Quantity',
                        type: 'number',
                        width: '140px',
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
                    },
                    {
                        key: 'allocated_cost',
                        name: 'allocated_cost',
                        label: 'Allocated',
                        type: 'number',
                        width: '140px',
                        readOnly: true,
                        formula: (row, values) => {
                            const totals = calculateTotals(values || {});
                            return Number(
                                (
                                    (totals.totalCostOfProduction *
                                        toNumber(row.cost_percent)) /
                                    100
                                ).toFixed(2),
                            );
                        },
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
                col: 12,
                rows: 5,
                placeholder: 'Notes',
            },
            {
                name: '_summary',
                label: '',
                type: 'custom',
                col: 12,
                render: ({ values }) => {
                    const totals = calculateTotals(values);

                    const rowStyle = {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 0',
                    };

                    return (
                        <div
                            style={{
                                border: '1px solid #d8dee8',
                                background: '#eef2f8',
                                padding: '8px 12px',
                                marginTop: 4,
                            }}
                        >
                            <div style={rowStyle}>
                                <Text>Raw Material Cost</Text>
                                <Text strong>{money(totals.rawMaterialCost)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Production Expenses</Text>
                                <Text strong>{money(totals.productionExpenses)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Total Cost of Production</Text>
                                <Text strong>{money(totals.totalCostOfProduction)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Cost Allocated to By-product</Text>
                                <Text strong>{money(totals.costAllocatedToByProduct)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Finished Goods Cost</Text>
                                <Text strong>{money(totals.finishedGoodsCost)}</Text>
                            </div>

                            <div
                                style={{
                                    ...rowStyle,
                                    borderTop: '1px solid #d1d8e3',
                                    marginTop: 8,
                                    paddingTop: 14,
                                }}
                            >
                                <Text strong>Cost Per Unit</Text>
                                <Text strong style={{ fontSize: 17 }}>
                                    {money(totals.costPerUnit)}
                                </Text>
                            </div>
                        </div>
                    );
                },
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: 'Code',
                dataIndex: 'code',
                key: 'code',
                width: 160,
                backendSort: true,
                sortField: 'code',
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
                width: 180,
                render: (value) => value || '-',
            },
            {
                title: 'Finished Product',
                dataIndex: 'finished_product_name',
                key: 'finished_product_name',
                width: 260,
                backendSort: true,
                sortField: 'finished_product_name',
                render: (_, record) =>
                    record?.finished_product_name ||
                    record?.finished_product?.name ||
                    record?.product?.name ||
                    '-',
            },
            {
                title: 'Warehouse',
                dataIndex: 'warehouse_name',
                key: 'warehouse_name',
                width: 180,
                render: (_, record) =>
                    record?.warehouse_name ||
                    record?.warehouse?.name ||
                    record?.warehouse?.code ||
                    '-',
            },
            {
                title: 'Output Qty',
                dataIndex: 'output_quantity',
                key: 'output_quantity',
                width: 130,
                align: 'right',
                render: (value, record) => {
                    const unit =
                        record?.output_unit_code ||
                        record?.finished_product?.primary_unit?.short_name ||
                        '';

                    return `${toNumber(value)} ${unit}`.trim();
                },
            },
            {
                title: 'Raw Cost',
                dataIndex: 'raw_material_cost',
                key: 'raw_material_cost',
                width: 130,
                align: 'right',
                render: (value) => <Text strong>{money(value)}</Text>,
            },
            {
                title: 'Finished Cost',
                dataIndex: 'finished_goods_cost',
                key: 'finished_goods_cost',
                width: 150,
                align: 'right',
                render: (value) => <Text strong>{money(value)}</Text>,
            },
            {
                title: 'Cost / Unit',
                dataIndex: 'cost_per_unit',
                key: 'cost_per_unit',
                width: 130,
                align: 'right',
                render: (value) => <Text strong>{money(value)}</Text>,
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (value, record) => {
                    const status = value || (record?.approved ? 'approved' : 'draft');

                    if (status === 'approved') return <Tag color="green">Approved</Tag>;
                    if (status === 'posted') return <Tag color="blue">Posted</Tag>;
                    if (status === 'cancelled') return <Tag color="red">Cancelled</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const rawMaterials = (values.raw_materials || [])
            .filter((row) => row.product_id)
            .map((row) => {
                const line = calculateRawLine(row);

                return {
                    id: row.id,
                    product_id: row.product_id,
                    quantity: toNumber(row.quantity),
                    unit_code: row.unit_code || '',
                    rate: toNumber(row.rate),
                    amount: Number(line.amount.toFixed(2)),
                    notes: row.notes || '',
                };
            });

        const productionExpenses = (values.production_expenses || [])
            .filter((row) => row.cost_term_id || toNumber(row.amount) > 0)
            .map((row) => ({
                id: row.id,
                cost_term_id: row.cost_term_id,
                amount: toNumber(row.amount),
                notes: row.notes || '',
            }));

        const byProducts = (values.by_products || [])
            .filter((row) => row.product_id)
            .map((row) => {
                const totals = calculateTotals(values);
                const allocatedCost =
                    (totals.totalCostOfProduction * toNumber(row.cost_percent)) / 100;

                return {
                    id: row.id,
                    product_id: row.product_id,
                    cost_percent: toNumber(row.cost_percent),
                    quantity: toNumber(row.quantity),
                    unit_code: row.unit_code || '',
                    allocated_cost: Number(allocatedCost.toFixed(2)),
                    notes: row.notes || '',
                };
            });

        const totals = calculateTotals(values);

        return {
            code: values.code || 'DRAFT',
            date: formatDateForBackend(values.date),
            reference: values.reference || '',

            finished_product_id: values.finished_product_id,
            output_quantity: toNumber(values.output_quantity),
            output_unit_code: values.output_unit_code || '',
            warehouse_id: values.warehouse_id,

            raw_materials: rawMaterials,
            production_expenses: productionExpenses,
            by_products: byProducts,

            raw_material_cost: Number(totals.rawMaterialCost.toFixed(2)),
            production_expense_amount: Number(totals.productionExpenses.toFixed(2)),
            total_cost_of_production: Number(totals.totalCostOfProduction.toFixed(2)),
            by_product_allocated_cost: Number(totals.costAllocatedToByProduct.toFixed(2)),
            finished_goods_cost: Number(totals.finishedGoodsCost.toFixed(2)),
            cost_per_unit: Number(totals.costPerUnit.toFixed(2)),

            notes: values.notes || '',

            approved: !!values.approved,
            status: values.status || 'draft',
        };
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const product = values?.finished_product_id_detail;

        if (product) {
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
                values.output_unit_code ||
                '';

            if (productName && values.finished_product_name !== productName) {
                setFieldValue('finished_product_name', productName, false);
            }

            if (productCode && values.finished_product_code !== productCode) {
                setFieldValue('finished_product_code', productCode, false);
            }

            if (unitCode && values.output_unit_code !== unitCode) {
                setFieldValue('output_unit_code', unitCode, false);
            }
        }

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

        (values.raw_materials || []).forEach((row, index) => {
            const itemProduct = row?.product_id_detail;

            if (!itemProduct) return;

            const productName =
                itemProduct.name ||
                itemProduct.display_name ||
                itemProduct.title ||
                '';

            const productCode =
                itemProduct.code ||
                itemProduct.sku ||
                '';

            const unitCode =
                itemProduct.unit_code ||
                itemProduct.primary_unit?.short_name ||
                itemProduct.primary_unit?.name ||
                itemProduct.unit?.short_name ||
                itemProduct.unit?.name ||
                row.unit_code ||
                '';

            const rate =
                itemProduct.purchase_price ??
                itemProduct.purchase_rate ??
                itemProduct.cost_price ??
                itemProduct.rate ??
                row.rate ??
                0;

            if (productName && row.product_name !== productName) {
                setFieldValue(`raw_materials[${index}].product_name`, productName, false);
            }

            if (productCode && row.product_code !== productCode) {
                setFieldValue(`raw_materials[${index}].product_code`, productCode, false);
            }

            if (unitCode && row.unit_code !== unitCode) {
                setFieldValue(`raw_materials[${index}].unit_code`, unitCode, false);
            }

            if (
                (row.rate === null ||
                    row.rate === undefined ||
                    Number(row.rate) === 0) &&
                rate
            ) {
                setFieldValue(`raw_materials[${index}].rate`, Number(rate), false);
            }

            const nextAmount = Number(calculateRawLine(row).amount.toFixed(2));

            if (Number(row.amount || 0) !== nextAmount) {
                setFieldValue(`raw_materials[${index}].amount`, nextAmount, false);
            }
        });

        (values.production_expenses || []).forEach((row, index) => {
            const costTerm = row?.cost_term_id_detail;

            if (!costTerm) return;

            const costTermName =
                costTerm.name ||
                costTerm.display_name ||
                costTerm.code ||
                '';

            if (costTermName && row.cost_term_name !== costTermName) {
                setFieldValue(
                    `production_expenses[${index}].cost_term_name`,
                    costTermName,
                    false,
                );
            }
        });

        (values.by_products || []).forEach((row, index) => {
            const itemProduct = row?.product_id_detail;

            if (!itemProduct) return;

            const productName =
                itemProduct.name ||
                itemProduct.display_name ||
                itemProduct.title ||
                '';

            const productCode =
                itemProduct.code ||
                itemProduct.sku ||
                '';

            const unitCode =
                itemProduct.unit_code ||
                itemProduct.primary_unit?.short_name ||
                itemProduct.primary_unit?.name ||
                itemProduct.unit?.short_name ||
                itemProduct.unit?.name ||
                row.unit_code ||
                '';

            if (productName && row.product_name !== productName) {
                setFieldValue(`by_products[${index}].product_name`, productName, false);
            }

            if (productCode && row.product_code !== productCode) {
                setFieldValue(`by_products[${index}].product_code`, productCode, false);
            }

            if (unitCode && row.unit_code !== unitCode) {
                setFieldValue(`by_products[${index}].unit_code`, unitCode, false);
            }

            const totals = calculateTotals(values);
            const nextAllocatedCost = Number(
                ((totals.totalCostOfProduction * toNumber(row.cost_percent)) / 100).toFixed(2),
            );

            if (Number(row.allocated_cost || 0) !== nextAllocatedCost) {
                setFieldValue(
                    `by_products[${index}].allocated_cost`,
                    nextAllocatedCost,
                    false,
                );
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
                minWidth: 120,
                height: 40,
                borderRadius: 2,
                background: '#18b957',
                borderColor: '#18b957',
                fontWeight: 650,
            }}
        >
            Save
        </Button>
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Production Journal
                </h2>
            }
        >
            <Head title="Production Journal" />

            <ReusableCrud
                title="Production Journal"
                apiUrl={api('/api/production-journals/')}
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
                        title: 'Production Journal',
                        params: { approved: true },
                    },
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Production Journal',
                        params: { approved: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Production Journal',
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
                viewPathBuilder={(record) => route('inventory.production-journals.show', record.id)}
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                        router.visit(route('inventory.production-journals.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                hasActions
                hasActionColumns
            />
        </AuthenticatedLayout>
    );
}
