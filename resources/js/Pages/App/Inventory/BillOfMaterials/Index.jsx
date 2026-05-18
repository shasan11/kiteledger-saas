import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import { Button, Checkbox, Tag, Typography } from 'antd';
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

const unitOptions = [
    { value: 'PCS', label: 'PCS' },
    { value: 'PC', label: 'PC' },
    { value: 'CC', label: 'CC' },
    { value: 'BX', label: 'BX' },
    { value: 'KG', label: 'KG' },
    { value: 'LTR', label: 'LTR' },
];

const emptyRawMaterial = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    product_code: '',
    quantity: 1,
    unit_code: '',
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
    notes: '',
};

const emptyProductionExpense = {
    cost_term_id: null,
    cost_term_id_detail: null,
    cost_term_name: '',
    amount: 0,
    notes: '',
};

const initialValues = {
    bom_number: 'DRAFT',

    product_id: null,
    product_id_detail: null,
    product_name: '',
    product_code: '',

    output_quantity: 1,
    output_unit_code: '',

    manufacture_on_every_sale: false,

    raw_materials: [{ ...emptyRawMaterial }],
    by_products: [{ ...emptyByProduct }],
    production_expenses: [{ ...emptyProductionExpense }],

    notes: '',
    approved: false,
    status: 'draft',
    active: true,
};

