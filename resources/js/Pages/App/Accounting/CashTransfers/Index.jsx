import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';
import { SwapOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import * as Yup from 'yup';

const CASH_TRANSFER_API = '/api/cash-transfers';
const ACCOUNT_API = '/api/accounts';
const CURRENCY_API = '/api/currencies';
const BRANCH_API = '/api/branches';

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'posted', label: 'Posted' },
    { value: 'cancelled', label: 'Cancelled' },
];

function normalizeFk(value) {
    if (!value) return null;

    if (typeof value === 'object') {
        return value.id || value.value || null;
    }

    return value;
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getStatusColor(status) {
    if (status === 'posted') return 'green';
    if (status === 'cancelled') return 'red';
    return 'blue';
}

function getAccountLabel(account) {
    if (!account) return '-';

    if (account.code && account.name) {
        return `${account.code} - ${account.name}`;
    }

    return (
        account.name ||
        account.display_name ||
        account.account_name ||
        account.bank_name ||
        account.code ||
        account.label ||
        '-'
    );
}

function getCurrencyLabel(currency) {
    if (!currency) return '-';

    if (currency.code && currency.name) {
        return `${currency.code} - ${currency.name}`;
    }

    return currency.name || currency.code || currency.label || '-';
}

export default function Index({
    branches = [],
    accounts = [],
    currencies = [],
}) {
    const today = new Date().toISOString().slice(0, 10);

    const branchOptions = useMemo(
        () =>
            branches.map((branch) => ({
                label: branch.code ? `${branch.code} - ${branch.name}` : branch.name,
                value: branch.id,
            })),
        [branches]
    );

    const accountOptions = useMemo(
        () =>
            accounts
                .filter((account) => account?.id)
                .map((account) => ({
                    label: getAccountLabel(account),
                    value: account.id,
                })),
        [accounts]
    );

    const currencyOptions = useMemo(
        () =>
            currencies
                .filter((currency) => currency?.id)
                .map((currency) => ({
                    label: getCurrencyLabel(currency),
                    value: currency.id,
                })),
        [currencies]
    );

    const baseCurrency = useMemo(
        () => currencies.find((currency) => currency.is_base) || currencies[0] || null,
        [currencies]
    );

    const validationSchema = Yup.object().shape({
        branch_id: Yup.mixed().nullable(),

        transfer_date: Yup.string()
            .required('Date is required'),

        from_account_id: Yup.mixed()
            .required('Transfer from account is required'),

        currency_id: Yup.mixed()
            .required('Currency is required'),

        exchange_rate: Yup.number()
            .typeError('Exchange rate must be a number')
            .min(0, 'Exchange rate cannot be negative')
            .required('Exchange rate is required'),

        transfer_no: Yup.string()
            .nullable()
            .max(40, 'Transfer number cannot exceed 40 characters'),

        reference: Yup.string()
            .nullable()
            .max(120, 'Reference cannot exceed 120 characters'),

        status: Yup.string()
            .oneOf(['draft', 'posted', 'cancelled'])
            .nullable(),

        notes: Yup.string()
            .nullable(),

        items: Yup.array()
            .of(
                Yup.object().shape({
                    id: Yup.mixed().nullable(),

                    to_account_id: Yup.mixed()
                        .required('Transferred to account is required'),

                    amount: Yup.number()
                        .typeError('Amount must be a number')
                        .min(0.01, 'Amount must be greater than 0')
                        .required('Amount is required'),

                    exchange_rate_to_default: Yup.number()
                        .nullable()
                        .typeError('Exchange rate must be a number')
                        .min(0, 'Exchange rate cannot be negative'),

                    description: Yup.string()
                        .nullable()
                        .max(200, 'Description cannot exceed 200 characters'),
                })
            )
            .min(1, 'At least one transfer line is required')
            .required('Transfer lines are required'),
    });

    const columns = useMemo(
        () => [
            {
                title: '#Transfer',
                dataIndex: 'transfer_no',
                key: 'transfer_no',
                backendSort: true,
                render: (value) => value || 'DRAFT',
            },
            {
                title: 'Date',
                dataIndex: 'transfer_date',
                key: 'transfer_date',
                backendSort: true,
                width: 130,
                render: (value) => value || '-',
            },
            {
                title: 'From Account',
                dataIndex: 'from_account_id_detail',
                key: 'from_account_id',
                render: (_, record) =>
                    getAccountLabel(
                        record?.from_account_id_detail ||
                            record?.fromAccount ||
                            record?.from_account ||
                            record?.from_account_detail
                    ),
            },
            {
                title: 'Currency',
                dataIndex: 'currency_id_detail',
                key: 'currency_id',
                width: 160,
                render: (_, record) =>
                    getCurrencyLabel(record?.currency_id_detail || record?.currency),
            },
            {
                title: 'Total',
                dataIndex: 'total_amount',
                key: 'total_amount',
                align: 'right',
                width: 140,
                backendSort: true,
                render: (value) => formatMoney(value),
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                backendSort: true,
                backendFilter: {
                    type: 'select',
                    param: 'status',
                    options: STATUS_OPTIONS,
                },
                render: (value) => (
                    <Tag color={getStatusColor(value || 'draft')}>
                        {String(value || 'draft').toUpperCase()}
                    </Tag>
                ),
            },
        ],
        []
    );

    const fields = useMemo(
        () => [
            {
                name: 'from_account_id',
                label: 'Transfer From Account',
                type: 'fkSelect',
                required: true,
                placeholder: 'Select Account',
                fkUrl: ACCOUNT_API,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                fkLabel: getAccountLabel,
                fkSearchParam: 'search',
                fkPageSize: 20,
                options: accountOptions,
                col: 16,
            },
            {
                name: 'transfer_date',
                label: 'Date',
                type: 'date',
                required: true,
                col: 8,
            },
            {
                name: 'transfer_no',
                label: '#Transfer',
                type: 'text',
                placeholder: 'DRAFT',
                col: 8,
            },
            {
                name: 'reference',
                label: 'Reference',
                type: 'text',
                placeholder: 'Reference',
                col: 8,
            },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'fkSelect',
                required: true,
                placeholder: 'Select Currency',
                fkUrl: CURRENCY_API,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                fkLabel: getCurrencyLabel,
                fkSearchParam: 'search',
                fkPageSize: 20,
                options: currencyOptions,
                col: 8,
            },
            {
                name: 'exchange_rate',
                label: `Exchange Rate To ${baseCurrency?.code || 'Default'}`,
                type: 'number',
                required: true,
                placeholder: '1',
                min: 0,
                col: 8,
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                options: STATUS_OPTIONS,
                col: 8,
            },
            {
                name: 'branch_id',
                label: 'Branch',
                type: 'fkSelect',
                placeholder: 'Select Branch',
                fkUrl: BRANCH_API,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                fkSearchParam: 'search',
                fkPageSize: 20,
                options: branchOptions,
                allowClear: true,
                col: 8,
            },
            {
                name: 'items',
                label: 'Transferred To',
                type: 'objectArray',
                col: 24,
                required: true,
                minRows: 1,
                addButtonLabel: 'Add Row',
                defaultItem: {
                    id: null,
                    to_account_id: null,
                    description: '',
                    exchange_rate_to_default: 1,
                    amount: null,
                },
                columns: [
                    {
                        key: 'to_account_id',
                        name: 'to_account_id',
                        title: 'Transferred To',
                        label: 'Transferred To',
                        type: 'fkSelect',
                        required: true,
                        placeholder: 'Select Account',
                        fkUrl: ACCOUNT_API,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        fkLabel: getAccountLabel,
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        options: accountOptions,
                        width: '65%',
                    },
                    {
                        key: 'amount',
                        name: 'amount',
                        title: 'Amount',
                        label: 'Amount',
                        type: 'number',
                        required: true,
                        placeholder: 'Amount',
                        min: 0.01,
                        align: 'right',
                        width: '25%',
                    },
                ],
                collapsedFields: [
                    {
                        name: 'description',
                        key: 'description',
                        label: 'Description',
                        type: 'text',
                        placeholder: 'Description',
                        col: 12,
                    },
                    {
                        name: 'exchange_rate_to_default',
                        key: 'exchange_rate_to_default',
                        label: 'Exchange Rate',
                        type: 'number',
                        placeholder: '1',
                        min: 0,
                        col: 6,
                    },
                ],
            },
            {
                name: 'notes',
                label: 'Notes',
                type: 'textarea',
                rows: 3,
                col: 24,
            },
        ],
        [accountOptions, currencyOptions, branchOptions, baseCurrency]
    );

    const crudInitialValues = useMemo(
        () => ({
            branch_id: branches[0]?.id || null,
            transfer_no: '',
            transfer_date: today,
            from_account_id: null,
            reference: '',
            currency_id: baseCurrency?.id || null,
            exchange_rate: 1,
            total_amount: 0,
            total: 0,
            notes: '',
            status: 'draft',
            active: true,
            approved: false,
            void: false,
            items: [
                {
                    id: null,
                    to_account_id: null,
                    description: '',
                    exchange_rate_to_default: 1,
                    amount: null,
                },
            ],
            deleted_item_ids: [],
        }),
        [branches, today, baseCurrency]
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Cash Transfers
                </h2>
            }
        >
            <Head title="Cash Transfers" />

            <div className="rounded-lg bg-white">
                <ReusableCrud
                    title="Cash Transfers"
                    icon={<SwapOutlined />}
                    apiUrl={CASH_TRANSFER_API}
                    columns={columns}
                    fields={fields}
                    validationSchema={validationSchema}
                    crudInitialValues={crudInitialValues}
                    form_ui="modal"
                    modalWidth={1000}
                    showSearch={true}
                    canAdd={true}
                    canEdit={true}
                    canDelete={true}
                    canView={true}
                    hasActions={true}
                    hasActionColumns={true}
                    showRowActionMenu={true}
                    enableServerPagination={true}
                    enableInactiveDrawer={true}
                    searchParam="search"
                    pageParam="page"
                    pageSizeParam="page_size"
                    activeParam="active"
                    sortMode="ordering"
                    orderingParam="ordering"
                    defaultSortField="created_at"
                    defaultSortOrder="descend"
                    searchFields={['transfer_no', 'reference', 'notes']}
                    transformPayload={(values) => {
                        const items = Array.isArray(values.items)
                            ? values.items
                                  .filter((item) => item && !item._destroy)
                                  .map((item) => {
                                      const row = {
                                          to_account_id: normalizeFk(item.to_account_id),
                                          exchange_rate_to_default:
                                              item.exchange_rate_to_default === '' ||
                                              item.exchange_rate_to_default === null ||
                                              item.exchange_rate_to_default === undefined
                                                  ? 1
                                                  : Number(item.exchange_rate_to_default),
                                          description: item.description || null,
                                          amount:
                                              item.amount === '' ||
                                              item.amount === null ||
                                              item.amount === undefined
                                                  ? 0
                                                  : Number(item.amount),
                                      };

                                      if (item.id) {
                                          row.id = item.id;
                                      }

                                      return row;
                                  })
                            : [];

                        const totalAmount = items.reduce(
                            (sum, item) => sum + Number(item.amount || 0),
                            0
                        );

                        return {
                            branch_id: normalizeFk(values.branch_id),
                            transfer_no:
                                values.transfer_no && values.transfer_no !== 'DRAFT'
                                    ? values.transfer_no
                                    : null,
                            transfer_date: values.transfer_date || today,
                            from_account_id: normalizeFk(values.from_account_id),
                            reference: values.reference || null,
                            currency_id: normalizeFk(values.currency_id),
                            exchange_rate:
                                values.exchange_rate === '' ||
                                values.exchange_rate === null ||
                                values.exchange_rate === undefined
                                    ? 1
                                    : Number(values.exchange_rate),
                            total_amount: totalAmount,
                            total: totalAmount,
                            notes: values.notes || null,
                            status: values.status || 'draft',
                            active: values.active ?? true,
                            approved: values.approved ?? false,
                            void: values.void ?? false,
                            items,
                            deleted_item_ids: Array.isArray(values.deleted_item_ids)
                                ? values.deleted_item_ids
                                : [],
                        };
                    }}
                />
            </div>
        </AuthenticatedLayout>
    );
}