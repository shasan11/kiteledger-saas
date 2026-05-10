import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Tag, Typography, theme } from 'antd';
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

    const parsedDisplay = dayjs(value, 'DD-MM-YYYY', true);
    if (parsedDisplay.isValid()) return parsedDisplay.format('YYYY-MM-DD');

    const parsedNormal = dayjs(value);
    if (parsedNormal.isValid()) return parsedNormal.format('YYYY-MM-DD');

    return value;
};

const getRelationLabel = (relation) => {
    if (!relation) return '';

    return (
        relation.label ||
        relation.display_name ||
        relation.company_name ||
        relation.person_name ||
        relation.name ||
        relation.code ||
        relation.email ||
        ''
    );
};

const emptyItem = {
    id: null,

    product_id: null,
    product_id_detail: null,
    product_name: '',

    custom_product_name: '',
    description: '',

    qty: 1,
    unit_price: 0,
    discount_percent: 0,

    tax_rate_id: null,
    tax_rate_id_detail: null,
    tax_rate_name: '',

    tax_amount: 0,
    line_total: 0,
};

const normalizeLine = (line = {}) => {
    const productDetail =
        line.product_id_detail ||
        line.product ||
        line.product_detail ||
        null;

    const taxDetail =
        line.tax_rate_id_detail ||
        line.taxRate ||
        line.tax_rate ||
        line.tax_rate_detail ||
        null;

    return {
        id: line.id || null,

        product_id:
            line.product_id ||
            productDetail?.id ||
            productDetail?.value ||
            null,
        product_id_detail: productDetail,
        product_name:
            line.product_name ||
            getRelationLabel(productDetail),

        custom_product_name: line.custom_product_name || '',
        description: line.description || '',

        qty: toNumber(line.qty || 1),
        unit_price: toNumber(line.unit_price),
        discount_percent: toNumber(line.discount_percent),

        tax_rate_id:
            line.tax_rate_id ||
            taxDetail?.id ||
            taxDetail?.value ||
            null,
        tax_rate_id_detail: taxDetail,
        tax_rate_name:
            line.tax_rate_name ||
            getRelationLabel(taxDetail),

        tax_amount: toNumber(line.tax_amount),
        line_total: toNumber(line.line_total),
    };
};

const calculateLine = (row = {}) => {
    const qty = toNumber(row.qty);
    const unitPrice = toNumber(row.unit_price);
    const discountPercent = toNumber(row.discount_percent);

    const baseAmount = qty * unitPrice;
    const discountAmount = baseAmount * (discountPercent / 100);
    const taxableAmount = Math.max(baseAmount - discountAmount, 0);

    const taxRate =
        row?.tax_rate_id_detail?.rate_percent ??
        row?.taxRate?.rate_percent ??
        row?.tax_rate?.rate_percent ??
        row?.tax_rate_percent ??
        0;

    const taxAmount = taxableAmount * (toNumber(taxRate) / 100);
    const lineTotal = taxableAmount + taxAmount;

    return {
        baseAmount,
        discountAmount,
        taxableAmount,
        taxAmount,
        lineTotal,
    };
};

const calculateTotals = (values = {}) => {
    const items = values.items || [];

    return items.reduce(
        (acc, row) => {
            const line = calculateLine(row);

            acc.subtotal += line.baseAmount;
            acc.discountTotal += line.discountAmount;
            acc.taxTotal += line.taxAmount;
            acc.grandTotal += line.lineTotal;

            return acc;
        },
        {
            subtotal: 0,
            discountTotal: 0,
            taxTotal: 0,
            grandTotal: 0,
        },
    );
};

const initialValues = {
    branch_id: null,
    branch_id_detail: null,

    sales_order_no: '',
    sales_order_date: dayjs().format('YYYY-MM-DD'),

    contact_id: null,
    contact_id_detail: null,
    contact_name: '',

    warehouse_id: null,
    warehouse_id_detail: null,
    warehouse_name: '',

    currency_id: null,
    currency_id_detail: null,
    currency_name: '',

    reference: '',
    notes: '',

    subtotal: 0,
    discount_total: 0,
    tax_total: 0,
    grand_total: 0,
    total: 0,

    approved: false,
    void: false,
    active: true,
    status: 'draft',

    items: [{ ...emptyItem }],
    deleted_item_ids: [],
};

