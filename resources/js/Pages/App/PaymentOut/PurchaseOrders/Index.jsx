import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import * as Yup from 'yup';

import ReusableCrud from '@/Components/ResuableCrud';
import { STATUS_TABS_BY_MODULE, buildStandardFilters } from '@/Pages/App/FinanceConfigs';

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

const emptyLine = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    description: '',
    quantity: 1,
    unit_code: 'BX',
    rate: 0,
    discount: 0,
    discount_type: 'percent',
    tax_code: 'no_vat',
    amount: 0,
    notes: '',
};

const calculateLine = (row = {}) => {
    const qty = toNumber(row.quantity);
    const rate = toNumber(row.rate);
    const gross = qty * rate;

    const discountValue = toNumber(row.discount);
    const discount =
        row.discount_type === 'amount'
            ? discountValue
            : (gross * discountValue) / 100;

    const taxable = Math.max(gross - discount, 0);
    const tax = row.tax_code === 'vat_13' ? taxable * 0.13 : 0;

    return {
        gross,
        discount,
        taxable,
        tax,
        amount: taxable + tax,
    };
};

const calculateTotals = (items = []) => {
    return items.reduce(
        (acc, row) => {
            const line = calculateLine(row);

            acc.subtotal += line.gross;
            acc.discount += line.discount;
            acc.tax += line.tax;
            acc.total += line.amount;

            return acc;
        },
        {
            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0,
        },
    );
};

const creditTermsOptions = [
    { value: 'due_on_receipt', label: 'Due on Receipt' },
    { value: 'net_7', label: 'Net 7' },
    { value: 'net_15', label: 'Net 15' },
    { value: 'net_30', label: 'Net 30' },
    { value: 'net_45', label: 'Net 45' },
    { value: 'net_60', label: 'Net 60' },
];

const unitOptions = [
    { value: 'BX', label: 'BX' },
    { value: 'PCS', label: 'PCS' },
    { value: 'KG', label: 'KG' },
    { value: 'LTR', label: 'LTR' },
    { value: 'SERVICE', label: 'Service' },
];

const discountTypeOptions = [
    { value: 'percent', label: '%' },
    { value: 'amount', label: 'Amount' },
];

const taxOptions = [
    { value: 'no_vat', label: 'No Vat' },
    { value: 'vat_13', label: 'VAT 13%' },
    { value: 'zero_rated', label: 'Zero Rated' },
    { value: 'exempt', label: 'Exempt' },
];

const initialValues = {
    supplier_id: null,
    supplier_id_detail: null,
    supplier_name: '',
    reference_no: '',
    order_number: 'DRAFT',
    date: dayjs().format('YYYY-MM-DD'),
    credit_terms: null,
    currency_id: null,
    currency_id_detail: null,
    currency_name: '',
    currency_code: '',
    exchange_rate_to_npr: 1,
    approved: false,
    status: 'draft',
    items: [{ ...emptyLine }],
    remarks: '',
};

