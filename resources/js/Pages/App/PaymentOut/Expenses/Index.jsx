import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Switch, Tag, Typography } from 'antd';
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

const emptyExpenseLine = {
    account_id: null,
    account_id_detail: null,
    account_name: '',
    description: '',
    amount: 0,
    tax_code: 'no_vat',
    tax_amount: 0,
    total_amount: 0,
};

const taxOptions = [
    { value: 'no_vat', label: 'No Vat' },
    { value: 'vat_13', label: 'VAT 13%' },
    { value: 'zero_rated', label: 'Zero Rated' },
    { value: 'exempt', label: 'Exempt' },
];

const tdsTypeOptions = [
    { value: 'percent', label: '%' },
    { value: 'amount', label: 'Amount' },
];

const calculateLine = (row = {}) => {
    const baseAmount = toNumber(row.amount);
    const vat = row.tax_code === 'vat_13' ? baseAmount * 0.13 : 0;

    const taxable = row.tax_code === 'vat_13' ? baseAmount : 0;
    const nonTaxable =
        row.tax_code === 'no_vat' || row.tax_code === 'exempt'
            ? baseAmount
            : 0;

    return {
        baseAmount,
        taxable,
        nonTaxable,
        vat,
        totalAmount: baseAmount + vat,
    };
};

const calculateTotals = (values = {}) => {
    const lines = values.lines || [];

    const totals = lines.reduce(
        (acc, row) => {
            const line = calculateLine(row);

            acc.subTotal += line.baseAmount;
            acc.nonTaxableTotal += line.nonTaxable;
            acc.taxableTotal += line.taxable;
            acc.vat += line.vat;
            acc.totalBeforeTds += line.totalAmount;

            return acc;
        },
        {
            subTotal: 0,
            nonTaxableTotal: 0,
            taxableTotal: 0,
            vat: 0,
            totalBeforeTds: 0,
        },
    );

    const tdsAmount = values.tds_applicable ? toNumber(values.tds_amount) : 0;

    return {
        ...totals,
        tdsAmount,
        grandTotal: Math.max(totals.totalBeforeTds - tdsAmount, 0),
    };
};

