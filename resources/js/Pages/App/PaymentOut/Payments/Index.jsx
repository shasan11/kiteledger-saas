import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Switch, Tag, Typography } from 'antd';
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

const paymentModeOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'online', label: 'Online Payment' },
    { value: 'card', label: 'Card' },
];

const tdsTypeOptions = [
    { value: 'percent', label: '%' },
    { value: 'amount', label: 'Amount' },
];

const initialValues = {
    paid_to_id: null,
    paid_to_id_detail: null,
    paid_to_name: '',

    paid_from_account_id: null,
    paid_from_account_id_detail: null,
    paid_from_account_name: '',

    payment_number: 'DRAFT',
    payment_date: dayjs().format('YYYY-MM-DD'),
    amount: 0,

    currency_id: null,
    currency_id_detail: null,
    currency_name: '',
    currency_code: '',
    exchange_rate_to_npr: 1,

    payment_mode: null,
    payment_reference: '',

    bank_charge_applicable: false,
    bank_charge_account_id: null,
    bank_charge_account_id_detail: null,
    bank_charge_account_name: '',
    bank_charge_amount: 0,

    tds_applicable: false,
    tds_account_id: null,
    tds_account_id_detail: null,
    tds_account_name: '',
    tds_type: null,
    tds_amount: 0,

    notes: '',
    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    paid_to_id: Yup.string().nullable().required('Paid to is required'),
    paid_from_account_id: Yup.string().nullable().required('Paid from is required'),

    payment_date: Yup.string().required('Payment date is required'),

    amount: Yup.number()
        .typeError('Amount is required')
        .min(0.0001, 'Amount must be greater than 0')
        .required('Amount is required'),

    exchange_rate_to_npr: Yup.number()
        .typeError('Exchange rate is required')
        .min(0.0001, 'Exchange rate must be greater than 0')
        .required('Exchange rate is required'),

    bank_charge_account_id: Yup.string()
        .nullable()
        .when('bank_charge_applicable', {
            is: true,
            then: (schema) => schema.required('Bank charge account is required'),
            otherwise: (schema) => schema.nullable(),
        }),

    bank_charge_amount: Yup.number()
        .typeError('Bank charge amount is required')
        .when('bank_charge_applicable', {
            is: true,
            then: (schema) =>
                schema
                    .min(0.0001, 'Bank charge amount must be greater than 0')
                    .required('Bank charge amount is required'),
            otherwise: (schema) => schema.nullable(),
        }),

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
                name: 'paid_to_id',
                label: 'Paid To',
                type: 'fkSelect',
                required: true,
                col: 16,
                placeholder: 'Paid To',
                fkUrl: '/api/contacts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'display_name',
                labelField: 'paid_to_name',
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
                name: 'paid_from_account_id',
                label: 'Paid From',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Select Account',
                fkUrl: '/api/bank-accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'display_name',
                labelField: 'paid_from_account_name',
                fkExtraParams: {
                    active: true,
                },
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.account_name ||
                    row?.bank_name ||
                    row?.name ||
                    row?.code ||
                    '',
            },

            {
                name: 'payment_number',
                label: 'Payment Number',
                col: 8,
                readOnly: true,
                placeholder: 'DRAFT',
            },
            {
                name: 'payment_date',
                label: 'Payment Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Payment Date',
            },
            {
                name: 'amount',
                label: 'Amount',
                type: 'number',
                required: true,
                col: 8,
                min: 0,
                placeholder: 'Amount',
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
                name: '_empty_exchange_space',
                type: 'custom',
                col: 8,
                render: () => null,
            },

            {
                name: '_payment_mode_title',
                label: '',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            marginTop: 8,
                            paddingTop: 22,
                            color: '#8b95a5',
                            fontWeight: 700,
                            fontSize: 15,
                        }}
                    >
                        Payment Mode
                    </div>
                ),
            },
            {
                name: 'payment_mode',
                label: 'Payment Mode',
                type: 'select',
                col: 8,
                placeholder: 'Payment Mode',
                options: paymentModeOptions,
            },
            {
                name: 'payment_reference',
                label: 'Payment Reference#',
                col: 8,
                placeholder: 'Payment Reference#',
            },
            {
                name: '_empty_payment_mode_space',
                type: 'custom',
                col: 8,
                render: () => null,
            },

            {
                name: '_bank_charge_toggle',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 24,
                            marginTop: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                        }}
                    >
                        <Switch
                            checked={!!values.bank_charge_applicable}
                            onChange={(checked) => setFieldValue('bank_charge_applicable', checked)}
                        />
                        <Text strong>Bank charge</Text>
                    </div>
                ),
            },
            {
                name: 'bank_charge_account_id',
                label: 'Bank Charge Account',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Select Account',
                fkUrl: '/api/accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'bank_charge_account_name',
                condition: (values) => !!values.bank_charge_applicable,
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.name ||
                    row?.code ||
                    '',
            },
            {
                name: 'bank_charge_amount',
                label: 'Bank Charge Amount',
                type: 'number',
                required: true,
                col: 8,
                min: 0,
                placeholder: 'Bank Charge Amount',
                condition: (values) => !!values.bank_charge_applicable,
            },
            {
                name: '_empty_bank_charge_space',
                type: 'custom',
                col: 8,
                condition: (values) => !!values.bank_charge_applicable,
                render: () => null,
            },

            {
                name: '_tds_toggle',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            paddingTop: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                        }}
                    >
                        <Switch
                            checked={!!values.tds_applicable}
                            onChange={(checked) => setFieldValue('tds_applicable', checked)}
                        />
                        <Text strong>TDS</Text>
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

            {
                name: 'notes',
                label: 'Notes',
                type: 'textarea',
                col: 24,
                rows: 6,
                placeholder: 'Notes',
                helpText: 'This will appear on print',
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: 'Payment No',
                dataIndex: 'payment_number',
                key: 'payment_number',
                width: 160,
                backendSort: true,
                sortField: 'payment_number',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Paid To',
                dataIndex: 'paid_to_name',
                key: 'paid_to_name',
                width: 240,
                backendSort: true,
                sortField: 'paid_to_name',
                render: (_, record) =>
                    record?.paid_to_name ||
                    record?.paid_to?.display_name ||
                    record?.paid_to?.company_name ||
                    record?.paid_to?.name ||
                    '-',
            },
            {
                title: 'Paid From',
                dataIndex: 'paid_from_account_name',
                key: 'paid_from_account_name',
                width: 220,
                render: (_, record) =>
                    record?.paid_from_account_name ||
                    record?.paid_from_account?.display_name ||
                    record?.paid_from_account?.account_name ||
                    record?.paid_from_account?.bank_name ||
                    '-',
            },
            {
                title: 'Payment Date',
                dataIndex: 'payment_date',
                key: 'payment_date',
                width: 140,
                backendSort: true,
                sortField: 'payment_date',
                render: (value) => {
                    if (!value) return '-';
                    const parsed = dayjs(value);
                    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
                },
            },
            {
                title: 'Mode',
                dataIndex: 'payment_mode',
                key: 'payment_mode',
                width: 150,
                render: (value) =>
                    paymentModeOptions.find((item) => item.value === value)?.label || '-',
            },
            {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                width: 140,
                align: 'right',
                backendSort: true,
                sortField: 'amount',
                render: (value) => <Text strong>{money(value)}</Text>,
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
        return {
            paid_to_id: values.paid_to_id,
            paid_from_account_id: values.paid_from_account_id,

            payment_number: values.payment_number || 'DRAFT',

            payment_date: dayjs(values.payment_date, 'DD-MM-YYYY').isValid()
                ? dayjs(values.payment_date, 'DD-MM-YYYY').format('YYYY-MM-DD')
                : values.payment_date,

            amount: toNumber(values.amount),

            currency_id: values.currency_id || null,
            exchange_rate_to_npr: toNumber(values.exchange_rate_to_npr || 1),

            payment_mode: values.payment_mode || null,
            payment_reference: values.payment_reference || '',

            bank_charge_applicable: !!values.bank_charge_applicable,
            bank_charge_account_id: values.bank_charge_applicable
                ? values.bank_charge_account_id
                : null,
            bank_charge_amount: values.bank_charge_applicable
                ? toNumber(values.bank_charge_amount)
                : 0,

            tds_applicable: !!values.tds_applicable,
            tds_account_id: values.tds_applicable ? values.tds_account_id : null,
            tds_type: values.tds_applicable ? values.tds_type : null,
            tds_amount: values.tds_applicable ? toNumber(values.tds_amount) : 0,

            net_amount: Math.max(
                toNumber(values.amount) +
                    (values.bank_charge_applicable ? toNumber(values.bank_charge_amount) : 0) -
                    (values.tds_applicable ? toNumber(values.tds_amount) : 0),
                0,
            ),

            notes: values.notes || '',
            approved: !!values.approved,
            status: values.status || 'draft',
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
                    Payment Out
                </h2>
            }
        >
            <Head title="Payment Out" />

            <ReusableCrud
                title="Payment Out"
                apiUrl={api('/api/payment-out/')}
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
                        title: 'Payment Out',
                        params: { approved: false },
                    },
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Payment Out',
                        params: { approved: true },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Payment Out',
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