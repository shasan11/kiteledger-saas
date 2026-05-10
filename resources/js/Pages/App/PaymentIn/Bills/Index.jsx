import { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Modal, Input, Tag, Typography } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const money = (value) => toNumber(value).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const displayDate = (value) => {
    if (!value) return '-';
    const d = dayjs(value);
    return d.isValid() ? d.format('DD-MM-YYYY') : '-';
};

const statusColor = (status) => ({
    draft: 'default', posted: 'blue', part_paid: 'orange', paid: 'green', void: 'red',
}[status] || 'default');

export default function BillsIndex(props) {
    const [voidState, setVoidState] = useState({ open: false, reason: '', loading: false, ctx: null });

    const columns = useMemo(() => [
        { title: 'Bill No', dataIndex: 'invoice_no', key: 'invoice_no', sorter: true, width: 140, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        { title: 'Customer', dataIndex: 'contact', key: 'contact', render: (_, r) => r?.contact?.name || r?.contact_name || '-' },
        { title: 'Date', dataIndex: 'invoice_date', key: 'invoice_date', sorter: true, width: 120, render: displayDate },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120, render: displayDate },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag> },
        { title: 'Amount', dataIndex: 'total', key: 'total', sorter: true, align: 'right', width: 140, render: (v) => <Text strong>{money(v)}</Text> },
    ], []);

    const rowMenu = useMemo(() => [
        {
            label: 'Bulk Approve',
            icon: <CheckCircleOutlined />,
            requiresSelection: true,
            onClick: async ({ selectedRowKeys, fetchData, clearSelection, message }) => {
                try {
                    await axios.patch(api('/api/invoices/bulk'), {
                        records: selectedRowKeys.map((id) => ({ id, approved: true })),
                    });
                    message.success('Records approved');
                    clearSelection();
                    fetchData();
                } catch {
                    message.error('Failed to approve records');
                }
            },
        },
        {
            label: 'Bulk Void',
            icon: <StopOutlined />,
            danger: true,
            requiresSelection: true,
            onClick: ({ selectedRowKeys, fetchData, clearSelection, message }) => {
                setVoidState({ open: true, reason: '', loading: false, ctx: { selectedRowKeys, fetchData, clearSelection, message } });
            },
        },
    ], []);

    const handleVoidConfirm = async () => {
        const { ctx, reason } = voidState;
        if (!ctx) return;
        setVoidState((s) => ({ ...s, loading: true }));
        try {
            await axios.patch(api('/api/invoices/bulk'), {
                records: ctx.selectedRowKeys.map((id) => ({ id, void: true, voided_reason: reason })),
            });
            ctx.message.success('Records voided');
            ctx.clearSelection();
            ctx.fetchData();
            setVoidState({ open: false, reason: '', loading: false, ctx: null });
        } catch {
            ctx.message.error('Failed to void records');
            setVoidState((s) => ({ ...s, loading: false }));
        }
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Bills" />

            <ReusableCrud
                title="Bills"
                apiUrl={api('/api/invoices/')}
                columns={columns}
                rowMenu={rowMenu}
                custom_add={true}
                custom_add_link={route('payment-in.bills.add')}
                form_ui="drawer"
                drawerWidth="calc(100vw - 24px)"
                searchParam="search"
                pageParam="page"
                pageSizeParam="page_size"
                sortMode="ordering"
                orderingParam="ordering"
                enableServerPagination
                showSearch
                canAdd={true}
                canEdit
                canDelete
                hasActions
                hasActionColumns
                canView
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select,.ant-picker')) return;
                        router.visit(route('payment-in.bills.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                anchorFilters={[
                    { key: 'approved', label: 'Approved', params: { approved: true } },
                    { key: 'draft', label: 'Draft', params: { approved: false } },
                ]}
                defaultAnchorKey="approved"
                anchorSyncWithHash
            />

            <Modal
                title="Void Records"
                open={voidState.open}
                onOk={handleVoidConfirm}
                confirmLoading={voidState.loading}
                onCancel={() => setVoidState({ open: false, reason: '', loading: false, ctx: null })}
                okText="Void"
                okButtonProps={{ danger: true }}
            >
                <p>Please provide a reason for voiding the selected records.</p>
                <Input.TextArea
                    rows={3}
                    value={voidState.reason}
                    onChange={(e) => setVoidState((s) => ({ ...s, reason: e.target.value }))}
                    placeholder="Void reason..."
                />
            </Modal>
        </AuthenticatedLayout>
    );
}