const validationSchema = Yup.object().shape({
    sales_order_no: Yup.string()
        .nullable()
        .max(40, 'Max 40 characters'),

    sales_order_date: Yup.string()
        .required('Sales order date is required'),

    contact_id: Yup.string()
        .nullable()
        .required('Customer is required'),

    items: Yup.array()
        .of(
            Yup.object().shape({
                product_id: Yup.string().nullable(),
                custom_product_name: Yup.string().nullable(),

                qty: Yup.number()
                    .typeError('Qty is required')
                    .moreThan(0, 'Qty must be greater than 0')
                    .required('Qty is required'),

                unit_price: Yup.number()
                    .typeError('Unit price is required')
                    .min(0, 'Unit price cannot be negative')
                    .required('Unit price is required'),

                discount_percent: Yup.number()
                    .typeError('Discount must be a number')
                    .min(0, 'Discount cannot be negative')
                    .max(100, 'Discount cannot be more than 100')
                    .nullable(),

                tax_amount: Yup.number()
                    .typeError('Tax amount must be a number')
                    .min(0, 'Tax amount cannot be negative')
                    .nullable(),

                line_total: Yup.number()
                    .typeError('Line total must be a number')
                    .min(0, 'Line total cannot be negative')
                    .nullable(),
            }),
        )
        .min(1, 'At least one item is required')
        .test(
            'product-or-custom-name',
            'Each item must have product or custom product name',
            (items = []) =>
                items.every(
                    (row) =>
                        !!row?.product_id ||
                        !!String(row?.custom_product_name || '').trim(),
                ),
        ),
});

