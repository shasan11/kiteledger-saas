import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Checkbox, InputNumber, Select, Switch, Tag, Typography } from 'antd';
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

const emptyItem = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    description: '',
    qty: 1,
    unit_code: 'PCS',
    unit_price: 0,
    discount: 0,
    discount_type: 'percent',
    tax_code: 'no_vat',
    line_total: 0,
    notes: '',
};

const unitOptions = [
    { value: 'PCS', label: 'PCS' },
    { value: 'PC', label: 'PC' },
    { value: 'KG', label: 'KG' },
    { value: 'BX', label: 'BX' },
    { value: 'LTR', label: 'LTR' },
    { value: 'SERVICE', label: 'Service' },
];

const discountTypeOptions = [
    { value: 'percent', label: '%' },
    { value: 'amount', label: 'Amount' },
];

const taxOptions = [
    { value: 'no_vat', label: 'No Vat' },
    { value: 'vat_13', label: '13% VAT' },
    { value: 'zero_rated', label: 'Zero Rated' },
    { value: 'exempt', label: 'Exempt' },
];

const tdsTypeOptions = [
    { value: 'percent', label: '%' },
    { value: 'amount', label: 'Amount' },
];

const calculateLine = (row = {}) => {
    const qty = toNumber(row.qty ?? row.quantity);
    const rate = toNumber(row.unit_price ?? row.rate);
    const gross = qty * rate;

    const discountValue = toNumber(row.discount);
    const discount =
        row.discount_type === 'amount'
            ? discountValue
            : (gross * discountValue) / 100;

    const net = Math.max(gross - discount, 0);
    const vat = row.tax_code === 'vat_13' ? net * 0.13 : 0;

    const taxable = row.tax_code === 'vat_13' ? net : 0;
    const nonTaxable =
        row.tax_code === 'no_vat' || row.tax_code === 'exempt' || row.tax_code === 'zero_rated'
            ? net
            : 0;

    return {
        gross,
        discount,
        net,
        taxable,
        nonTaxable,
        vat,
        line_total: net + vat,
    };
};

const calculateTotals = (values = {}) => {
    const items = values.items || [];

    const itemTotals = items.reduce(
        (acc, row) => {
            const line = calculateLine(row);

            acc.subTotal += line.gross;
            acc.lineDiscount += line.discount;
            acc.nonTaxableTotal += line.nonTaxable;
            acc.taxableTotal += line.taxable;
            acc.vat += line.vat;
            acc.itemTotal += line.line_total;

            return acc;
        },
        {
            subTotal: 0,
            lineDiscount: 0,
            nonTaxableTotal: 0,
            taxableTotal: 0,
            vat: 0,
            itemTotal: 0,
        },
    );

    const invoiceDiscountValue = toNumber(values.proforma_discount);
    const invoiceDiscount =
        values.proforma_discount_type === 'amount'
            ? invoiceDiscountValue
            : (itemTotals.itemTotal * invoiceDiscountValue) / 100;

    const tdsAmount = values.tds_applicable ? toNumber(values.tds_amount) : 0;

    return {
        ...itemTotals,
        invoiceDiscount,
        tdsAmount,
        grandTotal: Math.max(itemTotals.itemTotal - invoiceDiscount - tdsAmount, 0),
    };
};

