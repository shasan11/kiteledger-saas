import { useCallback, useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    App,
    Avatar,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Drawer,
    Empty,
    Form,
    Input,
    Row,
    Select,
    Skeleton,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Timeline,
    Typography,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckOutlined,
    EditOutlined,
    MessageOutlined,
    SendOutlined,
    UserOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import TicketComments from './components/TicketComments';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const STATUS_OPTIONS = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Waiting Customer', value: 'waiting_customer' },
    { label: 'Waiting Internal', value: 'waiting_internal' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
];

const PRIORITY_OPTIONS = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
];

const statusColor = {
    open: 'blue', in_progress: 'processing', waiting_customer: 'gold',
    waiting_internal: 'orange', resolved: 'success', closed: 'default',
};
const priorityColor = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };

const labelize = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';
const formatDateTime = (v) => {
    if (!v) return '-';
    try { return new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return v; }
};
const formatDate = (v) => {
    if (!v) return '-';
    try { return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return v; }
};

const safeRoute = (name, params, fallback) => {
    try { if (typeof route === 'function') return params ? route(name, params) : route(name); } catch {}
    return fallback;
};

export default function TicketShow() {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { props } = usePage();
    const ticketId = props.id;

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm] = Form.useForm();
    const [editLoading, setEditLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const loadTicket = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(api(`/api/support-tickets/${ticketId}`));
            setTicket(res.data?.data || res.data);
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to load ticket');
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => { loadTicket(); }, [loadTicket]);

    const updateStatus = async (newStatus) => {
        try {
            await axios.patch(api(`/api/support-tickets/${ticketId}/status`), { status: newStatus });
            message.success('Status updated');
            loadTicket();
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to update status');
        }
    };

    const handleEdit = async (values) => {
        setEditLoading(true);
        try {
            await axios.patch(api(`/api/support-tickets/${ticketId}`), values);
            message.success('Ticket updated');
            setEditOpen(false);
            loadTicket();
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to update ticket');
        } finally {
            setEditLoading(false);
        }
    };

    if (loading) {
        return (
            <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>Loading...</Title>}>
                <Head title="Ticket" />
                <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 10 }} /></div>
            </AuthenticatedLayout>
        );
    }

    if (!ticket) {
        return (
            <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>Ticket Not Found</Title>}>
                <Head title="Ticket Not Found" />
                <Empty description="Ticket not found" />
            </AuthenticatedLayout>
        );
    }

    const isOverdue = ticket.due_at && new Date(ticket.due_at) < new Date() && !['resolved', 'closed'].includes(ticket.status);
    const isClosed = ticket.status === 'closed';

    const headerNode = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
                <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => router.visit('/support/tickets')} />
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{ticket.ticket_no}</Text>
                    <Title level={5} style={{ margin: 0 }}>{ticket.subject}</Title>
                </div>
            </Space>
            <Space wrap>
                <Tag color={statusColor[ticket.status]}>{labelize(ticket.status)}</Tag>
                <Tag color={priorityColor[ticket.priority]}>{labelize(ticket.priority)}</Tag>
                {isOverdue ? <Tag color="error">Overdue</Tag> : null}
                <Select
                    size="small"
                    value={ticket.status}
                    options={STATUS_OPTIONS}
                    onChange={updateStatus}
                    style={{ width: 160 }}
                    disabled={isClosed}
                />
                <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                        editForm.setFieldsValue({
                            subject: ticket.subject,
                            description: ticket.description,
                            priority: ticket.priority,
                            category: ticket.category,
                            source: ticket.source,
                        });
                        setEditOpen(true);
                    }}
                >
                    Edit
                </Button>
                {isClosed ? (
                    <Button size="small" onClick={() => updateStatus('open')}>Reopen</Button>
                ) : ticket.status !== 'resolved' ? (
                    <Button size="small" icon={<CheckOutlined />} onClick={() => updateStatus('resolved')}>Resolve</Button>
                ) : null}
            </Space>
        </div>
    );

    const overviewTab = (
        <Row gutter={[12, 12]}>
            <Col xs={24} md={16}>
                <Card size="small" title="Details" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                    <Descriptions column={{ xs: 1, sm: 2 }} size="small" labelStyle={{ fontWeight: 500, color: token.colorTextSecondary }}>
                        <Descriptions.Item label="Ticket No">{ticket.ticket_no}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={statusColor[ticket.status]}>{labelize(ticket.status)}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Priority"><Tag color={priorityColor[ticket.priority]}>{labelize(ticket.priority)}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Category">{labelize(ticket.category)}</Descriptions.Item>
                        <Descriptions.Item label="Source">{labelize(ticket.source)}</Descriptions.Item>
                        <Descriptions.Item label="Branch">{ticket.branch?.name || '-'}</Descriptions.Item>
                    </Descriptions>
                </Card>

                {ticket.description ? (
                    <Card size="small" title="Description" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}`, marginTop: 12 }}>
                        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{ticket.description}</Paragraph>
                    </Card>
                ) : null}
            </Col>

            <Col xs={24} md={8}>
                <Card size="small" title="People" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Contact</Text>
                            <div>
                                {ticket.contact ? (
                                    <a onClick={() => router.visit(safeRoute('crm.contacts.show', ticket.contact_id, `/crm/contacts/${ticket.contact_id}`))}>
                                        {ticket.contact.name}
                                    </a>
                                ) : '-'}
                            </div>
                        </div>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Assigned To</Text>
                            <div>{ticket.assigned_to?.name || ticket.assigned_to?.display_name || '-'}</div>
                        </div>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Created By</Text>
                            <div>{ticket.created_by?.name || ticket.created_by?.display_name || '-'}</div>
                        </div>
                    </Space>
                </Card>

                <Card size="small" title="Dates" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}`, marginTop: 12 }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Created</Text><div>{formatDateTime(ticket.created_at)}</div></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Due</Text><div><Text type={isOverdue ? 'danger' : undefined}>{formatDateTime(ticket.due_at)}</Text></div></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>First Response</Text><div>{formatDateTime(ticket.first_response_at)}</div></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Resolved</Text><div>{formatDateTime(ticket.resolved_at)}</div></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Closed</Text><div>{formatDateTime(ticket.closed_at)}</div></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Last Activity</Text><div>{formatDateTime(ticket.last_activity_at)}</div></div>
                    </Space>
                </Card>

                {(ticket.lead || ticket.deal || ticket.campaign) ? (
                    <Card size="small" title="Related Records" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}`, marginTop: 12 }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            {ticket.lead ? (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Lead</Text>
                                    <div>
                                        <a onClick={() => router.visit(safeRoute('crm.leads.show', ticket.lead_id, `/crm/leads/${ticket.lead_id}`))}>
                                            {ticket.lead.name || ticket.lead.lead_no}
                                        </a>
                                    </div>
                                </div>
                            ) : null}
                            {ticket.deal ? (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Deal</Text>
                                    <div>
                                        <a onClick={() => router.visit(safeRoute('crm.deals.show', ticket.deal_id, `/crm/deals/${ticket.deal_id}`))}>
                                            {ticket.deal.title || ticket.deal.deal_no}
                                        </a>
                                    </div>
                                </div>
                            ) : null}
                            {ticket.campaign ? (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Campaign</Text>
                                    <div>{ticket.campaign.name}</div>
                                </div>
                            ) : null}
                        </Space>
                    </Card>
                ) : null}
            </Col>
        </Row>
    );

    const tabItems = [
        { key: 'overview', label: 'Overview', children: overviewTab },
        {
            key: 'conversation',
            label: 'Conversation',
            children: <TicketComments ticketId={ticketId} isInternal={false} />,
        },
        {
            key: 'internal_notes',
            label: 'Internal Notes',
            children: <TicketComments ticketId={ticketId} isInternal={true} />,
        },
    ];

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title={`${ticket.ticket_no} - ${ticket.subject}`} />

            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="small" />
            </div>

            <Drawer
                title="Edit Ticket"
                open={editOpen}
                onClose={() => setEditOpen(false)}
                width={480}
                footer={
                    <Space style={{ float: 'right' }}>
                        <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="primary" loading={editLoading} onClick={() => editForm.submit()}>Save</Button>
                    </Space>
                }
            >
                <Form form={editForm} layout="vertical" onFinish={handleEdit}>
                    <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={4} />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="priority" label="Priority">
                                <Select options={PRIORITY_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="category" label="Category">
                                <Select allowClear options={[
                                    { label: 'General', value: 'general' },
                                    { label: 'Billing', value: 'billing' },
                                    { label: 'Technical', value: 'technical' },
                                    { label: 'Account', value: 'account' },
                                    { label: 'Product', value: 'product' },
                                    { label: 'POS', value: 'pos' },
                                    { label: 'CRM', value: 'crm' },
                                    { label: 'Inventory', value: 'inventory' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="source" label="Source">
                        <Select allowClear options={[
                            { label: 'Manual', value: 'manual' },
                            { label: 'Email', value: 'email' },
                            { label: 'Phone', value: 'phone' },
                            { label: 'WhatsApp', value: 'whatsapp' },
                            { label: 'Web', value: 'web' },
                            { label: 'Internal', value: 'internal' },
                        ]} />
                    </Form.Item>
                </Form>
            </Drawer>
        </AuthenticatedLayout>
    );
}
