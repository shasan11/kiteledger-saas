import { useCallback, useEffect, useState } from 'react';
import { App, Avatar, Button, Empty, Form, Input, Skeleton, Space, Typography, theme } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const formatDateTime = (v) => {
    if (!v) return '-';
    try {
        return new Date(v).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    } catch { return v; }
};

const typeLabel = {
    public_reply: 'Reply',
    internal_note: 'Internal Note',
    status_change: 'Status Change',
    assignment_change: 'Assignment',
};

const initials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function TicketComments({ ticketId, isInternal = false }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(api(`/api/support-tickets/${ticketId}/comments`));
            const all = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setComments(isInternal ? all.filter((c) => c.is_internal) : all.filter((c) => !c.is_internal));
        } catch {
            setComments([]);
        } finally {
            setLoading(false);
        }
    }, [ticketId, isInternal]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (values) => {
        if (!values.body?.trim()) return;
        setSubmitting(true);
        try {
            await axios.post(api(`/api/support-tickets/${ticketId}/comments`), {
                body: values.body.trim(),
                is_internal: isInternal,
                type: isInternal ? 'internal_note' : 'public_reply',
            });
            form.resetFields();
            message.success(isInternal ? 'Note added' : 'Reply sent');
            load();
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Form form={form} onFinish={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Form.Item name="body" style={{ flex: 1, marginBottom: 0 }}>
                    <TextArea
                        rows={2}
                        placeholder={isInternal ? 'Add an internal note...' : 'Write a reply...'}
                    />
                </Form.Item>
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    htmlType="submit"
                    loading={submitting}
                >
                    {isInternal ? 'Add Note' : 'Reply'}
                </Button>
            </Form>

            {comments.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={isInternal ? 'No internal notes yet' : 'No replies yet'}
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {comments.map((comment) => {
                        const userName = comment.user?.name || comment.user?.display_name || 'User';
                        const isSystemComment = ['status_change', 'assignment_change'].includes(comment.type);

                        if (isSystemComment) {
                            return (
                                <div
                                    key={comment.id}
                                    style={{
                                        padding: '6px 12px',
                                        background: token.colorBgTextHover,
                                        borderRadius: token.borderRadiusSM,
                                        fontSize: 12,
                                    }}
                                >
                                    <Text type="secondary">
                                        {userName} &mdash; {comment.body} &mdash; {formatDateTime(comment.created_at)}
                                    </Text>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={comment.id}
                                style={{
                                    display: 'flex',
                                    gap: 10,
                                    padding: '10px 12px',
                                    background: isInternal ? `${token.colorWarningBg}` : token.colorBgContainer,
                                    border: `1px solid ${isInternal ? token.colorWarningBorder : token.colorBorderSecondary}`,
                                    borderRadius: token.borderRadius,
                                }}
                            >
                                <Avatar size={28} icon={<UserOutlined />} style={{ flexShrink: 0 }}>
                                    {initials(userName)}
                                </Avatar>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text strong style={{ fontSize: 13 }}>{userName}</Text>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{formatDateTime(comment.created_at)}</Text>
                                    </div>
                                    <Paragraph style={{ marginBottom: 0, marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                                        {comment.body}
                                    </Paragraph>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Space>
    );
}
