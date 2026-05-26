import { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Modal, Input, Tag, Typography } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const displayDate = (v) => { if (!v) return '-'; const d = dayjs(v); return d.isValid() ? d.format('DD-MM-YYYY') : '-'; };
const statusColor = (s) => ({ draft: 'default', posted: 'green', cancelled: 'red' }[s] || 'default');

export default function WarehouseTransfersIndex(props) {
    const [voidState, setVoidState] = useState({ open: false, reason: '', loading: false, ctx: null });

    const columns = useMemo(() => [
        { title: 'Transfer No', dataIndex: 'transfer_no', key: 'transfer_no', sorter: true, width: 140, render: (_, r) => <Text strong>{displayDocumentNumber(r, r?.warehouse_transfer_no ? 'warehouse_transfer_no' : 'transfer_no')}</Text> },
        { title: 'Date', dataIndex: 'transfer_date', key: 'transfer_date', sorter: true, width: 120, render: displayDate },
        { title: 'From Warehouse', dataIndex: 'fromWarehouse', key: 'fromWarehouse', render: (_, r) => r?.fromWarehouse?.name || r?.from_warehouse?.name || '-' },
        { title: 'To Warehouse', dataIndex: 'toWarehouse', key: 'toWarehouse', render: (_, r) => r?.toWarehouse?.name || r?.to_warehouse?.name || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag> },
    ], []);

    const rowMenu = useMemo(() => [
        {
            label: 'Bulk Approve',
            icon: <CheckCircleOutlined />,
            requiresSelection: true,
            onClick: async ({ selectedRowKeys, fetchData, clearSelection, message }) => {
                try {
                    await axios.post(api('/api/warehouse-transfers/bulk-approve'), { ids: selectedRowKeys });
                    message.success('Records approved');
                    clearSelection();
                    fetchData();
                } catch { message.error('Failed to approve records'); }
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
            await axios.post(api('/api/warehouse-transfers/bulk-void'), { ids: ctx.selectedRowKeys, voided_reason: reason });
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
            <Head title="Warehouse Transfers" />
            <ReusableCrud
                title="Warehouse Transfers"
                apiUrl={api('/api/warehouse-transfers/')}
                columns={columns}
                rowMenu={rowMenu}
                custom_add={true}
                custom_add_link={route('inventory.warehouse-transfers.add')}
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
                        router.visit(route('inventory.warehouse-transfers.show', record.id));
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
                <Input.TextArea rows={3} value={voidState.reason} onChange={(e) => setVoidState((s) => ({ ...s, reason: e.target.value }))} placeholder="Void reason..." />
            </Modal>
        </AuthenticatedLayout>
    );
}
