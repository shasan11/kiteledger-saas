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
const statusColor = (s) => ({ draft: 'default', posted: 'blue', part_paid: 'orange', paid: 'green', void: 'red' }[s] || 'default');

export default function PurchaseBillsIndex(props) {
    const columns = useMemo(() => [
        { title: 'Bill No', dataIndex: 'bill_no', key: 'bill_no', sorter: true, width: 140, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        { title: 'Supplier', dataIndex: 'contact', key: 'contact', render: (_, r) => r?.contact?.name || r?.contact_name || '-', backendFilter: { type: 'autocomplete', paramName: 'contact_id', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkLabelKey: 'name', fkValueKey: 'id' } },
        { title: 'Date', dataIndex: 'bill_date', key: 'bill_date', sorter: true, width: 120, render: displayDate, backendFilter: { type: 'date_range', fromParam: 'date_from', toParam: 'date_to' } },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120, render: displayDate },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag>, backendFilter: { type: 'select', paramName: 'status', options: [{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'part_paid', label: 'Part Paid' }, { value: 'paid', label: 'Paid' }, { value: 'void', label: 'Void' }] } },
        { title: 'Total', dataIndex: 'total', key: 'total', sorter: true, align: 'right', width: 140, render: (v, record) => renderAmountWithDefaultCurrency(v, record), backendFilter: { type: 'amount_range', minParam: 'amount_min', maxParam: 'amount_max' } },
        { title: 'Paid', dataIndex: 'paid_total', key: 'paid_total', sorter: true, align: 'right', width: 140, render: (v, record) => renderAmountWithDefaultCurrency(v, record) },
        { title: 'Balance', dataIndex: 'balance_due', key: 'balance_due', sorter: true, align: 'right', width: 140, render: (v, record) => renderAmountWithDefaultCurrency(v, record) },
    ], []);

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Purchase Bills" />
            <ReusableCrud
                title="Purchase Bills"
                apiUrl={api('/api/purchase-bills/')}
                bulkActions={{ approve: true, void: true, export: true }}
                columns={columns}
                custom_add={true}
                custom_add_link={route('payment-out.purchase-bills.add')}
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
                        router.visit(route('payment-out.purchase-bills.show', record.id));
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
