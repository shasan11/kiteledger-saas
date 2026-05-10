import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ReusableCrud';
import {
    BankOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';

export default function Index({
    loanAccounts = [],
    bankAccounts = [],
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

    const bankAccountOptions = useMemo(
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

    const columns = useMemo(
        () => [
            {
                title: 'Account Name',
                dataIndex: 'account_name',
                key: 'account_name',
                render: (value) => value || '-',
            },
            {
                title: 'Lender Bank',
                dataIndex: 'lender_bank',
                key: 'lender_bank',
                render: (value) => value || '-',
            },
            {
                title: 'Account Number',
                dataIndex: 'account_number',
                key: 'account_number',
                render: (value) => value || '-',
            },
            {
                title: 'Current Balance',
                dataIndex: 'current_balance',
                key: 'current_balance',
                align: 'right',
                render: (value) => formatMoney(value),
            },
            {
                title: 'Balance As Of',
                dataIndex: 'balance_as_of',
                key: 'balance_as_of',
                render: (value) => value || '-',
            },
            {
                title: 'Loan Received In',
                dataIndex: 'loan_received_in',
                key: 'loan_received_in',
                render: (_, record) =>
                    record?.loan_received_in?.display_name ||
                    record?.loan_received_in_detail?.display_name ||
                    '-',
            },
            {
                title: 'Interest Rate',
                dataIndex: 'interest_rate',
                key: 'interest_rate',
                render: (value) => value ? `${value}%` : '-',
            },
            {
                title: 'Term',
                dataIndex: 'term_duration_months',
                key: 'term_duration_months',
                render: (value) => value ? `${value} months` : '-',
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
                name: 'account_name',
                label: 'Account Name',
                placeholder: 'Account Name',
                required: true,
                col: 12,
            },
            {
                name: 'lender_bank',
                label: 'Lender Bank',
                placeholder: 'Lender Bank',
                col: 12,
            },
            {
                name: 'account_number',
                label: 'Account Number',
                placeholder: 'Account Number',
                col: 12,
            },
            {
                name: 'description',
                label: 'Description',
                placeholder: 'Description',
                col: 12,
            },
            {
                name: 'current_balance',
                label: 'Current Balance',
                type: 'number',
                placeholder: 'Current Balance',
                required: true,
                col: 12,
            },
            {
                name: 'balance_as_of',
                label: 'Balance as of',
                type: 'date',
                required: true,
                col: 12,
            },
            {
                name: 'loan_received_in_id',
                label: 'Loan Received In',
                type: 'select',
                placeholder: 'Select Account',
                required: true,
                col: 12,
                options: bankAccountOptions,
            },
            {
                name: 'interest_rate',
                label: 'Interest Rate',
                type: 'number',
                placeholder: 'Interest Rate',
                addonAfter: '% per annum',
                col: 12,
            },
            {
                name: 'term_duration_months',
                label: 'Term Duration',
                type: 'number',
                placeholder: 'Term Duration(in Months)',
                col: 12,
            },
            {
                name: 'processing_fee',
                label: 'Processing Fee',
                type: 'number',
                placeholder: 'Processing Fee',
                col: 12,
            },
            {
                name: 'processing_fee_paid_from_id',
                label: 'Processing Fee Paid from',
                type: 'select',
                placeholder: 'Select Account',
                col: 12,
                options: bankAccountOptions,
            },
        ],
        [bankAccountOptions]
    );

    const anchorFilters = useMemo(
        () => [
            {
                key: 'draft',
                label: 'Draft',
                title: 'Draft Loan Accounts',
                params: {
                    approved: false,
                },
            },
            {
                key: 'approved',
                label: 'Approved',
                title: 'Approved Loan Accounts',
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
                    Loan Accounts
                </h2>
            }
        >
            <Head title="Loan Accounts" />

            <ReusableCrud
                title="Loan Accounts"
                icon={<BankOutlined />}
                data={loanAccounts}
                columns={columns}
                fields={fields}
                // createRoute={route('loan-accounts.store')}
                // updateRoute={(record) =>
                //     route('loan-accounts.update', record.id)
                // }
                // deleteRoute={(record) =>
                //     route('loan-accounts.destroy', record.id)
                // }
                crudInitialValues={{
                    account_name: '',
                    lender_bank: '',
                    account_number: '',
                    description: '',
                    current_balance: 0,
                    balance_as_of: today,
                    loan_received_in_id: null,
                    interest_rate: '',
                    term_duration_months: '',
                    processing_fee: '',
                    processing_fee_paid_from_id: null,
                    approved: false,
                }}
                editValues={(record) => ({
                    account_name: record?.account_name || '',
                    lender_bank: record?.lender_bank || '',
                    account_number: record?.account_number || '',
                    description: record?.description || '',
                    current_balance: record?.current_balance || 0,
                    balance_as_of: record?.balance_as_of || today,

                    loan_received_in_id:
                        record?.loan_received_in_id ||
                        record?.loan_received_in?.id ||
                        record?.loan_received_in_detail?.id ||
                        null,

                    interest_rate: record?.interest_rate || '',
                    term_duration_months:
                        record?.term_duration_months || '',

                    processing_fee: record?.processing_fee || '',

                    processing_fee_paid_from_id:
                        record?.processing_fee_paid_from_id ||
                        record?.processing_fee_paid_from?.id ||
                        record?.processing_fee_paid_from_detail?.id ||
                        null,

                    approved: Boolean(record?.approved),
                })}
                
                 
                searchFields={[
                    'account_name',
                    'lender_bank',
                    'account_number',
                    'description',
                ]}
                form_ui="modal"
                modalWidth={760}
                showRowActionMenu
                canView
                canAdd
                canEdit
                canDelete
            />
        </AuthenticatedLayout>
    );
}