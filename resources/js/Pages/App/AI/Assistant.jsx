import { useEffect, useRef, useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Grid,
    Input,
    List,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
    message as antMessage,
    theme,
} from 'antd';
import {
    RobotOutlined,
    SendOutlined,
    StopOutlined,
    ReloadOutlined,
    CopyOutlined,
    DeleteOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import AiToolBlocks from '@/Components/AI/AiToolBlocks';
import AiMessageRenderer from '@/Components/AI/AiMessageRenderer';
import AiSuggestedQuestions from '@/Components/AI/AiSuggestedQuestions';

const { Title, Paragraph, Text } = Typography;

const SUGGESTED_PROMPTS = [
    'Open the sales report',
    'Explain this report',
    'Show trial balance report',
    'Open receivables report',
    'Summarize inventory report',
    'Show profit and loss report',
    'Open tax report',
    'Find payroll report',
];

function hasAnyPermission(perms = [], required = []) {
    if (!Array.isArray(perms)) return false;
    return required.some((r) => perms.includes(r));
}

function HeaderTitle({ token }) {
    return (
        <Space size={10} align="center">
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorPrimaryBg,
                    border: `1px solid ${token.colorPrimaryBorder}`,
                    color: token.colorPrimary,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <RobotOutlined />
            </div>

            <div>
                <Title level={5} style={{ margin: 0, lineHeight: 1.1 }}>
                    AI Assistant
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Ask it to find, explain, and summarize reports.
                </Text>
            </div>
        </Space>
    );
}

function StatusBadge({ health, healthLoading, healthError, aiReady }) {
    if (healthLoading) {
        return (
            <Tag icon={<Spin size="small" />} bordered={false}>
                Checking
            </Tag>
        );
    }

    if (healthError) {
        return (
            <Tag color="error" icon={<ExclamationCircleOutlined />} bordered={false}>
                Error
            </Tag>
        );
    }

    if (aiReady) {
        return (
            <Tag color="success" icon={<CheckCircleOutlined />} bordered={false}>
                Ready
            </Tag>
        );
    }

    return (
        <Tag color="warning" icon={<ExclamationCircleOutlined />} bordered={false}>
            Not ready
        </Tag>
    );
}

function MessageBubble({ message, token, onCopy, onFollowup }) {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const isSystem = message.role === 'system';

    const bubbleStyle = {
        maxWidth: 'min(760px, 86%)',
        borderRadius: isUser
            ? `${token.borderRadiusXL}px ${token.borderRadiusXL}px 4px ${token.borderRadiusXL}px`
            : `${token.borderRadiusXL}px ${token.borderRadiusXL}px ${token.borderRadiusXL}px 4px`,
        padding: '12px 14px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: 1.65,
        fontSize: 14,
        boxShadow: token.boxShadowTertiary,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        color: token.colorText,
    };

    if (isUser) {
        bubbleStyle.background = token.colorPrimary;
        bubbleStyle.color = token.colorTextLightSolid;
        bubbleStyle.border = `1px solid ${token.colorPrimary}`;
    }

    if (isSystem) {
        bubbleStyle.background = token.colorWarningBg;
        bubbleStyle.border = `1px solid ${token.colorWarningBorder}`;
        bubbleStyle.color = token.colorText;
    }

    return (
        <List.Item
            style={{
                border: 'none',
                padding: '8px 0',
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
        >
            <div style={bubbleStyle}>
                {!isUser && (
                    <Space size={6} style={{ marginBottom: 6 }}>
                        <Tag
                            bordered={false}
                            color={isAssistant ? 'blue' : 'warning'}
                            style={{ marginInlineEnd: 0 }}
                        >
                            {isAssistant ? 'Assistant' : 'System'}
                        </Tag>
                    </Space>
                )}

                <AiMessageRenderer message={message} onFollowup={onFollowup} />
                <AiToolBlocks message={message} />

                {isAssistant && (
                    <div
                        style={{
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                        }}
                    >
                        <Space size={4} wrap>
                            {message.cached && (
                                <Tag color="green" bordered={false} style={{ marginInlineEnd: 0 }}>
                                    cached
                                </Tag>
                            )}

                            {message.provider && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {message.provider}
                                </Text>
                            )}

                            {message.model && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    / {message.model}
                                </Text>
                            )}
                        </Space>

                        <Tooltip title="Copy reply">
                            <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => onCopy(message.content)}
                            />
                        </Tooltip>
                    </div>
                )}
            </div>
        </List.Item>
    );
}

