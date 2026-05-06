import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';
import * as Yup from 'yup';
import {
    BankOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { Tag, Typography } from 'antd';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const today = new Date().toISOString().slice(0, 10);

const accountLabel = (row) => {
    const code = row?.code || '';
    const name = row?.display_name || row?.name || row?.label || '';

    return [code, name].filter(Boolean).join(' - ') || String(row?.id || '');
};

const money = (value) => {
    const num = Number(value || 0);

    return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const relationLabel = (record, ...keys) => {
    for (const key of keys) {
        const value = record?.[key];

        if (!value) {
            continue;
        }

        if (typeof value === 'string') {
            return value;
        }

        const label = accountLabel(value);

        if (label) {
            return label;
        }
    }

    return '-';
};

const statusMeta = {
    active: { label: 'Active', color: 'success', icon: <CheckCircleOutlined /> },
    settled: { label: 'Settled', color: 'processing', icon: <CheckCircleOutlined /> },
    closed: { label: 'Closed', color: 'default', icon: <CloseCircleOutlined /> },
    cancelled: { label: 'Cancelled', color: 'error', icon: <StopOutlined /> },
};

const renderStatus = (status) => {
    const normalized = String(status || 'active').toLowerCase();
    const meta = statusMeta[normalized] || statusMeta.active;

    return (
        <Tag icon={meta.icon} color={meta.color} style={{ marginInlineEnd: 0 }}>
            {meta.label}
        </Tag>
    );
};

export default function Index({ auth }) {
    const accountFk = useMemo(
        () => ({
            type: 'fkSelect',
            fkUrl: api('/api/accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            fkLabel: accountLabel,
            fkExtraParams: {
                active: true,
            },
        }),
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: 'Loan Account',
                dataIndex: 'name',
                key: 'name',
                backendSort: true,
                sortField: 'name',
                render: (value) => <Text strong>{value || '-'}</Text>,
            },
            {
                title: 'Lender Bank',
                dataIndex: 'bank_name',
                key: 'bank_name',
                backendSort: true,
                sortField: 'bank_name',
                render: (value) => value || '-',
            },
            {
                title: 'Loan Number',
                dataIndex: 'loan_number',
                key: 'loan_number',
                render: (value) => value || '-',
            },
            {
                title: 'Opening Amount',
                dataIndex: 'opening_balance',
                key: 'opening_balance',
                align: 'right',
                backendSort: true,
                sortField: 'opening_balance',
                render: (value) => money(value),
            },
            {
                title: 'Current Balance',
                dataIndex: 'current_balance',
                key: 'current_balance',
                align: 'right',
                backendSort: true,
                sortField: 'current_balance',
                render: (value) => money(value),
            },
            {
                title: 'Balance As Of',
                dataIndex: 'balance_as_of',
                key: 'balance_as_of',
                render: (value) => value || '-',
            },
            {
                title: 'Loan Received In',
                key: 'loan_received_in_account_id',
                render: (_, record) =>
                    relationLabel(
                        record,
                        'loanReceivedInAccount',
                        'loan_received_in_account',
                        'loan_received_in_account_id_detail',
                    ),
            },
            {
                title: 'Liability Account',
                key: 'related_account_id',
                render: (_, record) =>
                    relationLabel(
                        record,
                        'relatedAccount',
                        'related_account',
                        'related_account_id_detail',
                    ),
            },
            {
                title: 'Interest Rate',
                dataIndex: 'interest_rate_per_annum',
                key: 'interest_rate_per_annum',
                render: (value) => (Number(value || 0) ? `${Number(value)}%` : '-'),
            },
            {
                title: 'Term',
                dataIndex: 'duration_in_month',
                key: 'duration_in_month',
                render: (value) => (Number(value || 0) ? `${Number(value)} months` : '-'),
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: renderStatus,
            },
        ],
        [],
    );

    const fields = useMemo(
        () => [
            {
                name: 'name',
                label: 'Loan Account Name',
                type: 'text',
                placeholder: 'Loan account name',
                required: true,
                col: 12,
            },
            {
                name: 'bank_name',
                label: 'Lender Bank',
                type: 'text',
                placeholder: 'Lender bank',
                col: 12,
            },
            {
                name: 'loan_number',
                label: 'Loan Number',
                type: 'text',
                placeholder: 'Loan number',
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
                name: 'opening_balance',
                label: 'Opening Loan Amount',
                type: 'number',
                placeholder: 'Opening loan amount',
                required: true,
                col: 12,
            },
            {
                name: 'loan_received_in_account_id',
                label: 'Loan Received In',
                placeholder: 'Search account',
                required: true,
                col: 12,
                ...accountFk,
            },
            {
                name: 'related_account_id',
                label: 'Loan Liability Account',
                placeholder: 'Search liability account',
                required: true,
                col: 12,
                ...accountFk,
            },
            {
                name: 'interest_rate_per_annum',
                label: 'Interest Rate',
                type: 'number',
                placeholder: 'Interest rate',
                addonAfter: '% per annum',
                col: 12,
            },
            {
                name: 'duration_in_month',
                label: 'Term Duration',
                type: 'number',
                placeholder: 'Duration in months',
                col: 12,
            },
            {
                name: 'processing_fee',
                label: 'Processing Fee',
                type: 'number',
                placeholder: 'Processing fee',
                col: 12,
            },
            {
                name: 'processing_fee_paid_from_account_id',
                label: 'Processing Fee Paid From',
                placeholder: 'Search account',
                col: 12,
                ...accountFk,
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                col: 12,
                options: [
                    { label: 'Active', value: 'active' },
                    { label: 'Settled', value: 'settled' },
                    { label: 'Closed', value: 'closed' },
                    { label: 'Cancelled', value: 'cancelled' },
                ],
            },
            {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Description',
                rows: 3,
                col: 24,
            },
            {
                name: 'active',
                label: 'Active',
                type: 'switch',
                col: 12,
            },
        ],
        [accountFk],
    );

    const validationSchema = Yup.object().shape({
        name: Yup.string().trim().required('Loan account name is required'),
        opening_balance: Yup.number()
            .typeError('Opening loan amount must be a number')
            .min(0, 'Opening loan amount cannot be negative')
            .required('Opening loan amount is required'),
        balance_as_of: Yup.string().nullable().required('Balance date is required'),
        loan_received_in_account_id: Yup.string()
            .nullable()
            .when('opening_balance', {
                is: (value) => Number(value || 0) > 0,
                then: (schema) => schema.required('Loan received in account is required'),
            }),
        related_account_id: Yup.string()
            .nullable()
            .when('opening_balance', {
                is: (value) => Number(value || 0) > 0,
                then: (schema) => schema.required('Loan liability account is required'),
            }),
        interest_rate_per_annum: Yup.number()
            .transform((value, originalValue) => (originalValue === '' ? null : value))
            .nullable()
            .min(0, 'Interest rate cannot be negative'),
        duration_in_month: Yup.number()
            .transform((value, originalValue) => (originalValue === '' ? null : value))
            .nullable()
            .integer('Term duration must be a whole number')
            .min(0, 'Term duration cannot be negative'),
        processing_fee: Yup.number()
            .transform((value, originalValue) => (originalValue === '' ? null : value))
            .nullable()
            .min(0, 'Processing fee cannot be negative'),
        processing_fee_paid_from_account_id: Yup.string()
            .nullable()
            .when('processing_fee', {
                is: (value) => Number(value || 0) > 0,
                then: (schema) => schema.required('Processing fee paid from account is required'),
            }),
        status: Yup.string().oneOf(['active', 'settled', 'closed', 'cancelled']).required(),
        active: Yup.boolean().nullable(),
    });

    const transformPayload = (values) => {
        const numberOrZero = (value) => {
            const num = Number(value || 0);

            return Number.isFinite(num) ? num : 0;
        };

        const payload = {
            name: values.name?.trim() || null,
            bank_name: values.bank_name?.trim() || null,
            loan_number: values.loan_number?.trim() || null,
            description: values.description?.trim() || null,
            opening_balance: numberOrZero(values.opening_balance),
            balance_as_of: values.balance_as_of || null,
            loan_received_in_account_id: values.loan_received_in_account_id || null,
            related_account_id: values.related_account_id || null,
            interest_rate_per_annum: numberOrZero(values.interest_rate_per_annum),
            duration_in_month: numberOrZero(values.duration_in_month),
            processing_fee: numberOrZero(values.processing_fee),
            processing_fee_paid_from_account_id:
                values.processing_fee_paid_from_account_id || null,
            status: values.status || 'active',
            active: values.active !== false,
        };

        payload.current_balance = payload.opening_balance;

        return payload;
    };

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Loan Accounts" />

            <ReusableCrud
                title="Loan Accounts"
                icon={<BankOutlined />}
                apiUrl={api('/api/loan-accounts/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                transformPayload={transformPayload}
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                        router.visit(route('accounting.loan-accounts.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                crudInitialValues={{
                    name: '',
                    bank_name: '',
                    loan_number: '',
                    description: '',
                    opening_balance: 0,
                    current_balance: 0,
                    balance_as_of: today,
                    loan_received_in_account_id: null,
                    related_account_id: null,
                    interest_rate_per_annum: '',
                    duration_in_month: '',
                    processing_fee: '',
                    processing_fee_paid_from_account_id: null,
                    status: 'active',
                    active: true,
                }}
                searchFields={['name', 'bank_name', 'loan_number', 'description']}
                form_ui="modal"
                modalWidth={820}
                enableServerPagination
                pageParam="page"
                pageSizeParam="page_size"
                searchParam="search"
                activeParam="active"
                sortMode="ordering"
                orderingParam="ordering"
                defaultSortField="created_at"
                defaultSortOrder="descend"
                anchorFilters={[
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Approved Loan Accounts',
                        params: { approved: true },
                    },
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Draft Loan Accounts',
                        params: { approved: false },
                    },
                    {
                        key: 'active',
                        label: 'Active',
                        title: 'Active Loan Accounts',
                        params: { status: 'active' },
                    },
                    {
                        key: 'settled',
                        label: 'Settled',
                        title: 'Settled Loan Accounts',
                        params: { status: 'settled' },
                    },
                    {
                        key: 'closed',
                        label: 'Closed',
                        title: 'Closed Loan Accounts',
                        params: { status: 'closed' },
                    },
                    {
                        key: 'cancelled',
                        label: 'Cancelled',
                        title: 'Cancelled Loan Accounts',
                        params: { status: 'cancelled' },
                    },
                ]}
                defaultAnchorKey="approved"
                anchorSyncWithHash
                enableInactiveDrawer
                showSearch
                showRowActionMenu
                canView
                canAdd
                canEdit
                canDelete
                hasActions
                hasActionColumns
            />
        </AuthenticatedLayout>
    );
}