const validationSchema = Yup.object().shape({
    product_id: Yup.string()
        .nullable()
        .required('Product is required'),

    output_quantity: Yup.number()
        .typeError('Output quantity is required')
        .min(0.0001, 'Output quantity must be greater than 0')
        .required('Output quantity is required'),

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
            }),
        )
        .min(1, 'At least one raw material is required'),

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

    production_expenses: Yup.array().of(
        Yup.object().shape({
            cost_term_id: Yup.string().nullable(),
            amount: Yup.number()
                .typeError('Amount must be a number')
                .min(0, 'Amount cannot be negative'),
        }),
    ),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'product_id',
                label: 'Product',
                type: 'fkSelect',
                required: true,
                col: 12,
                placeholder: 'Product',
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
                name: 'output_quantity',
                label: 'Output Quantity',
                type: 'number',
                col: 12,
                min: 0,
                placeholder: 'Output Quantity',
            },

            {
                name: '_manufacture_on_sale',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            paddingTop: 10,
                            paddingBottom: 12,
                        }}
                    >
                        <Checkbox
                            checked={!!values.manufacture_on_every_sale}
                            onChange={(e) =>
                                setFieldValue(
                                    'manufacture_on_every_sale',
                                    e.target.checked,
                                )
                            }
                        />
                        <Text strong>Manufacture on every sales</Text>
                    </div>
                ),
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
                        fkExtraParams: {
                            active: true,
                            product_type: 'goods',
                            track_inventory: true,
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
                name: '_by_product_title',
                label: '',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
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
                        <span>By product (Output)</span>
                        <span style={{ color: '#8b95a5' }}>⌄</span>
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
                name: '_production_expenses_title',
                label: '',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
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
                        <span>Production Expenses (Input)</span>
                        <span style={{ color: '#8b95a5' }}>⌄</span>
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
                        placeholder: 'Amt',
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
                rows: 5,
                placeholder: 'Notes',
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: 'BOM No',
                dataIndex: 'bom_number',
                key: 'bom_number',
                width: 160,
                backendSort: true,
                sortField: 'bom_number',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Product',
                dataIndex: 'product_name',
                key: 'product_name',
                width: 260,
                backendSort: true,
                sortField: 'product_name',
                render: (_, record) =>
                    record?.product_name ||
                    record?.product?.name ||
                    record?.product?.display_name ||
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
                        record?.product?.primary_unit?.short_name ||
                        '';

                    return `${toNumber(value)} ${unit}`.trim();
                },
            },
            {
                title: 'Raw Materials',
                dataIndex: 'raw_materials',
                key: 'raw_materials',
                width: 140,
                align: 'right',
                render: (value, record) => {
                    const rows = Array.isArray(value)
                        ? value
                        : Array.isArray(record?.items)
                            ? record.items
                            : [];

                    return rows.length;
                },
            },
            {
                title: 'By Products',
                dataIndex: 'by_products',
                key: 'by_products',
                width: 130,
                align: 'right',
                render: (value) => (Array.isArray(value) ? value.length : 0),
            },
            {
                title: 'Expenses',
                dataIndex: 'production_expenses',
                key: 'production_expenses',
                width: 130,
                align: 'right',
                render: (value) => (Array.isArray(value) ? value.length : 0),
            },
            {
                title: 'Auto Manufacture',
                dataIndex: 'manufacture_on_every_sale',
                key: 'manufacture_on_every_sale',
                width: 150,
                render: (value) =>
                    value ? (
                        <Tag color="green">Yes</Tag>
                    ) : (
                        <Tag>No</Tag>
                    ),
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (value, record) => {
                    const status = value || (record?.approved ? 'approved' : 'draft');

                    if (status === 'approved') return <Tag color="green">Approved</Tag>;
                    if (status === 'inactive') return <Tag color="red">Inactive</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const rawMaterials = (values.raw_materials || [])
            .filter((row) => row.product_id)
            .map((row) => ({
                id: row.id,
                product_id: row.product_id,
                quantity: toNumber(row.quantity),
                unit_code: row.unit_code || '',
                notes: row.notes || '',
            }));

        const byProducts = (values.by_products || [])
            .filter((row) => row.product_id)
            .map((row) => ({
                id: row.id,
                product_id: row.product_id,
                cost_percent: toNumber(row.cost_percent),
                quantity: toNumber(row.quantity),
                unit_code: row.unit_code || '',
                notes: row.notes || '',
            }));

        const productionExpenses = (values.production_expenses || [])
            .filter((row) => row.cost_term_id || toNumber(row.amount) > 0)
            .map((row) => ({
                id: row.id,
                cost_term_id: row.cost_term_id,
                amount: toNumber(row.amount),
                notes: row.notes || '',
            }));

        return {
            bom_number: values.bom_number || 'DRAFT',

            product_id: values.product_id,
            output_quantity: toNumber(values.output_quantity),
            output_unit_code: values.output_unit_code || '',

            manufacture_on_every_sale: !!values.manufacture_on_every_sale,

            raw_materials: rawMaterials,
            by_products: byProducts,
            production_expenses: productionExpenses,

            notes: values.notes || '',

            approved: !!values.approved,
            status: values.status || 'draft',
            active: values.active !== false,
        };
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const product = values?.product_id_detail;

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

            if (productName && values.product_name !== productName) {
                setFieldValue('product_name', productName, false);
            }

            if (productCode && values.product_code !== productCode) {
                setFieldValue('product_code', productCode, false);
            }

            if (unitCode && values.output_unit_code !== unitCode) {
                setFieldValue('output_unit_code', unitCode, false);
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

            if (productName && row.product_name !== productName) {
                setFieldValue(`raw_materials[${index}].product_name`, productName, false);
            }

            if (productCode && row.product_code !== productCode) {
                setFieldValue(`raw_materials[${index}].product_code`, productCode, false);
            }

            if (unitCode && row.unit_code !== unitCode) {
                setFieldValue(`raw_materials[${index}].unit_code`, unitCode, false);
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
                    Bills Of Material
                </h2>
            }
        >
            <Head title="Bills Of Material" />

            <ReusableCrud
                title="Bills Of Material"
                apiUrl={api('/api/bills-of-material/')}
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
                        title: 'Bills Of Material',
                        params: { approved: true },
                    },
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Bills Of Material',
                        params: { approved: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Bills Of Material',
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
                viewPathBuilder={(record) => route('inventory.bill-of-materials.show', record.id)}
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                        router.visit(route('inventory.bill-of-materials.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                hasActions
                hasActionColumns
            />
        </AuthenticatedLayout>
    );
}
