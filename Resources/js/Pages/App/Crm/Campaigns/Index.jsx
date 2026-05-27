import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    App, Card, Col, Row, Skeleton, Space, Statistic, Tag, Typography, theme,
} from 'antd';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import * as Yup from 'yup';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatMoney = (v) => v != null ? Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
const labelize = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';
const statusColor = { draft: 'default', active: 'success', paused: 'warning', completed: 'blue', cancelled: 'error' };

const ruleTypeOptions = [
    { value: 'spend', label: 'Spend Cap' },
    { value: 'budget_increase', label: 'Increase Budget Capacity' },
    { value: 'budget_threshold', label: 'Budget Threshold' },
    { value: 'audience_quantity', label: 'Audience Quantity' },
    { value: 'email_quantity', label: 'Email Quantity' },
    { value: 'sms_quantity', label: 'SMS Quantity' },
];

const operatorOptions = [
    { value: 'lte', label: '<=' },
    { value: 'lt', label: '<' },
    { value: 'eq', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
];

export default function Campaigns({ auth }) {
    const { token } = theme.useToken();
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);

    useEffect(() => {
        setSummaryLoading(true);
        axios.get(api('/api/crm-campaigns/summary'), { headers: authHeaders() })
            .then((res) => setSummary(res.data))
            .catch(() => setSummary(null))
            .finally(() => setSummaryLoading(false));
    }, []);

    const columns = [
        {
            title: 'Campaign', dataIndex: 'name', key: 'name', sorter: true,
            render: (v, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{v}</Text>
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
        { title: 'Leads', key: 'leads', width: 70, align: 'right', render: (_, r) => r.stats?.leads_count ?? '-' },
        { title: 'Won', key: 'won', width: 70, align: 'right', render: (_, r) => r.stats?.won_deals_count ?? '-' },
        { title: 'ROI', key: 'roi', width: 80, align: 'right', render: (_, r) => r.stats?.roi != null ? `${r.stats.roi}%` : '-' },
    ];

    const fields = [
        // Row 1: Name | Code
        { name: 'name', label: 'Name', type: 'text', required: true, col: 16, placeholder: 'Campaign name' },
        { name: 'code', label: 'Code', type: 'text', col: 8, placeholder: 'Auto-generated if empty' },

        // Row 2: Source | Medium | Budget
        {
            name: 'source', label: 'Source', type: 'fkSelect', col: 8, placeholder: 'Select source',
            fkUrl: api('/api/master-data/'),
            fkSearchParam: 'search',
            fkExtraParams: { type: 'campaign_source', active: true, page_size: 50, ordering: 'value' },
            fkValueKey: 'key',
            fkLabelKey: 'value',
            allowClear: true,
        },
        {
            name: 'medium', label: 'Medium', type: 'fkSelect', col: 8, placeholder: 'Select medium',
            fkUrl: api('/api/master-data/'),
            fkSearchParam: 'search',
            fkExtraParams: { type: 'campaign_medium', active: true, page_size: 50, ordering: 'value' },
            fkValueKey: 'key',
            fkLabelKey: 'value',
            allowClear: true,
        },
        { name: 'budget', label: 'Budget', type: 'number', col: 8, min: 0, placeholder: '0.00' },

        // Row 3: Start | End | Status
        { name: 'start_date', label: 'Start Date', type: 'datePicker', col: 8 },
        { name: 'end_date', label: 'End Date', type: 'datePicker', col: 8 },
        {
            name: 'status', label: 'Status', type: 'select', col: 8,
            options: ['draft', 'active', 'paused', 'completed', 'cancelled']
                .map((v) => ({ value: v, label: labelize(v) })),
        },

        // Audience targeting
        { name: 'target_customers', label: 'Target Customers', type: 'number', col: 8, min: 0, placeholder: 'Total reach' },
        { name: 'email_only_quantity', label: 'Email Only Quantity', type: 'number', col: 8, min: 0 },
        { name: 'sms_only_quantity', label: 'SMS Only Quantity', type: 'number', col: 8, min: 0 },

        {
            name: 'contact_group_id', label: 'Contact Group', type: 'fkSelect', col: 24,
            fkUrl: api('/api/contact-groups/'),
            fkSearchParam: 'search',
            fkValueKey: 'id',
            fkLabelKey: 'name',
            fkPageSize: 20,
            allowClear: true,
            placeholder: 'Target by contact group',
        },

        { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },

        // Inline campaign rules — uses ReusableCrud's objectArray pattern.
        {
            name: 'rules',
            label: 'Campaign Rules',
            type: 'objectArray',
            col: 24,
            addLabel: 'Add Rule',
            allowAdd: true,
            allowDelete: true,
            columns: [
                {
                    title: 'Type', key: 'rule_type', type: 'select', width: 200,
                    options: ruleTypeOptions,
                },
                {
                    title: 'Condition', key: 'operator', type: 'select', width: 100,
                    options: operatorOptions,
                },
                { title: 'Value', key: 'value', type: 'text', width: 140 },
                { title: 'Action', key: 'action', type: 'text', width: 200, placeholder: 'e.g. block, warn, notify' },
                {
                    title: 'Active', key: 'active', type: 'switch', width: 80,
                },
            ],
        },
    ];

    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Name is required').max(180),
        code: Yup.string().nullable().max(60),
        source: Yup.string().nullable().max(80),
        medium: Yup.string().nullable().max(80),
        budget: Yup.number().nullable().min(0),
        target_customers: Yup.number().nullable().integer().min(0),
        email_only_quantity: Yup.number().nullable().integer().min(0),
        sms_only_quantity: Yup.number().nullable().integer().min(0),
        contact_group_id: Yup.string().nullable(),
        start_date: Yup.date().nullable(),
        end_date: Yup.date().nullable(),
        status: Yup.string().nullable().oneOf(['draft', 'active', 'paused', 'completed', 'cancelled']),
        description: Yup.string().nullable(),
    });

    const transformPayload = (values) => {
        const p = { ...values };
        ['source', 'medium', 'code', 'description'].forEach((k) => {
            if (p[k] === '') p[k] = null;
        });
        // Normalize rules array — drop empty rows.
        if (Array.isArray(p.rules)) {
            p.rules = p.rules
                .filter((r) => r && (r.rule_type || r.value || r.action))
                .map((r) => ({
                    rule_type: r.rule_type || null,
                    operator: r.operator || null,
                    value: r.value ?? null,
                    action: r.action || null,
                    active: r.active !== false,
                }));
        }
        return p;
    };

    return (
        <AuthenticatedLayout user={auth?.user} header={<Text strong style={{ fontSize: 16 }}>Marketing Campaigns</Text>}>
            <Head title="Marketing Campaigns" />

            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {summaryLoading ? (
                        <Skeleton.Button active block style={{ height: 60 }} />
                    ) : summary ? (
                        <Row gutter={[12, 12]}>
                            {[
                                { title: 'Budget', value: summary.total_budget, prefix: 'Rs.', precision: 0 },
                                { title: 'Cost', value: summary.total_cost, prefix: 'Rs.', precision: 0 },
                                { title: 'Leads', value: summary.leads_count },
                                { title: 'Won Deals', value: summary.won_deals_count, color: token.colorSuccess },
                                { title: 'Revenue', value: summary.revenue, prefix: 'Rs.', precision: 0 },
                                { title: 'ROI', value: summary.roi ?? 0, suffix: '%', color: (summary.roi || 0) >= 0 ? token.colorSuccess : token.colorError },
                            ].map((s) => (
                                <Col xs={8} md={4} key={s.title}>
                                    <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                                        <Statistic
                                            title={s.title}
                                            value={s.value}
                                            prefix={s.prefix}
                                            suffix={s.suffix}
                                            precision={s.precision}
                                            valueStyle={{ fontSize: 16, color: s.color }}
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    ) : null}

                    <ReusableCrud
                        title="Campaigns"
                        apiUrl={api('/api/crm-campaigns/')}
                        columns={columns}
                        fields={fields}
                        validationSchema={validationSchema}
                        crudInitialValues={{
                            name: '',
                            code: '',
                            source: null,
                            medium: null,
                            budget: null,
                            target_customers: null,
                            email_only_quantity: null,
                            sms_only_quantity: null,
                            contact_group_id: null,
                            start_date: null,
                            end_date: null,
                            status: 'draft',
                            description: '',
                            rules: [],
                        }}
                        transformPayload={transformPayload}
                        form_ui="modal"
                        modalWidth={900}
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
                        activeTableRowFunction={(record) => ({
                            onClick: (event) => {
                                if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                                router.visit(`/crm/campaigns/${record.id}`);
                            },
                            style: { cursor: 'pointer' },
                        })}
                    />
                </Space>
            </div>
        </AuthenticatedLayout>
    );
}
