import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { renderAmountWithDefaultCurrency } from '@/Pages/App/Shared/transactionDisplay';
import { branchColumn } from '@/Components/Transactions';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const displayDate = (v) => { if (!v) return '-'; const d = dayjs(v); return d.isValid() ? d.format('DD-MM-YYYY') : '-'; };
const statusColor = (s) => ({ draft: 'default', confirmed: 'blue', fulfilled: 'green', cancelled: 'red', void: 'red' }[s] || 'default');

export default function SalesOrderIndex(props) {
    const columns = useMemo(() => [
        { title: 'SO No', dataIndex: 'sales_order_no', key: 'sales_order_no', sorter: true, width: 140, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        branchColumn(),
        { title: 'Customer', dataIndex: 'contact', key: 'contact', render: (_, r) => r?.contact?.name || r?.contact_name || '-', backendFilter: { type: 'autocomplete', paramName: 'contact_id', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkLabelKey: 'name', fkValueKey: 'id' } },
        { title: 'Date', dataIndex: 'sales_order_date', key: 'sales_order_date', sorter: true, width: 120, render: displayDate, backendFilter: { type: 'date_range', fromParam: 'date_from', toParam: 'date_to' } },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120, render: displayDate },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag>, backendFilter: { type: 'select', paramName: 'status', options: [{ value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'fulfilled', label: 'Fulfilled' }, { value: 'cancelled', label: 'Cancelled' }] } },
        { title: 'Amount', dataIndex: 'grand_total', key: 'grand_total', sorter: true, align: 'right', width: 150, render: (v, record) => renderAmountWithDefaultCurrency(v ?? record?.total, record), backendFilter: { type: 'amount_range', minParam: 'amount_min', maxParam: 'amount_max' } },
    ], []);

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Sales Orders" />
            <ReusableCrud
                title="Sales Orders"
                apiUrl={api('/api/sales-orders/')}
                bulkActions={{ approve: true, void: true, export: true }}
                columns={columns}
                custom_add={true}
                custom_add_link={route('payment-in.sales-orders.add')}
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
                        router.visit(route('payment-in.sales-orders.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                anchorFilters={[
                    { key: 'all', label: 'All', params: {} },
                    { key: 'draft', label: 'Draft', params: { approved: false } },
                    { key: 'approved', label: 'Approved', params: { approved: true } },
                ]}
                defaultAnchorKey="all"
                anchorSyncWithHash
            />
        </AuthenticatedLayout>
    );
}
