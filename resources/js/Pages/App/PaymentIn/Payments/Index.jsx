import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Alert, Button, message, Modal, Space, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { renderAmountWithDefaultCurrency } from '@/Pages/App/Shared/transactionDisplay';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
const errorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (data?.failed?.length) return data.failed.map((item) => item.reason).filter(Boolean).join('\n') || fallback;
    const firstError = data?.errors ? Object.values(data.errors).flat()?.[0] : null;
    return firstError || fallback;
};
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const displayDate = (v) => { if (!v) return '-'; const d = dayjs(v); return d.isValid() ? d.format('DD-MM-YYYY') : '-'; };
const statusColor = (s) => ({ draft: 'default', posted: 'blue', cancelled: 'red' }[s] || 'default');

export default function PaymentsIndex(props) {
    const crudRef = useRef(null);
    const [unapprovedCount, setUnapprovedCount] = useState(0);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [unapprovedRows, setUnapprovedRows] = useState([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [approvingIds, setApprovingIds] = useState(new Set());

    const fetchUnapprovedCount = useCallback(async () => {
        try {
            const response = await axios.get(api('/api/customer-payments/'), {
                headers: authHeaders(),
                params: { approved: false, page_size: 1 },
            });
            const payload = response.data;
            const count = payload?.count ?? payload?.total ?? (Array.isArray(payload?.results) ? payload.results.length : 0);
            setUnapprovedCount(Number(count) || 0);
        } catch (error) {
            message.error(errorMessage(error, 'Failed to load unapproved payment count.'));
        }
    }, []);

    useEffect(() => {
        void fetchUnapprovedCount();
    }, [fetchUnapprovedCount]);

    const openReview = async () => {
        setReviewOpen(true);
        setReviewLoading(true);
        try {
            const response = await axios.get(api('/api/customer-payments/'), {
                headers: authHeaders(),
                params: { approved: false, page_size: 50, ordering: '-payment_date' },
            });
            const payload = response.data;
            setUnapprovedRows(payload?.results ?? payload?.data ?? []);
        } catch (error) {
            message.error(errorMessage(error, 'Failed to load payments for review.'));
            setUnapprovedRows([]);
        }
        finally {
            setReviewLoading(false);
        }
    };

    const approveRecord = async (record) => {
        setApprovingIds((prev) => new Set([...prev, record.id]));
        try {
            await axios.post(api(`/api/customer-payments/${record.id}/approve`), {}, { headers: authHeaders() });
            message.success('Payment approved.');
            await fetchUnapprovedCount();
            crudRef.current?.refresh?.();

            const response = await axios.get(api('/api/customer-payments/'), {
                headers: authHeaders(),
                params: { approved: false, page_size: 50, ordering: '-payment_date' },
            });
            const payload = response.data;
            setUnapprovedRows(payload?.results ?? payload?.data ?? []);
        } catch (error) {
            message.error(errorMessage(error, 'Failed to approve payment.'));
        }
        finally {
            setApprovingIds((prev) => { const next = new Set(prev); next.delete(record.id); return next; });
        }
    };

    const columns = useMemo(() => [
        { title: 'Payment No', dataIndex: 'payment_no', key: 'payment_no', sorter: true, width: 140, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        { title: 'Customer', dataIndex: 'contact', key: 'contact', render: (_, r) => r?.contact?.name || r?.contact_name || '-', backendFilter: { type: 'autocomplete', paramName: 'contact_id', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkLabelKey: 'name', fkValueKey: 'id' } },
        { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', sorter: true, width: 120, render: displayDate, backendFilter: { type: 'date_range', fromParam: 'date_from', toParam: 'date_to' } },
        { title: 'Method', dataIndex: 'payment_method', key: 'payment_method', width: 120, render: (v) => v || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v || 'draft'}</Tag>, backendFilter: { type: 'select', paramName: 'status', options: [{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }] } },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', sorter: true, align: 'right', width: 150, render: (v, record) => renderAmountWithDefaultCurrency(v, record), backendFilter: { type: 'amount_range', minParam: 'amount_min', maxParam: 'amount_max' } },
    ], []);

    const reviewColumns = useMemo(() => [
        { title: 'Payment No', dataIndex: 'payment_no', key: 'payment_no', render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
        { title: 'Customer', key: 'customer', render: (_, r) => r?.contact?.name || r?.contact_name || '-' },
        { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', width: 110, render: displayDate },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', width: 150, render: (v, record) => renderAmountWithDefaultCurrency(v, record) },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={approvingIds.has(record.id)}
                    onClick={() => approveRecord(record)}
                >
                    Approve
                </Button>
            ),
        },
    ], [approvingIds]);

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Customer Payments" />

            <div>
                {unapprovedCount > 0 && (
                    <div style={{ padding: '12px 16px 0' }}>
                        <Alert
                            type="warning"
                            showIcon
                            icon={<ExclamationCircleOutlined />}
                            message={
                                <Space>
                                    <span>
                                        {unapprovedCount} payment{unapprovedCount !== 1 ? 's' : ''} not yet approved.
                                    </span>
                                    <Button size="small" type="primary" onClick={openReview}>
                                        Review &amp; Approve
                                    </Button>
                                </Space>
                            }
                        />
                    </div>
                )}

                <ReusableCrud
                    ref={crudRef}
                    title="Customer Payments"
                    apiUrl={api('/api/customer-payments/')}
                    bulkActions={{ approve: true, void: true, export: true }}
                    columns={columns}
                    custom_add={true}
                    custom_add_link={route('payment-in.payments.add')}
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
                            router.visit(route('payment-in.payments.show', record.id));
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
            </div>

            <Modal
                title={
                    <Space>
                        <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                        Review Unapproved Payments
                    </Space>
                }
                open={reviewOpen}
                onCancel={() => setReviewOpen(false)}
                footer={<Button onClick={() => setReviewOpen(false)}>Close</Button>}
                width={820}
                destroyOnClose
            >
                <Table
                    rowKey="id"
                    size="small"
                    loading={reviewLoading}
                    columns={reviewColumns}
                    dataSource={unapprovedRows}
                    pagination={false}
                    locale={{ emptyText: 'All payments are approved.' }}
                />
            </Modal>
        </AuthenticatedLayout>
    );
}
