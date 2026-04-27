import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import ReusableCrud from '@/Components/ResuableCrud';

export default function Index({
    journalVouchers = [],
    accounts = [],
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
            accounts.map((account) => ({
                label: account.code
                    ? `${account.code} - ${account.name}`
                    : account.name,
                value: account.id,
            })),
        [accounts]
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
                title: '#JV',
                dataIndex: 'jv_number',
                key: 'jv_number',
                render: (_, record) =>
                    record?.jv_number ||
                    record?.voucher_number ||
                    record?.number ||
                    'DRAFT',
            },
            {
                title: 'Date',
                dataIndex: 'date',
                key: 'date',
            },
            {
                title: 'Reference',
                dataIndex: 'reference',
                key: 'reference',
                render: (value) => value || '-',
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
                title: 'DR Total',
                dataIndex: 'total_debit',
                key: 'total_debit',
                align: 'right',
                render: (_, record) =>
                    formatMoney(
                        record?.total_debit ||
                            record?.dr_total ||
                            record?.items?.reduce(
                                (sum, item) =>
                                    sum + Number(item?.dr_amount || 0),
                                0
                            )
                    ),
            },
            {
                title: 'CR Total',
                dataIndex: 'total_credit',
                key: 'total_credit',
                align: 'right',
                render: (_, record) =>
                    formatMoney(
                        record?.total_credit ||
                            record?.cr_total ||
                            record?.items?.reduce(
                                (sum, item) =>
                                    sum + Number(item?.cr_amount || 0),
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
                name: 'jv_number',
                label: '#JV',
                placeholder: '#JV',
                readOnly: true,
                col: 8,
            },
            {
                name: 'date',
                label: 'Date',
                type: 'date',
                required: true,
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
                label: 'Accounts',
                type: 'objectArray',
                col: 24,
                required: true,
                minRows: 1,
                addButtonText: 'Add Account Row',

                tableHeaderStyle: {
                    background: '#374151',
                    color: '#ffffff',
                },

                columns: [
                    {
                        title: 'Accounts',
                        dataIndex: 'account_id',
                        width: '50%',
                    },
                    {
                        title: 'DR Amount',
                        dataIndex: 'dr_amount',
                        width: '25%',
                        align: 'right',
                    },
                    {
                        title: 'CR Amount',
                        dataIndex: 'cr_amount',
                        width: '25%',
                        align: 'right',
                    },
                ],

                fields: [
                    {
                        name: 'account_id',
                        label: 'Account',
                        type: 'select',
                        required: true,
                        placeholder: 'Select Account',
                        col: 12,
                        options: accountOptions,
                    },
                    {
                        name: 'dr_amount',
                        label: 'DR Amount',
                        type: 'number',
                        placeholder: '0.00',
                        min: 0,
                        col: 6,
                    },
                    {
                        name: 'cr_amount',
                        label: 'CR Amount',
                        type: 'number',
                        placeholder: '0.00',
                        min: 0,
                        col: 6,
                    },
                ],

                defaultRow: {
                    account_id: null,
                    dr_amount: 0,
                    cr_amount: 0,
                },

                summary: (rows = []) => {
                    const totalDebit = rows.reduce(
                        (sum, row) => sum + Number(row?.dr_amount || 0),
                        0
                    );

                    const totalCredit = rows.reduce(
                        (sum, row) => sum + Number(row?.cr_amount || 0),
                        0
                    );

                    const difference = totalDebit - totalCredit;

                    return {
                        label: 'Total',
                        values: {
                            dr_amount: formatMoney(totalDebit),
                            cr_amount: formatMoney(totalCredit),
                            difference: `Rs. ${formatMoney(Math.abs(difference))}`,
                        },
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
                key: 'draft',
                label: 'Draft',
                title: 'Draft Journal Vouchers',
                params: {
                    approved: false,
                },
            },
            {
                key: 'approved',
                label: 'Approved',
                title: 'Approved Journal Vouchers',
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
                    Journal Vouchers
                </h2>
            }
        >
            <Head title="Journal Vouchers" />

            <ReusableCrud
                title="Journal Vouchers"
                icon={<FileTextOutlined />}
                data={journalVouchers}
                columns={columns}
                fields={fields}
                createRoute={route('journal-vouchers.store')}
                updateRoute={(record) =>
                    route('journal-vouchers.update', record.id)
                }
                deleteRoute={(record) =>
                    route('journal-vouchers.destroy', record.id)
                }
                initialValues={{
                    jv_number: '#JV',
                    date: today,
                    reference: '',
                    currency_id: null,
                    exchange_rate: 1,
                    items: [
                        {
                            account_id: null,
                            dr_amount: 0,
                            cr_amount: 0,
                        },
                    ],
                    note: '',
                    approved: false,
                }}
                editValues={(record) => ({
                    jv_number:
                        record?.jv_number ||
                        record?.voucher_number ||
                        record?.number ||
                        '#JV',

                    date: record?.date || today,

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
                                  account_id:
                                      item?.account_id ||
                                      item?.account?.id ||
                                      item?.account_detail?.id ||
                                      null,
                                  dr_amount:
                                      item?.dr_amount ||
                                      item?.debit ||
                                      item?.debit_amount ||
                                      0,
                                  cr_amount:
                                      item?.cr_amount ||
                                      item?.credit ||
                                      item?.credit_amount ||
                                      0,
                              }))
                            : [
                                  {
                                      account_id: null,
                                      dr_amount: 0,
                                      cr_amount: 0,
                                  },
                              ],

                    note: record?.note || '',
                    approved: Boolean(record?.approved),
                })}
                anchorFilters={anchorFilters}
                defaultAnchorKey="draft"
                anchorSyncWithHash={true}
                anchorParamResolver={(key) => {
                    if (key === 'approved') {
                        return {
                            approved: true,
                        };
                    }

                    return {
                        approved: false,
                    };
                }}
                searchFields={[
                    'jv_number',
                    'voucher_number',
                    'number',
                    'reference',
                    'note',
                ]}
                form_ui="modal"
                modalWidth={950}
                showRowActionMenu
                canView
                canAdd
                canEdit
                canDelete
            />
        </AuthenticatedLayout>
    );
}