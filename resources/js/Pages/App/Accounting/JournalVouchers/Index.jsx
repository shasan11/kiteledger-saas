import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { FileTextOutlined } from '@ant-design/icons';
import ReusableCrud from '@/Components/ResuableCrud';

export default function Index({ branches = [], accounts = [], currencies = [] }) {
    const today = new Date().toISOString().slice(0, 10);

    const formatMoney = (value) =>
        Number(value || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const accountOptions = useMemo(
        () =>
            accounts.map((account) => ({
                label: account.code ? `${account.code} - ${account.name}` : account.name,
                value: account.id,
            })),
        [accounts]
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
            { title: '#JV', dataIndex: 'voucher_no', render: (value) => value || 'DRAFT' },
            { title: 'Date', dataIndex: 'voucher_date' },
            { title: 'Reference', dataIndex: 'reference', render: (value) => value || '-' },
            {
                title: 'DR Total',
                dataIndex: 'items',
                align: 'right',
                render: (_, record) => formatMoney((record?.items || []).reduce((sum, item) => sum + Number(item?.debit || 0), 0)),
            },
            {
                title: 'CR Total',
                dataIndex: 'items_credit',
                align: 'right',
                render: (_, record) => formatMoney((record?.items || []).reduce((sum, item) => sum + Number(item?.credit || 0), 0)),
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
            { name: 'voucher_no', label: '#JV', placeholder: 'Voucher No', required: true, col: 8 },
            { name: 'voucher_date', label: 'Date', type: 'date', required: true, col: 8 },
            { name: 'reference', label: 'Reference', placeholder: 'Reference', col: 8 },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'select',
                placeholder: 'Select Currency',
                col: 8,
                options: currencyOptions,
            },
            { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', placeholder: '1', col: 8 },
            {
                name: 'items',
                label: 'Accounts',
                type: 'objectArray',
                col: 24,
                required: true,
                minRows: 1,
                columns: [
                    { title: 'Accounts', dataIndex: 'chart_of_account_id', width: '50%' },
                    { title: 'DR Amount', dataIndex: 'debit', width: '25%', align: 'right' },
                    { title: 'CR Amount', dataIndex: 'credit', width: '25%', align: 'right' },
                ],
                fields: [
                    {
                        name: 'chart_of_account_id',
                        label: 'Account',
                        type: 'select',
                        required: true,
                        placeholder: 'Select Account',
                        col: 12,
                        options: accountOptions,
                    },
                    { name: 'debit', label: 'DR Amount', type: 'number', placeholder: '0.00', min: 0, col: 6 },
                    { name: 'credit', label: 'CR Amount', type: 'number', placeholder: '0.00', min: 0, col: 6 },
                ],
                defaultRow: { chart_of_account_id: null, debit: 0, credit: 0 },
            },
            { name: 'narration', label: 'Narration', type: 'textarea', rows: 4, col: 24 },
        ],
        [branches, accountOptions, currencyOptions]
    );

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Journal Vouchers</h2>}
        >
            <Head title="Journal Vouchers" />

            <ReusableCrud
                title="Journal Vouchers"
                icon={<FileTextOutlined />}
                apiUrl="/api/journal-vouchers/"
                columns={columns}
                fields={fields}
                crudInitialValues={{
                    branch_id: branches[0]?.id || null,
                    voucher_no: '',
                    voucher_date: today,
                    reference: '',
                    currency_id: null,
                    exchange_rate: 1,
                    items: [{ chart_of_account_id: null, debit: 0, credit: 0 }],
                    narration: '',
                    status: 'draft',
                }}
                searchParam="filter[q]"
                pageSizeParam="per_page"
                sortMode="sort"
                searchFields={['voucher_no', 'reference', 'narration']}
                form_ui="modal"
                modalWidth={950}
            />
        </AuthenticatedLayout>
    );
}