const initialValues = {
    contact_id: null,
    contact_id_detail: null,
    customer_name: '',

    reference: '',
    proforma_no: 'DRAFT',

    proforma_date: dayjs().format('YYYY-MM-DD'),
    due_date: dayjs().format('YYYY-MM-DD'),

    currency_id: null,
    currency_id_detail: null,
    currency_name: '',
    currency_code: '',
    exchange_rate: 1,

    warehouse_id: null,
    warehouse_id_detail: null,
    warehouse_name: '',

    is_export_sales: true,
    export_country_id: null,
    export_country_id_detail: null,
    export_country_name: '',
    export_document_date: null,
    export_document_no: '',

    items: [{ ...emptyItem }],

    received_by: '',
    expiry: '',
    batch_no: '',
    udf: '',

    notes: '',

    proforma_discount: 0,
    proforma_discount_type: 'percent',

    tds_applicable: false,
    tds_account_id: null,
    tds_account_id_detail: null,
    tds_account_name: '',
    tds_type: null,
    tds_amount: 0,

    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    contact_id: Yup.string().nullable().required('Customer is required'),
    proforma_date: Yup.string().required('Proforma Invoice date is required'),
    due_date: Yup.string().required('Due date is required'),
    warehouse_id: Yup.string().nullable(),

    exchange_rate: Yup.number()
        .typeError('Exchange rate is required')
        .min(0.0001, 'Exchange rate must be greater than 0')
        .required('Exchange rate is required'),

    items: Yup.array()
        .of(
            Yup.object().shape({
                product_id: Yup.string().nullable(),
                product_name: Yup.string().nullable(),
                description: Yup.string().nullable(),
                qty: Yup.number()
                    .typeError('Qty is required')
                    .min(0.0001, 'Qty must be greater than 0')
                    .required('Qty is required'),
                unit_price: Yup.number()
                    .typeError('Rate is required')
                    .min(0, 'Rate cannot be negative')
                    .required('Rate is required'),
            }),
        )
        .min(1, 'At least one product is required'),

    tds_account_id: Yup.string()
        .nullable()
        .when('tds_applicable', {
            is: true,
            then: (schema) => schema.required('TDS account is required'),
            otherwise: (schema) => schema.nullable(),
        }),

    tds_type: Yup.string()
        .nullable()
        .when('tds_applicable', {
            is: true,
            then: (schema) => schema.required('TDS type is required'),
            otherwise: (schema) => schema.nullable(),
        }),

    tds_amount: Yup.number()
        .typeError('TDS amount is required')
        .when('tds_applicable', {
            is: true,
            then: (schema) =>
                schema
                    .min(0.0001, 'TDS amount must be greater than 0')
                    .required('TDS amount is required'),
            otherwise: (schema) => schema.nullable(),
        }),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'contact_id',
                label: 'Customer Name',
                type: 'fkSelect',
                required: true,
                col: 16,
                placeholder: 'Customer Name',
                fkUrl: '/api/contacts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'display_name',
                labelField: 'customer_name',
                fkExtraParams: {
                    active: true,
                    type: 'customer',
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
                label: 'Reference No',
                col: 8,
                placeholder: 'Reference Number',
            },

            {
                name: 'proforma_no',
                label: 'Proforma Invoice Code',
                col: 8,
                readOnly: true,
                placeholder: 'Proforma Invoice Code',
            },
            {
                name: 'proforma_date',
                label: 'Proforma Invoice Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Proforma Invoice Date',
            },
            {
                name: 'due_date',
                label: 'Due Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Due Date',
            },

            {
                name: 'currency_id',
                label: 'Currency',
                type: 'fkSelect',
                col: 8,
                placeholder: 'Currency',
                fkUrl: '/api/currencies/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'currency_name',
                fkLabel: (row) => row?.name || row?.display_name || row?.code || '',
            },
            {
                name: 'exchange_rate',
                label: 'Exchange Rate To NPR',
                type: 'number',
                required: true,
                col: 8,
                min: 0,
                placeholder: '1',
            },
            {
                name: 'warehouse_id',
                label: 'Warehouse',
                type: 'fkSelect',
                required: false,
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
                fkLabel: (row) => row?.name || row?.display_name || row?.code || '',
            },

            {
                name: '_export_sales',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Checkbox
                            checked={!!values.is_export_sales}
                            onChange={(e) => setFieldValue('is_export_sales', e.target.checked)}
                        />
                        <Text strong>This is export sales</Text>
                    </div>
                ),
            },

            {
                name: 'export_country_id',
                label: 'Country',
                type: 'fkSelect',
                col: 8,
                placeholder: 'Country',
                fkUrl: '/api/countries/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'export_country_name',
                condition: (values) => !!values.is_export_sales,
                fkLabel: (row) => row?.name || row?.display_name || row?.code || '',
            },
            {
                name: 'export_document_date',
                label: 'Date',
                type: 'datePicker',
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'DD-MM-YYYY (AD)',
                condition: (values) => !!values.is_export_sales,
            },
            {
                name: 'export_document_no',
                label: 'Document No',
                col: 8,
                placeholder: 'Document No',
                condition: (values) => !!values.is_export_sales,
            },

            {
                name: 'items',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Add Code or Product',
                defaultItem: { ...emptyItem },
                columns: [
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product / service',
                        type: 'fkSelect',
                        width: '3fr',
                        placeholder: 'Add Code or Product',
                        fkUrl: '/api/products/search',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'label',
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
                        key: 'qty',
                        name: 'qty',
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
                        width: '85px',
                        options: unitOptions,
                    },
                    {
                        key: 'unit_price',
                        name: 'unit_price',
                        label: 'Rate',
                        type: 'number',
                        width: '110px',
                        min: 0,
                        placeholder: 'Rate',
                    },
                    {
                        key: 'discount',
                        name: 'discount',
                        label: 'Discount',
                        type: 'number',
                        width: '105px',
                        min: 0,
                        placeholder: '0',
                    },
                    {
                        key: 'discount_type',
                        name: 'discount_type',
                        label: '',
                        type: 'select',
                        width: '85px',
                        options: discountTypeOptions,
                    },
                    {
                        key: 'tax_code',
                        name: 'tax_code',
                        label: 'Tax',
                        type: 'select',
                        width: '125px',
                        options: taxOptions,
                    },
                    {
                        key: 'line_total',
                        name: 'line_total',
                        label: 'Amount',
                        type: 'number',
                        width: '120px',
                        readOnly: true,
                        formula: (row) => Number(calculateLine(row).line_total.toFixed(2)),
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
                name: '_custom_fields_title',
                label: '',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 20,
                            marginTop: 18,
                            color: '#8b95a5',
                            fontWeight: 700,
                        }}
                    >
                        Custom Fields
                    </div>
                ),
            },
            {
                name: 'received_by',
                label: 'Received By',
                col: 24,
                placeholder: 'Received By',
            },
            {
                name: 'expiry',
                label: 'Expiry',
                col: 8,
                placeholder: 'Expiry',
            },
            {
                name: 'batch_no',
                label: 'Batch NO',
                col: 8,
                placeholder: 'Batch NO',
            },
            {
                name: 'udf',
                label: 'UDF',
                col: 8,
                placeholder: 'UDF',
            },

            {
                name: 'notes',
                label: 'Notes',
                type: 'textarea',
                col: 12,
                rows: 4,
                placeholder: 'Notes',
                helpText: 'This will appear on print',
            },
            {
                name: '_summary',
                label: '',
                type: 'custom',
                col: 12,
                render: ({ values, setFieldValue }) => {
                    const totals = calculateTotals(values);

                    const rowStyle = {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        padding: '9px 0',
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
                                <Text>Sub Total</Text>
                                <Text strong>{money(totals.subTotal)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Discount</Text>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <InputNumber
                                        value={values.proforma_discount}
                                        min={0}
                                        style={{ width: 140 }}
                                        onChange={(val) => setFieldValue('proforma_discount', val || 0)}
                                    />
                                    <Select
                                        value={values.proforma_discount_type}
                                        options={discountTypeOptions}
                                        style={{ width: 95 }}
                                        onChange={(val) => setFieldValue('proforma_discount_type', val)}
                                    />
                                </div>
                            </div>

                            <div style={rowStyle}>
                                <Text>Non-Taxable Total</Text>
                                <Text strong>{money(totals.nonTaxableTotal)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Taxable Total</Text>
                                <Text strong>{money(totals.taxableTotal)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>VAT</Text>
                                <Text strong>{money(totals.vat)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>TDS</Text>
                                <Text strong>{money(totals.tdsAmount)}</Text>
                            </div>

                            <div
                                style={{
                                    ...rowStyle,
                                    borderTop: '1px solid #d1d8e3',
                                    marginTop: 8,
                                    paddingTop: 14,
                                }}
                            >
                                <Text strong>Grand Total</Text>
                                <Text strong style={{ fontSize: 17 }}>
                                    {money(totals.grandTotal)}
                                </Text>
                            </div>
                        </div>
                    );
                },
            },

            {
                name: '_tds_toggle',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 16,
                            marginTop: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                        }}
                    >
                        <Switch
                            checked={!!values.tds_applicable}
                            onChange={(checked) => setFieldValue('tds_applicable', checked)}
                        />
                        <Text strong>TDS is applicable</Text>
                    </div>
                ),
            },
            {
                name: 'tds_account_id',
                label: 'TDS Account',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Select Account',
                fkUrl: '/api/accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'tds_account_name',
                condition: (values) => !!values.tds_applicable,
                fkLabel: (row) => row?.display_name || row?.name || row?.code || '',
            },
            {
                name: 'tds_type',
                label: 'TDS Type',
                type: 'select',
                required: true,
                col: 8,
                placeholder: 'TDS Type',
                options: tdsTypeOptions,
                condition: (values) => !!values.tds_applicable,
            },
            {
                name: 'tds_amount',
                label: 'TDS Amount',
                type: 'number',
                required: true,
                col: 8,
                min: 0,
                placeholder: 'TDS Amount',
                condition: (values) => !!values.tds_applicable,
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: 'Proforma Invoice Code',
                dataIndex: 'proforma_no',
                key: 'proforma_no',
                width: 160,
                backendSort: true,
                sortField: 'proforma_no',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Customer',
                dataIndex: 'contact',
                key: 'contact',
                width: 240,
                backendSort: true,
                sortField: 'customer_name',
                render: (_, record) =>
                    record?.contact?.display_name ||
                    record?.contact?.company_name ||
                    record?.contact?.name ||
                    record?.customer_name ||
                    '-',
            },
            {
                title: 'Proforma Invoice Date',
                dataIndex: 'proforma_date',
                key: 'proforma_date',
                width: 140,
                backendSort: true,
                sortField: 'proforma_date',
                render: (value) => {
                    if (!value) return '-';
                    const parsed = dayjs(value);
                    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
                },
            },
            {
                title: 'Due Date',
                dataIndex: 'due_date',
                key: 'due_date',
                width: 130,
                backendSort: true,
                sortField: 'due_date',
                render: (value) => {
                    if (!value) return '-';
                    const parsed = dayjs(value);
                    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
                },
            },
            {
                title: 'Reference No',
                dataIndex: 'reference',
                key: 'reference',
                width: 170,
                render: (value) => value || '-',
            },
            {
                title: 'Warehouse',
                dataIndex: 'warehouse_name',
                key: 'warehouse_name',
                width: 170,
                render: (_, record) =>
                    record?.warehouse_name ||
                    record?.warehouse?.name ||
                    record?.warehouse?.code ||
                    '-',
            },
            {
                title: 'Grand Total',
                dataIndex: 'total',
                key: 'total',
                width: 150,
                align: 'right',
                backendSort: true,
                sortField: 'total',
                render: (_, record) => {
                    const total = record?.total ?? record?.grand_total ?? 0;

                    return <Text strong>{money(total)}</Text>;
                },
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (value, record) => {
                    const status = value || (record?.approved ? 'issued' : 'draft');

                    if (status === 'issued' || status === 'approved') return <Tag color="green">Issued</Tag>;
                    if (status === 'cancelled') return <Tag color="red">Cancelled</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const items = (values.items || [])
            .filter((row) => row.product_id || row.product_name || row.description)
            .map((row) => {
                const line = calculateLine(row);
                const productId = row.product_id || null;
                const customName = !productId ? (row.product_name || row.description || 'Custom item') : null;

                return {
                    id: row.id,
                    product_id: productId,
                    custom_product_name: customName,
                    description: row.description || row.product_name || '',
                    qty: toNumber(row.qty),
                    unit_code: row.unit_code || '',
                    unit_price: toNumber(row.unit_price),
                    discount_percent: row.discount_type === 'amount' || toNumber(row.discount) <= 0
                        ? 0
                        : toNumber(row.discount),
                    tax_rate_id: row.tax_rate_id || null,
                    tax_amount: Number(line.vat.toFixed(2)),
                    line_total: Number(line.line_total.toFixed(2)),
                };
            });

        return {
            contact_id: values.contact_id,
            reference: values.reference || '',
            proforma_no: values.proforma_no && values.proforma_no !== 'DRAFT' ? values.proforma_no : null,

            proforma_date: formatDateForBackend(values.proforma_date),

            currency_id: values.currency_id || null,
            exchange_rate: toNumber(values.exchange_rate || 1),

            notes: values.notes || '',

            status: ['draft', 'issued', 'cancelled'].includes(values.status) ? values.status : 'draft',

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

            if (rate && Number(values.exchange_rate || 0) !== Number(rate)) {
                setFieldValue('exchange_rate', Number(rate), false);
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
                    'PCS';

                const rate =
                    product.sales_rate ??
                    product.selling_price ??
                    product.rate ??
                    product.price ??
                    row.unit_price ??
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

                if ((row.unit_price === null || row.unit_price === undefined || Number(row.unit_price) === 0) && rate) {
                    setFieldValue(`items[${index}].unit_price`, Number(rate), false);
                }
            }

            const nextAmount = Number(calculateLine(row).line_total.toFixed(2));

            if (Number(row.line_total || 0) !== nextAmount) {
                setFieldValue(`items[${index}].line_total`, nextAmount, false);
            }
        });
    };

    const renderSaveButton = ({ submitForm, isValid, isSubmitting, setFieldValue }) => {
        const triggerStatusAction = (status, approved = false) => {
            setFieldValue('status', status, false);
            setFieldValue('approved', approved, false);
            submitForm();
        };

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Button type="default" disabled={isSubmitting} onClick={() => triggerStatusAction('draft', false)}>
                    Save Draft
                </Button>
                <Button type="default" disabled={!isValid || isSubmitting} onClick={() => triggerStatusAction('issued', false)}>
                    Issue
                </Button>
                <Button danger disabled={isSubmitting} onClick={() => triggerStatusAction('cancelled', false)}>
                    Cancel
                </Button>
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Payment-in Proforma Invoices
                </h2>
            }
        >
            <Head title="Payment-in Proforma Invoices" />

            <ReusableCrud
                title="Payment-in Proforma Invoices"
                apiUrl={api('/api/proforma-invoices/')}
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
                        title: 'Payment-in Proforma Invoices',
                        params: { approved: true },
                    },
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Payment-in Proforma Invoices',
                        params: { approved: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Payment-in Proforma Invoices',
                        params: {},
                    },
                ]}
                defaultAnchorKey="approved"
                anchorSyncWithHash
                showViewColumn
                viewPathBuilder={(record) => route('payment-in.proforma-invoices.show', record.id)}
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
