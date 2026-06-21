import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    App,
    Button,
    Card,
    Col,
    DatePicker,
    Dropdown,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    theme,
} from 'antd';
import {
    CalendarOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    MoreOutlined,
    PlusOutlined,
    SendOutlined,
    StopOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const typeOptions = [
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'email_sms', label: 'Email + SMS' },
];

const statusOptions = [
    'draft',
    'ready',
    'scheduled',
    'partially_sent',
    'sending',
    'sent',
    'failed',
    'cancelled',
].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) }));

const priorityOptions = ['low', 'normal', 'high', 'urgent'].map((value) => ({ value, label: value.replace(/\b\w/g, (char) => char.toUpperCase()) }));
const statusColor = {
    draft: 'default',
    ready: 'processing',
    scheduled: 'gold',
    partially_sent: 'purple',
    sending: 'cyan',
    sent: 'green',
    failed: 'red',
    cancelled: 'default',
};

const labelize = (value) => (value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '-');
const dateText = (value) => {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
};

function StatCard({ title, value, color }) {
    const { token } = theme.useToken();
    return (
        <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
            <Statistic title={title} value={value ?? 0} valueStyle={{ fontSize: 16, color }} />
        </Card>
    );
}

function CampaignFormModal({ open, record, onClose, onSaved }) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            title: record?.title || record?.name || '',
            code: record?.code || '',
            type: record?.type || 'email_sms',
            description: record?.description || '',
            default_sender_name: record?.default_sender_name || '',
            default_sender_email: record?.default_sender_email || '',
            default_reply_to_email: record?.default_reply_to_email || '',
            default_sms_sender_id: record?.default_sms_sender_id || '',
            priority: record?.priority || 'normal',
            status: record?.status || 'draft',
            tags: Array.isArray(record?.tags) ? record.tags : [],
            internal_remarks: record?.internal_remarks || '',
        });
    }, [form, open, record]);

    const save = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            if (record?.id) {
                await axios.patch(api(`/api/crm-campaigns/${record.id}`), values, { headers: authHeaders() });
            } else {
                await axios.post(api('/api/crm-campaigns'), values, { headers: authHeaders() });
            }
            message.success(record?.id ? 'Campaign updated' : 'Campaign created');
            onSaved?.();
            onClose?.();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to save campaign');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title={record?.id ? 'Edit Campaign' : 'New Campaign'}
            open={open}
            onCancel={onClose}
            onOk={save}
            confirmLoading={saving}
            width={860}
            destroyOnClose
        >
            <Form form={form} layout="vertical" size="middle">
                <Row gutter={12}>
                    <Col xs={24} md={16}>
                        <Form.Item name="title" label="Campaign title" rules={[{ required: true, message: 'Campaign title is required' }]}>
                            <Input maxLength={180} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="code" label="Campaign code">
                            <Input maxLength={60} placeholder="Auto-generated" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="type" label="Campaign type" rules={[{ required: true }]}>
                            <Select options={typeOptions} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="status" label="Status">
                            <Select options={statusOptions} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="priority" label="Priority">
                            <Select options={priorityOptions} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="default_sender_name" label="Default sender name">
                            <Input maxLength={180} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="default_sender_email" label="Default sender email" rules={[{ type: 'email' }]}>
                            <Input maxLength={180} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="default_reply_to_email" label="Default reply-to email" rules={[{ type: 'email' }]}>
                            <Input maxLength={180} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="default_sms_sender_id" label="Default SMS sender ID">
                            <Input maxLength={60} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                        <Form.Item name="tags" label="Tags">
                            <Select mode="tags" tokenSeparators={[',']} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="description" label="Description / internal note">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="internal_remarks" label="Internal remarks">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}