const validationSchema = Yup.object().shape({
    supplier_id: Yup.string().nullable().required('Supplier is required'),
    date: Yup.string().required('Date is required'),
    exchange_rate_to_npr: Yup.number()
        .typeError('Exchange rate is required')
        .min(0.0001, 'Exchange rate must be greater than 0')
        .required('Exchange rate is required'),
    items: Yup.array()
        .of(
            Yup.object().shape({
                product_id: Yup.string().nullable().required('Product is required'),
                quantity: Yup.number()
                    .typeError('Qty is required')
                    .min(0.0001, 'Qty must be greater than 0')
                    .required('Qty is required'),
                rate: Yup.number()
                    .typeError('Rate is required')
                    .min(0, 'Rate cannot be negative')
                    .required('Rate is required'),
            }),
        )
        .min(1, 'At least one item is required'),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'supplier_id',
                label: 'Supplier Name',
                type: 'fkSelect',
                required: true,
                col: 16,
                placeholder: 'Select Supplier',
                fkUrl: '/api/contacts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'display_name',
                labelField: 'supplier_name',
                fkExtraParams: {
                    active: true,
                    type: 'supplier',
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
                name: 'reference_no',
                label: 'Reference No',
                col: 8,
                placeholder: 'Reference Number',
            },
            {
                name: 'order_number',
                label: 'Order Number',
                col: 8,
                readOnly: true,
                placeholder: 'DRAFT',
            },
            {
                name: 'date',
                label: 'Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Select Date',
            },
            {
                name: 'credit_terms',
                label: 'Credit Terms',
                type: 'select',
                col: 8,
                placeholder: 'Credit Terms',
                options: creditTermsOptions,
            },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'fkSelect',
                col: 8,
                placeholder: 'Select Currency',
                fkUrl: '/api/currencies/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'currency_name',
                fkLabel: (row) =>
                    row?.name ||
                    row?.display_name ||
                    row?.code ||
                    row?.symbol ||
                    '',
            },
            {
                name: 'exchange_rate_to_npr',
                label: 'Exchange Rate To NPR',
                type: 'number',
                required: true,
                col: 8,
                min: 0,
                placeholder: '1',
            },
            {
                name: 'items',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Add Code or Product',
                defaultItem: { ...emptyLine },
                columns: [
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product / service',
                        type: 'fkSelect',
                        width: '3fr',
                        placeholder: 'Add Code or Product',
                        fkUrl: '/api/products/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'product_name',
                        fkLabel: (row) => {
                            const code = row?.code || row?.sku || '';
                            const name = row?.name || row?.display_name || row?.title || '';
                            const type = row?.type || row?.product_type || '';

                            return [code, name, type ? `(${type})` : '']
                                .filter(Boolean)
                                .join(' - ');
                        },
                    },
                    {
                        key: 'quantity',
                        name: 'quantity',
                        label: 'Qty',
                        type: 'number',
                        width: '90px',
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
                        width: '120px',
                        min: 0,
                        placeholder: 'Rate',
                    },
                    {
                        key: 'discount',
                        name: 'discount',
                        label: 'Discount',
                        type: 'number',
                        width: '115px',
                        min: 0,
                        placeholder: '0',
                    },
                    {
                        key: 'discount_type',
                        name: 'discount_type',
                        label: '',
                        type: 'select',
                        width: '100px',
                        options: discountTypeOptions,
                    },
                    {
                        key: 'tax_code',
                        name: 'tax_code',
                        label: 'Tax',
                        type: 'select',
                        width: '130px',
                        options: taxOptions,
                    },
                    {
                        key: 'amount',
                        name: 'amount',
                        label: 'Amount',
                        type: 'number',
                        width: '130px',
                        readOnly: true,
                        formula: (row) => Number(calculateLine(row).amount.toFixed(2)),
                    },
                ],
                collapsedFields: [
                    {
                        key: 'description',
                        name: 'description',
                        label: 'Description',
                        type: 'textarea',
                        col: 12,
                        rows: 2,
                        placeholder: 'Product/service description',
                    },
                    {
                        key: 'notes',
                        name: 'notes',
                        label: 'Line Notes',
                        type: 'textarea',
                        col: 12,
                        rows: 2,
                        placeholder: 'Internal line note',
                    },
                ],
            },
            {
                name: 'remarks',
                label: 'Remarks',
                type: 'textarea',
                col: 16,
                rows: 3,
                placeholder: 'Purchase order remarks',
            },
            {
                name: '_summary',
                label: '',
                type: 'custom',
                col: 8,
                render: ({ values }) => {
                    const totals = calculateTotals(values?.items || []);

                    return (
                        <div
                            style={{
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                padding: 14,
                                marginTop: 4,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Subtotal</Text>
                                <Text strong>{money(totals.subtotal)}</Text>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Discount</Text>
                                <Text strong>{money(totals.discount)}</Text>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Tax</Text>
                                <Text strong>{money(totals.tax)}</Text>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    borderTop: '1px solid #e5e7eb',
                                    paddingTop: 10,
                                    marginTop: 10,
                                }}
                            >
                                <Text strong>Total</Text>
                                <Text strong style={{ fontSize: 18 }}>
                                    {money(totals.total)}
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
                title: 'Order No',
                dataIndex: 'order_number',
                key: 'order_number',
                width: 150,
                backendSort: true,
                sortField: 'order_number',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Supplier',
                dataIndex: 'supplier_name',
                key: 'supplier_name',
                width: 230,
                backendSort: true,
                sortField: 'supplier_name',
                render: (_, record) =>
                    record?.supplier_name ||
                    record?.supplier?.display_name ||
                    record?.supplier?.company_name ||
                    record?.supplier?.name ||
                    '-',
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
                title: 'Reference No',
                dataIndex: 'reference_no',
                key: 'reference_no',
                width: 160,
                render: (value) => value || '-',
            },
            {
                title: 'Currency',
                dataIndex: 'currency_name',
                key: 'currency_name',
                width: 140,
                render: (_, record) =>
                    record?.currency_name ||
                    record?.currency?.name ||
                    record?.currency?.code ||
                    '-',
            },
            {
                title: 'Total',
                dataIndex: 'total_amount',
                key: 'total_amount',
                width: 140,
                align: 'right',
                backendSort: true,
                sortField: 'total_amount',
                render: (_, record) => {
                    const total =
                        record?.total_amount ??
                        record?.grand_total ??
                        calculateTotals(record?.items || []).total;

                    return <Text strong>{money(total)}</Text>;
                },
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (value, record) => {
                    const status = value || (record?.approved ? 'approved' : 'draft');

                    if (status === 'approved') return <Tag color="green">Approved</Tag>;
                    if (status === 'cancelled') return <Tag color="red">Cancelled</Tag>;
                    if (status === 'sent') return <Tag color="blue">Sent</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const items = (values.items || [])
            .filter((row) => row.product_id || row.description)
            .map((row) => {
                const line = calculateLine(row);

                return {
                    id: row.id,
                    product_id: row.product_id,
                    description: row.description || row.product_name || '',
                    quantity: toNumber(row.quantity),
                    unit_code: row.unit_code || '',
                    rate: toNumber(row.rate),
                    discount: toNumber(row.discount),
                    discount_type: row.discount_type || 'percent',
                    tax_code: row.tax_code || 'no_vat',
                    tax_amount: Number(line.tax.toFixed(2)),
                    amount: Number(line.amount.toFixed(2)),
                    notes: row.notes || '',
                };
            });

        const totals = calculateTotals(items);

        return {
            supplier_id: values.supplier_id,
            reference_no: values.reference_no || '',
            order_number: values.order_number || 'DRAFT',
            date: dayjs(values.date).isValid()
                ? dayjs(values.date).format('YYYY-MM-DD')
                : values.date,
            credit_terms: values.credit_terms || null,
            currency_id: values.currency_id || null,
            exchange_rate_to_npr: toNumber(values.exchange_rate_to_npr || 1),
            status: values.status || 'draft',
            approved: !!values.approved,
            remarks: values.remarks || '',

            subtotal: Number(totals.subtotal.toFixed(2)),
            discount_amount: Number(totals.discount.toFixed(2)),
            tax_amount: Number(totals.tax.toFixed(2)),
            total_amount: Number(totals.total.toFixed(2)),

            items,
        };
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const currency = values?.currency_id_detail;

        if (currency) {
            const currencyName =
                currency.name ||
                currency.display_name ||
                currency.code ||
                '';

            const currencyCode = currency.code || '';

            if (currencyName && values.currency_name !== currencyName) {
                setFieldValue('currency_name', currencyName, false);
            }

            if (currencyCode && values.currency_code !== currencyCode) {
                setFieldValue('currency_code', currencyCode, false);
            }

            const rate =
                currency.exchange_rate_to_npr ??
                currency.exchange_rate ??
                currency.rate_to_npr;

            if (rate && Number(values.exchange_rate_to_npr || 0) !== Number(rate)) {
                setFieldValue('exchange_rate_to_npr', Number(rate), false);
            }
        }

        (values.items || []).forEach((row, index) => {
            const product = row?.product_id_detail;

            if (product) {
                const productName =
                    product.name ||
                    product.display_name ||
                    product.title ||
                    product.code ||
                    '';

                const unit =
                    product.unit_code ||
                    product.unit?.code ||
                    product.product_unit?.code ||
                    row.unit_code ||
                    'BX';

                const rate =
                    product.purchase_rate ??
                    product.cost_price ??
                    product.rate ??
                    product.price ??
                    row.rate ??
                    0;

                if (!row.product_name && productName) {
                    setFieldValue(`items[${index}].product_name`, productName, false);
                }

                if (!row.description && productName) {
                    setFieldValue(`items[${index}].description`, productName, false);
                }

                if (!row.unit_code && unit) {
                    setFieldValue(`items[${index}].unit_code`, unit, false);
                }

                if ((row.rate === null || row.rate === undefined || Number(row.rate) === 0) && rate) {
                    setFieldValue(`items[${index}].rate`, Number(rate), false);
                }
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
                minWidth: 150,
                height: 46,
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
                    Purchase Order
                </h2>
            }
        >
            <Head title="Purchase Order" />

            <ReusableCrud
                title="New Purchase Order"
                apiUrl={api('/api/purchase-orders/')}
                fields={fields}
                columns={columns}
                validationSchema={validationSchema}
                crudInitialValues={initialValues}
                form_ui="drawer"
                drawerWidth={1280}
                modalWidth={1280}
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
                        title: 'Purchase Order',
                        params: { approved: false },
                    },
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Purchase Order',
                        params: { approved: true },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Purchase Order',
                        params: {},
                    },
                ]}
                defaultAnchorKey="draft"
                anchorSyncWithHash
                showSearch
                serverFilters={buildStandardFilters()}
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