import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    App,
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
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
    Tabs,
    Tag,
    Tooltip,
    Typography,
    Upload,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    CalendarOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    FileAddOutlined,
    MailOutlined,
    MessageOutlined,
    PlusOutlined,
    ReloadOutlined,
    SendOutlined,
    StopOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Text, Title, Paragraph } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = (extra = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
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
const statusColor = {
    draft: 'default',
    ready: 'processing',
    scheduled: 'gold',
    queued: 'cyan',
    sending: 'cyan',
    sent: 'green',
    delivered: 'green',
    partially_sent: 'purple',
    failed: 'red',
    bounced: 'volcano',
    opened: 'blue',
    clicked: 'purple',
    skipped: 'default',
    unsubscribed: 'orange',
    cancelled: 'default',
};
const placeholders = [
    '{{contact_name}}',
    '{{first_name}}',
    '{{last_name}}',
    '{{company_name}}',
    '{{email}}',
    '{{phone}}',
    '{{campaign_title}}',
    '{{campaign_code}}',
    '{{unsubscribe_link}}',
];

function Metric({ title, value, color }) {
    const { token } = theme.useToken();
    return (
        <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
            <Statistic title={title} value={value ?? 0} valueStyle={{ fontSize: 16, color }} />
        </Card>
    );
}

function MessageModal({ type, open, record, campaign, onClose, onSaved }) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const isEmail = type === 'email';

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            title: record?.title || '',
            code: record?.code || '',
            subject: record?.subject || '',
            preview_text: record?.preview_text || '',
            sender_name: record?.sender_name || campaign?.default_sender_name || '',
            sender_email: record?.sender_email || campaign?.default_sender_email || '',
            reply_to_email: record?.reply_to_email || campaign?.default_reply_to_email || '',
            sender_id: record?.sender_id || campaign?.default_sms_sender_id || '',
            body: record?.body || '',
            send_order: record?.send_order || 1,
            delay_minutes: record?.delay_minutes || null,
            priority: record?.priority || 'normal',
            status: record?.status || 'draft',
            send_mode: record?.send_mode || 'draft',
            is_active: record?.is_active !== false,
            track_opens: record?.track_opens !== false,
            track_clicks: record?.track_clicks !== false,
            notes: record?.notes || '',
        });
    }, [campaign, form, open, record]);

    const save = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            const base = isEmail ? 'email-messages' : 'sms-messages';
            if (record?.id) {
                await axios.patch(api(`/api/crm-campaigns/${campaign.id}/${base}/${record.id}`), values, { headers: authHeaders() });
            } else {
                await axios.post(api(`/api/crm-campaigns/${campaign.id}/${base}`), values, { headers: authHeaders() });
            }
            message.success(isEmail ? 'Email message saved' : 'SMS message saved');
            onSaved?.();
            onClose?.();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Message save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title={`${record?.id ? 'Edit' : 'Add'} ${isEmail ? 'Email' : 'SMS'} Message`}
            open={open}
            onCancel={onClose}
            onOk={save}
            confirmLoading={saving}
            width={isEmail ? 960 : 760}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Row gutter={12}>
                    <Col xs={24} md={16}>
                        <Form.Item name="title" label="Message title" rules={[{ required: true }]}>
                            <Input maxLength={180} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="code" label="Internal code">
                            <Input maxLength={80} placeholder="Auto-generated" />
                        </Form.Item>
                    </Col>
                    {isEmail ? (
                        <>
                            <Col xs={24}>
                                <Form.Item name="subject" label="Subject">
                                    <Input maxLength={255} />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item name="preview_text" label="Preview text">
                                    <Input maxLength={255} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="sender_name" label="Sender name">
                                    <Input maxLength={180} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="sender_email" label="Sender email" rules={[{ type: 'email' }]}>
                                    <Input maxLength={180} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="reply_to_email" label="Reply-to email" rules={[{ type: 'email' }]}>
                                    <Input maxLength={180} />
                                </Form.Item>
                            </Col>
                        </>
                    ) : (
                        <Col xs={24} md={8}>
                            <Form.Item name="sender_id" label="SMS sender ID">
                                <Input maxLength={60} />
                            </Form.Item>
                        </Col>
                    )}
                    <Col xs={24}>
                        <Form.Item name="body" label={isEmail ? 'Email body' : 'SMS body'}>
                            <Input.TextArea rows={isEmail ? 12 : 5} maxLength={isEmail ? undefined : 1600} />
                        </Form.Item>
                        <Space wrap size={4} style={{ marginTop: -12, marginBottom: 12 }}>
                            {placeholders.map((item) => (
                                <Tag key={item} onClick={() => form.setFieldValue('body', `${form.getFieldValue('body') || ''}${item}`)} style={{ cursor: 'pointer' }}>
                                    {item}
                                </Tag>
                            ))}
                        </Space>
                    </Col>
                    <Col xs={12} md={6}>
                        <Form.Item name="send_order" label="Send order">
                            <Input type="number" min={1} />
                        </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                        <Form.Item name="delay_minutes" label="Delay minutes">
                            <Input type="number" min={0} />
                        </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                        <Form.Item name="priority" label="Priority">
                            <Select options={['low', 'normal', 'high', 'urgent'].map((value) => ({ value, label: labelize(value) }))} />
                        </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                        <Form.Item name="status" label="Status">
                            <Select options={['draft', 'ready', 'scheduled', 'queued', 'sending', 'sent', 'partially_sent', 'failed', 'cancelled'].map((value) => ({ value, label: labelize(value) }))} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="notes" label="Notes">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}

