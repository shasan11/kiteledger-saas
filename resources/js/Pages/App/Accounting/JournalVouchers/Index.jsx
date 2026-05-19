import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { renderAmountWithDefaultCurrency } from '@/Pages/App/Shared/transactionDisplay';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const displayDate = (v) => { if (!v) return '-'; const d = dayjs(v); return d.isValid() ? d.format('DD-MM-YYYY') : '-'; };
const statusColor = (s) => ({ draft: 'default', posted: 'green', cancelled: 'red' }[s] || 'default');

export default function JournalVouchersIndex(props) {
    const columns = useMemo(() => [
        { title: 'Voucher No', dataIndex: 'voucher_no', key: 'voucher_no', sorter: true, width: 140, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        { title: 'Date', dataIndex: 'voucher_date', key: 'voucher_date', sorter: true, width: 120, render: displayDate, backendFilter: { type: 'date_range', fromParam: 'date_from', toParam: 'date_to' } },
        { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (v) => v || '-' },
        { title: 'Narration', dataIndex: 'narration', key: 'narration', render: (v) => v || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag> },
        { title: 'Total Debit', dataIndex: 'total_debit', key: 'total_debit', sorter: true, align: 'right', width: 150, render: (v, record) => renderAmountWithDefaultCurrency(v, record), backendFilter: { type: 'amount_range', minParam: 'amount_min', maxParam: 'amount_max' } },
    ], []);

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Journal Vouchers" />
            <ReusableCrud
                title="Journal Vouchers"
                apiUrl={api('/api/journal-vouchers/')}
                bulkActions={{ approve: true, void: true, export: true }}
                columns={columns}
                custom_add={true}
                custom_add_link={route('accounting.journal-vouchers.add')}
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
                hasActions
                canView
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select,.ant-picker')) return;
                        router.visit(route('accounting.journal-vouchers.show', record.id));
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
        </AuthenticatedLayout>
    );
}
