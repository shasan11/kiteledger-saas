import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Space, Tag, Typography } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const money = (v) =>
    Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusColor = { pending: 'gold', cleared: 'green', bounced: 'red', cancelled: 'default' };

export default function ChequeRegisters({ auth }) {
    const columns = useMemo(
        () => [
            {
                title: 'Cheque No',
                dataIndex: 'cheque_no',
                key: 'cheque_no',
                width: 150,
                render: (v) => <Text strong>{v || '-'}</Text>,
            },
            {
                title: 'Date',
                dataIndex: 'cheque_date',
                key: 'cheque_date',
                width: 110,
                render: (v) => (v ? String(v).slice(0, 10) : '-'),
            },
            {
                title: 'Direction',
                dataIndex: 'direction',
                key: 'direction',
                width: 110,
                render: (v) => (
                    <Tag color={v === 'received' ? 'green' : 'orange'} style={{ marginInlineEnd: 0 }}>
                        {v === 'received' ? 'Received' : 'Issued'}
                    </Tag>
                ),
            },
            {
                title: 'Account',
                key: 'account',
                render: (_, r) => r?.account?.name || r?.account?.display_name || r?.account_id_detail?.name || '-',
            },
            {
                title: 'Customer / Supplier',
                key: 'related_account',
                render: (_, r) =>
                    r?.relatedAccount?.name ||
                    r?.related_account?.name ||
                    r?.related_account_id_detail?.name ||
                    r?.payee_name ||
                    '-',
            },
            {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                align: 'right',
                width: 130,
                render: (v) => money(v),
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (v, r) => (
                    <Space size={4}>
                        <Tag color={statusColor[v] || 'default'}>{String(v || 'pending').toUpperCase()}</Tag>
                        {r.void ? <Tag color="red">VOID</Tag> : null}
                    </Space>
                ),
            },
        ],
        [],
    );

    const accountFk = {
        type: 'fkSelect',
        fkUrl: api('/api/accounts/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        fkLabel: (row) => {
            const code = row?.code || '';
            const name = row?.display_name || row?.name || '';
            return [code, name].filter(Boolean).join(' - ') || String(row?.id || '');
        },
        fkExtraParams: { active: true },
    };

    const fields = useMemo(
        () => [
            {
                name: 'cheque_no',
                label: 'Cheque No',
                type: 'text',
                required: true,
                col: 8,
                placeholder: 'Cheque number',
            },
            {
                name: 'cheque_date',
                label: 'Cheque Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'YYYY-MM-DD',
                placeholder: 'Select date',
            },
            {
                name: 'direction',
                label: 'Direction',
                type: 'select',
                required: true,
                col: 8,
                options: [
                    { value: 'received', label: 'Received' },
                    { value: 'issued', label: 'Issued' },
                ],
            },
            {
                name: 'account_id',
                label: 'Cheque Account',
                required: true,
                col: 12,
                placeholder: 'Select bank / cash account',
                ...accountFk,
            },
            {
                name: 'related_account_id',
                label: 'Customer / Supplier Account',
                required: true,
                col: 12,
                placeholder: 'Select customer / supplier account',
                ...accountFk,
            },
            {
                name: 'payee_name',
                label: 'Payee / Received From',
                type: 'text',
                col: 12,
                placeholder: 'Payee name or received from',
            },
            {
                name: 'amount',
                label: 'Amount',
                type: 'number',
                required: true,
                col: 8,
                min: 0.01,
                placeholder: '0.00',
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                col: 8,
                options: [
                    { value: 'pending', label: 'Pending' },
                    { value: 'cleared', label: 'Cleared' },
                    { value: 'bounced', label: 'Bounced' },
                    { value: 'cancelled', label: 'Cancelled' },
                ],
            },
            {
                name: 'cleared_date',
                label: 'Cleared Date',
                type: 'datePicker',
                col: 8,
                format: 'YYYY-MM-DD',
                placeholder: 'Cleared date',
            },
            {
                name: 'exchange_rate',
                label: 'Exchange Rate',
                type: 'number',
                col: 8,
                min: 0.000001,
                placeholder: '1.00',
            },
            {
                name: 'approved',
                label: 'Approved',
                type: 'select',
                col: 8,
                options: [
                    { value: false, label: 'No' },
                    { value: true, label: 'Yes' },
                ],
            },
            {
                name: 'void',
                label: 'Void',
                type: 'select',
                col: 8,
                options: [
                    { value: false, label: 'No' },
                    { value: true, label: 'Yes' },
                ],
            },
            {
                name: 'voided_reason',
                label: 'Void Reason',
                type: 'text',
                col: 24,
                placeholder: 'Required only when cheque is voided',
            },
            {
                name: 'notes',
                label: 'Notes',
                type: 'textarea',
                col: 24,
                rows: 3,
                placeholder: 'Notes',
            },
        ],
        [],
    );

    const validationSchema = Yup.object().shape({
        cheque_no: Yup.string().required('Cheque number is required'),
        cheque_date: Yup.string().required('Cheque date is required'),
        direction: Yup.string().oneOf(['received', 'issued']).required('Direction is required'),
        account_id: Yup.string().nullable().required('Cheque account is required'),
        related_account_id: Yup.string().nullable().required('Customer / Supplier account is required'),
        amount: Yup.number().min(0.01, 'Amount must be greater than zero').required('Amount is required'),
        status: Yup.string().oneOf(['pending', 'cleared', 'bounced', 'cancelled']).required(),
        exchange_rate: Yup.number().nullable(),
        voided_reason: Yup.string().nullable(),
        notes: Yup.string().nullable(),
    });

    const transformPayload = (values) => {
        const chequeDate = values.cheque_date
            ? dayjs(values.cheque_date).format('YYYY-MM-DD')
            : dayjs().format('YYYY-MM-DD');
        const clearedDate = values.cleared_date ? dayjs(values.cleared_date).format('YYYY-MM-DD') : null;
        const isVoided = Boolean(values.void);

        return {
            cheque_no: values.cheque_no?.trim() || null,
            cheque_date: chequeDate,
            issued_date: chequeDate,
            received_date: values.direction === 'received' ? chequeDate : null,
            direction: values.direction || 'received',
            payee_name: values.payee_name?.trim() || null,
            account_id: values.account_id || null,
            related_account_id: values.related_account_id || null,
            receiver_related_account_id:
                values.direction === 'received' ? values.related_account_id || null : null,
            amount: Number(values.amount || 0),
            status: values.status || 'pending',
            cleared_date: values.status === 'cleared' ? clearedDate || chequeDate : clearedDate,
            exchange_rate: Number(values.exchange_rate || 1),
            total: Number(values.amount || 0) * Number(values.exchange_rate || 1),
            approved: Boolean(values.approved),
            void: isVoided,
            voided_reason: isVoided ? values.voided_reason?.trim() || null : null,
            voided_at: isVoided ? dayjs().format('YYYY-MM-DD HH:mm:ss') : null,
            notes: values.notes?.trim() || null,
            active: true,
        };
    };

    const crudInitialValues = {
        cheque_no: '',
        cheque_date: dayjs().format('YYYY-MM-DD'),
        direction: 'received',
        account_id: null,
        related_account_id: null,
        payee_name: '',
        amount: 0,
        status: 'pending',
        cleared_date: null,
        exchange_rate: 1,
        approved: false,
        void: false,
        voided_reason: '',
        notes: '',
    };

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Cheque Register" />
            <ReusableCrud
                icon={<BankOutlined />}
                title="Cheque Register"
                apiUrl={api('/api/cheque-registers/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                form_ui="modal"
                modalWidth={860}
                searchParam="search"
                pageParam="page"
                pageSizeParam="page_size"
                sortMode="ordering"
                orderingParam="ordering"
                enableServerPagination
                showSearch
                canAdd
                canEdit
                canDelete
                hasActions
                hasActionColumns
                anchorFilters={[
                    { key: 'all',      label: 'All',             title: 'All Cheques',      params: {} },
                    { key: 'received', label: 'Received',        title: 'Cheques Received', params: { direction: 'received' } },
                    { key: 'issued',   label: 'Issued',          title: 'Cheques Issued',   params: { direction: 'issued' } },
                    { key: 'approved', label: 'Approved',        title: 'Approved Cheques', params: { approved: true } },
                    { key: 'draft',    label: 'Draft / Pending', title: 'Pending Approval', params: { approved: false } },
                ]}
                defaultAnchorKey="all"
                anchorSyncWithHash
            />
        </AuthenticatedLayout>
    );
}