export default function Assistant() {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const page = usePage();
    const permissions = page.props?.auth?.permissions || [];
    const canBypass = !!page.props?.auth?.canBypassPermissions;

    const canUseAi =
        canBypass || hasAnyPermission(permissions, ['ai.view', 'ai.use', 'ai.chat', 'ai.manage']);

    const canManage =
        canBypass || hasAnyPermission(permissions, ['ai.manage', 'ai.settings.update']);

    const [health, setHealth] = useState(null);
    const [healthError, setHealthError] = useState(null);
    const [healthLoading, setHealthLoading] = useState(true);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [error, setError] = useState(null);

    const abortRef = useRef(null);
    const scrollRef = useRef(null);

    const aiReady = useMemo(() => {
        if (!health) return false;
        return health.ok && health.ai_enabled && health.provider_configured;
    }, [health]);

    const styles = useMemo(() => {
        return {
            page: {
                padding: isMobile ? 12 : 16,
                background: token.colorBgLayout,
                minHeight: 'calc(100vh - 64px)',
            },
            shell: {
                display: 'grid',
                 gap: 16,
                alignItems: 'stretch',
            },
            sideCard: {
                height: '100%',
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: token.boxShadowTertiary,
            },
            mainCard: {
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: token.boxShadowTertiary,
                overflow: 'hidden',
            },
            chatArea: {
                minHeight: isMobile ? 420 : 520,
                maxHeight: isMobile ? 'calc(100vh - 330px)' : 'calc(100vh - 260px)',
                overflowY: 'auto',
                padding: isMobile ? 12 : 18,
                background: `linear-gradient(180deg, ${token.colorBgLayout} 0%, ${token.colorFillQuaternary} 100%)`,
            },
            composer: {
                padding: isMobile ? 10 : 12,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
            },
            composerBox: {
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'flex-end',
                gap: 8,
            },
            promptButton: {
                width: '100%',
                textAlign: 'left',
                justifyContent: 'flex-start',
                height: 34,
                borderRadius: token.borderRadius,
            },
            statBox: {
                padding: 12,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillQuaternary,
                border: `1px solid ${token.colorBorderSecondary}`,
            },
        };
    }, [token, isMobile]);

    useEffect(() => {
        if (!canUseAi) {
            setHealthLoading(false);
            return;
        }

        let cancelled = false;

        setHealthLoading(true);
        setHealthError(null);

        axios
            .get('/api/ai/health')
            .then((res) => {
                if (!cancelled) {
                    setHealth(res.data);
                }
            })
            .catch((err) => {
                if (cancelled) return;

                if (err.response?.status === 403) {
                    setHealthError(err.response.data || { message: 'Permission denied.' });
                } else {
                    setHealthError({
                        message: err.response?.data?.message || 'Failed to load AI health.',
                    });
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setHealthLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [canUseAi]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, sending]);

    const send = async (textOverride) => {
        const text = (textOverride ?? input).trim();

        if (!text || sending) return;

        setError(null);

        const userMsg = {
            role: 'user',
            content: text,
            id: `${Date.now()}-user`,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setSending(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await axios.post(
                '/api/ai/chat',
                {
                    message: text,
                    conversation_id: conversationId,
                    context_type: 'auto',
                    context_payload: {
                        url: page.url,
                        module: 'reports',
                    },
                    cache: true,
                },
                {
                    signal: controller.signal,
                    timeout: 90000,
                }
            );

            const reply = res.data?.message?.content || '(no reply)';

            setConversationId(res.data?.conversation_id || conversationId);

            const hasDisplay = Boolean((res.data?.cards || []).length || (res.data?.tables || []).length);

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: reply,
                    id: `${Date.now()}-assistant`,
                    provider: res.data?.provider,
                    model: res.data?.model,
                    cached: res.data?.cached,
                    actions: res.data?.actions || [],
                    results: hasDisplay ? [] : (res.data?.results || []),
                    mode: res.data?.mode,
                    tool: res.data?.tool,
                    cards: res.data?.cards || [],
                    tables: res.data?.tables || [],
                    warnings: res.data?.warnings || [],
                    source_note: res.data?.source_note || null,
                    followups: res.data?.followups || [],
                    answer_type: res.data?.answer_type || null,
                },
            ]);
        } catch (err) {
            if (axios.isCancel(err) || err.name === 'CanceledError') {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'system',
                        content: 'Request stopped.',
                        id: `${Date.now()}-system`,
                    },
                ]);
            } else {
                const data = err.response?.data;
                const code = data?.code || (err.code === 'ECONNABORTED' ? 'AI_TIMEOUT' : null);

                let msg = data?.message || err.message || 'AI request failed.';

                if (code === 'AI_TIMEOUT') {
                    msg =
                        'AI request timed out. Try a shorter prompt, reduce context size, or pick a faster model in AI Settings.';
                }

                if (code === 'AI_PERMISSION_DENIED' && data?.required_permission) {
                    msg = `${data.message} Required permission: ${data.required_permission}`;
                }

                setError({ message: msg, code });
            }
        } finally {
            setSending(false);
            abortRef.current = null;
        }
    };

    const stop = () => {
        abortRef.current?.abort();
    };

    const retry = () => {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        if (lastUser) send(lastUser.content);
    };

    const copy = async (text) => {
        try {
            await navigator.clipboard?.writeText(text);
            antMessage.success('Copied');
        } catch {
            antMessage.error('Copy failed');
        }
    };

    const clearConversation = () => {
        setMessages([]);
        setConversationId(null);
        setError(null);
    };

    if (!canUseAi) {
        return (
            <AuthenticatedLayout header={<HeaderTitle token={token} />}>
                <Head title="AI Assistant" />

                <div style={styles.page}>
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
        <AuthenticatedLayout header={<HeaderTitle token={token} />}>
            <Head title="AI Assistant" />

            <div style={styles.page}>
                {(healthError || error || (!healthLoading && health && !aiReady)) && (
                    <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 12 }}>
                        {healthError && (
                            <Alert
                                type="error"
                                showIcon
                                message={healthError.message}
                                description={
                                    healthError.required_permission
                                        ? `Required permission: ${healthError.required_permission}`
                                        : null
                                }
                            />
                        )}

                        {!healthLoading && health && !health.ai_enabled && (
                            <Alert
                                type="warning"
                                showIcon
                                message="AI Assistant is disabled in AI Settings."
                                action={
                                    canManage && (
                                        <Button
                                            size="small"
                                            icon={<SettingOutlined />}
                                            onClick={() => router.visit('/settings/ai')}
                                        >
                                            Open Settings
                                        </Button>
                                    )
                                }
                            />
                        )}

                        {!healthLoading && health?.ai_enabled && !health.provider_configured && (
                            <Alert
                                type="warning"
                                showIcon
                                message="AI provider is not configured. Add API key in AI Settings."
                                action={
                                    canManage && (
                                        <Button
                                            size="small"
                                            icon={<SettingOutlined />}
                                            onClick={() => router.visit('/settings/ai')}
                                        >
                                            Open Settings
                                        </Button>
                                    )
                                }
                            />
                        )}

                        {error && (
                            <Alert
                                type="error"
                                showIcon
                                closable
                                message={error.message}
                                description={error.code ? `Code: ${error.code}` : null}
                                onClose={() => setError(null)}
                            />
                        )}
                    </Space>
                )}

                <div style={styles.shell}>
                     

                    <Card
                        size="small"
                        style={styles.mainCard}
                        styles={{ body: { padding: 0 } }}
                        title={
                            <Space size={8} wrap>
                                <RobotOutlined style={{ color: token.colorPrimary }} />
                                <Text strong>Conversation</Text>
                                <Tag bordered={false}>{messages.length} messages</Tag>
                            </Space>
                        }
                        extra={
                            <Space>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={retry}
                                    disabled={sending || !messages.length}
                                >
                                    Retry
                                </Button>

                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={clearConversation}
                                    disabled={!messages.length}
                                >
                                    Clear
                                </Button>
                            </Space>
                        }
                    >
                        <div ref={scrollRef} style={styles.chatArea}>
                            {messages.length === 0 ? (
                                <div
                                    style={{
                                        minHeight: 360,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                    }}
                                >
                                    <div style={{ maxWidth: 560 }}>
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={
                                                <Space direction="vertical" size={4}>
                                                    <Title level={4} style={{ margin: 0 }}>
                                                        Ask about reports
                                                    </Title>
                                                    <Paragraph
                                                        type="secondary"
                                                        style={{
                                                            margin: 0,
                                                            maxWidth: 460,
                                                        }}
                                                    >
                                                        Use it to open, explain, and summarize reports while the
                                                        broader assistant is paused.
                                                    </Paragraph>
                                                </Space>
                                            }
                                        />

                                        <Space wrap size={[8, 8]} style={{ justifyContent: 'center' }}>
                                            {SUGGESTED_PROMPTS.slice(0, 6).map((prompt) => (
                                                <Button
                                                    key={prompt}
                                                    size="small"
                                                    onClick={() => send(prompt)}
                                                    disabled={!aiReady || sending}
                                                >
                                                    {prompt}
                                                </Button>
                                            ))}
                                        </Space>
                                        <div style={{ marginTop: 14 }}>
                                            <AiSuggestedQuestions disabled={!aiReady || sending} onSelect={send} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <List
                                    dataSource={messages}
                                    split={false}
                                    renderItem={(item) => (
                                        <MessageBubble
                                            key={item.id}
                                            message={item}
                                            token={token}
                                            onCopy={copy}
                                            onFollowup={send}
                                        />
                                    )}
                                />
                            )}

                            {sending && (
                                <div style={{ padding: '8px 0' }}>
                                    <Space>
                                        <Spin size="small" />
                                        <Text type="secondary">Thinking...</Text>
                                    </Space>
                                </div>
                            )}
                        </div>

                        <div style={styles.composer}>
                            <div style={styles.composerBox}>
                                <Input.TextArea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={
                                        aiReady
                                            ? 'Ask about reports...'
                                            : 'AI assistant is not ready.'
                                    }
                                    autoSize={{ minRows: 1, maxRows: 5 }}
                                    disabled={!aiReady || sending}
                                    onPressEnter={(e) => {
                                        if (!e.shiftKey) {
                                            e.preventDefault();
                                            send();
                                        }
                                    }}
                                    style={{
                                        borderRadius: token.borderRadiusLG,
                                        resize: 'none',
                                    }}
                                />

                                <Space.Compact
                                    style={{
                                        width: isMobile ? '100%' : 'auto',
                                    }}
                                >
                                    {sending ? (
                                        <Button
                                            danger
                                            type="primary"
                                            icon={<StopOutlined />}
                                            onClick={stop}
                                            style={{
                                                width: isMobile ? '50%' : undefined,
                                            }}
                                        >
                                            Stop
                                        </Button>
                                    ) : (
                                        <Button
                                            type="primary"
                                            icon={<SendOutlined />}
                                            onClick={() => send()}
                                            disabled={!aiReady || !input.trim()}
                                            style={{
                                                width: isMobile ? '50%' : undefined,
                                            }}
                                        >
                                            Send
                                        </Button>
                                    )}

                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={retry}
                                        disabled={sending || !messages.length}
                                        style={{
                                            width: isMobile ? '50%' : undefined,
                                        }}
                                    >
                                        Retry
                                    </Button>
                                </Space.Compact>
                            </div>

                            <div
                                style={{
                                    marginTop: 8,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Press Enter to send, Shift + Enter for new line.
                                </Text>

                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Context: Auto
                                </Text>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
