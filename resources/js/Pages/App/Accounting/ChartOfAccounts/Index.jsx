import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';

export default function Index({ branches = [], accounts = [], currencies = [] }) {
    const columns = useMemo(
        () => [
            { title: 'Code', dataIndex: 'code', key: 'code', render: (value) => value || '-',width: 150 },
            { title: 'Account Name', dataIndex: 'name', key: 'name', width: 200 },
            { title: 'Description', dataIndex: 'description', key: 'description', render: (value) => value || '-', width: 300 },
        ],
        []
    );

    const fields = useMemo(
        () => [
            {
                name: 'branch_id',
                label: 'Branch',
                type: 'select',
                placeholder: 'Select branch',
                required: true,
                options: branches.map((branch) => ({ label: branch.name, value: branch.id })),
            },
            {
                name: 'account_id',
                label: 'Account Group',
                type: 'select',
                placeholder: 'Select account group',
                required: true,
                options: accounts.map((account) => ({
                    label: account.code ? `${account.code} - ${account.name}` : account.name,
                    value: account.id,
                })),
            },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'select',
                placeholder: 'Select currency',
                options: currencies.map((currency) => ({
                    label: currency.code ? `${currency.code} - ${currency.name}` : currency.name,
                    value: currency.id,
                })),
            },
            { name: 'code', label: 'Code', type: 'text', placeholder: 'Enter account code', required: true },
            { name: 'name', label: 'Account Name', type: 'text', placeholder: 'Enter account name', required: true },
            { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description', rows: 3 },
        ],
        [branches, accounts, currencies]
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Chart of Accounts
                </h2>
            }
        >
            <Head title="Chart of Accounts" />

            <ReusableCrud
                title="Chart of Accounts"
                apiUrl="/api/chart-of-accounts/"
                columns={columns}
                fields={fields}
                crudInitialValues={{
                    branch_id: branches[0]?.id || null,
                    account_id: null,
                    currency_id: null,
                    code: '',
                    name: '',
                    description: '',
                }}
                searchParam="filter[q]"
                pageSizeParam="per_page"
                sortMode="sort"
            />
        </AuthenticatedLayout>
    );
}