export default function Index() {
    const { token } = theme.useToken();

    const fields = useMemo(
        () => [
            {
                name: 'sales_order_no',
                label: 'Sales Order No',
                col: 8,
                placeholder: 'Auto generated if blank',
            },
            {
                name: 'sales_order_date',
                label: 'Sales Order Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Sales order date',
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                col: 8,
                options: [
                    { value: 'draft', label: 'Draft' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'fulfilled', label: 'Fulfilled' },
                    { value: 'cancelled', label: 'Cancelled' },
                ],
            },

            {
                name: 'contact_id',
                label: 'Customer',
                type: 'fkSelect',
                required: true,
                col: 12,
                placeholder: 'Select customer',
                fkUrl: '/api/contacts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'contact_name',
                fkExtraParams: {
                    active: true,
                    contact_type: 'customer',
                },
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.company_name ||
                    row?.person_name ||
                    row?.name ||
                    row?.email ||
                    '',
            },
            {
                name: 'reference',
                label: 'Reference',
                col: 12,
                placeholder: 'Reference number / external ref',
            },

            {
                name: 'warehouse_id',
                label: 'Warehouse',
                type: 'fkSelect',
                col: 12,
                placeholder: 'Select warehouse',
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
                name: 'currency_id',
                label: 'Currency',
                type: 'fkSelect',
                col: 12,
                placeholder: 'Select currency',
                fkUrl: '/api/currencies/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'currency_name',
                fkExtraParams: {
                    active: true,
                },
                fkLabel: (row) =>
                    row?.code && row?.name
                        ? `${row.code} - ${row.name}`
                        : row?.name || row?.code || '',
            },

            {
                name: 'items',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: token.colorText,
                headerColor: token.colorBgContainer,
                addButtonLabel: 'Add Item',
                defaultItem: { ...emptyItem },
                columns: [
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product',
                        type: 'fkSelect',
                        width: '3fr',
                        placeholder: 'Select product',
                        fkUrl: '/api/products/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'product_name',
                        fkExtraParams: {
                            active: true,
                            allow_sale: true,
                        },
                        fkLabel: (row) => {
                            const code = row?.sku || row?.code || row?.barcode || '';
                            const name = row?.name || row?.display_name || '';
                            return [code, name].filter(Boolean).join(' - ');
                        },
                    },
                     
                    {
                        key: 'qty',
                        name: 'qty',
                        label: 'Qty',
                        type: 'number',
                        width: '90px',
                        min: 0,
                        placeholder: 'Qty',
                    },
                    {
                        key: 'unit_price',
                        name: 'unit_price',
                        label: 'Unit Price',
                        type: 'number',
                        width: '120px',
                        min: 0,
                        placeholder: '0.00',
                    },
                    {
                        key: 'discount_percent',
                        name: 'discount_percent',
                        label: 'Disc %',
                        type: 'number',
                        width: '95px',
                        min: 0,
                        max: 100,
                        placeholder: '0',
                    },
                    {
                        key: 'tax_rate_id',
                        name: 'tax_rate_id',
                        label: 'Tax',
                        type: 'fkSelect',
                        width: '150px',
                        placeholder: 'Tax',
                        fkUrl: '/api/tax-rates/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'tax_rate_name',
                        fkExtraParams: {
                            active: true,
                        },
                        fkLabel: (row) => {
                            const name = row?.name || row?.code || '';
                            const rate = row?.rate_percent ?? 0;
                            return `${name} (${rate}%)`;
                        },
                    },
                    {
                        key: 'tax_amount',
                        name: 'tax_amount',
                        label: 'Tax Amt',
                        type: 'number',
                        width: '110px',
                        readOnly: true,
                        formula: (row) =>
                            Number(calculateLine(row).taxAmount.toFixed(2)),
                    },
                    {
                        key: 'line_total',
                        name: 'line_total',
                        label: 'Line Total',
                        type: 'number',
                        width: '130px',
                        readOnly: true,
                        formula: (row) =>
                            Number(calculateLine(row).lineTotal.toFixed(2)),
                    },
                ],
                collapsedFields: [
                    {
                        key: 'description',
                        name: 'description',
                        label: 'Description',
                        type: 'textarea',
                        col: 24,
                        rows: 2,
                        placeholder: 'Item description',
                    },
                ],
            },

            {
                name: 'notes',
                label: 'Notes',
                type: 'textarea',
                col: 12,
                rows: 4,
                placeholder: 'Sales order notes',
                helpText: 'This will appear on print',
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
                        gap: token.marginSM,
                        padding: `${token.paddingXS}px 0`,
                    };

                    return (
                        <div
                            style={{
                                border: `1px solid ${token.colorBorderSecondary}`,
                                background: token.colorFillAlter,
                                borderRadius: token.borderRadiusLG,
                                padding: `${token.paddingSM}px ${token.paddingMD}px`,
                                marginTop: token.marginXS,
                            }}
                        >
                            <div style={rowStyle}>
                                <Text>Subtotal</Text>
                                <Text strong>{money(totals.subtotal)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Discount Total</Text>
                                <Text strong>{money(totals.discountTotal)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Tax Total</Text>
                                <Text strong>{money(totals.taxTotal)}</Text>
                            </div>

                            <div
                                style={{
                                    ...rowStyle,
                                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                                    marginTop: token.marginXS,
                                    paddingTop: token.paddingSM,
                                }}
                            >
                                <Text strong>Grand Total</Text>
                                <Text strong style={{ fontSize: token.fontSizeLG }}>
                                    {money(totals.grandTotal)}
                                </Text>
                            </div>
                        </div>
                    );
                },
            },
        ],
        [token],
    );

    const columns = useMemo(
        () => [
            {
                title: 'Sales Order No',
                dataIndex: 'sales_order_no',
                key: 'sales_order_no',
                width: 160,
                backendSort: true,
                sortField: 'sales_order_no',
                render: (value) => <Text strong>{value || '-'}</Text>,
            },
            {
                title: 'Customer',
                dataIndex: 'contact_name',
                key: 'contact_name',
                width: 240,
                render: (_, record) =>
                    record?.contact_name ||
                    getRelationLabel(record?.contact) ||
                    '-',
            },
            {
                title: 'Date',
                dataIndex: 'sales_order_date',
                key: 'sales_order_date',
                width: 130,
                backendSort: true,
                sortField: 'sales_order_date',
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
                width: 160,
                render: (_, record) =>
                    record?.warehouse_name ||
                    getRelationLabel(record?.warehouse) ||
                    '-',
            },
            {
                title: 'Currency',
                dataIndex: 'currency_name',
                key: 'currency_name',
                width: 130,
                render: (_, record) =>
                    record?.currency_name ||
                    getRelationLabel(record?.currency) ||
                    '-',
            },
            {
                title: 'Grand Total',
                dataIndex: 'grand_total',
                key: 'grand_total',
                width: 150,
                align: 'right',
                backendSort: true,
                sortField: 'grand_total',
                render: (_, record) => {
                    const total =
                        record?.grand_total ??
                        record?.total ??
                        calculateTotals({
                            items:
                                record?.items ||
                                record?.sales_order_lines ||
                                record?.salesOrderLines ||
                                [],
                        }).grandTotal;

                    return <Text strong>{money(total)}</Text>;
                },
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (value) => {
                    const status = value || 'draft';

                    if (status === 'confirmed') return <Tag color="blue">Confirmed</Tag>;
                    if (status === 'fulfilled') return <Tag color="green">Fulfilled</Tag>;
                    if (status === 'cancelled') return <Tag color="red">Cancelled</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
            {
                title: 'Approved',
                dataIndex: 'approved',
                key: 'approved',
                width: 120,
                render: (value) =>
                    value ? <Tag color="green">Approved</Tag> : <Tag>Not Approved</Tag>,
            },
        ],
        [],
    );

    const transformRecord = (record = {}) => {
        const rawItems =
            record.items ||
            record.sales_order_lines ||
            record.salesOrderLines ||
            [];

        const items = Array.isArray(rawItems) && rawItems.length
            ? rawItems.map(normalizeLine)
            : [{ ...emptyItem }];

        const contactDetail =
            record.contact_id_detail ||
            record.contact ||
            null;

        const warehouseDetail =
            record.warehouse_id_detail ||
            record.warehouse ||
            null;

        const currencyDetail =
            record.currency_id_detail ||
            record.currency ||
            null;

        return {
            ...record,

            contact_id: record.contact_id || contactDetail?.id || contactDetail?.value || null,
            contact_id_detail: contactDetail,
            contact_name: record.contact_name || getRelationLabel(contactDetail),

            warehouse_id: record.warehouse_id || warehouseDetail?.id || warehouseDetail?.value || null,
            warehouse_id_detail: warehouseDetail,
            warehouse_name: record.warehouse_name || getRelationLabel(warehouseDetail),

            currency_id: record.currency_id || currencyDetail?.id || currencyDetail?.value || null,
            currency_id_detail: currencyDetail,
            currency_name: record.currency_name || getRelationLabel(currencyDetail),

            items,
            deleted_item_ids: [],
        };
    };

    const transformPayload = (values) => {
        const items = (values.items || [])
            .filter(
                (row) =>
                    row.product_id ||
                    String(row.custom_product_name || '').trim(),
            )
            .map((row) => {
                const line = calculateLine(row);

                return {
                    id: row.id || undefined,

                    product_id: row.product_id || null,
                    custom_product_name: String(row.custom_product_name || '').trim() || null,
                    description: row.description || null,

                    qty: toNumber(row.qty),
                    unit_price: toNumber(row.unit_price),
                    discount_percent: toNumber(row.discount_percent),

                    tax_rate_id: row.tax_rate_id || null,
                    tax_amount: Number(line.taxAmount.toFixed(2)),
                    line_total: Number(line.lineTotal.toFixed(2)),
                };
            });

        const totals = calculateTotals({
            ...values,
            items,
        });

        const grandTotal = Number(totals.grandTotal.toFixed(2));

        return {
            branch_id: values.branch_id || null,

            sales_order_no: values.sales_order_no || null,
            sales_order_date: formatDateForBackend(values.sales_order_date),

            contact_id: values.contact_id,
            warehouse_id: values.warehouse_id || null,
            currency_id: values.currency_id || null,

            reference: values.reference || null,
            notes: values.notes || null,

            subtotal: Number(totals.subtotal.toFixed(2)),
            discount_total: Number(totals.discountTotal.toFixed(2)),
            tax_total: Number(totals.taxTotal.toFixed(2)),
            grand_total: grandTotal,
            total: grandTotal,

            approved: !!values.approved,
            void: !!values.void,
            active: values.active !== false,
            status: values.status || 'draft',

            items,
            deleted_item_ids: values.deleted_item_ids || [],
        };
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const contact = values?.contact_id_detail;

        if (contact) {
            const contactName = getRelationLabel(contact);

            if (contactName && values.contact_name !== contactName) {
                setFieldValue('contact_name', contactName, false);
            }
        }

        const warehouse = values?.warehouse_id_detail;

        if (warehouse) {
            const warehouseName = getRelationLabel(warehouse);

            if (warehouseName && values.warehouse_name !== warehouseName) {
                setFieldValue('warehouse_name', warehouseName, false);
            }
        }

        const currency = values?.currency_id_detail;

        if (currency) {
            const currencyName = getRelationLabel(currency);

            if (currencyName && values.currency_name !== currencyName) {
                setFieldValue('currency_name', currencyName, false);
            }
        }

        (values.items || []).forEach((row, index) => {
            const product = row?.product_id_detail;

            if (product) {
                const productName = getRelationLabel(product);

                const sellingPrice =
                    product.selling_price ??
                    product.sales_rate ??
                    product.rate ??
                    product.price ??
                    0;

                if (productName && row.product_name !== productName) {
                    setFieldValue(`items[${index}].product_name`, productName, false);
                }

                if (!row.custom_product_name && productName) {
                    setFieldValue(
                        `items[${index}].custom_product_name`,
                        productName,
                        false,
                    );
                }

                if (!row.description && productName) {
                    setFieldValue(`items[${index}].description`, productName, false);
                }

                if (
                    (row.unit_price === null ||
                        row.unit_price === undefined ||
                        Number(row.unit_price) === 0) &&
                    Number(sellingPrice) > 0
                ) {
                    setFieldValue(
                        `items[${index}].unit_price`,
                        Number(sellingPrice),
                        false,
                    );
                }
            }

            const taxRate = row?.tax_rate_id_detail;

            if (taxRate) {
                const taxRateName = getRelationLabel(taxRate);

                if (taxRateName && row.tax_rate_name !== taxRateName) {
                    setFieldValue(`items[${index}].tax_rate_name`, taxRateName, false);
                }
            }

            const line = calculateLine(row);

            const nextTaxAmount = Number(line.taxAmount.toFixed(2));
            const nextLineTotal = Number(line.lineTotal.toFixed(2));

            if (Number(row.tax_amount || 0) !== nextTaxAmount) {
                setFieldValue(`items[${index}].tax_amount`, nextTaxAmount, false);
            }

            if (Number(row.line_total || 0) !== nextLineTotal) {
                setFieldValue(`items[${index}].line_total`, nextLineTotal, false);
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
                minWidth: 150,
                height: 44,
                borderRadius: token.borderRadius,
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
                    Sales Order
                </h2>
            }
        >
            <Head title="Sales Order" />

            <ReusableCrud
                title="Sales Order"
                apiUrl={api('/api/sales-orders/')}
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
                transformRecord={transformRecord}
                transformPayload={transformPayload}
                onFormValuesChange={handleFormValuesChange}
                renderSubmitButton={renderSaveButton}
                anchorFilters={[
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Sales Order',
                        params: {
                            status: 'draft',
                        },
                    },
                    {
                        key: 'confirmed',
                        label: 'Confirmed',
                        title: 'Sales Order',
                        params: {
                            status: 'confirmed',
                        },
                    },
                    {
                        key: 'fulfilled',
                        label: 'Fulfilled',
                        title: 'Sales Order',
                        params: {
                            status: 'fulfilled',
                        },
                    },
                    {
                        key: 'cancelled',
                        label: 'Cancelled',
                        title: 'Sales Order',
                        params: {
                            status: 'cancelled',
                        },
                    },
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Sales Order',
                        params: {
                            approved: true,
                        },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Sales Order',
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