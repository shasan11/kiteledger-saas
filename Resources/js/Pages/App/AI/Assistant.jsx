import { useEffect, useRef, useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage, router } from '@inertiajs/react';
import {
    Alert, Button, Card, Empty, Input, List, Select, Space, Spin, Tag, Typography, message as antMessage, theme,
} from 'antd';
import {
    RobotOutlined, SendOutlined, StopOutlined, ReloadOutlined, CopyOutlined, DeleteOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

const SUGGESTED_PROMPTS = [
    "Summarize today's sales",
    'Explain this report',
    'What receivables should I follow up?',
    'Find inventory risks',
    'Explain profit and loss',
    'What should I check today?',
    'Summarize this branch performance',
    'Show business risks',
];

const CONTEXT_OPTIONS = [
    { value: 'general', label: 'General' },
    { value: 'sales', label: 'Sales' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'receivable', label: 'Receivables' },
    { value: 'payable', label: 'Payables' },
    { value: 'accounting', label: 'Accounting' },
];

function hasAnyPermission(perms = [], required = []) {
    if (!Array.isArray(perms)) return false;
    return required.some((r) => perms.includes(r));
}

export default function Assistant() {
    const { token } = theme.useToken();
    const page = usePage();
    const permissions = page.props?.auth?.permissions || [];
    const canBypass = !!page.props?.auth?.canBypassPermissions;
    const canUseAi = canBypass || hasAnyPermission(permissions, ['ai.view', 'ai.use', 'ai.chat', 'ai.manage']);
    const canManage = canBypass || hasAnyPermission(permissions, ['ai.manage', 'ai.settings.update']);

    const [health, setHealth] = useState(null);
    const [healthError, setHealthError] = useState(null);
    const [healthLoading, setHealthLoading] = useState(true);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [contextType, setContextType] = useState('general');
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!canUseAi) {
            setHealthLoading(false);
            return;
        }
        let cancelled = false;
        setHealthLoading(true);
        axios.get('/api/ai/health')
            .then((res) => { if (!cancelled) setHealth(res.data); })
            .catch((err) => {
                if (cancelled) return;
                if (err.response?.status === 403) {
                    setHealthError(err.response.data || { message: 'Permission denied.' });
                } else {
                    setHealthError({ message: err.response?.data?.message || 'Failed to load AI health.' });
                }
            })
            .finally(() => { if (!cancelled) setHealthLoading(false); });
        return () => { cancelled = true; };
    }, [canUseAi]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, sending]);

    const aiReady = useMemo(() => {
        if (!health) return false;
        return health.ok && health.ai_enabled && health.provider_configured;
    }, [health]);

    const send = async (textOverride) => {
        const text = (textOverride ?? input).trim();
        if (!text || sending) return;
        setError(null);

        const userMsg = { role: 'user', content: text, id: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setSending(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await axios.post('/api/ai/chat', {
                message: text,
                conversation_id: conversationId,
                context_type: contextType,
            }, { signal: controller.signal });

            const reply = res.data?.message?.content || '(no reply)';
            setConversationId(res.data?.conversation_id || conversationId);
            setMessages((prev) => [...prev, {
                role: 'assistant', content: reply, id: Date.now() + 1,
                provider: res.data?.provider, model: res.data?.model, cached: res.data?.cached,
            }]);
        } catch (err) {
            if (axios.isCancel(err) || err.name === 'CanceledError') {
                setMessages((prev) => [...prev, { role: 'system', content: 'Request stopped.', id: Date.now() + 2 }]);
            } else {
                const data = err.response?.data;
                const code = data?.code;
                let msg = data?.message || err.message || 'AI request failed.';
                if (code === 'AI_PERMISSION_DENIED') {
                    msg = `${data.message} Required permission: ${data.required_permission}`;
                }
                setError({ message: msg, code });
            }
        } finally {
            setSending(false);
            abortRef.current = null;
        }
    };

    const stop = () => abortRef.current?.abort();

    const retry = () => {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        if (lastUser) send(lastUser.content);
    };

    const copy = (text) => {
        navigator.clipboard?.writeText(text).then(() => antMessage.success('Copied'));
    };

    const clearConversation = () => {
        setMessages([]);
        setConversationId(null);
        setError(null);
    };

    if (!canUseAi) {
        return (
            <AuthenticatedLayout header={<Space><RobotOutlined /><Title level={5} style={{ margin: 0 }}>AI Assistant</Title></Space>}>
                <Head title="AI Assistant" />
                <div style={{ padding: 24 }}>
                    <Alert
                        type="warning"
                        showIcon
                        message="You do not have permission to use AI Assistant."
                        description="Required permission: ai.use. Please contact your administrator."
                    />
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <Space>
                    <RobotOutlined style={{ color: token.colorPrimary }} />
                    <Title level={5} style={{ margin: 0 }}>AI Assistant</Title>
                </Space>
            }
        >
            <Head title="AI Assistant" />

            <div style={{ padding: 16 }}>
                {healthLoading && <Spin />}

                {!healthLoading && healthError && (
                    <Alert
                        type="error"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message={healthError.message}
                        description={healthError.required_permission ? `Required permission: ${healthError.required_permission}` : null}
                    />
                )}

                {!healthLoading && health && !health.ai_enabled && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="AI Assistant is disabled in AI Settings."
                        action={canManage && (
                            <Button size="small" onClick={() => router.visit('/settings/ai')}>Open Settings</Button>
                        )}
                    />
                )}

                {!healthLoading && health?.ai_enabled && !health.provider_configured && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="AI provider is not configured. Add API key in AI Settings."
                        action={canManage && (
                            <Button size="small" onClick={() => router.visit('/settings/ai')}>Open Settings</Button>
                        )}
                    />
                )}

                {error && (
                    <Alert
                        type="error"
                        showIcon
                        closable
                        style={{ marginBottom: 12 }}
                        message={error.message}
                        description={error.code ? `Code: ${error.code}` : null}
                        onClose={() => setError(null)}
                    />
                )}

                <Card
                    size="small"
                    bodyStyle={{ padding: 0 }}
                    title={
                        <Space wrap>
                            <Text strong>Context:</Text>
                            <Select
                                size="small"
                                value={contextType}
                                onChange={setContextType}
                                options={CONTEXT_OPTIONS}
                                style={{ minWidth: 160 }}
                            />
                            {health?.provider && <Tag color="blue">{health.provider}</Tag>}
                            {health?.model && <Tag>{health.model}</Tag>}
                        </Space>
                    }
                    extra={
                        <Space>
                            <Button size="small" icon={<DeleteOutlined />} onClick={clearConversation} disabled={!messages.length}>
                                Clear
                            </Button>
                        </Space>
                    }
                >
                    <div
                        ref={scrollRef}
                        style={{
                            minHeight: 360,
                            maxHeight: 'calc(100vh - 360px)',
                            overflowY: 'auto',
                            padding: 16,
                            background: token.colorBgLayout,
                        }}
                    >
                        {messages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 24 }}>
                                <Empty description="Ask anything about your business" />
                                <div style={{ marginTop: 16 }}>
                                    <Space wrap>
                                        {SUGGESTED_PROMPTS.map((p) => (
                                            <Button key={p} size="small" onClick={() => send(p)} disabled={!aiReady}>
                                                {p}
                                            </Button>
                                        ))}
                                    </Space>
                                </div>
                            </div>
                        ) : (
                            <List
                                dataSource={messages}
                                renderItem={(m) => (
                                    <List.Item
                                        style={{
                                            border: 'none',
                                            padding: '6px 0',
                                            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <div
                                            style={{
                                                maxWidth: '80%',
                                                background: m.role === 'user' ? token.colorPrimary : token.colorBgContainer,
                                                color: m.role === 'user' ? '#fff' : token.colorText,
                                                padding: '10px 14px',
                                                borderRadius: 12,
                                                whiteSpace: 'pre-wrap',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            }}
                                        >
                                            <div>{m.content}</div>
                                            {m.role === 'assistant' && (
                                                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>
                                                    <Space size={4}>
                                                        {m.cached && <Tag color="green">cached</Tag>}
                                                        {m.provider && <Text type="secondary">{m.provider}</Text>}
                                                        {m.model && <Text type="secondary">/ {m.model}</Text>}
                                                        <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copy(m.content)} />
                                                    </Space>
                                                </div>
                                            )}
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}

                        {sending && (
                            <div style={{ padding: 8 }}>
                                <Spin size="small" /> <Text type="secondary">Thinking…</Text>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input.TextArea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask the AI assistant…"
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                onPressEnter={(e) => {
                                    if (!e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                disabled={!aiReady || sending}
                            />
                            {sending ? (
                                <Button type="primary" danger icon={<StopOutlined />} onClick={stop}>Stop</Button>
                            ) : (
                                <Button type="primary" icon={<SendOutlined />} onClick={() => send()} disabled={!aiReady || !input.trim()}>
                                    Send
                                </Button>
                            )}
                            <Button icon={<ReloadOutlined />} onClick={retry} disabled={sending || !messages.length}>Retry</Button>
                        </Space.Compact>
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
