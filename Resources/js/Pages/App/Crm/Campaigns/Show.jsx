import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    App, Alert, Button, Card, Col, Descriptions, Divider, Empty, Input, Modal,
    Row, Skeleton, Space, Statistic, Table, Tabs, Tag, Tooltip, Typography, theme,
} from 'antd';
import {
    ArrowLeftOutlined, MailOutlined, MessageOutlined, SendOutlined, EyeOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Text, Title, Paragraph } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatMoney = (v) => v != null ? Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
const formatDate = (v) => { if (!v) return '-'; try { return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return v; } };
const labelize = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';

const statusColor = { draft: 'default', active: 'success', paused: 'warning', completed: 'blue', cancelled: 'error' };
const dealStatusColor = { open: 'blue', won: 'green', lost: 'red', cancelled: 'default' };

const PLACEHOLDERS = [
    '{{contact_name}}', '{{contact_first_name}}', '{{contact_email}}', '{{contact_phone}}',
    '{{campaign_name}}', '{{campaign_code}}', '{{company_name}}',
];

function RelatedList({ endpoint, params, columns, emptyText, onRowClick }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        axios.get(api(endpoint), { params: { ...params, page_size: 50 }, headers: authHeaders() })
            .then((res) => {
                if (mounted) {
                    const d = res.data;
                    setRows(Array.isArray(d?.data) ? d.data : Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);
                }
            })
            .catch(() => { if (mounted) setRows([]); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [endpoint, JSON.stringify(params)]);

    return (
        <Table
            size="small"
            loading={loading}
            dataSource={rows}
            rowKey={(r, i) => r.id || i}
            columns={columns}
            pagination={{ pageSize: 15, hideOnSinglePage: true }}
            scroll={{ x: 600 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText || 'No records'} /> }}
            onRow={(record) => ({
                onClick: () => onRowClick?.(record),
                style: { cursor: onRowClick ? 'pointer' : 'default' },
            })}
        />
    );
}

function PlaceholderHints({ onInsert }) {
    return (
        <Space wrap size={4} style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Insert:</Text>
            {PLACEHOLDERS.map((p) => (
                <Tag key={p} style={{ cursor: 'pointer' }} onClick={() => onInsert(p)}>{p}</Tag>
            ))}
        </Space>
    );
}