function RecipientDrawer({ type, campaign, messageRecord, open, onClose, onChanged }) {
    const { message } = App.useApp();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [manual, setManual] = useState('');
    const [groupId, setGroupId] = useState(null);
    const [groups, setGroups] = useState([]);
    const isEmail = type === 'email';

    const load = useCallback(async () => {
        if (!campaign?.id || !messageRecord?.id || !open) return;
        setLoading(true);
        try {
            const res = await axios.get(api(`/api/crm-campaigns/${campaign.id}/${isEmail ? 'email-messages' : 'sms-messages'}/${messageRecord.id}/recipients`), {
                headers: authHeaders(),
                params: { page_size: 100 },
            });
            setRows(res.data?.data || []);
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to load recipients');
        } finally {
            setLoading(false);
        }
    }, [campaign?.id, isEmail, message, messageRecord?.id, open]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!open) return;
        axios.get(api('/api/contact-groups'), { headers: authHeaders(), params: { page_size: 100 } })
            .then((res) => setGroups((res.data?.results || []).map((item) => ({ value: item.id, label: item.name }))))
            .catch(() => setGroups([]));
    }, [open]);

    const addManual = async () => {
        const lines = manual.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
        const recipients = lines.map((value) => (isEmail ? { email: value, source: 'manual' } : { phone: value, source: 'manual' }));
        if (!recipients.length) return;
        try {
            await axios.post(api(`/api/crm-campaigns/${campaign.id}/${isEmail ? 'email-messages' : 'sms-messages'}/${messageRecord.id}/recipients`), { recipients }, { headers: authHeaders() });
            setManual('');
            message.success('Recipients added');
            load();
            onChanged?.();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Add recipients failed');
        }
    };

    const addGroup = async () => {
        if (!groupId) return;
        try {
            const res = await axios.post(api(`/api/crm-campaigns/${campaign.id}/${isEmail ? 'email-messages' : 'sms-messages'}/${messageRecord.id}/recipients/contact-group`), { contact_group_id: groupId }, { headers: authHeaders() });
            const result = res.data || {};
            message.success(`Added ${result.added || 0}, skipped ${Number(result.duplicates || 0) + Number(result.invalid || 0) + Number(result.unsubscribed || 0)}`);
            load();
            onChanged?.();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Contact group import failed');
        }
    };

    const remove = async (recipient) => {
        try {
            await axios.delete(api(`/api/crm-campaigns/${campaign.id}/${isEmail ? 'email-messages' : 'sms-messages'}/${messageRecord.id}/recipients/${recipient.id}`), { headers: authHeaders() });
            load();
            onChanged?.();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Remove failed');
        }
    };

    const columns = [
        { title: 'Name', dataIndex: 'name', width: 150, render: (value) => value || '-' },
        { title: 'Company', dataIndex: 'company_name', width: 150, render: (value) => value || '-' },
        { title: isEmail ? 'Email' : 'Phone', dataIndex: isEmail ? 'email' : 'phone', width: 210 },
        { title: isEmail ? 'Phone' : 'Email', dataIndex: isEmail ? 'phone' : 'email', width: 150, render: (value) => value || '-' },
        { title: 'Source', dataIndex: 'source', width: 120, render: labelize },
        { title: 'Valid', dataIndex: isEmail ? 'is_valid_email' : 'is_valid_phone', width: 80, render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Tag> },
        { title: 'Unsubscribed', dataIndex: 'is_unsubscribed', width: 120, render: (value) => <Tag color={value ? 'orange' : 'green'}>{value ? 'Yes' : 'No'}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 110, render: (value) => <Tag color={statusColor[value]}>{labelize(value)}</Tag> },
        { title: 'Last log', dataIndex: 'last_log_status', width: 110, render: labelize },
        { title: 'Action', width: 80, render: (_, record) => <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(record)} /> },
    ];

    return (
        <Drawer title={`${isEmail ? 'Email' : 'SMS'} Recipients: ${messageRecord?.title || ''}`} open={open} onClose={onClose} width={980}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Card size="small">
                    <Row gutter={[8, 8]}>
                        <Col xs={24} md={10}>
                            <Select allowClear showSearch placeholder="Contact group" value={groupId} onChange={setGroupId} options={groups} style={{ width: '100%' }} />
                        </Col>
                        <Col xs={24} md={4}>
                            <Button block onClick={addGroup}>Fetch group</Button>
                        </Col>
                        <Col xs={24} md={10}>
                            <Input.TextArea rows={2} value={manual} onChange={(event) => setManual(event.target.value)} placeholder={isEmail ? 'one@email.com, two@email.com' : '+9779800000000, +9779811111111'} />
                        </Col>
                        <Col xs={24} md={4}>
                            <Button type="primary" block onClick={addManual}>Add manual</Button>
                        </Col>
                    </Row>
                </Card>
                <Table size="small" rowKey="id" loading={loading} dataSource={rows} columns={columns} scroll={{ x: 1300 }} pagination={{ pageSize: 15 }} />
            </Space>
        </Drawer>
    );
}

