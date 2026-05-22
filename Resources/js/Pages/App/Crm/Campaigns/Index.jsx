import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    App, Button, Card, Col, Empty, Input, Row, Select, Skeleton, Space, Statistic, Table, Tag, Typography, theme,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import * as Yup from 'yup';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const formatMoney = (v) => v != null ? Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
const labelize = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';

const statusColor = { draft: 'default', active: 'success', paused: 'warning', completed: 'blue', cancelled: 'error' };

export default function Campaigns({ auth }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);

    useEffect(() => {
        setSummaryLoading(true);
        axios.get(api('/api/crm-campaigns/summary'))
            .then((res) => setSummary(res.data))
            .catch(() => setSummary(null))
            .finally(() => setSummaryLoading(false));
    }, []);

    const columns = [
        {
            title: 'Campaign', dataIndex: 'name', key: 'name', sorter: true,
            render: (v, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ cursor: 'pointer' }}>{v}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.code || '-'}</Text>
                </Space>
            ),
        },
        { title: 'Source', dataIndex: 'source', key: 'source', width: 120, render: labelize },
        { title: 'Medium', dataIndex: 'medium', key: 'medium', width: 120, render: labelize },
        { title: 'Budget', dataIndex: 'budget', key: 'budget', width: 120, align: 'right', render: formatMoney },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 110,
            render: (v) => <Tag color={statusColor[v] || 'default'}>{labelize(v)}</Tag>,
        },
        {
            title: 'Dates', key: 'dates', width: 180,
            render: (_, r) => {
                const s = r.start_date ? new Date(r.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
                const e = r.end_date ? new Date(r.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
                return s || e ? `${s} - ${e}` : '-';
            },
        },
        {
            title: 'Leads', key: 'leads', width: 70, align: 'right',
            render: (_, r) => r.stats?.leads_count ?? '-',
        },
        {
            title: 'Won', key: 'won', width: 70, align: 'right',
            render: (_, r) => r.stats?.won_deals_count ?? '-',
        },
        {
            title: 'ROI', key: 'roi', width: 80, align: 'right',
            render: (_, r) => r.stats?.roi != null ? `${r.stats.roi}%` : '-',
        },
    ];

    const fields = [
        { name: 'name', label: 'Name', type: 'text', required: true, col: 12 },
        { name: 'code', label: 'Code', type: 'text', col: 6, placeholder: 'Auto-generated if empty' },
        { name: 'status', label: 'Status', type: 'select', col: 6, options: ['draft', 'active', 'paused', 'completed', 'cancelled'].map((v) => ({ value: v, label: labelize(v) })) },
        { name: 'source', label: 'Source', type: 'text', col: 6 },
        { name: 'medium', label: 'Medium', type: 'text', col: 6 },
        { name: 'budget', label: 'Budget', type: 'number', col: 6 },
        { name: 'start_date', label: 'Start Date', type: 'datePicker', col: 6 },
        { name: 'end_date', label: 'End Date', type: 'datePicker', col: 6 },
    ];

    const headerNode = (
        <Text strong style={{ fontSize: 16 }}>Marketing Campaigns</Text>
    );

    return (
        <AuthenticatedLayout user={auth?.user} header={headerNode}>
            <Head title="Marketing Campaigns" />

            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {summaryLoading ? (
                        <Skeleton.Button active block style={{ height: 60 }} />
                    ) : summary ? (
                        <Row gutter={[12, 12]}>
                            <Col xs={8} md={4}>
                                <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                                    <Statistic title="Budget" value={summary.total_budget} prefix="Rs." precision={0} valueStyle={{ fontSize: 16 }} />
                                </Card>
                            </Col>
                            <Col xs={8} md={4}>
                                <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                                    <Statistic title="Cost" value={summary.total_cost} prefix="Rs." precision={0} valueStyle={{ fontSize: 16 }} />
                                </Card>
                            </Col>
                            <Col xs={8} md={4}>
                                <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                                    <Statistic title="Leads" value={summary.leads_count} valueStyle={{ fontSize: 16 }} />
                                </Card>
                            </Col>
                            <Col xs={8} md={4}>
                                <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                                    <Statistic title="Won Deals" value={summary.won_deals_count} valueStyle={{ fontSize: 16, color: token.colorSuccess }} />
                                </Card>
                            </Col>
                            <Col xs={8} md={4}>
                                <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                                    <Statistic title="Revenue" value={summary.revenue} prefix="Rs." precision={0} valueStyle={{ fontSize: 16 }} />
                                </Card>
                            </Col>
                            <Col xs={8} md={4}>
                                <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                                    <Statistic title="ROI" value={summary.roi ?? 0} suffix="%" valueStyle={{ fontSize: 16, color: summary.roi > 0 ? token.colorSuccess : token.colorError }} />
                                </Card>
                            </Col>
                        </Row>
                    ) : null}

                    <ReusableCrud
                        title="Campaigns"
                        apiUrl={api('/api/crm-campaigns/')}
                        columns={columns}
                        fields={fields}
                        validationSchema={Yup.object({ name: Yup.string().required() })}
                        crudInitialValues={{ name: '', status: 'draft' }}
                        transformPayload={(v) => v}
                        form_ui="drawer"
                        enableServerPagination
                        showSearch
                        canAdd
                        canEdit
                        canDelete
                        hasActions
                        hasActionColumns
                        searchParam="search"
                        pageParam="page"
                        pageSizeParam="page_size"
                        onRowClick={(record) => {
                            try {
                                if (typeof route === 'function') {
                                    router.visit(route('crm.campaigns.show', record.id));
                                } else {
                                    router.visit(`/crm/campaigns/${record.id}`);
                                }
                            } catch {
                                router.visit(`/crm/campaigns/${record.id}`);
                            }
                        }}
                    />
                </Space>
            </div>
        </AuthenticatedLayout>
    );
}