const initialValues = {
    supplier_id: null,
    supplier_id_detail: null,
    supplier_name: '',

    supplier_invoice_reference_no: '',
    expense_number: 'DRAFT',

    date: dayjs().format('YYYY-MM-DD'),
    due_date: dayjs().format('YYYY-MM-DD'),

    currency_id: null,
    currency_id_detail: null,
    currency_name: '',
    currency_code: '',
    exchange_rate_to_npr: 1,

    lines: [{ ...emptyExpenseLine }],

    notes: '',

    tds_applicable: true,
    tds_account_id: null,
    tds_account_id_detail: null,
    tds_account_name: '',
    tds_type: null,
    tds_amount: 0,

    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    supplier_id: Yup.string().nullable().required('Supplier is required'),
    date: Yup.string().required('Date is required'),
    due_date: Yup.string().required('Due date is required'),
    exchange_rate_to_npr: Yup.number()
        .typeError('Exchange rate is required')
        .min(0.0001, 'Exchange rate must be greater than 0')
        .required('Exchange rate is required'),

    lines: Yup.array()
        .of(
            Yup.object().shape({
                account_id: Yup.string().nullable().required('Account is required'),
                amount: Yup.number()
                    .typeError('Amount is required')
                    .min(0.0001, 'Amount must be greater than 0')
                    .required('Amount is required'),
            }),
        )
        .min(1, 'At least one expense account is required'),

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
                    .min(0, 'TDS amount cannot be negative')
                    .required('TDS amount is required'),
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
                name: 'supplier_invoice_reference_no',
                label: 'Supplier Invoice Reference No',
                col: 8,
                placeholder: 'Reference No',
            },

            {
                name: 'expense_number',
                label: '#Expense',
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
                placeholder: 'Date',
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
                name: '_empty_currency_space',
                type: 'custom',
                col: 8,
                render: () => null,
            },

            {
                name: 'lines',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Select Account',
                defaultItem: { ...emptyExpenseLine },
                columns: [
                    {
                        key: 'account_id',
                        name: 'account_id',
                        label: 'Accounts',
                        type: 'fkSelect',
                        width: '4fr',
                        placeholder: 'Select Account',
                        fkUrl: '/api/accounts/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'account_name',
                        fkLabel: (row) =>
                            row?.display_name ||
                            row?.name ||
                            row?.code ||
                            '',
                    },
                    {
                        key: 'amount',
                        name: 'amount',
                        label: 'Amount',
                        type: 'number',
                        width: '180px',
                        min: 0,
                        placeholder: 'Amount',
                    },
                    {
                        key: 'tax_code',
                        name: 'tax_code',
                        label: 'Tax',
                        type: 'select',
                        width: '160px',
                        options: taxOptions,
                    },
                    {
                        key: 'total_amount',
                        name: 'total_amount',
                        label: 'Total',
                        type: 'number',
                        width: '160px',
                        readOnly: true,
                        formula: (row) => Number(calculateLine(row).totalAmount.toFixed(2)),
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
                        placeholder: 'Expense description',
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
                render: ({ values }) => {
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
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.name ||
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
                title: '#Expense',
                dataIndex: 'expense_number',
                key: 'expense_number',
                width: 150,
                backendSort: true,
                sortField: 'expense_number',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
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
                dataIndex: 'supplier_invoice_reference_no',
                key: 'supplier_invoice_reference_no',
                width: 190,
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
                    if (status === 'paid') return <Tag color="blue">Paid</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const lines = (values.lines || [])
            .filter((row) => row.account_id || toNumber(row.amount) > 0)
            .map((row) => {
                const line = calculateLine(row);

                return {
                    id: row.id,
                    account_id: row.account_id,
                    description: row.description || row.account_name || '',
                    amount: Number(line.baseAmount.toFixed(2)),
                    tax_code: row.tax_code || 'no_vat',
                    taxable_amount: Number(line.taxable.toFixed(2)),
                    non_taxable_amount: Number(line.nonTaxable.toFixed(2)),
                    tax_amount: Number(line.vat.toFixed(2)),
                    total_amount: Number(line.totalAmount.toFixed(2)),
                };
            });

        const totals = calculateTotals(values);

        return {
            supplier_id: values.supplier_id,
            supplier_invoice_reference_no: values.supplier_invoice_reference_no || '',
            expense_number: values.expense_number || 'DRAFT',

            date: dayjs(values.date, 'DD-MM-YYYY').isValid()
                ? dayjs(values.date, 'DD-MM-YYYY').format('YYYY-MM-DD')
                : values.date,

            due_date: dayjs(values.due_date, 'DD-MM-YYYY').isValid()
                ? dayjs(values.due_date, 'DD-MM-YYYY').format('YYYY-MM-DD')
                : values.due_date,

            currency_id: values.currency_id || null,
            exchange_rate_to_npr: toNumber(values.exchange_rate_to_npr || 1),

            notes: values.notes || '',

            tds_applicable: !!values.tds_applicable,
            tds_account_id: values.tds_applicable ? values.tds_account_id : null,
            tds_type: values.tds_applicable ? values.tds_type : null,
            tds_amount: values.tds_applicable ? toNumber(values.tds_amount) : 0,

            sub_total: Number(totals.subTotal.toFixed(2)),
            non_taxable_total: Number(totals.nonTaxableTotal.toFixed(2)),
            taxable_total: Number(totals.taxableTotal.toFixed(2)),
            vat_amount: Number(totals.vat.toFixed(2)),
            grand_total: Number(totals.grandTotal.toFixed(2)),

            approved: !!values.approved,
            status: values.status || 'draft',

            lines,
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

        (values.lines || []).forEach((row, index) => {
            const account = row?.account_id_detail;

            if (account) {
                const accountName =
                    account.display_name ||
                    account.name ||
                    account.code ||
                    '';

                if (!row.account_name && accountName) {
                    setFieldValue(`lines[${index}].account_name`, accountName, false);
                }
            }

            const line = calculateLine(row);

            if (Number(row.tax_amount || 0) !== Number(line.vat.toFixed(2))) {
                setFieldValue(`lines[${index}].tax_amount`, Number(line.vat.toFixed(2)), false);
            }

            if (Number(row.total_amount || 0) !== Number(line.totalAmount.toFixed(2))) {
                setFieldValue(
                    `lines[${index}].total_amount`,
                    Number(line.totalAmount.toFixed(2)),
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
                    Expenses
                </h2>
            }
        >
            <Head title="Expenses" />

            <ReusableCrud
                title="Expense"
                apiUrl={api('/api/expenses/')}
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
                        title: 'Expenses',
                        params: { approved: true },
                    },
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Expenses',
                        params: { approved: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Expenses',
                        params: {},
                    },
                ]}
                defaultAnchorKey="approved"
                anchorSyncWithHash
                showViewColumn
                viewPathBuilder={(record) => route('payment-out.expenses.show', record.id)}
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