export default function CampaignShow({ auth }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { props } = usePage();
    const campaignId = props.id;
    const [campaign, setCampaign] = useState(null);
    const [emailMessages, setEmailMessages] = useState([]);
    const [smsMessages, setSmsMessages] = useState([]);
    const [recipients, setRecipients] = useState([]);
    const [logs, setLogs] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [messageModal, setMessageModal] = useState({ open: false, type: 'email', record: null });
    const [recipientDrawer, setRecipientDrawer] = useState({ open: false, type: 'email', record: null });
    const [preview, setPreview] = useState(null);
    const [uploadingFor, setUploadingFor] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [campaignRes, emailRes, smsRes, recipientsRes, logsRes, attachmentsRes] = await Promise.all([
                axios.get(api(`/api/crm-campaigns/${campaignId}`), { headers: authHeaders() }),
                axios.get(api(`/api/crm-campaigns/${campaignId}/email-messages`), { headers: authHeaders() }),
                axios.get(api(`/api/crm-campaigns/${campaignId}/sms-messages`), { headers: authHeaders() }),
                axios.get(api(`/api/crm-campaigns/${campaignId}/recipients`), { headers: authHeaders() }),
                axios.get(api(`/api/crm-campaigns/${campaignId}/send-logs`), { headers: authHeaders(), params: { page_size: 100 } }),
                axios.get(api(`/api/crm-campaigns/${campaignId}/attachments`), { headers: authHeaders() }),
            ]);
            setCampaign(campaignRes.data?.data || campaignRes.data);
            setEmailMessages(emailRes.data?.data || []);
            setSmsMessages(smsRes.data?.data || []);
            setRecipients(recipientsRes.data?.data || []);
            setLogs(logsRes.data?.data || []);
            setAttachments(attachmentsRes.data?.data || []);
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to load campaign');
        } finally {
            setLoading(false);
        }
    }, [campaignId, message]);

    useEffect(() => {
        load();
    }, [load]);

    const sendMessage = async (type, record) => {
        try {
            await axios.post(api(`/api/crm-campaigns/${campaignId}/${type === 'email' ? 'email-messages' : 'sms-messages'}/${record.id}/send-now`), {}, { headers: authHeaders() });
            message.success('Send complete');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Send failed');
        }
    };

    const scheduleMessage = async (type, record) => {
        Modal.confirm({
            title: `Schedule ${type === 'email' ? 'email' : 'SMS'} message`,
            content: <Input type="datetime-local" id="campaign-schedule-input" style={{ marginTop: 12 }} />,
            onOk: async () => {
                const scheduledAt = document.getElementById('campaign-schedule-input')?.value;
                await axios.post(api(`/api/crm-campaigns/${campaignId}/${type === 'email' ? 'email-messages' : 'sms-messages'}/${record.id}/schedule`), {
                    send_mode: 'scheduled',
                    scheduled_at: scheduledAt,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }, { headers: authHeaders() });
                message.success('Message scheduled');
                load();
            },
        });
    };

    const cancelSchedule = async (type, record) => {
        try {
            await axios.post(api(`/api/crm-campaigns/${campaignId}/${type === 'email' ? 'email-messages' : 'sms-messages'}/${record.id}/cancel-schedule`), {}, { headers: authHeaders() });
            message.success('Schedule cancelled');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Cancel failed');
        }
    };

    const deleteMessage = async (type, record) => {
        try {
            await axios.delete(api(`/api/crm-campaigns/${campaignId}/${type === 'email' ? 'email-messages' : 'sms-messages'}/${record.id}`), { headers: authHeaders() });
            message.success('Message deleted');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Delete failed');
        }
    };

    const duplicateMessage = async (type, record) => {
        try {
            await axios.post(api(`/api/crm-campaigns/${campaignId}/${type === 'email' ? 'email-messages' : 'sms-messages'}/${record.id}/duplicate`), {}, { headers: authHeaders() });
            message.success('Message duplicated');
            load();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Duplicate failed');
        }
    };

    const previewMessage = async (type, record) => {
        try {
            const res = await axios.post(api(`/api/crm-campaigns/${campaignId}/${type === 'email' ? 'email-messages' : 'sms-messages'}/${record.id}/preview`), {}, { headers: authHeaders() });
            setPreview({ type, data: res.data, record });
        } catch (error) {
            message.error(error?.response?.data?.message || 'Preview failed');
        }
    };

    const testMessage = async (type, record) => {
        Modal.confirm({
            title: type === 'email' ? 'Send test email' : 'Send test SMS',
            content: <Input id="campaign-test-input" placeholder={type === 'email' ? 'name@example.com' : '+9779800000000'} style={{ marginTop: 12 }} />,
            onOk: async () => {
                const value = document.getElementById('campaign-test-input')?.value;
                await axios.post(api(`/api/crm-campaigns/${campaignId}/${type === 'email' ? 'email-messages' : 'sms-messages'}/${record.id}/send-test`), type === 'email' ? { email: value } : { phone: value }, { headers: authHeaders() });
                message.success('Test send complete');
                load();
            },
        });
    };

    const uploadProps = (record) => ({
        multiple: true,
        showUploadList: false,
        customRequest: async ({ file, onSuccess, onError }) => {
            const data = new FormData();
            data.append('files[]', file);
            setUploadingFor(record.id);
            try {
                await axios.post(api(`/api/crm-campaigns/${campaignId}/email-messages/${record.id}/attachments`), data, {
                    headers: authHeaders({ 'Content-Type': 'multipart/form-data' }),
                });
                onSuccess?.();
                message.success('Attachment uploaded');
                load();
            } catch (error) {
                onError?.(error);
                message.error(error?.response?.data?.message || 'Upload failed');
            } finally {
                setUploadingFor(null);
            }
        },
    });

    const messageColumns = (type) => [
        { title: 'Message title', dataIndex: 'title', width: 210, render: (value, record) => <Text strong>{value || record.code}</Text> },
        { title: type === 'email' ? 'Subject' : 'Body preview', dataIndex: type === 'email' ? 'subject' : 'body', width: 260, ellipsis: true },
        { title: 'Status', dataIndex: 'status', width: 120, render: (value) => <Tag color={statusColor[value]}>{labelize(value)}</Tag> },
        { title: 'Recipients', width: 95, align: 'right', render: (_, record) => record.stats?.recipients_count ?? record.recipients_count ?? 0 },
        ...(type === 'email' ? [{ title: 'Attachments', width: 105, align: 'right', render: (_, record) => record.stats?.attachments_count ?? record.attachments_count ?? 0 }] : [{ title: 'Segments', dataIndex: 'segment_count', width: 90, align: 'right' }]),
        { title: 'Scheduled at', dataIndex: 'scheduled_at', width: 170, render: dateText },
        { title: 'Sent', width: 80, align: 'right', render: (_, record) => record.stats?.sent_count ?? 0 },
        { title: 'Delivered', width: 95, align: 'right', render: (_, record) => record.stats?.delivered_count ?? 0 },
        { title: 'Failed', width: 80, align: 'right', render: (_, record) => record.stats?.failed_count ?? 0 },
        ...(type === 'email' ? [
            { title: 'Bounced', width: 90, align: 'right', render: (_, record) => record.stats?.bounced_count ?? 0 },
            { title: 'Opened', width: 85, align: 'right', render: (_, record) => record.stats?.opened_count ?? 0 },
            { title: 'Clicked', width: 85, align: 'right', render: (_, record) => record.stats?.clicked_count ?? 0 },
        ] : []),
        { title: 'Order', dataIndex: 'send_order', width: 75, align: 'right' },
        {
            title: 'Action',
            fixed: 'right',
            width: 260,
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => setMessageModal({ open: true, type, record })} /></Tooltip>
                    <Tooltip title="Recipients"><Button size="small" icon={type === 'email' ? <MailOutlined /> : <MessageOutlined />} onClick={() => setRecipientDrawer({ open: true, type, record })} /></Tooltip>
                    <Tooltip title="Preview"><Button size="small" icon={<EyeOutlined />} onClick={() => previewMessage(type, record)} /></Tooltip>
                    <Tooltip title="Send test"><Button size="small" icon={<ReloadOutlined />} onClick={() => testMessage(type, record)} /></Tooltip>
                    <Tooltip title="Send now"><Button size="small" type="primary" icon={<SendOutlined />} onClick={() => sendMessage(type, record)} /></Tooltip>
                    <Tooltip title="Schedule"><Button size="small" icon={<CalendarOutlined />} onClick={() => scheduleMessage(type, record)} /></Tooltip>
                    <Tooltip title="Cancel schedule"><Button size="small" icon={<StopOutlined />} onClick={() => cancelSchedule(type, record)} /></Tooltip>
                    {type === 'email' ? (
                        <Upload {...uploadProps(record)}>
                            <Tooltip title="Upload attachment"><Button size="small" loading={uploadingFor === record.id} icon={<UploadOutlined />} /></Tooltip>
                        </Upload>
                    ) : null}
                    <Tooltip title="Duplicate"><Button size="small" icon={<CopyOutlined />} onClick={() => duplicateMessage(type, record)} /></Tooltip>
                    <Popconfirm title="Delete this message?" onConfirm={() => deleteMessage(type, record)}>
                        <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const logColumns = [
        { title: 'Date/time', dataIndex: 'created_at', width: 170, render: dateText },
        { title: 'Type', dataIndex: 'type', width: 80, render: labelize },
        { title: 'Message title', dataIndex: 'message_title', width: 190 },
        { title: 'Recipient', dataIndex: 'recipient_name', width: 150, render: (value) => value || '-' },
        { title: 'Email', dataIndex: 'email', width: 190, render: (value) => value || '-' },
        { title: 'Phone', dataIndex: 'phone', width: 130, render: (value) => value || '-' },
        { title: 'Provider', dataIndex: 'provider', width: 110, render: (value) => value || '-' },
        { title: 'Status', dataIndex: 'status', width: 115, render: (value) => <Tag color={statusColor[value]}>{labelize(value)}</Tag> },
        { title: 'Error reason', dataIndex: 'error_message', width: 220, ellipsis: true, render: (value, record) => value || record.error || '-' },
        { title: 'External ID', dataIndex: 'external_message_id', width: 170, render: (value, record) => value || record.provider_message_id || '-' },
        { title: 'Sent at', dataIndex: 'sent_at', width: 160, render: dateText },
        { title: 'Delivered at', dataIndex: 'delivered_at', width: 160, render: dateText },
        { title: 'Opened at', dataIndex: 'opened_at', width: 160, render: dateText },
        { title: 'Clicked at', dataIndex: 'clicked_at', width: 160, render: dateText },
        { title: 'Failed at', dataIndex: 'failed_at', width: 160, render: dateText },
        {
            title: 'Action',
            fixed: 'right',
            width: 100,
            render: (_, record) => (
                <Space size={4}>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview({ type: 'log', data: record, record })} />
                    <Button size="small" icon={<ReloadOutlined />} onClick={async () => {
                        await axios.post(api(`/api/crm-campaigns/${campaignId}/send-logs/${record.id}/retry`), {}, { headers: authHeaders() });
                        message.success('Retry complete');
                        load();
                    }} />
                </Space>
            ),
        },
    ];

    const attachmentColumns = [
        { title: 'Email message', width: 210, render: (_, record) => record.email_message?.title || '-' },
        { title: 'File name', dataIndex: 'original_name', width: 260 },
        { title: 'File type', dataIndex: 'file_type', width: 100, render: (value) => value || '-' },
        { title: 'File size', dataIndex: 'file_size', width: 120, render: (value) => `${Math.round((value || 0) / 1024)} KB` },
        { title: 'Uploaded by', width: 150, render: (_, record) => record.uploaded_by?.name || record.uploaded_by?.label || '-' },
        { title: 'Uploaded at', dataIndex: 'created_at', width: 170, render: dateText },
        { title: 'Status', dataIndex: 'is_active', width: 90, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Removed'}</Tag> },
        {
            title: 'Action',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<DownloadOutlined />} href={api(`/api/crm-campaigns/${campaignId}/attachments/${record.id}/download`)} />
                    {record.is_active ? (
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={async () => {
                            await axios.delete(api(`/api/crm-campaigns/${campaignId}/attachments/${record.id}`), { headers: authHeaders() });
                            load();
                        }} />
                    ) : null}
                </Space>
            ),
        },
    ];

    const scheduleRows = useMemo(() => [
        ...emailMessages.filter((item) => item.scheduled_at || item.send_mode === 'after_previous').map((item) => ({ ...item, _type: 'Email' })),
        ...smsMessages.filter((item) => item.scheduled_at || item.send_mode === 'after_previous').map((item) => ({ ...item, _type: 'SMS' })),
    ].sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || ''))), [emailMessages, smsMessages]);

    if (loading && !campaign) {
        return (
            <AuthenticatedLayout header={<Text strong>Campaign</Text>}>
                <Head title="Campaign" />
                <div style={{ padding: token.paddingSM }}>Loading...</div>
            </AuthenticatedLayout>
        );
    }

    if (!campaign) {
        return (
            <AuthenticatedLayout header={<Text strong>Campaign</Text>}>
                <Head title="Campaign Not Found" />
                <Empty description="Campaign not found" />
            </AuthenticatedLayout>
        );
    }

    const stats = campaign.stats || {};
    const header = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Space>
                <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => router.visit('/crm/campaigns')} />
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{campaign.code || '-'}</Text>
                    <Title level={5} style={{ margin: 0 }}>{campaign.title || campaign.name}</Title>
                </div>
            </Space>
            <Space wrap>
                <Tag color={statusColor[campaign.status]}>{labelize(campaign.status)}</Tag>
                <Button icon={<SendOutlined />} type="primary" onClick={async () => {
                    await axios.post(api(`/api/crm-campaigns/${campaignId}/send`), {}, { headers: authHeaders() });
                    message.success('Campaign send complete');
                    load();
                }}>Send campaign</Button>
                <Button icon={<StopOutlined />} onClick={async () => {
                    await axios.post(api(`/api/crm-campaigns/${campaignId}/cancel`), {}, { headers: authHeaders() });
                    message.success('Scheduled sends cancelled');
                    load();
                }}>Cancel schedules</Button>
            </Space>
        </div>
    );

    return (
        <AuthenticatedLayout user={auth?.user} header={header}>
            <Head title={`${campaign.title || campaign.name} - Campaign CMS`} />
            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Tabs
                    size="small"
                    items={[
                        {
                            key: 'overview',
                            label: 'Overview',
                            children: (
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    <Row gutter={[12, 12]}>
                                        <Col xs={12} md={4}><Metric title="Email messages" value={stats.total_email_messages} /></Col>
                                        <Col xs={12} md={4}><Metric title="SMS messages" value={stats.total_sms_messages} /></Col>
                                        <Col xs={12} md={4}><Metric title="Recipients" value={stats.total_recipients} /></Col>
                                        <Col xs={12} md={4}><Metric title="Scheduled" value={stats.scheduled_messages} /></Col>
                                        <Col xs={12} md={4}><Metric title="Queued" value={stats.queued_count} /></Col>
                                        <Col xs={12} md={4}><Metric title="Sent" value={stats.sent_count} color={token.colorSuccess} /></Col>
                                        <Col xs={12} md={4}><Metric title="Delivered" value={stats.delivered_count} color={token.colorSuccess} /></Col>
                                        <Col xs={12} md={4}><Metric title="Failed" value={stats.failed_sends} color={token.colorError} /></Col>
                                        <Col xs={12} md={4}><Metric title="Bounced" value={stats.bounce_count} color={token.colorError} /></Col>
                                        <Col xs={12} md={4}><Metric title="Opened" value={stats.open_count} /></Col>
                                        <Col xs={12} md={4}><Metric title="Clicked" value={stats.click_count} /></Col>
                                        <Col xs={12} md={4}><Metric title="Skipped" value={stats.skipped_count} /></Col>
                                    </Row>
                                    <Card size="small" title="Campaign Info">
                                        <Descriptions size="small" column={{ xs: 1, md: 2 }}>
                                            <Descriptions.Item label="Title">{campaign.title || campaign.name}</Descriptions.Item>
                                            <Descriptions.Item label="Code">{campaign.code || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="Status"><Tag color={statusColor[campaign.status]}>{labelize(campaign.status)}</Tag></Descriptions.Item>
                                            <Descriptions.Item label="Type">{labelize(campaign.type)}</Descriptions.Item>
                                            <Descriptions.Item label="Created by">{campaign.created_by?.label || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="Created date">{dateText(campaign.created_at)}</Descriptions.Item>
                                            <Descriptions.Item label="Last updated">{dateText(campaign.updated_at)}</Descriptions.Item>
                                            <Descriptions.Item label="Branch">{campaign.branch?.label || campaign.branch?.name || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="Default sender">{campaign.default_sender_name || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="Default sender email">{campaign.default_sender_email || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="Default SMS sender ID">{campaign.default_sms_sender_id || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="Tags">{(campaign.tags || []).map((tag) => <Tag key={tag}>{tag}</Tag>)}</Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                </Space>
                            ),
                        },
                        {
                            key: 'email',
                            label: 'Email Messages',
                            children: (
                                <Card size="small" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setMessageModal({ open: true, type: 'email', record: null })}>Add Email</Button>}>
                                    <Table size="small" rowKey="id" dataSource={emailMessages} columns={messageColumns('email')} scroll={{ x: 1800 }} />
                                </Card>
                            ),
                        },
                        {
                            key: 'sms',
                            label: 'SMS Messages',
                            children: (
                                <Card size="small" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setMessageModal({ open: true, type: 'sms', record: null })}>Add SMS</Button>}>
                                    <Table size="small" rowKey="id" dataSource={smsMessages} columns={messageColumns('sms')} scroll={{ x: 1500 }} />
                                </Card>
                            ),
                        },
                        {
                            key: 'recipients',
                            label: 'Recipients',
                            children: (
                                <Table
                                    size="small"
                                    rowKey="id"
                                    dataSource={recipients}
                                    scroll={{ x: 1300 }}
                                    columns={[
                                        { title: 'Name', dataIndex: 'name', width: 160, render: (value) => value || '-' },
                                        { title: 'Company', dataIndex: 'company_name', width: 160, render: (value) => value || '-' },
                                        { title: 'Email', dataIndex: 'email', width: 200, render: (value) => value || '-' },
                                        { title: 'Phone', dataIndex: 'phone', width: 140, render: (value) => value || '-' },
                                        { title: 'Used in email', dataIndex: 'used_in_email_messages', width: 120, align: 'right' },
                                        { title: 'Used in SMS', dataIndex: 'used_in_sms_messages', width: 110, align: 'right' },
                                        { title: 'Source', dataIndex: 'source', width: 120, render: labelize },
                                        { title: 'Validation', dataIndex: 'validation', width: 110, render: (value) => <Tag color={value === 'valid' ? 'green' : 'red'}>{labelize(value)}</Tag> },
                                        { title: 'Unsubscribed', dataIndex: 'is_unsubscribed', width: 120, render: (value) => <Tag color={value ? 'orange' : 'green'}>{value ? 'Yes' : 'No'}</Tag> },
                                        { title: 'Last status', dataIndex: 'last_send_status', width: 120, render: labelize },
                                    ]}
                                />
                            ),
                        },
                        {
                            key: 'schedule',
                            label: 'Schedule Timeline',
                            children: (
                                <Table
                                    size="small"
                                    rowKey={(row) => `${row._type}-${row.id}`}
                                    dataSource={scheduleRows}
                                    columns={[
                                        { title: 'Message type', dataIndex: '_type', width: 120 },
                                        { title: 'Message title', dataIndex: 'title' },
                                        { title: 'Scheduled date/time', dataIndex: 'scheduled_at', width: 180, render: dateText },
                                        { title: 'Timezone', dataIndex: 'timezone', width: 150, render: (value) => value || '-' },
                                        { title: 'Recipient count', width: 120, align: 'right', render: (_, row) => row.stats?.recipients_count ?? 0 },
                                        { title: 'Status', dataIndex: 'status', width: 120, render: (value) => <Tag color={statusColor[value]}>{labelize(value)}</Tag> },
                                        { title: 'Action', width: 180, render: (_, row) => <Space><Button size="small" onClick={() => scheduleMessage(row._type === 'Email' ? 'email' : 'sms', row)}>Reschedule</Button><Button size="small" onClick={() => cancelSchedule(row._type === 'Email' ? 'email' : 'sms', row)}>Cancel</Button></Space> },
                                    ]}
                                />
                            ),
                        },
                        {
                            key: 'logs',
                            label: 'Send Logs',
                            children: <Table size="small" rowKey="id" dataSource={logs} columns={logColumns} scroll={{ x: 2400 }} pagination={{ pageSize: 20 }} />,
                        },
                        {
                            key: 'attachments',
                            label: 'Attachments',
                            children: <Table size="small" rowKey="id" dataSource={attachments} columns={attachmentColumns} scroll={{ x: 1300 }} />,
                        },
                        {
                            key: 'settings',
                            label: 'Settings',
                            children: (
                                <Card size="small">
                                    <Descriptions size="small" column={1}>
                                        <Descriptions.Item label="Default sender name">{campaign.default_sender_name || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="Default sender email">{campaign.default_sender_email || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="Default reply-to email">{campaign.default_reply_to_email || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="Default SMS sender ID">{campaign.default_sms_sender_id || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="Internal remarks">{campaign.internal_remarks || '-'}</Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            ),
                        },
                    ]}
                />
            </div>

            <MessageModal
                type={messageModal.type}
                open={messageModal.open}
                record={messageModal.record}
                campaign={campaign}
                onClose={() => setMessageModal({ open: false, type: 'email', record: null })}
                onSaved={load}
            />

            <RecipientDrawer
                type={recipientDrawer.type}
                campaign={campaign}
                messageRecord={recipientDrawer.record}
                open={recipientDrawer.open}
                onClose={() => setRecipientDrawer({ open: false, type: 'email', record: null })}
                onChanged={load}
            />

            <Drawer title={preview?.type === 'log' ? 'Send Log' : 'Preview'} open={!!preview} onClose={() => setPreview(null)} width={720}>
                {preview?.type === 'email' ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Title level={5}>{preview.data?.subject || '-'}</Title>
                        <div style={{ border: `1px solid ${token.colorBorderSecondary}`, padding: 12 }} dangerouslySetInnerHTML={{ __html: preview.data?.body || '' }} />
                    </Space>
                ) : preview?.type === 'sms' ? (
                    <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{preview.data?.body || '-'}</Paragraph>
                ) : preview?.type === 'log' ? (
                    <Descriptions size="small" column={1} bordered>
                        {Object.entries(preview.data || {}).map(([key, value]) => (
                            <Descriptions.Item key={key} label={labelize(key)}>
                                {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '-')}
                            </Descriptions.Item>
                        ))}
                    </Descriptions>
                ) : null}
            </Drawer>
        </AuthenticatedLayout>
    );
}
