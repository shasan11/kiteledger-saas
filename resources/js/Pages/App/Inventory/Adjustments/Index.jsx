import { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Modal, Input, Tag, Typography } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const displayDate = (v) => { if (!v) return '-'; const d = dayjs(v); return d.isValid() ? d.format('DD-MM-YYYY') : '-'; };
const statusColor = (s) => ({ draft: 'default', posted: 'green', cancelled: 'red' }[s] || 'default');

export default function AdjustmentsIndex(props) {
    const [voidState, setVoidState] = useState({ open: false, reason: '', loading: false, ctx: null });

    const columns = useMemo(() => [
        { title: 'Adjustment No', dataIndex: 'adjustment_no', key: 'adjustment_no', sorter: true, width: 140, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        { title: 'Date', dataIndex: 'adjustment_date', key: 'adjustment_date', sorter: true, width: 120, render: displayDate },
        { title: 'Warehouse', dataIndex: 'warehouse', key: 'warehouse', render: (_, r) => r?.warehouse?.name || r?.warehouse_name || '-' },
        { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v) => v || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag> },
        { title: 'Stock Posting', dataIndex: 'stock_posting_status', key: 'stock_posting_status', width: 190, render: (v, r) => <Tag color={r?.stock_posted ? 'green' : r?.status === 'cancelled' ? 'red' : 'default'}>{v || 'Draft'}</Tag> },
    ], []);

    const rowMenu = useMemo(() => [
        {
            label: 'Bulk Approve',
            icon: <CheckCircleOutlined />,
            requiresSelection: true,
            onClick: async ({ selectedRowKeys, fetchData, clearSelection, message }) => {
                try {
                    await new Promise((resolve, reject) => {
                        Modal.confirm({
                            title: 'Post warehouse stock?',
                            content: 'This will update warehouse stock. Continue?',
                            okText: 'Continue',
                            onOk: resolve,
                            onCancel: reject,
                        });
                    });
                    await axios.patch(api('/api/inventory-adjustments/bulk'), { records: selectedRowKeys.map((id) => ({ id, approved: true })) });
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
            await axios.patch(api('/api/inventory-adjustments/bulk'), { records: ctx.selectedRowKeys.map((id) => ({ id, void: true, voided_reason: reason })) });
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
            <Head title="Inventory Adjustments" />
            <ReusableCrud
                title="Inventory Adjustments"
                apiUrl={api('/api/inventory-adjustments/')}
                columns={columns}
                rowMenu={rowMenu}
                custom_add={true}
                custom_add_link={route('inventory.adjustments.add')}
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
                        router.visit(route('inventory.adjustments.show', record.id));
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
