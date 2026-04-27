import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';
import { SwapOutlined } from '@ant-design/icons';

export default function Index({ branches = [], bankAccounts = [], currencies = [] }) {
    const today = new Date().toISOString().slice(0, 10);

    const formatMoney = (value) =>
        Number(value || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const accountOptions = useMemo(
        () =>
            bankAccounts.map((account) => ({
                label: account.code ? `${account.code} - ${account.display_name}` : account.display_name,
                value: account.id,
            })),
        [bankAccounts]
    );

    const currencyOptions = useMemo(
        () =>
            currencies.map((currency) => ({
                label: currency.code ? `${currency.code} - ${currency.name}` : currency.name,
                value: currency.id,
            })),
        [currencies]
    );

    const columns = useMemo(
        () => [
            { title: '#Transfer', dataIndex: 'transfer_no', render: (value) => value || 'DRAFT' },
            { title: 'Date', dataIndex: 'transfer_date' },
            { title: 'From Account', dataIndex: 'from_bank_account_id' },
            {
                title: 'Total',
                dataIndex: 'total_amount',
                align: 'right',
                render: (_, record) => formatMoney(record?.total_amount),
            },
            { title: 'Status', dataIndex: 'status', render: (value) => value || 'draft' },
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
                col: 8,
                options: branches.map((branch) => ({ label: branch.name, value: branch.id })),
            },
            {
                name: 'from_bank_account_id',
                label: 'Transfer From Account',
                type: 'select',
                required: true,
                placeholder: 'Select Account',
                col: 8,
                options: accountOptions,
            },
            { name: 'transfer_date', label: 'Date', type: 'date', required: true, col: 8 },
            { name: 'transfer_no', label: '#Transfer', placeholder: 'DRAFT', col: 8 },
            { name: 'reference', label: 'Reference', placeholder: 'Reference', col: 8 },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'select',
                required: true,
                placeholder: 'Select Currency',
                col: 8,
                options: currencyOptions,
            },
            { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', required: true, placeholder: '1', col: 8 },
            {
                name: 'items',
                label: 'Transferred To',
                type: 'objectArray',
                col: 24,
                required: true,
                minRows: 1,
                columns: [
                    { title: 'Transferred To', dataIndex: 'to_bank_account_id', width: '70%' },
                    { title: 'Amount', dataIndex: 'amount', width: '30%', align: 'right' },
                ],
                fields: [
                    {
                        name: 'to_bank_account_id',
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
                defaultRow: { to_bank_account_id: null, amount: 0 },
            },
            { name: 'notes', label: 'Note', type: 'textarea', rows: 4, col: 24 },
        ],
        [branches, accountOptions, currencyOptions]
    );

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Cash Transfers</h2>}
        >
            <Head title="Cash Transfers" />

            <ReusableCrud
                title="Cash Transfers"
                icon={<SwapOutlined />}
                apiUrl="/api/cash-transfers/"
                columns={columns}
                fields={fields}
                crudInitialValues={{
                    branch_id: branches[0]?.id || null,
                    from_bank_account_id: null,
                    transfer_date: today,
                    transfer_no: '',
                    reference: '',
                    currency_id: null,
                    exchange_rate: 1,
                    items: [{ to_bank_account_id: null, amount: 0 }],
                    notes: '',
                    status: 'draft',
                }}
                searchParam="filter[q]"
                pageSizeParam="per_page"
                sortMode="sort"
                searchFields={['transfer_no', 'reference', 'notes']}
                form_ui="modal"
                modalWidth={900}
            />
        </AuthenticatedLayout>
    );
}
