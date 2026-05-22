import { useCallback, useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { App, Card, Empty, Skeleton, Space, Tag, Typography, theme } from 'antd';
import axios from 'axios';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const KANBAN_COLUMNS = [
    { key: 'open', label: 'Open', color: '#1677ff' },
    { key: 'in_progress', label: 'In Progress', color: '#722ed1' },
    { key: 'waiting_customer', label: 'Waiting Customer', color: '#faad14' },
    { key: 'waiting_internal', label: 'Waiting Internal', color: '#fa8c16' },
    { key: 'resolved', label: 'Resolved', color: '#52c41a' },
    { key: 'closed', label: 'Closed', color: '#8c8c8c' },
];

const priorityColor = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };
const labelize = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';

const formatDate = (v) => {
    if (!v) return null;
    try { return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
    catch { return v; }
};

export default function TicketKanban({ onRefresh }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [tickets, setTickets] = useState({});
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(api('/api/support-tickets'), { params: { page_size: 200 } });
            const rows = res.data?.data || res.data?.results || [];

            const grouped = {};
            KANBAN_COLUMNS.forEach((col) => { grouped[col.key] = []; });
            rows.forEach((t) => {
                if (grouped[t.status]) grouped[t.status].push(t);
                else grouped.open.push(t);
            });
            setTickets(grouped);
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to load tickets');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const moveTicket = async (ticketId, newStatus) => {
        const prev = { ...tickets };
        const allTickets = Object.values(tickets).flat();
        const ticket = allTickets.find((t) => t.id === ticketId);
        if (!ticket || ticket.status === newStatus) return;

        setTickets((current) => {
            const next = {};
            Object.entries(current).forEach(([key, items]) => {
                next[key] = items.filter((t) => t.id !== ticketId);
            });
            next[newStatus] = [...(next[newStatus] || []), { ...ticket, status: newStatus }];
            return next;
        });

        try {
            await axios.patch(api(`/api/support-tickets/${ticketId}/status`), { status: newStatus });
            message.success('Status updated');
            onRefresh?.();
        } catch (err) {
            setTickets(prev);
            message.error(err?.response?.data?.message || 'Failed to update status');
        }
    };

    if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

    return (
        <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 8,
        }}>
            {KANBAN_COLUMNS.map((col) => {
                const items = tickets[col.key] || [];
                return (
                    <div
                        key={col.key}
                        style={{
                            minWidth: 240,
                            flex: '1 0 240px',
                            background: token.colorBgLayout,
                            borderRadius: token.borderRadius,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData('ticketId');
                            if (id) moveTicket(id, col.key);
                        }}
                    >
                        <div style={{
                            padding: '8px 12px',
                            borderBottom: `2px solid ${col.color}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Text strong style={{ fontSize: 13 }}>{col.label}</Text>
                            <Tag style={{ margin: 0 }}>{items.length}</Tag>
                        </div>

                        <div style={{ padding: 8, flex: 1, minHeight: 200 }}>
                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                {items.length ? items.map((ticket) => {
                                    const isOverdue = ticket.due_at && new Date(ticket.due_at) < new Date() && !['resolved', 'closed'].includes(ticket.status);
                                    return (
                                        <Card
                                            key={ticket.id}
                                            size="small"
                                            hoverable
                                            style={{
                                                borderRadius: token.borderRadiusSM,
                                                border: isOverdue ? `1px solid ${token.colorError}` : undefined,
                                            }}
                                            bodyStyle={{ padding: '8px 10px' }}
                                            onClick={() => router.visit(`/support/tickets/${ticket.id}`)}
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData('ticketId', ticket.id)}
                                        >
                                            <Text type="secondary" style={{ fontSize: 11 }}>{ticket.ticket_no}</Text>
                                            <div style={{ marginTop: 2 }}>
                                                <Text strong style={{ fontSize: 13, lineHeight: 1.3 }}>
                                                    {ticket.subject?.length > 50 ? ticket.subject.slice(0, 50) + '...' : ticket.subject}
                                                </Text>
                                            </div>
                                            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <Tag color={priorityColor[ticket.priority]} style={{ margin: 0, fontSize: 11 }}>
                                                    {labelize(ticket.priority)}
                                                </Tag>
                                                {ticket.contact?.name ? (
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{ticket.contact.name}</Text>
                                                ) : null}
                                            </div>
                                            {ticket.due_at ? (
                                                <Text type={isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                                    Due {formatDate(ticket.due_at)}
                                                </Text>
                                            ) : null}
                                        </Card>
                                    );
                                }) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>No tickets</Text>
                                    </div>
                                )}
                            </Space>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
