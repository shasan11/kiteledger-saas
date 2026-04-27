import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';

export default function Index({ branches = [], currencies = [], accounts = [] }) {
    const columns = useMemo(
        () => [
            {
                title: 'Type',
                dataIndex: 'type',
                render: (value) => (value === 'cash' ? 'Cash' : 'Bank'),
            },
            { title: 'Display Name', dataIndex: 'display_name' },
            { title: 'Code', dataIndex: 'code', render: (value) => value || '-' },
            { title: 'Bank Name', dataIndex: 'bank_name', render: (value) => value || '-' },
            { title: 'Account Number', dataIndex: 'account_number', render: (value) => value || '-' },
        ],
        []
    );

    const fields = useMemo(
        () => [
            {
                name: 'branch_id',
                label: 'Branch',
                type: 'select',
                required: true,
                options: branches.map((branch) => ({ label: branch.name, value: branch.id })),
            },
            {
                name: 'type',
                label: 'Type',
                type: 'radio',
                required: true,
                col: 24,
                options: [
                    { label: 'Bank', value: 'bank' },
                    { label: 'Cash', value: 'cash' },
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
                required: true,
                col: 24,
                options: currencies.map((currency) => ({
                    label: currency.code ? `${currency.code} - ${currency.name}` : currency.name,
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
                    { name: 'code', label: 'Code', placeholder: 'Enter code', col: 12, required: true },
                    { name: 'bank_name', label: 'Bank Name', placeholder: 'Enter bank name', col: 12 },
                    { name: 'account_name', label: 'Account Name', placeholder: 'Enter account holder name', col: 12 },
                    { name: 'account_number', label: 'Account Number', placeholder: 'Enter account number', col: 12 },
                    { name: 'account_type', label: 'Account Type', placeholder: 'Saving / Current / Checking', col: 12 },
                    { name: 'swift_code', label: 'Swift Code', placeholder: 'Enter swift code', col: 12 },
                    {
                        name: 'account_id',
                        label: 'Linked Account',
                        type: 'select',
                        col: 24,
                        options: accounts.map((account) => ({
                            label: account.code ? `${account.code} - ${account.name}` : account.name,
                            value: account.id,
                        })),
                    },
                    { name: 'description', label: 'Description', type: 'textarea', rows: 3, col: 24 },
                ],
            },
        ],
        [branches, currencies, accounts]
    );

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Bank Accounts</h2>}
        >
            <Head title="Bank Accounts" />
            <ReusableCrud
                title="Bank Accounts"
                apiUrl="/api/bank-accounts/"
                columns={columns}
                fields={fields}
                crudInitialValues={{
                    branch_id: branches[0]?.id || null,
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
                searchParam="filter[q]"
                pageSizeParam="per_page"
                sortMode="sort"
            />
        </AuthenticatedLayout>
    );
}
