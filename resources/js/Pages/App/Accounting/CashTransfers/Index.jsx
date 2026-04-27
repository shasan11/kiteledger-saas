import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';

export default function Index({
    cashTransfers = [],
    bankAccounts = [],
    currencies = [],
}) {
    const today = new Date().toISOString().slice(0, 10);

    const formatMoney = (value) => {
        const num = Number(value || 0);

        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const renderStatus = (approved) => {
        if (approved) {
            return (
                <Tag icon={<CheckCircleOutlined />} color="success">
                    Approved
                </Tag>
            );
        }

        return (
            <Tag icon={<ClockCircleOutlined />} color="warning">
                Draft
            </Tag>
        );
    };

    const accountOptions = useMemo(
        () =>
            bankAccounts.map((account) => ({
                label:
                    account.code && account.display_name
                        ? `${account.code} - ${account.display_name}`
                        : account.display_name || account.name || account.code,
                value: account.id,
            })),
        [bankAccounts]
    );

    const currencyOptions = useMemo(
        () =>
            currencies.map((currency) => ({
                label:
                    currency.name && currency.code
                        ? `${currency.name} (${currency.code})`
                        : currency.name || currency.code,
                value: currency.id,
            })),
        [currencies]
    );

    const columns = useMemo(
        () => [
            {
                title: '#Transfer',
                dataIndex: 'transfer_number',
                key: 'transfer_number',
                render: (value) => value || 'DRAFT',
            },
            {
                title: 'Date',
                dataIndex: 'date',
                key: 'date',
            },
            {
                title: 'Transfer From',
                dataIndex: 'from_account',
                key: 'from_account',
                render: (_, record) =>
                    record?.from_account?.display_name ||
                    record?.from_account_detail?.display_name ||
                    '-',
            },
            {
                title: 'Currency',
                dataIndex: 'currency',
                key: 'currency',
                render: (_, record) =>
                    record?.currency?.name ||
                    record?.currency_detail?.name ||
                    record?.currency?.code ||
                    record?.currency_detail?.code ||
                    '-',
            },
            {
                title: 'Exchange Rate',
                dataIndex: 'exchange_rate',
                key: 'exchange_rate',
                render: (value) => value || '1',
            },
            {
                title: 'Total',
                dataIndex: 'total_amount',
                key: 'total_amount',
                align: 'right',
                render: (_, record) =>
                    formatMoney(
                        record?.total_amount ||
                            record?.amount ||
                            record?.items?.reduce(
                                (sum, item) => sum + Number(item?.amount || 0),
                                0
                            )
                    ),
            },
            {
                title: 'Status',
                dataIndex: 'approved',
                key: 'approved',
                render: renderStatus,
            },
        ],
        []
    );

    const fields = useMemo(
        () => [
            {
                name: 'from_account_id',
                label: 'Transfer From Account',
                type: 'select',
                required: true,
                placeholder: 'Select Account',
                col: 16,
                options: accountOptions,
            },
            {
                name: 'date',
                label: 'Date',
                type: 'date',
                required: true,
                col: 8,
            },
            {
                name: 'transfer_number',
                label: '#Transfer',
                placeholder: 'DRAFT',
                readOnly: true,
                col: 8,
            },
            {
                name: 'reference',
                label: 'Reference',
                placeholder: 'Reference',
                col: 8,
            },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'select',
                required: true,
                placeholder: 'Select Currency',
                col: 8,
                options: currencyOptions,
            },
            {
                name: 'exchange_rate',
                label: 'Exchange Rate To NPR',
                type: 'number',
                required: true,
                placeholder: '1',
                col: 8,
            },
            {
                name: 'items',
                label: 'Transferred To',
                type: 'objectArray',
                col: 24,
                required: true,
                minRows: 1,
                addButtonText: 'Add Transfer Row',

                tableHeaderStyle: {
                    background: '#374151',
                    color: '#ffffff',
                },

                columns: [
                    {
                        title: 'Transferred To',
                        dataIndex: 'to_account_id',
                        width: '70%',
                    },
                    {
                        title: 'Amount',
                        dataIndex: 'amount',
                        width: '30%',
                        align: 'right',
                    },
                ],

                fields: [
                    {
                        name: 'to_account_id',
                        label: 'Transferred To',
                        type: 'select',
                        required: true,
                        placeholder: 'Select Account',
                        col: 16,
                        options: accountOptions,
                    },
                    {
                        name: 'amount',
                        label: 'Amount',
                        type: 'number',
                        required: true,
                        placeholder: '0',
                        min: 0,
                        col: 8,
                    },
                ],

                defaultRow: {
                    to_account_id: null,
                    amount: 0,
                },

                summary: (rows = []) => {
                    const total = rows.reduce(
                        (sum, row) => sum + Number(row?.amount || 0),
                        0
                    );

                    return {
                        label: 'Total',
                        value: formatMoney(total),
                    };
                },
            },
            {
                name: 'note',
                label: 'Note',
                type: 'textarea',
                rows: 4,
                col: 24,
            },
        ],
        [accountOptions, currencyOptions]
    );

    const anchorFilters = useMemo(
        () => [
            {
                key: 'all',
                label: 'All',
                title: 'Cash Transfers',
            },
            {
                key: 'draft',
                label: 'Draft',
                title: 'Draft Cash Transfers',
                params: {
                    approved: false,
                },
            },
            {
                key: 'approved',
                label: 'Approved',
                title: 'Approved Cash Transfers',
                params: {
                    approved: true,
                },
            },
        ],
        []
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

            <ReusableCrud
                title="Cash Transfers"
                icon={<SwapOutlined />}
                data={cashTransfers}
                columns={columns}
                fields={fields}
                createRoute={route('cash-transfers.store')}
                updateRoute={(record) =>
                    route('cash-transfers.update', record.id)
                }
                deleteRoute={(record) =>
                    route('cash-transfers.destroy', record.id)
                }
                initialValues={{
                    from_account_id: null,
                    date: today,
                    transfer_number: 'DRAFT',
                    reference: '',
                    currency_id: null,
                    exchange_rate: 1,
                    items: [
                        {
                            to_account_id: null,
                            amount: 0,
                        },
                    ],
                    note: '',
                    approved: false,
                }}
                editValues={(record) => ({
                    from_account_id:
                        record?.from_account_id ||
                        record?.from_account?.id ||
                        record?.from_account_detail?.id ||
                        null,

                    date: record?.date || today,

                    transfer_number:
                        record?.transfer_number ||
                        record?.number ||
                        'DRAFT',

                    reference: record?.reference || '',

                    currency_id:
                        record?.currency_id ||
                        record?.currency?.id ||
                        record?.currency_detail?.id ||
                        null,

                    exchange_rate: record?.exchange_rate || 1,

                    items:
                        record?.items?.length > 0
                            ? record.items.map((item) => ({
                                  id: item?.id,
                                  to_account_id:
                                      item?.to_account_id ||
                                      item?.to_account?.id ||
                                      item?.to_account_detail?.id ||
                                      null,
                                  amount: item?.amount || 0,
                              }))
                            : [
                                  {
                                      to_account_id: null,
                                      amount: 0,
                                  },
                              ],

                    note: record?.note || '',
                    approved: Boolean(record?.approved),
                })}
                anchorFilters={anchorFilters}
                defaultAnchorKey="all"
                anchorSyncWithHash={true}
                anchorParamResolver={(key) => {
                    if (key === 'approved') {
                        return {
                            approved: true,
                        };
                    }

                    if (key === 'draft') {
                        return {
                            approved: false,
                        };
                    }

                    return {};
                }}
                searchFields={[
                    'transfer_number',
                    'reference',
                    'note',
                    'from_account.display_name',
                ]}
                form_ui="modal"
                modalWidth={900}
                showRowActionMenu
                canView
                canAdd
                canEdit
                canDelete
            />
        </AuthenticatedLayout>
    );
}