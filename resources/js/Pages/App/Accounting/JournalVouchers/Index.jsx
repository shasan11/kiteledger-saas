import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { FileTextOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ResuableCrud';

const JOURNAL_VOUCHER_API = '/api/journal-vouchers';
const CHART_OF_ACCOUNT_API = '/api/chart-of-accounts';
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

function getChartAccountLabel(account) {
    if (!account) return '-';

    if (account.code && account.name) {
        return `${account.code} - ${account.name}`;
    }

    return (
        account.name ||
        account.display_name ||
        account.account_name ||
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

function getLineDebitTotal(items = []) {
    return items.reduce((sum, item) => sum + Number(item?.debit || 0), 0);
}

function getLineCreditTotal(items = []) {
    return items.reduce((sum, item) => sum + Number(item?.credit || 0), 0);
}

export default function Index({
    branches = [],
    chartOfAccounts = [],
    accounts = [],
    currencies = [],
}) {
    const today = new Date().toISOString().slice(0, 10);

    const finalChartAccounts = useMemo(() => {
        if (Array.isArray(chartOfAccounts) && chartOfAccounts.length) {
            return chartOfAccounts;
        }

        return Array.isArray(accounts) ? accounts : [];
    }, [chartOfAccounts, accounts]);

    const branchOptions = useMemo(
        () =>
            branches
                .filter((branch) => branch?.id)
                .map((branch) => ({
                    label: branch.code ? `${branch.code} - ${branch.name}` : branch.name,
                    value: branch.id,
                })),
        [branches]
    );

    const chartAccountOptions = useMemo(
        () =>
            finalChartAccounts
                .filter((account) => account?.id)
                .map((account) => ({
                    label: getChartAccountLabel(account),
                    value: account.id,
                })),
        [finalChartAccounts]
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

        voucher_no: Yup.string()
            .required('Voucher number is required')
            .max(40, 'Voucher number cannot exceed 40 characters'),

        voucher_date: Yup.string()
            .required('Voucher date is required'),

        currency_id: Yup.mixed().nullable(),

        exchange_rate: Yup.number()
            .nullable()
            .typeError('Exchange rate must be a number')
            .min(0, 'Exchange rate cannot be negative'),

        reference: Yup.string()
            .nullable()
            .max(120, 'Reference cannot exceed 120 characters'),

        narration: Yup.string().nullable(),

        status: Yup.string()
            .oneOf(['draft', 'posted', 'cancelled'])
            .nullable(),

        items: Yup.array()
            .of(
                Yup.object().shape({
                    id: Yup.mixed().nullable(),

                    chart_of_account_id: Yup.mixed()
                        .required('Account is required'),

                    description: Yup.string()
                        .nullable()
                        .max(200, 'Description cannot exceed 200 characters'),

                    debit: Yup.number()
                        .nullable()
                        .typeError('Debit must be a number')
                        .min(0, 'Debit cannot be negative'),

                    credit: Yup.number()
                        .nullable()
                        .typeError('Credit must be a number')
                        .min(0, 'Credit cannot be negative'),
                }).test(
                    'debit-or-credit',
                    'Each line must have either debit or credit, not both.',
                    function (row) {
                        const debit = Number(row?.debit || 0);
                        const credit = Number(row?.credit || 0);

                        if (debit > 0 && credit > 0) return false;
                        if (debit <= 0 && credit <= 0) return false;

                        return true;
                    }
                )
            )
            .min(2, 'At least two journal lines are required')
            .required('Journal lines are required')
            .test(
                'balanced-voucher',
                'Debit total and credit total must be equal.',
                function (items) {
                    const debit = getLineDebitTotal(items || []);
                    const credit = getLineCreditTotal(items || []);

                    return debit > 0 && credit > 0 && debit.toFixed(2) === credit.toFixed(2);
                }
            ),
    });

    const columns = useMemo(
        () => [
            {
                title: '#JV',
                dataIndex: 'voucher_no',
                key: 'voucher_no',
                backendSort: true,
                render: (value) => value || 'DRAFT',
            },
            {
                title: 'Date',
                dataIndex: 'voucher_date',
                key: 'voucher_date',
                width: 130,
                backendSort: true,
                render: (value) => value || '-',
            },
            {
                title: 'Reference',
                dataIndex: 'reference',
                key: 'reference',
                render: (value) => value || '-',
            },
            {
                title: 'DR Total',
                dataIndex: 'items',
                key: 'debit_total',
                align: 'right',
                width: 140,
                render: (_, record) => formatMoney(getLineDebitTotal(record?.items || [])),
            },
            {
                title: 'CR Total',
                dataIndex: 'items_credit',
                key: 'credit_total',
                align: 'right',
                width: 140,
                render: (_, record) => formatMoney(getLineCreditTotal(record?.items || [])),
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
                name: 'voucher_no',
                label: '#JV',
                type: 'text',
                placeholder: 'Voucher No',
                required: true,
                col: 8,
            },
            {
                name: 'voucher_date',
                label: 'Date',
                type: 'date',
                required: true,
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
                placeholder: 'Select Currency',
                fkUrl: CURRENCY_API,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                fkLabel: getCurrencyLabel,
                fkSearchParam: 'search',
                fkPageSize: 20,
                options: currencyOptions,
                allowClear: true,
                col: 8,
            },
            {
                name: 'exchange_rate',
                label: `Exchange Rate To ${baseCurrency?.code || 'Default'}`,
                type: 'number',
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
                label: 'Accounts',
                type: 'objectArray',
                col: 24,
                required: true,
                minRows: 2,
                addButtonLabel: 'Add Row',
                defaultItem: {
                    id: null,
                    chart_of_account_id: null,
                    description: '',
                    debit: 0,
                    credit: 0,
                },
                columns: [
                    {
                        key: 'chart_of_account_id',
                        name: 'chart_of_account_id',
                        title: 'Account',
                        label: 'Account',
                        type: 'fkSelect',
                        required: true,
                        placeholder: 'Select Account',
                        fkUrl: CHART_OF_ACCOUNT_API,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        fkLabel: getChartAccountLabel,
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        options: chartAccountOptions,
                        width: '46%',
                    },
                    {
                        key: 'debit',
                        name: 'debit',
                        title: 'DR Amount',
                        label: 'DR Amount',
                        type: 'number',
                        placeholder: '0.00',
                        min: 0,
                        align: 'right',
                        width: '22%',
                    },
                    {
                        key: 'credit',
                        name: 'credit',
                        title: 'CR Amount',
                        label: 'CR Amount',
                        type: 'number',
                        placeholder: '0.00',
                        min: 0,
                        align: 'right',
                        width: '22%',
                    },
                ],
                collapsedFields: [
                    {
                        name: 'description',
                        key: 'description',
                        label: 'Description',
                        type: 'text',
                        placeholder: 'Description',
                        col: 24,
                    },
                ],
            },
            {
                name: 'narration',
                label: 'Narration',
                type: 'textarea',
                rows: 3,
                col: 24,
            },
        ],
        [branchOptions, chartAccountOptions, currencyOptions, baseCurrency]
    );

    const crudInitialValues = useMemo(
        () => ({
            branch_id: branches[0]?.id || null,
            voucher_no: '',
            voucher_date: today,
            reference: '',
            currency_id: baseCurrency?.id || null,
            exchange_rate: 1,
            narration: '',
            status: 'draft',
            active: true,
            approved: false,
            void: false,
            total: 0,
            items: [
                {
                    id: null,
                    chart_of_account_id: null,
                    description: '',
                    debit: 0,
                    credit: 0,
                },
                {
                    id: null,
                    chart_of_account_id: null,
                    description: '',
                    debit: 0,
                    credit: 0,
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
                    Journal Vouchers
                </h2>
            }
        >
            <Head title="Journal Vouchers" />

            <div className="rounded-lg bg-white">
                <ReusableCrud
                    title="Journal Vouchers"
                    icon={<FileTextOutlined />}
                    apiUrl={JOURNAL_VOUCHER_API}
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
                    searchFields={['voucher_no', 'reference', 'narration']}
                    transformPayload={(values) => {
                        const items = Array.isArray(values.items)
                            ? values.items
                                  .filter((item) => item && !item._destroy)
                                  .map((item) => {
                                      const debit = Number(item.debit || 0);
                                      const credit = Number(item.credit || 0);

                                      const row = {
                                          chart_of_account_id: normalizeFk(item.chart_of_account_id),
                                          description: item.description || null,
                                          debit,
                                          credit,
                                      };

                                      if (item.id) {
                                          row.id = item.id;
                                      }

                                      return row;
                                  })
                            : [];

                        const debitTotal = getLineDebitTotal(items);
                        const creditTotal = getLineCreditTotal(items);

                        return {
                            branch_id: normalizeFk(values.branch_id),
                            voucher_no: values.voucher_no || null,
                            voucher_date: values.voucher_date || today,
                            currency_id: normalizeFk(values.currency_id),
                            exchange_rate:
                                values.exchange_rate === '' ||
                                values.exchange_rate === null ||
                                values.exchange_rate === undefined
                                    ? 1
                                    : Number(values.exchange_rate),
                            reference: values.reference || null,
                            narration: values.narration || null,
                            status: values.status || 'draft',
                            active: values.active ?? true,
                            approved: values.approved ?? false,
                            void: values.void ?? false,
                            total: debitTotal,
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