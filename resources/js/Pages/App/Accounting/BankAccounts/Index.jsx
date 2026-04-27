import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';

export default function Index({
    bankAccounts = [],
    currencies = [],
    accounts = [],
}) {
    const columns = useMemo(
        () => [
            {
                title: 'Type',
                dataIndex: 'type',
                render: (value) => value === 'cash' ? 'Cash' : 'Bank',
            },
            {
                title: 'Display Name',
                dataIndex: 'display_name',
            },
            {
                title: 'Code',
                dataIndex: 'code',
                render: (value) => value || '-',
            },
            {
                title: 'Currency',
                dataIndex: 'currency',
                render: (_, record) =>
                    record?.currency?.code ||
                    record?.currency?.name ||
                    '-',
            },
            {
                title: 'Bank Name',
                dataIndex: 'bank_name',
                render: (value) => value || '-',
            },
            {
                title: 'Account Number',
                dataIndex: 'account_number',
                render: (value) => value || '-',
            },
            {
                title: 'Linked Account',
                dataIndex: 'account',
                render: (_, record) => record?.account?.name || '-',
            },
        ],
        []
    );

    const fields = useMemo(
        () => [
            {
                name: 'type',
                label: 'Type',
                type: 'radio',
                required: true,
                col: 24,
                options: [
                    {
                        label: 'Bank',
                        value: 'bank',
                    },
                    {
                        label: 'Cash',
                        value: 'cash',
                    },
                ],
            },
            {
                name: 'display_name',
                label: 'Display Name',
                placeholder: 'e.g. Nabil Bank / Petty Cash',
                required: true,
                col: 24,
            },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'select',
                placeholder: 'Select currency',
                required: true,
                col: 24,
                options: currencies.map((currency) => ({
                    label:
                        currency.code && currency.name
                            ? `${currency.code} - ${currency.name}`
                            : currency.code || currency.name,
                    value: currency.id,
                })),
            },

            {
                type: 'group',
                label: 'Bank Details',
                defaultOpen: true,
                accordion: false,
                condition: (values) => values?.type === 'bank',
                children: [
                    {
                        name: 'code',
                        label: 'Code',
                        placeholder: 'Enter code',
                        col: 12,
                    },
                    {
                        name: 'bank_name',
                        label: 'Bank Name',
                        placeholder: 'Enter bank name',
                        col: 12,
                    },
                    {
                        name: 'account_name',
                        label: 'Account Name',
                        placeholder: 'Enter account holder name',
                        col: 12,
                    },
                    {
                        name: 'account_number',
                        label: 'Account Number',
                        placeholder: 'Enter account number',
                        col: 12,
                    },
                    {
                        name: 'account_type',
                        label: 'Account Type',
                        placeholder: 'Saving / Current / Checking',
                        col: 12,
                    },
                    {
                        name: 'swift_code',
                        label: 'Swift Code',
                        placeholder: 'Enter swift code',
                        col: 12,
                    },
                    {
                        name: 'account_id',
                        label: 'Linked Chart Account',
                        type: 'select',
                        placeholder: 'Select account',
                        col: 24,
                        options: accounts.map((account) => ({
                            label: account.code
                                ? `${account.code} - ${account.name}`
                                : account.name,
                            value: account.id,
                        })),
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        type: 'textarea',
                        rows: 3,
                        col: 24,
                    },
                ],
            },
        ],
        [currencies, accounts]
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Bank Accounts
                </h2>
            }
        >
            <Head title="Bank Accounts" />

            <ReusableCrud
                title="Bank Accounts"
                data={bankAccounts}
                columns={columns}
                fields={fields}
                createRoute={route('bank-accounts.store')}
                updateRoute={(record) =>
                    route('bank-accounts.update', record.id)
                }
                deleteRoute={(record) =>
                    route('bank-accounts.destroy', record.id)
                }
                crudInitialValues={{
                    type: 'bank',
                    display_name: '',
                    currency_id: null,
                    code: '',
                    description: '',
                    bank_name: '',
                    account_name: '',
                    account_number: '',
                    account_type: '',
                    swift_code: '',
                    account_id: null,
                }}
                editValues={(record) => ({
                    type: record?.type || 'bank',
                    display_name: record?.display_name || '',
                    currency_id:
                        record?.currency_id ||
                        record?.currency?.id ||
                        null,
                    code: record?.code || '',
                    description: record?.description || '',
                    bank_name: record?.bank_name || '',
                    account_name: record?.account_name || '',
                    account_number: record?.account_number || '',
                    account_type: record?.account_type || '',
                    swift_code: record?.swift_code || '',
                    account_id:
                        record?.account_id ||
                        record?.account?.id ||
                        null,
                })}
            />
        </AuthenticatedLayout>
    );
}