export default function Campaigns({ auth }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', type: null, status: null });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [modal, setModal] = useState({ open: false, record: null });
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const load = async (page = pagination.current, pageSize = pagination.pageSize) => {
        setLoading(true);
        try {
            const [listRes, summaryRes] = await Promise.all([
                axios.get(api('/api/crm-campaigns'), {
                    headers: authHeaders(),
                    params: {
                        page,
                        page_size: pageSize,
                        search: filters.search || undefined,
                        type: filters.type || undefined,
                        status: filters.status || undefined,
                    },
                }),
                axios.get(api('/api/crm-campaigns/summary'), { headers: authHeaders() }),
            ]);

            const payload = listRes.data;
            setRows(payload.results || payload.data || []);
            setPagination({ current: page, pageSize, total: payload.count || payload.meta?.total || 0 });
            setSummary(summaryRes.data || {});
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(1, pagination.pageSize);
    }, [filters.type, filters.status]);

    const duplicateCampaign = async (record) => {
        try {
            await axios.post(api(`/api/crm-campaigns/${record.id}/duplicate`), {}, { headers: authHeaders() });
            message.success('Campaign duplicated');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Duplicate failed');
        }
    };

    const sendCampaign = async (record) => {
        try {
            await axios.post(api(`/api/crm-campaigns/${record.id}/send`), {}, { headers: authHeaders() });
            message.success('Campaign send started');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Send failed');
        }
    };

    const cancelCampaign = async (record) => {
        try {
            await axios.post(api(`/api/crm-campaigns/${record.id}/cancel`), {}, { headers: authHeaders() });
            message.success('Scheduled sends cancelled');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Cancel failed');
        }
    };

    const deleteCampaign = async (record) => {
        try {
            await axios.delete(api(`/api/crm-campaigns/${record.id}`), { headers: authHeaders() });
            message.success('Campaign deleted');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Delete failed');
        }
    };

    const bulkSend = async () => {
        const selected = rows.filter((row) => selectedRowKeys.includes(row.id));
        for (const record of selected) {
            await sendCampaign(record);
        }
        setSelectedRowKeys([]);
    };

    const columns = useMemo(() => [
        {
            title: 'Campaign title',
            dataIndex: 'title',
            fixed: 'left',
            width: 240,
            render: (value, record) => (
                <Space direction="vertical" size={0}>
                    <Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 600 }} onClick={() => router.visit(`/crm/campaigns/${record.id}`)}>
                        {value || record.name}
                    </Button>
                    <Text type="secondary" style={{ fontSize: 11 }}>{record.code || '-'}</Text>
                </Space>
            ),
        },
        { title: 'Campaign type', dataIndex: 'type', width: 130, render: labelize },
        { title: 'Status', dataIndex: 'status', width: 130, render: (value) => <Tag color={statusColor[value]}>{labelize(value)}</Tag> },
        { title: 'Email msg', width: 90, align: 'right', render: (_, record) => record.stats?.total_email_messages ?? 0 },
        { title: 'SMS msg', width: 80, align: 'right', render: (_, record) => record.stats?.total_sms_messages ?? 0 },
        { title: 'Recipients', width: 100, align: 'right', render: (_, record) => record.stats?.total_recipients ?? 0 },
        { title: 'Scheduled', width: 100, align: 'right', render: (_, record) => record.stats?.scheduled_messages ?? 0 },
        { title: 'Sent msg', width: 90, align: 'right', render: (_, record) => record.stats?.sent_messages ?? 0 },
        { title: 'Failed', width: 80, align: 'right', render: (_, record) => record.stats?.failed_sends ?? 0 },
        { title: 'Bounced', width: 90, align: 'right', render: (_, record) => record.stats?.bounce_count ?? 0 },
        { title: 'Delivered', width: 100, align: 'right', render: (_, record) => record.stats?.delivered_count ?? 0 },
        { title: 'Opened', width: 90, align: 'right', render: (_, record) => record.stats?.open_count ?? 0 },
        { title: 'Clicked', width: 90, align: 'right', render: (_, record) => record.stats?.click_count ?? 0 },
        { title: 'Created by', width: 140, render: (_, record) => record.created_by?.label || record.created_by_name || '-' },
        { title: 'Created date', dataIndex: 'created_at', width: 170, render: dateText },
        { title: 'Last activity', dataIndex: 'last_activity_at', width: 170, render: dateText },
        {
            title: 'Actions',
            fixed: 'right',
            width: 82,
            render: (_, record) => (
                <Dropdown
                    trigger={['click']}
                    menu={{
                        items: [
                            { key: 'view', icon: <EyeOutlined />, label: 'View' },
                            { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
                            { key: 'duplicate', icon: <CopyOutlined />, label: 'Duplicate' },
                            { key: 'send', icon: <SendOutlined />, label: 'Send campaign' },
                            { key: 'cancel', icon: <StopOutlined />, label: 'Cancel scheduled sends' },
                            { type: 'divider' },
                            { key: 'delete', icon: <DeleteOutlined />, danger: true, label: 'Delete' },
                        ],
                        onClick: ({ key }) => {
                            if (key === 'view') router.visit(`/crm/campaigns/${record.id}`);
                            if (key === 'edit') setModal({ open: true, record });
                            if (key === 'duplicate') duplicateCampaign(record);
                            if (key === 'send') sendCampaign(record);
                            if (key === 'cancel') cancelCampaign(record);
                            if (key === 'delete') deleteCampaign(record);
                        },
                    }}
                >
                    <Button icon={<MoreOutlined />} size="small" />
                </Dropdown>
            ),
        },
    ], [rows]);

    return (
        <AuthenticatedLayout user={auth?.user} header={<Text strong style={{ fontSize: 16 }}>Campaign CMS / Marketing Campaigns</Text>}>
            <Head title="Campaign CMS" />

            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Row gutter={[12, 12]}>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Total campaigns" value={summary.total_campaigns} /></Col>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Draft" value={summary.draft_campaigns} /></Col>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Ready" value={summary.ready_campaigns} /></Col>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Scheduled" value={summary.scheduled_campaigns} /></Col>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Sending" value={summary.sending_campaigns} /></Col>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Sent" value={summary.sent_campaigns} color={token.colorSuccess} /></Col>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Failed sends" value={summary.failed_sends} color={token.colorError} /></Col>
                        <Col xs={12} sm={8} lg={3}><StatCard title="Reached" value={summary.total_recipients_reached} /></Col>
                    </Row>

                    <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            <Row gutter={[8, 8]} align="middle">
                                <Col xs={24} md={7}>
                                    <Input.Search
                                        allowClear
                                        placeholder="Search title or code"
                                        value={filters.search}
                                        onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                                        onSearch={() => load(1)}
                                    />
                                </Col>
                                <Col xs={12} md={4}>
                                    <Select allowClear placeholder="Campaign type" value={filters.type} onChange={(value) => setFilters((current) => ({ ...current, type: value }))} options={typeOptions} style={{ width: '100%' }} />
                                </Col>
                                <Col xs={12} md={4}>
                                    <Select allowClear placeholder="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={statusOptions} style={{ width: '100%' }} />
                                </Col>
                                <Col xs={24} md={5}>
                                    <RangePicker style={{ width: '100%' }} placeholder={['Created from', 'Created to']} />
                                </Col>
                                <Col xs={24} md={4}>
                                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                        {selectedRowKeys.length ? (
                                            <Popconfirm title={`Send ${selectedRowKeys.length} selected campaigns?`} onConfirm={bulkSend}>
                                                <Button icon={<SendOutlined />}>Send selected</Button>
                                            </Popconfirm>
                                        ) : null}
                                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, record: null })}>
                                            New
                                        </Button>
                                    </Space>
                                </Col>
                            </Row>

                            <Table
                                size="small"
                                rowKey="id"
                                loading={loading}
                                dataSource={rows}
                                columns={columns}
                                rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                                pagination={{
                                    current: pagination.current,
                                    pageSize: pagination.pageSize,
                                    total: pagination.total,
                                    showSizeChanger: true,
                                    onChange: load,
                                }}
                                scroll={{ x: 2100 }}
                                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No campaigns found" /> }}
                            />
                        </Space>
                    </Card>
                </Space>
            </div>

            <CampaignFormModal
                open={modal.open}
                record={modal.record}
                onClose={() => setModal({ open: false, record: null })}
                onSaved={() => load(1)}
            />
        </AuthenticatedLayout>
    );
}
