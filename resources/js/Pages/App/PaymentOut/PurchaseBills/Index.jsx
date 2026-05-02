import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, InputNumber, Select, Switch, Tag, Typography } from 'antd';
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

const emptyItem = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    description: '',
    quantity: 1,
    unit_code: 'PC',
    rate: 0,
    discount: 0,
    discount_type: 'percent',
    tax_code: 'no_vat',
    amount: 0,
    notes: '',
};

const emptyAdditionalCost = {
    cost_term_id: null,
    cost_term_id_detail: null,
    cost_term_name: '',
    product_id: null,
    product_id_detail: null,
    product_name: '',
    method: 'value',
    amount_npr: 0,
};

const unitOptions = [
    { value: 'PC', label: 'PC' },
    { value: 'PCS', label: 'PCS' },
    { value: 'BX', label: 'BX' },
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

const costMethodOptions = [
    { value: 'value', label: 'Value' },
    { value: 'percent', label: '%' },
];

const tdsTypeOptions = [
    { value: 'percent', label: '%' },
    { value: 'amount', label: 'Amount' },
];

const calculateLine = (row = {}) => {
    const qty = toNumber(row.quantity);
    const rate = toNumber(row.rate);
    const gross = qty * rate;

    const discountValue = toNumber(row.discount);
    const discount =
        row.discount_type === 'amount'
            ? discountValue
            : (gross * discountValue) / 100;

    const taxableBeforeVat = Math.max(gross - discount, 0);
    const vat = row.tax_code === 'vat_13' ? taxableBeforeVat * 0.13 : 0;
    const nonTaxable = row.tax_code === 'no_vat' || row.tax_code === 'exempt'
        ? taxableBeforeVat
        : 0;
    const taxable = row.tax_code === 'vat_13' ? taxableBeforeVat : 0;

    return {
        gross,
        discount,
        taxable,
        nonTaxable,
        vat,
        amount: taxableBeforeVat + vat,
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
            acc.itemTotal += line.amount;

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

    const billDiscountValue = toNumber(values.bill_discount);
    const billDiscount =
        values.bill_discount_type === 'amount'
            ? billDiscountValue
            : (itemTotals.itemTotal * billDiscountValue) / 100;

    const additionalCostTotal = (values.additional_costs || []).reduce((sum, row) => {
        if (row.method === 'percent') {
            return sum + (itemTotals.itemTotal * toNumber(row.amount_npr)) / 100;
        }

        return sum + toNumber(row.amount_npr);
    }, 0);

    const tdsAmount = values.tds_applicable ? toNumber(values.tds_amount) : 0;

    const grandTotal = Math.max(
        itemTotals.itemTotal - billDiscount + additionalCostTotal - tdsAmount,
        0,
    );

    return {
        ...itemTotals,
        billDiscount,
        additionalCostTotal,
        tdsAmount,
        grandTotal,
    };
};

const initialValues = {
    supplier_id: null,
    supplier_id_detail: null,
    supplier_name: '',

    reference_no: '',
    bill_number: '',
    bill_date: dayjs().format('YYYY-MM-DD'),
    due_date: dayjs().format('YYYY-MM-DD'),
    supplier_invoice_reference_no: '',

    warehouse_id: null,
    warehouse_id_detail: null,
    warehouse_name: '',

    currency_id: null,
    currency_id_detail: null,
    currency_name: '',
    currency_code: '',
    exchange_rate_to_npr: 1,

    is_import: false,

    items: [{ ...emptyItem }],

    notes: '',
    bill_discount: 0,
    bill_discount_type: 'percent',

    additional_cost_product_wise: false,
    additional_costs: [{ ...emptyAdditionalCost }],

    tds_applicable: true,
    tds_account_id: null,
    tds_account_id_detail: null,
    tds_type: null,
    tds_amount: 0,

    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    supplier_id: Yup.string().nullable().required('Supplier is required'),
    bill_date: Yup.string().required('Bill date is required'),
    due_date: Yup.string().required('Due date is required'),
    warehouse_id: Yup.string().nullable().required('Warehouse is required'),
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
            then: (schema) => schema.min(0, 'TDS amount cannot be negative').required('TDS amount is required'),
            otherwise: (schema) => schema.nullable(),
        }),
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
                placeholder: 'Supplier Name',
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
                placeholder: 'Reference',
            },

            {
                name: 'bill_number',
                label: 'Bill Number',
                col: 8,
                readOnly: true,
                placeholder: 'Bill Number',
            },
            {
                name: 'bill_date',
                label: 'Bill Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Bill Date',
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
                name: 'supplier_invoice_reference_no',
                label: 'Supplier Invoice Reference No',
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
                fkLabel: (row) =>
                    row?.name ||
                    row?.display_name ||
                    row?.code ||
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
                name: 'is_import',
                label: 'Is Import',
                type: 'switch',
                col: 8,
            },
            {
                name: '_space_after_import',
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
                defaultItem: { ...emptyItem },
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
                        width: '85px',
                        options: unitOptions,
                    },
                    {
                        key: 'rate',
                        name: 'rate',
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
                        key: 'amount',
                        name: 'amount',
                        label: 'Amount',
                        type: 'number',
                        width: '120px',
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
                                <Text>Sub Total</Text>
                                <Text strong>{money(totals.subTotal)}</Text>
                            </div>

                            <div style={rowStyle}>
                                <Text>Discount</Text>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <InputNumber
                                        value={values.bill_discount}
                                        min={0}
                                        style={{ width: 140 }}
                                        onChange={(val) => setFieldValue('bill_discount', val || 0)}
                                    />
                                    <Select
                                        value={values.bill_discount_type}
                                        options={discountTypeOptions}
                                        style={{ width: 95 }}
                                        onChange={(val) => setFieldValue('bill_discount_type', val)}
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
                                <Text>Additional Cost</Text>
                                <Text strong>{money(totals.additionalCostTotal)}</Text>
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
                name: '_additional_cost_title',
                label: '',
                type: 'custom',
                col: 18,
                render: () => (
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>
                        Additional Cost
                    </div>
                ),
            },
            {
                name: 'additional_cost_product_wise',
                label: '',
                type: 'custom',
                col: 6,
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 12,
                        }}
                    >
                        <Switch
                            size="small"
                            checked={!!values.additional_cost_product_wise}
                            onChange={(checked) => setFieldValue('additional_cost_product_wise', checked)}
                        />
                        <Text>Add product-wise</Text>
                    </div>
                ),
            },
            {
                name: 'additional_costs',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Select Products',
                defaultItem: { ...emptyAdditionalCost },
                columns: [
                    {
                        key: 'cost_term_id',
                        name: 'cost_term_id',
                        label: 'Cost Terms',
                        type: 'fkSelect',
                        width: '2fr',
                        placeholder: 'Select Cost Term',
                        fkUrl: '/api/cost-terms/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'cost_term_name',
                        fkLabel: (row) => row?.name || row?.display_name || row?.code || '',
                    },
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product',
                        type: 'fkSelect',
                        width: '3fr',
                        placeholder: 'All Product / Select Product',
                        fkUrl: '/api/products/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'product_name',
                        fkLabel: (row) =>
                            row?.name ||
                            row?.display_name ||
                            row?.code ||
                            '',
                    },
                    {
                        key: 'method',
                        name: 'method',
                        label: 'Method',
                        type: 'select',
                        width: '160px',
                        options: costMethodOptions,
                    },
                    {
                        key: 'amount_npr',
                        name: 'amount_npr',
                        label: 'Amount (NPR)',
                        type: 'number',
                        width: '180px',
                        min: 0,
                        placeholder: 'Amount',
                    },
                ],
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
                            paddingTop: 14,
                            marginTop: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <Switch
                            checked={!!values.tds_applicable}
                            onChange={(checked) => setFieldValue('tds_applicable', checked)}
                        />
                        <Text strong>TDS is applicable to this product</Text>
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
                fkLabel: (row) =>
                    row?.name ||
                    row?.display_name ||
                    row?.code ||
                    '',
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
                title: 'Bill No',
                dataIndex: 'bill_number',
                key: 'bill_number',
                width: 150,
                backendSort: true,
                sortField: 'bill_number',
                render: (value) => <Text strong>{value || '-'}</Text>,
            },
            {
                title: 'Supplier',
                dataIndex: 'supplier_name',
                key: 'supplier_name',
                width: 240,
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
                title: 'Bill Date',
                dataIndex: 'bill_date',
                key: 'bill_date',
                width: 130,
                backendSort: true,
                sortField: 'bill_date',
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
                dataIndex: 'reference_no',
                key: 'reference_no',
                width: 160,
                render: (value) => value || '-',
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
                title: 'Total',
                dataIndex: 'grand_total',
                key: 'grand_total',
                width: 140,
                align: 'right',
                backendSort: true,
                sortField: 'grand_total',
                render: (_, record) => {
                    const total =
                        record?.grand_total ??
                        record?.total_amount ??
                        calculateTotals(record).grandTotal;

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
                    if (status === 'paid') return <Tag color="blue">Paid</Tag>;

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
                    taxable_amount: Number(line.taxable.toFixed(2)),
                    non_taxable_amount: Number(line.nonTaxable.toFixed(2)),
                    vat_amount: Number(line.vat.toFixed(2)),
                    amount: Number(line.amount.toFixed(2)),
                    notes: row.notes || '',
                };
            });

        const totals = calculateTotals(values);

        return {
            supplier_id: values.supplier_id,
            reference_no: values.reference_no || '',
            bill_number: values.bill_number || '',
            bill_date: dayjs(values.bill_date, 'DD-MM-YYYY').isValid()
                ? dayjs(values.bill_date, 'DD-MM-YYYY').format('YYYY-MM-DD')
                : values.bill_date,
            due_date: dayjs(values.due_date, 'DD-MM-YYYY').isValid()
                ? dayjs(values.due_date, 'DD-MM-YYYY').format('YYYY-MM-DD')
                : values.due_date,
            supplier_invoice_reference_no: values.supplier_invoice_reference_no || '',
            warehouse_id: values.warehouse_id,
            currency_id: values.currency_id || null,
            exchange_rate_to_npr: toNumber(values.exchange_rate_to_npr || 1),
            is_import: !!values.is_import,
            notes: values.notes || '',

            bill_discount: toNumber(values.bill_discount),
            bill_discount_type: values.bill_discount_type || 'percent',

            additional_cost_product_wise: !!values.additional_cost_product_wise,
            additional_costs: (values.additional_costs || [])
                .filter((row) => row.cost_term_id || toNumber(row.amount_npr) > 0)
                .map((row) => ({
                    id: row.id,
                    cost_term_id: row.cost_term_id,
                    product_id: values.additional_cost_product_wise ? row.product_id : null,
                    method: row.method || 'value',
                    amount_npr: toNumber(row.amount_npr),
                })),

            tds_applicable: !!values.tds_applicable,
            tds_account_id: values.tds_applicable ? values.tds_account_id : null,
            tds_type: values.tds_applicable ? values.tds_type : null,
            tds_amount: values.tds_applicable ? toNumber(values.tds_amount) : 0,

            sub_total: Number(totals.subTotal.toFixed(2)),
            discount_amount: Number(totals.billDiscount.toFixed(2)),
            non_taxable_total: Number(totals.nonTaxableTotal.toFixed(2)),
            taxable_total: Number(totals.taxableTotal.toFixed(2)),
            vat_amount: Number(totals.vat.toFixed(2)),
            additional_cost_total: Number(totals.additionalCostTotal.toFixed(2)),
            grand_total: Number(totals.grandTotal.toFixed(2)),

            approved: !!values.approved,
            status: values.status || 'draft',

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
                    'PC';

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
                    Purchase Bill
                </h2>
            }
        >
            <Head title="Purchase Bill" />

            <ReusableCrud
                title="New Purchase Bill"
                apiUrl={api('/api/purchase-bills/')}
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
                        title: 'Purchase Bill',
                        params: { approved: false },
                    },
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Purchase Bill',
                        params: { approved: true },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Purchase Bill',
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