function EmailTemplateEditor({ campaign, onSaved }) {
    const { message } = App.useApp();
    const [subject, setSubject] = useState(campaign.email_subject || '');
    const [preview, setPreview] = useState(campaign.email_preview_text || '');
    const [body, setBody] = useState(campaign.email_body || '');
    const [saving, setSaving] = useState(false);
    const [previewModal, setPreviewModal] = useState(null);

    useEffect(() => {
        setSubject(campaign.email_subject || '');
        setPreview(campaign.email_preview_text || '');
        setBody(campaign.email_body || '');
    }, [campaign.id]);

    const save = async () => {
        setSaving(true);
        try {
            await axios.patch(
                api(`/api/crm-campaigns/${campaign.id}`),
                { email_subject: subject, email_preview_text: preview, email_body: body },
                { headers: authHeaders() }
            );
            message.success('Email template saved');
            onSaved?.();
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to save template');
        } finally { setSaving(false); }
    };

    const doPreview = async () => {
        try {
            const res = await axios.post(
                api(`/api/crm-campaigns/${campaign.id}/preview-email`),
                { subject, body },
                { headers: authHeaders() }
            );
            setPreviewModal(res.data);
        } catch (e) {
            message.error(e?.response?.data?.message || 'Preview failed');
        }
    };

    return (
        <Card size="small" bordered={false} style={{ border: `1px solid #f0f0f0` }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Input
                    placeholder="Email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={255}
                />
                <Input
                    placeholder="Preview text (optional)"
                    value={preview}
                    onChange={(e) => setPreview(e.target.value)}
                    maxLength={255}
                />
                <Input.TextArea
                    placeholder="Email HTML/body. Supports placeholders."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    autoSize={{ minRows: 10, maxRows: 24 }}
                />
                <PlaceholderHints onInsert={(p) => setBody((b) => `${b}${p}`)} />
                <Space>
                    <Button type="primary" onClick={save} loading={saving}>Save Template</Button>
                    <Button icon={<EyeOutlined />} onClick={doPreview}>Preview</Button>
                </Space>
            </Space>

            <Modal
                title="Email Preview"
                open={!!previewModal}
                onCancel={() => setPreviewModal(null)}
                footer={null}
                width={720}
            >
                {previewModal ? (
                    <>
                        <Text type="secondary">Subject</Text>
                        <Title level={5} style={{ marginTop: 4 }}>{previewModal.subject || '-'}</Title>
                        <Divider style={{ margin: '8px 0' }} />
                        <div dangerouslySetInnerHTML={{ __html: previewModal.body || '' }} />
                        {previewModal.sample_contact ? (
                            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                                Rendered using contact: {previewModal.sample_contact.name}
                            </Text>
                        ) : null}
                    </>
                ) : null}
            </Modal>
        </Card>
    );
}

function SmsTemplateEditor({ campaign, onSaved }) {
    const { message } = App.useApp();
    const [body, setBody] = useState(campaign.sms_body || '');
    const [saving, setSaving] = useState(false);
    const [previewModal, setPreviewModal] = useState(null);

    useEffect(() => { setBody(campaign.sms_body || ''); }, [campaign.id]);

    const save = async () => {
        setSaving(true);
        try {
            await axios.patch(
                api(`/api/crm-campaigns/${campaign.id}`),
                { sms_body: body },
                { headers: authHeaders() }
            );
            message.success('SMS template saved');
            onSaved?.();
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to save template');
        } finally { setSaving(false); }
    };

    const doPreview = async () => {
        try {
            const res = await axios.post(
                api(`/api/crm-campaigns/${campaign.id}/preview-sms`),
                { body },
                { headers: authHeaders() }
            );
            setPreviewModal(res.data);
        } catch (e) {
            message.error(e?.response?.data?.message || 'Preview failed');
        }
    };

    return (
        <Card size="small" bordered={false} style={{ border: `1px solid #f0f0f0` }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Input.TextArea
                    placeholder="SMS body. Supports placeholders."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={1600}
                    autoSize={{ minRows: 4, maxRows: 10 }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                    {body.length} characters · ~{Math.ceil(Math.max(body.length, 1) / 160)} SMS segments
                </Text>
                <PlaceholderHints onInsert={(p) => setBody((b) => `${b}${p}`)} />
                <Space>
                    <Button type="primary" onClick={save} loading={saving}>Save Template</Button>
                    <Button icon={<EyeOutlined />} onClick={doPreview}>Preview</Button>
                </Space>
            </Space>

            <Modal
                title="SMS Preview"
                open={!!previewModal}
                onCancel={() => setPreviewModal(null)}
                footer={null}
            >
                {previewModal ? (
                    <>
                        <Paragraph style={{ background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
                            {previewModal.body || '-'}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {previewModal.characters} characters
                            {previewModal.sample_contact ? ` · contact: ${previewModal.sample_contact.name}` : ''}
                        </Text>
                    </>
                ) : null}
            </Modal>
        </Card>
    );
}

function BulkSendButton({ campaign, channel, label, icon, onSent }) {
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    const openModal = async () => {
        setOpen(true);
        setSummary(null);
        setDiagnostics(null);
        setResult(null);
        setLoading(true);
        try {
            const res = await axios.get(
                api(`/api/crm-campaigns/${campaign.id}/audience/${channel}`),
                { headers: authHeaders() }
            );
            setSummary(res.data?.summary || null);
            setDiagnostics(res.data?.diagnostics || null);
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to load audience');
        } finally { setLoading(false); }
    };

    const confirmSend = async () => {
        setSending(true);
        try {
            const endpoint = channel === 'email' ? 'send-bulk-email' : 'send-bulk-sms';
            const res = await axios.post(
                api(`/api/crm-campaigns/${campaign.id}/${endpoint}`),
                { confirm: true },
                { headers: authHeaders() }
            );
            setResult(res.data);
            message.success(`${labelize(channel)} send complete: ${res.data?.sent || 0} sent`);
            onSent?.();
        } catch (e) {
            message.error(e?.response?.data?.message || `${labelize(channel)} send failed`);
        } finally { setSending(false); }
    };

    return (
        <>
            <Button type="primary" icon={icon} onClick={openModal}>
                {label}
            </Button>

            <Modal
                title={`Send Bulk ${labelize(channel)}`}
                open={open}
                onCancel={() => setOpen(false)}
                footer={
                    result ? (
                        <Button onClick={() => setOpen(false)}>Close</Button>
                    ) : (
                        <Space>
                            <Button onClick={() => setOpen(false)}>Cancel</Button>
                            <Button
                                type="primary"
                                danger
                                loading={sending}
                                disabled={!summary || !summary.will_send}
                                onClick={confirmSend}
                            >
                                Send to {summary?.will_send ?? 0} contacts
                            </Button>
                        </Space>
                    )
                }
                width={520}
            >
                {loading ? <Skeleton active /> : null}

                {!loading && summary && !result ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {summary.will_send === 0 && diagnostics ? (
                            <Alert
                                type="error"
                                showIcon
                                message="No contacts will receive this message."
                                description={
                                    <div>
                                        <div>Filter breakdown:</div>
                                        <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                                            <li>Total contacts in system: <b>{diagnostics.contacts_total}</b></li>
                                            <li>Non-supplier contacts: <b>{diagnostics.contacts_non_supplier}</b></li>
                                            <li>
                                                {diagnostics.contact_group_id
                                                    ? <>In selected contact group: <b>{diagnostics.contacts_in_group}</b> (group is set on the campaign — clear it to broadcast wider)</>
                                                    : <>No contact group filter on campaign</>}
                                            </li>
                                            <li>
                                                With {channel === 'email' ? 'email address' : 'phone number'}:&nbsp;
                                                <b>{channel === 'email' ? diagnostics.contacts_with_email : diagnostics.contacts_with_phone}</b>
                                            </li>
                                        </ul>
                                        <div style={{ marginTop: 6 }}>
                                            Fix whichever count above is zero, then reopen this dialog.
                                        </div>
                                    </div>
                                }
                            />
                        ) : (
                            <Alert
                                type="warning"
                                showIcon
                                message="Please review carefully before sending. Sends are not reversible."
                            />
                        )}
                        <Descriptions size="small" column={1} bordered>
                            <Descriptions.Item label="Target group total">{summary.total}</Descriptions.Item>
                            <Descriptions.Item label={`Eligible (has ${channel === 'email' ? 'email' : 'phone'})`}>{summary.eligible}</Descriptions.Item>
                            <Descriptions.Item label={`Missing ${channel === 'email' ? 'email' : 'phone'}`}>{summary.missing_contact_info}</Descriptions.Item>
                            <Descriptions.Item label="Limit configured">{summary.limit ?? 'No limit'}</Descriptions.Item>
                            <Descriptions.Item label="Will send to"><Text strong>{summary.will_send}</Text></Descriptions.Item>
                        </Descriptions>
                    </Space>
                ) : null}

                {result ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Alert
                            type={result.failed > 0 ? 'warning' : 'success'}
                            showIcon
                            message={`${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`}
                        />
                        {result.sample_errors?.length ? (
                            <Card size="small" title="Sample errors">
                                {result.sample_errors.map((err, i) => (
                                    <Paragraph key={i} type="danger" style={{ marginBottom: 4 }}>{err}</Paragraph>
                                ))}
                            </Card>
                        ) : null}
                    </Space>
                ) : null}
            </Modal>
        </>
    );
}

export default function CampaignShow({ auth }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { props } = usePage();
    const campaignId = props.id;

    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(api(`/api/crm-campaigns/${campaignId}`), { headers: authHeaders() });
            setCampaign(res.data?.data || res.data);
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to load campaign');
        } finally { setLoading(false); }
    }, [campaignId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>Loading...</Title>}>
                <Head title="Campaign" />
                <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
            </AuthenticatedLayout>
        );
    }

    if (!campaign) {
        return (
            <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>Not Found</Title>}>
                <Head title="Campaign Not Found" />
                <Empty description="Campaign not found" />
            </AuthenticatedLayout>
        );
    }

    const stats = campaign.stats || {};
    const rules = Array.isArray(campaign.rules) ? campaign.rules : [];

    const headerNode = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
                <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => router.visit('/crm/campaigns')} />
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{campaign.code || '-'}</Text>
                    <Title level={5} style={{ margin: 0 }}>{campaign.name}</Title>
                </div>
            </Space>
            <Space wrap>
                <Tag color={statusColor[campaign.status]}>{labelize(campaign.status)}</Tag>
                {campaign.source && <Tag>{labelize(campaign.source)}</Tag>}
                {campaign.medium && <Tag>{labelize(campaign.medium)}</Tag>}
                <BulkSendButton campaign={campaign} channel="email" label="Send Bulk Email" icon={<MailOutlined />} onSent={load} />
                <BulkSendButton campaign={campaign} channel="sms" label="Send Bulk SMS" icon={<MessageOutlined />} onSent={load} />
            </Space>
        </div>
    );

    const overviewTab = (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Row gutter={[12, 12]}>
                {[
                    { title: 'Budget', value: campaign.budget, prefix: 'Rs.' },
                    { title: 'Actual Cost', value: stats.actual_cost, prefix: 'Rs.' },
                    { title: 'Revenue', value: stats.revenue, prefix: 'Rs.', color: token.colorSuccess },
                    { title: 'ROI', value: stats.roi, suffix: '%', color: stats.roi > 0 ? token.colorSuccess : stats.roi < 0 ? token.colorError : undefined },
                    { title: 'Target', value: campaign.target_customers ?? '-' },
                    { title: 'Email Qty', value: campaign.email_only_quantity ?? '-' },
                    { title: 'SMS Qty', value: campaign.sms_only_quantity ?? '-' },
                    { title: 'Won Deals', value: stats.won_deals_count, color: token.colorSuccess },
                ].map((s, i) => (
                    <Col xs={12} sm={8} md={6} key={i}>
                        <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                            <Statistic
                                title={s.title}
                                value={s.value ?? 0}
                                prefix={s.prefix}
                                suffix={s.suffix}
                                precision={s.prefix ? 0 : undefined}
                                valueStyle={{ fontSize: 16, color: s.color }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card size="small" title="Details" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Name">{campaign.name}</Descriptions.Item>
                    <Descriptions.Item label="Code">{campaign.code || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={statusColor[campaign.status]}>{labelize(campaign.status)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Source">{labelize(campaign.source) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Medium">{labelize(campaign.medium) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Budget">{formatMoney(campaign.budget)}</Descriptions.Item>
                    <Descriptions.Item label="Start Date">{formatDate(campaign.start_date)}</Descriptions.Item>
                    <Descriptions.Item label="End Date">{formatDate(campaign.end_date)}</Descriptions.Item>
                    <Descriptions.Item label="Contact Group">{campaign.contact_group?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Branch">{campaign.branch?.name || '-'}</Descriptions.Item>
                    {campaign.description ? <Descriptions.Item label="Description" span={2}>{campaign.description}</Descriptions.Item> : null}
                </Descriptions>
            </Card>

            {rules.length ? (
                <Card size="small" title="Campaign Rules" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                    <Table
                        size="small"
                        dataSource={rules.map((r, i) => ({ ...r, _i: i }))}
                        rowKey="_i"
                        pagination={false}
                        columns={[
                            { title: 'Type', dataIndex: 'rule_type', render: labelize },
                            { title: 'Condition', dataIndex: 'operator' },
                            { title: 'Value', dataIndex: 'value' },
                            { title: 'Action', dataIndex: 'action' },
                            { title: 'Active', dataIndex: 'active', render: (v) => v === false ? <Tag>No</Tag> : <Tag color="green">Yes</Tag> },
                        ]}
                    />
                </Card>
            ) : null}
        </Space>
    );

    const templatesTab = (
        <Row gutter={[12, 12]}>
            <Col xs={24} lg={14}>
                <Card size="small" title="Email Template" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                    <EmailTemplateEditor campaign={campaign} onSaved={load} />
                </Card>
            </Col>
            <Col xs={24} lg={10}>
                <Card size="small" title="SMS Template" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                    <SmsTemplateEditor campaign={campaign} onSaved={load} />
                </Card>
            </Col>
        </Row>
    );

    const leadColumns = [
        { title: 'Lead', dataIndex: 'name', key: 'name', render: (v, r) => <><Text strong>{v}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{r.company_name || ''}</Text></> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={v === 'converted' ? 'purple' : v === 'lost' ? 'red' : 'blue'}>{labelize(v)}</Tag> },
        { title: 'Value', dataIndex: 'expected_value', key: 'value', width: 120, align: 'right', render: formatMoney },
    ];

    const dealColumns = [
        { title: 'Deal', dataIndex: 'title', key: 'title', render: (v) => <Text strong>{v}</Text> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={dealStatusColor[v] || 'default'}>{labelize(v)}</Tag> },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', render: formatMoney },
    ];

    const billColumns = [
        { title: 'Bill No', dataIndex: 'bill_no', key: 'bill_no', render: (v) => <Text strong>{v || '-'}</Text> },
        { title: 'Date', dataIndex: 'bill_date', key: 'date', width: 130, render: formatDate },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right', render: formatMoney },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag>{labelize(v)}</Tag> },
    ];

    const ticketColumns = [
        { title: 'Ticket', dataIndex: 'ticket_no', key: 'ticket_no', render: (v, r) => <><Text strong>{v}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{r.subject}</Text></> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 130, render: (v) => <Tag>{labelize(v)}</Tag> },
        { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100, render: (v) => <Tag>{labelize(v)}</Tag> },
    ];

    const sendLogColumns = [
        { title: 'Channel', dataIndex: 'channel', key: 'channel', width: 80, render: (v) => <Tag>{labelize(v)}</Tag> },
        { title: 'To', dataIndex: 'to_address', key: 'to_address' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={v === 'sent' ? 'green' : v === 'failed' ? 'red' : 'default'}>{labelize(v)}</Tag> },
        { title: 'Sent At', dataIndex: 'sent_at', key: 'sent_at', width: 160, render: (v) => v ? new Date(v).toLocaleString() : '-' },
        { title: 'Error', dataIndex: 'error', key: 'error', ellipsis: true },
    ];

    const tabItems = [
        { key: 'overview', label: 'Overview', children: overviewTab },
        { key: 'templates', label: 'Email & SMS Templates', children: templatesTab },
        {
            key: 'leads', label: `Leads (${stats.leads_count || 0})`,
            children: (
                <RelatedList
                    endpoint="/api/leads/"
                    params={{ campaign_id: campaignId }}
                    columns={leadColumns}
                    onRowClick={(r) => router.visit(`/crm/leads/${r.id}`)}
                />
            ),
        },
        {
            key: 'deals', label: `Deals (${stats.deals_count || 0})`,
            children: (
                <RelatedList
                    endpoint="/api/deals/"
                    params={{ campaign_id: campaignId }}
                    columns={dealColumns}
                    onRowClick={(r) => router.visit(`/crm/deals/${r.id}`)}
                />
            ),
        },
        {
            key: 'costs', label: 'Purchase Bills',
            children: (
                <RelatedList
                    endpoint="/api/purchase-bills/"
                    params={{ campaign_id: campaignId }}
                    columns={billColumns}
                    onRowClick={(r) => router.visit(`/payment-out/purchase-bills/${r.id}`)}
                />
            ),
        },
        {
            key: 'support_tickets', label: 'Support Tickets',
            children: (
                <RelatedList
                    endpoint="/api/support-tickets/"
                    params={{ campaign_id: campaignId }}
                    columns={ticketColumns}
                    onRowClick={(r) => router.visit(`/crm/tickets/${r.id}`)}
                />
            ),
        },
        {
            key: 'send_logs', label: 'Send Logs',
            children: (
                <RelatedList
                    endpoint={`/api/crm-campaigns/${campaignId}/send-logs`}
                    params={{}}
                    columns={sendLogColumns}
                />
            ),
        },
    ];

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title={`${campaign.name} - Campaign`} />
            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Tabs items={tabItems} size="small" />
            </div>
        </AuthenticatedLayout>
    );
}
