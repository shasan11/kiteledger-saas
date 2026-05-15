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

export default function InvoicesIndex(props) {
    const columns = useMemo(() => [
        { title: 'Invoice No', dataIndex: 'invoice_no', key: 'invoice_no', sorter: true, width: 140, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        { title: 'Customer', dataIndex: 'contact', key: 'contact', render: (_, r) => r?.contact?.name || r?.contact_name || '-', backendFilter: { type: 'autocomplete', paramName: 'contact_id', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkLabelKey: 'name', fkValueKey: 'id' } },
        { title: 'Date', dataIndex: 'invoice_date', key: 'invoice_date', sorter: true, width: 120, render: displayDate, backendFilter: { type: 'date_range', fromParam: 'date_from', toParam: 'date_to' } },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120, render: displayDate },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag>, backendFilter: { type: 'select', paramName: 'status', options: [{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'part_paid', label: 'Part Paid' }, { value: 'paid', label: 'Paid' }, { value: 'void', label: 'Void' }] } },
        { title: 'Amount', dataIndex: 'total', key: 'total', sorter: true, align: 'right', width: 150, render: (v, record) => renderAmountWithDefaultCurrency(v, record), backendFilter: { type: 'amount_range', minParam: 'amount_min', maxParam: 'amount_max' } },
    ], []);

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Invoices" />
            <ReusableCrud
                title="Invoices"
                apiUrl={api('/api/invoices/')}
                bulkActions={{ approve: true, void: true, export: true }}
                columns={columns}
                custom_add={true}
                custom_add_link={route('payment-in.invoices.add')}
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
                        router.visit(route('payment-in.invoices.show', record.id));
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
