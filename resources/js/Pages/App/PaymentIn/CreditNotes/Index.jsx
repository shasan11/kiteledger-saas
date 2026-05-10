import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, InputNumber, Select, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ReusableCrud';
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
    quantity: 1,
    unit_code: 'PCS',
    rate: 0,
    discount: 0,
    discount_type: 'percent',
    tax_code: 'no_vat',
    amount: 0,
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

const calculateLine = (row = {}) => {
    const qty = toNumber(row.quantity);
    const rate = toNumber(row.rate);
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
        amount: net + vat,
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

    const noteDiscountValue = toNumber(values.note_discount);
    const noteDiscount =
        values.note_discount_type === 'amount'
            ? noteDiscountValue
            : (itemTotals.itemTotal * noteDiscountValue) / 100;

    return {
        ...itemTotals,
        noteDiscount,
        grandTotal: Math.max(itemTotals.itemTotal - noteDiscount, 0),
    };
};

const initialValues = {
    customer_id: null,
    customer_id_detail: null,
    customer_name: '',

    reference_no: '',
    note_number: 'DRAFT',

    date: dayjs().format('YYYY-MM-DD'),

    currency_id: null,
    currency_id_detail: null,
    currency_name: '',
    currency_code: '',
    exchange_rate_to_npr: 1,

    warehouse_id: null,
    warehouse_id_detail: null,
    warehouse_name: '',

    items: [{ ...emptyItem }],

    note_discount: 0,
    note_discount_type: 'percent',

    terms_enabled: false,
    terms_and_conditions:
        '1. This credit note is issued against returned goods, billing adjustment, or approved correction.\n' +
        '2. The credited amount will be adjusted against the customer ledger.\n' +
        '3. Taxes and discounts are calculated based on the selected item lines.\n' +
        '4. This credit note is valid only after approval.',

    notes: '',

    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    customer_id: Yup.string().nullable().required('Customer is required'),

    date: Yup.string().required('Date is required'),

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
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'customer_id',
                label: 'Customer Name',
                type: 'fkSelect',
                required: true,
                col: 16,
                placeholder: 'Select Customer',
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
                name: 'reference_no',
                label: 'Reference No',
                col: 8,
                placeholder: 'Reference',
            },

            {
                name: 'note_number',
                label: '#Note',
                col: 8,
                readOnly: true,
                placeholder: '#Note',
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
                name: '_empty_top_space',
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
                name: '_terms_button',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            marginTop: 20,
                            paddingTop: 20,
                        }}
                    >
                        <Button
                            type="link"
                            style={{ paddingLeft: 0, fontWeight: 600 }}
                            onClick={() => setFieldValue('terms_enabled', !values.terms_enabled)}
                        >
                            {values.terms_enabled
                                ? '- Hide Terms and Conditions'
                                : '+ Add Terms and Conditions'}
                        </Button>
                    </div>
                ),
            },
            {
                name: 'terms_and_conditions',
                label: 'Terms and Conditions',
                type: 'textarea',
                col: 24,
                rows: 5,
                placeholder: 'Enter terms and conditions',
                condition: (values) => !!values.terms_enabled,
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
                                        value={values.note_discount}
                                        min={0}
                                        style={{ width: 140 }}
                                        onChange={(val) => setFieldValue('note_discount', val || 0)}
                                    />
                                    <Select
                                        value={values.note_discount_type}
                                        options={discountTypeOptions}
                                        style={{ width: 95 }}
                                        onChange={(val) => setFieldValue('note_discount_type', val)}
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
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: '#Note',
                dataIndex: 'note_number',
                key: 'note_number',
                width: 150,
                backendSort: true,
                sortField: 'note_number',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Customer',
                dataIndex: 'customer_name',
                key: 'customer_name',
                width: 240,
                backendSort: true,
                sortField: 'customer_name',
                render: (_, record) =>
                    record?.customer_name ||
                    record?.customer?.display_name ||
                    record?.customer?.company_name ||
                    record?.customer?.name ||
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
                dataIndex: 'grand_total',
                key: 'grand_total',
                width: 150,
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
                    if (status === 'refunded') return <Tag color="blue">Refunded</Tag>;

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
            customer_id: values.customer_id,
            reference_no: values.reference_no || '',
            note_number: values.note_number || 'DRAFT',

            date: formatDateForBackend(values.date),

            currency_id: values.currency_id || null,
            exchange_rate_to_npr: toNumber(values.exchange_rate_to_npr || 1),
            warehouse_id: values.warehouse_id,

            notes: values.notes || '',
            terms_enabled: !!values.terms_enabled,
            terms_and_conditions: values.terms_enabled ? values.terms_and_conditions || '' : '',

            note_discount: toNumber(values.note_discount),
            note_discount_type: values.note_discount_type || 'percent',

            sub_total: Number(totals.subTotal.toFixed(2)),
            discount_amount: Number(totals.noteDiscount.toFixed(2)),
            line_discount_amount: Number(totals.lineDiscount.toFixed(2)),
            non_taxable_total: Number(totals.nonTaxableTotal.toFixed(2)),
            taxable_total: Number(totals.taxableTotal.toFixed(2)),
            vat_amount: Number(totals.vat.toFixed(2)),
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
                    'PCS';

                const rate =
                    product.sales_rate ??
                    product.selling_price ??
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
                    Credit Note
                </h2>
            }
        >
            <Head title="Credit Note" />

            <ReusableCrud
                title="Credit Note"
                apiUrl={api('/api/credit-notes/')}
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
                        title: 'Credit Note',
                        params: { approved: true },
                    },
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Credit Note',
                        params: { approved: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Credit Note',
                        params: {},
                    },
                ]}
                defaultAnchorKey="approved"
                anchorSyncWithHash
                showViewColumn
                viewPathBuilder={(record) => route('payment-in.credit-notes.show', record.id)}
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
