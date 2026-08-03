import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Drawer,
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
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    HistoryOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import AiMessageRenderer from '@/Components/AI/AiMessageRenderer';
import AiPendingActionCard from '@/Components/AI/AiPendingActionCard';
import AiSourceCards from '@/Components/AI/AiSourceCards';
import AiCopilotStyles from '@/Components/AI/AiCopilotStyles';
import AiWelcome from '@/Components/AI/AiWelcome';
import AiThinkingIndicator from '@/Components/AI/AiThinkingIndicator';

const { Title, Text } = Typography;


function hasAnyPermission(perms = [], required = []) {
    if (!Array.isArray(perms)) return false;
    return required.some((r) => perms.includes(r));
}

function HeaderTitle({ token, compact = false }) {
    const iconSize = compact ? 36 : 42;
    const radius = token.borderRadiusXL || token.borderRadiusLG + 4;

    return (
        <Space size={compact ? 10 : 12} align="center" style={{ minWidth: 0 }}>
            <div
                aria-hidden="true"
                style={{
                    width: iconSize,
                    height: iconSize,
                    flex: `0 0 ${iconSize}px`,
                    borderRadius: radius,
                    background: token.colorPrimary,
                    border: `1px solid ${token.colorPrimaryBorderHover}`,
                    boxShadow: token.boxShadowTertiary || token.boxShadowSecondary,
                    color: token.colorTextLightSolid,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: compact ? 17 : 19,
                }}
            >
                <RobotOutlined />
            </div>

            <div style={{ minWidth: 0 }}>
                {!compact && (
                    <Text
                        type="secondary"
                        style={{
                            display: 'block',
                            marginBottom: 2,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            lineHeight: 1.2,
                            textTransform: 'uppercase',
                        }}
                    >
                        AI workspace
                    </Text>
                )}
                <Title
                    level={5}
                    style={{
                        margin: 0,
                        fontSize: compact ? 15 : 17,
                        fontWeight: 750,
                        lineHeight: 1.2,
                        letterSpacing: '-0.015em',
                    }}
                >
                    KiteLedger Copilot
                </Title>
                <Text
                    type="secondary"
                    ellipsis
                    style={{ display: 'block', marginTop: 2, fontSize: 12, lineHeight: 1.35 }}
                >
                    Your permission-aware business assistant
                </Text>
            </div>
        </Space>
    );
}

function PremiumCopilotStyles({ token }) {
    return (
        <style>{`
            .kl-premium-page .ant-card-head {
                border-bottom-color: ${token.colorBorderSecondary};
            }

            .kl-premium-page .kl-sidebar-chat {
                transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
            }

            .kl-premium-page .kl-sidebar-chat:hover {
                background: ${token.colorFillTertiary} !important;
                border-color: ${token.colorBorder} !important;
                transform: translateY(-1px);
            }

            .kl-premium-page .kl-message-bubble {
                transition: border-color 160ms ease, box-shadow 160ms ease;
            }

            .kl-premium-page .kl-message-bubble:hover {
                border-color: ${token.colorBorder} !important;
                box-shadow: ${token.boxShadowTertiary} !important;
            }

            .kl-premium-page .kl-message-bubble .kl-copy-button {
                opacity: .58;
                transition: opacity 160ms ease, background-color 160ms ease;
            }

            .kl-premium-page .kl-message-bubble:hover .kl-copy-button {
                opacity: 1;
            }

            .kl-premium-page .kl-chat-scroll {
                scrollbar-width: thin;
                scrollbar-color: ${token.colorFillSecondary} transparent;
            }

            .kl-premium-page .kl-chat-scroll::-webkit-scrollbar {
                width: 8px;
            }

            .kl-premium-page .kl-chat-scroll::-webkit-scrollbar-thumb {
                background: ${token.colorFillSecondary};
                border-radius: 999px;
            }

            .kl-premium-page .kl-composer-textarea textarea {
                padding: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                line-height: 1.6 !important;
            }

            .kl-premium-page .kl-composer-textarea,
            .kl-premium-page .kl-composer-textarea:hover,
            .kl-premium-page .kl-composer-textarea:focus,
            .kl-premium-page .kl-composer-textarea.ant-input-affix-wrapper-focused {
                border: 0 !important;
                box-shadow: none !important;
                background: transparent !important;
            }

            @media (max-width: 767px) {
                .kl-premium-page .ant-card-head {
                    padding-inline: 14px;
                }
            }
        `}</style>
    );
}

function StatusBadge({ health, healthLoading, healthError, aiReady }) {
    const sharedStyle = {
        height: 26,
        marginInlineEnd: 0,
        paddingInline: 10,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 650,
        lineHeight: '24px',
    };

    if (healthLoading) {
        return (
            <Tag icon={<Spin size="small" />} bordered={false} style={sharedStyle}>
                Checking
            </Tag>
        );
    }

    if (healthError) {
        return (
            <Tag
                color="error"
                icon={<ExclamationCircleOutlined />}
                bordered={false}
                style={sharedStyle}
            >
                Error
            </Tag>
        );
    }

    if (aiReady) {
        return (
            <Tag
                color="success"
                icon={<CheckCircleOutlined />}
                bordered={false}
                style={sharedStyle}
            >
                Ready
            </Tag>
        );
    }

    return (
        <Tag
            color="warning"
            icon={<ExclamationCircleOutlined />}
            bordered={false}
            style={sharedStyle}
        >
            Not ready
        </Tag>
    );
}

/**
 * Shows where an answer came from. A verified live figure and a paraphrase of
 * documentation look identical in plain prose, so the distinction is made
 * explicit rather than left to the wording of the reply.
 */
function EvidenceBadge({ evidence, token }) {
    if (!evidence?.label) return null;

    const verified = Boolean(evidence.verified);
    const asOf = evidence.as_of ? new Date(evidence.as_of) : null;

    const detail = [
        evidence.currency,
        evidence.branch_scope,
        evidence.filters?.date_range
            ? `${evidence.filters.date_range.from} to ${evidence.filters.date_range.to}`
            : null,
        asOf && !Number.isNaN(asOf.getTime())
            ? `as of ${asOf.toLocaleString()}`
            : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Tag
                color={verified ? 'green' : 'blue'}
                icon={verified ? <CheckCircleOutlined /> : null}
                bordered={false}
                style={{ marginInlineEnd: 0 }}
            >
                {evidence.label}
            </Tag>

            {detail && (
                /* Tabular figures so dates and amounts keep their columns
                   steady as answers change. */
                <Text type="secondary" className="kl-tabular" style={{ fontSize: 11 }}>
                    {detail}
                </Text>
            )}
        </div>
    );
}

function MessageBubble({ message, token, isMobile, onCopy, onFollowup, actionStates = {}, onApprove, onReject }) {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const isSystem = message.role === 'system';
    const radius = token.borderRadiusXL || token.borderRadiusLG + 6;

    const bubbleStyle = {
        width: 'fit-content',
        maxWidth: isMobile ? '100%' : isUser ? 'min(680px, 80%)' : 'min(880px, 92%)',
        borderRadius: isUser
            ? `${radius}px ${radius}px 6px ${radius}px`
            : `${radius}px ${radius}px ${radius}px 6px`,
        padding: isMobile ? '12px 13px' : '14px 16px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: 1.68,
        fontSize: 14,
        boxShadow: token.boxShadowTertiary,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgElevated,
        color: token.colorText,
    };

    if (isUser) {
        bubbleStyle.background = token.colorPrimaryBg;
        bubbleStyle.color = token.colorText;
        bubbleStyle.border = `1px solid ${token.colorPrimaryBorder}`;
        bubbleStyle.boxShadow = token.boxShadowTertiary;
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
                padding: isMobile ? '7px 0' : '10px 0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: 10,
            }}
        >
            {!isUser && (
                <div
                    aria-hidden="true"
                    style={{
                        width: 30,
                        height: 30,
                        marginTop: 2,
                        flex: '0 0 30px',
                        borderRadius: token.borderRadiusLG,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isAssistant ? token.colorPrimary : token.colorWarning,
                        background: isAssistant ? token.colorPrimaryBg : token.colorWarningBg,
                        border: `1px solid ${
                            isAssistant ? token.colorPrimaryBorder : token.colorWarningBorder
                        }`,
                        boxShadow: token.boxShadowTertiary,
                    }}
                >
                    {isAssistant ? <RobotOutlined /> : <ExclamationCircleOutlined />}
                </div>
            )}

            <div className="kl-message-bubble" style={bubbleStyle}>
                {!isUser && (
                    <div
                        style={{
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                        }}
                    >
                        <Text
                            strong
                            style={{
                                color: isSystem ? token.colorWarningText : token.colorText,
                                fontSize: 12,
                                letterSpacing: '0.01em',
                            }}
                        >
                            {isAssistant ? 'KiteLedger Copilot' : 'System notice'}
                        </Text>
                    </div>
                )}

                <AiMessageRenderer message={message} onFollowup={onFollowup} />

                {isAssistant && <EvidenceBadge evidence={message.evidence} token={token} />}

                {Array.isArray(message.sources) && message.sources.length > 0 && (
                    <AiSourceCards sources={message.sources} />
                )}

                {Array.isArray(message.actions) &&
                    message.actions.map((action) => (
                        <AiPendingActionCard
                            key={action.id}
                            action={action}
                            state={actionStates[action.id] || {}}
                            onApprove={onApprove}
                            onReject={onReject}
                        />
                    ))}

                {isAssistant && (
                    <div
                        style={{
                            marginTop: 12,
                            paddingTop: 9,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Space size={5} wrap>
                            {message.cached && (
                                <Tag
                                    color="green"
                                    bordered={false}
                                    style={{ marginInlineEnd: 0, borderRadius: 999, fontSize: 10 }}
                                >
                                    Cached response
                                </Tag>
                            )}
                        </Space>

                        <Tooltip title="Copy response">
                            <Button
                                className="kl-copy-button"
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                aria-label="Copy response"
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

    const [health, setHealth] = useState(null);
    const [healthError, setHealthError] = useState(null);
    const [healthLoading, setHealthLoading] = useState(true);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [error, setError] = useState(null);
    const [actionStates, setActionStates] = useState({});
    const [conversations, setConversations] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    const abortRef = useRef(null);
    const scrollRef = useRef(null);

    /*
     * The backend `ready` flag is authoritative — it already accounts for the
     * master switch, the Copilot switch, provider credentials and providers
     * that need no key. Recomputing readiness here from a subset of those
     * fields is how the UI ended up enabling the composer while the server
     * refused every request. The boolean fallback only covers an older backend
     * that predates `ready`.
     */
    const aiReady = useMemo(() => {
        if (!health || !canUseAi) return false;

        return (
            health.ready ??
            Boolean(
                health.ok &&
                    health.ai_enabled &&
                    health.copilot_enabled &&
                    health.provider_configured,
            )
        );
    }, [health, canUseAi]);

    const notReadyReason = useMemo(() => {
        if (healthLoading) return null;
        if (healthError) {
            return healthError.code === 'AI_PERMISSION_DENIED'
                ? 'You do not have permission to use KiteLedger Copilot.'
                : 'Copilot readiness could not be checked. Try refreshing.';
        }
        if (!health) return 'Copilot readiness could not be checked. Try refreshing.';
        if (aiReady) return null;
        if (!canUseAi) return 'You do not have permission to use KiteLedger Copilot.';
        if (health.ai_enabled === false) {
            return 'AI features are disabled by the platform administrator.';
        }
        if (health.copilot_enabled === false) {
            return 'KiteLedger Copilot is currently disabled.';
        }
        if (health.provider_configured === false) {
            return 'The shared AI provider has not been configured.';
        }

        return 'KiteLedger Copilot is not ready.';
    }, [health, healthError, healthLoading, aiReady, canUseAi]);

    const refreshConversations = useCallback(async () => {
        if (!canUseAi) return;

        try {
            const response = await axios.get('/api/ai/conversations');
            const items = response.data?.conversations?.data || response.data?.conversations || [];
            setConversations(Array.isArray(items) ? items : []);
        } catch {
            // Chat remains usable when history cannot be loaded.
        }
    }, [canUseAi]);

    const styles = useMemo(() => {
        const radius = token.borderRadiusXL || token.borderRadiusLG + 6;
        const premiumShadow = token.boxShadowSecondary || token.boxShadow;

        return {
            page: {
                padding: isMobile ? 10 : 22,
                background: token.colorBgLayout,
                minHeight: 'calc(100vh - 64px)',
            },
            shell: {
                display: 'grid',
                gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '292px minmax(0, 1fr)',
                gap: isMobile ? 10 : 18,
                alignItems: 'stretch',
                width: '100%',
                maxWidth: 1400,
                margin: '0 auto',
            },
            sideCard: {
                height: 'fit-content',
                maxHeight: 'calc(100vh - 108px)',
                borderRadius: radius,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: premiumShadow,
                position: 'sticky',
                top: 18,
                overflow: 'hidden',
                background: token.colorBgContainer,
            },
            mainCard: {
                borderRadius: radius,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: premiumShadow,
                overflow: 'hidden',
                minWidth: 0,
                background: token.colorBgContainer,
            },
            chatArea: {
                minHeight: isMobile ? 430 : 570,
                maxHeight: isMobile ? 'calc(100vh - 292px)' : 'calc(100vh - 232px)',
                overflowY: 'auto',
                padding: isMobile ? '14px 12px 18px' : '22px 26px 28px',
                background: token.colorBgLayout,
            },
            composer: {
                padding: isMobile ? 10 : 14,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
            },
            composerSurface: {
                padding: isMobile ? 11 : 12,
                borderRadius: radius,
                background: token.colorBgElevated,
                border: `1px solid ${token.colorBorder}`,
                boxShadow: token.boxShadowTertiary,
                transition: 'border-color 160ms ease, box-shadow 160ms ease',
            },
            composerBox: {
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'flex-end',
                gap: 10,
            },
            statBox: {
                padding: 13,
                borderRadius: token.borderRadiusLG,
                background: token.colorPrimaryBg,
                border: `1px solid ${token.colorPrimaryBorder}`,
            },
            sidebarSection: {
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: '100%',
            },
            sectionLabel: {
                margin: 0,
                color: token.colorTextTertiary,
                fontSize: 10,
                fontWeight: 750,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
            },
            toolbar: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
                width: '100%',
            },
            toolbarActions: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'stretch' : 'flex-end',
                flexWrap: 'wrap',
                gap: 7,
                width: isMobile ? '100%' : 'auto',
            },
            compactButton: {
                flex: isMobile ? '1 1 calc(50% - 8px)' : '0 0 auto',
                borderRadius: token.borderRadiusLG,
            },
            emptyState: {
                width: '100%',
                maxWidth: 820,
                minHeight: isMobile ? 390 : 510,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
        refreshConversations();
    }, [refreshConversations]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, sending]);

    const send = async (textOverride) => {
        const text = (textOverride ?? input).trim();

        if (!text || sending) return;

        // Readiness is re-checked here, not just on the disabled prop: health
        // can change between page load and send, and suggested-prompt handlers
        // call send() directly.
        if (!aiReady) {
            setError({ message: notReadyReason || 'KiteLedger Copilot is not ready.' });
            return;
        }

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
            refreshConversations();

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: reply,
                    id: `${Date.now()}-assistant`,
                    cached: res.data?.cached,
                    actions: res.data?.actions || [],
                    sources: res.data?.sources || [],
                    cards: res.data?.cards || [],
                    tables: res.data?.tables || [],
                    warnings: res.data?.warnings || [],
                    source_note: res.data?.source_note || null,
                    followups: res.data?.followups || [],
                    answer_type: res.data?.answer_type || null,
                    answer: res.data?.answer || null,
                    // V2 evidence metadata: lets the user tell a verified live
                    // figure apart from a documentation answer.
                    evidence: res.data?.evidence || null,
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
                    msg = data.message || 'You do not have permission to use KiteLedger Copilot.';
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
        setActionStates({});
    };

    const openConversation = async (id) => {
        setHistoryLoading(true);
        try {
            const response = await axios.get(`/api/ai/conversations/${encodeURIComponent(id)}`);
            const stored = response.data?.messages?.data || response.data?.messages || [];
            setMessages(
                stored.map((item, index) => ({
                    ...item,
                    id: `${id}-${index}-${item.created_at || ''}`,
                }))
            );
            setConversationId(id);
            setHistoryOpen(false);
            setError(null);
            setActionStates({});
        } catch (err) {
            antMessage.error(err.response?.data?.message || 'Could not open that conversation.');
        } finally {
            setHistoryLoading(false);
        }
    };

    const deleteConversation = async (event, id) => {
        event.stopPropagation();
        try {
            await axios.delete(`/api/ai/conversations/${encodeURIComponent(id)}`);
            if (conversationId === id) clearConversation();
            await refreshConversations();
            antMessage.success('Conversation deleted.');
        } catch (err) {
            antMessage.error(err.response?.data?.message || 'Could not delete that conversation.');
        }
    };

    const patchActionInMessages = (actionId, patch) => {
        setMessages((prev) =>
            prev.map((m) =>
                Array.isArray(m.actions)
                    ? {
                          ...m,
                          actions: m.actions.map((a) =>
                              a.id === actionId ? { ...a, ...patch } : a
                          ),
                      }
                    : m
            )
        );
    };

    const approveAction = async (action, confirmationText) => {
        const id = action.id;
        setActionStates((prev) => ({ ...prev, [id]: { ...prev[id], loading: true, error: null } }));

        try {
            const res = await axios.post(`/api/ai/actions/${id}/approve`, {
                confirmation_text: confirmationText || undefined,
            });

            setActionStates((prev) => ({
                ...prev,
                [id]: { loading: false, status: 'executed', result: res.data?.result || null },
            }));
            patchActionInMessages(id, { status: 'executed' });
            antMessage.success(res.data?.message || 'AI action executed.');
        } catch (err) {
            const data = err.response?.data;
            const msg =
                data?.code === 'AI_CONFIRMATION_REQUIRED'
                    ? data.message
                    : data?.message || 'Could not complete the action.';

            setActionStates((prev) => ({
                ...prev,
                [id]: { loading: false, status: data?.status || 'failed', error: msg },
            }));

            if (data?.status === 'failed') {
                patchActionInMessages(id, { status: 'failed' });
            }
            antMessage.error(msg);
        }
    };

    const rejectAction = async (action) => {
        const id = action.id;
        setActionStates((prev) => ({ ...prev, [id]: { ...prev[id], loading: true, error: null } }));

        try {
            await axios.post(`/api/ai/actions/${id}/reject`);
            setActionStates((prev) => ({ ...prev, [id]: { loading: false, status: 'rejected' } }));
            patchActionInMessages(id, { status: 'rejected' });
            antMessage.info('AI action rejected.');
        } catch (err) {
            const msg = err.response?.data?.message || 'Could not reject the action.';
            setActionStates((prev) => ({ ...prev, [id]: { loading: false, error: msg } }));
            antMessage.error(msg);
        }
    };

    if (!canUseAi) {
        return (
            <AuthenticatedLayout header={<HeaderTitle token={token} />}>
                <Head title="KiteLedger Copilot" />

                <div style={styles.page}>
                    <Alert
                        type="warning"
                        showIcon
                        message="You do not have permission to use KiteLedger Copilot."
                        description="Please contact your administrator if you need access."
                    />
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={<HeaderTitle token={token} />}>
            <Head title="KiteLedger Copilot" />
            <AiCopilotStyles />
            <PremiumCopilotStyles token={token} />

            <div className="kl-premium-page" style={styles.page}>
                {(healthError || error || (!healthLoading && health && !aiReady)) && (
                    <Space
                        direction="vertical"
                        size={10}
                        style={{ width: '100%', maxWidth: 1320, margin: '0 auto 12px' }}
                    >
                        {healthError && (
                            <Alert
                                type="error"
                                showIcon
                                message={healthError.message}
                                description="Please contact your administrator or try again."
                            />
                        )}

                        {!healthLoading && health && !health.ai_enabled && (
                            <Alert
                                type="warning"
                                showIcon
                            message="KiteLedger Copilot is disabled by the central administrator."
                                description="Contact the platform administrator to enable AI for the application."
                            />
                        )}

                        {!healthLoading && health?.ai_enabled && !health.provider_configured && (
                            <Alert
                                type="warning"
                                showIcon
                                message="AI provider is not configured by the central administrator."
                                description="Contact the platform administrator to configure the shared AI provider."
                            />
                        )}

                        {error && (
                            <Alert
                                type="error"
                                showIcon
                                closable
                                message={error.message}
                                onClose={() => setError(null)}
                            />
                        )}
                    </Space>
                )}

                <div style={styles.shell}>
                    {!isMobile && (
                        <Card
                            className="kl-premium-sidebar"
                            size="small"
                            style={styles.sideCard}
                            title={<HeaderTitle token={token} compact />}
                            styles={{
                                header: { minHeight: 70, paddingInline: 16 },
                                body: { padding: 14 },
                            }}
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    icon={<PlusOutlined />}
                                    onClick={clearConversation}
                                    style={{
                                        height: 44,
                                        borderRadius: token.borderRadiusLG,
                                        boxShadow: token.boxShadowTertiary,
                                        fontWeight: 650,
                                    }}
                                >
                                    New conversation
                                </Button>

                                <div style={styles.statBox}>
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                        <div style={styles.toolbar}>
                                            <Text strong style={{ fontSize: 13 }}>
                                                Copilot status
                                            </Text>
                                            <StatusBadge
                                                health={health}
                                                healthLoading={healthLoading}
                                                healthError={healthError}
                                                aiReady={aiReady}
                                            />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.55 }}>
                                            {aiReady
                                                ? 'Ready to answer using the business data you are allowed to access.'
                                                : health?.provider_configured === false
                                                  ? 'Waiting for the shared AI provider configuration.'
                                                  : 'Checking configuration and permissions.'}
                                        </Text>
                                    </Space>
                                </div>

                                <div style={styles.sidebarSection}>
                                    <div style={styles.toolbar}>
                                        <Text style={styles.sectionLabel}>Recent conversations</Text>
                                        <Button
                                            size="small"
                                            type="text"
                                            onClick={() => setHistoryOpen(true)}
                                            style={{ paddingInline: 4, fontSize: 12 }}
                                        >
                                            View all
                                        </Button>
                                    </div>

                                    {conversations.length ? (
                                        <List
                                            size="small"
                                            split={false}
                                            dataSource={conversations.slice(0, 5)}
                                            renderItem={(item) => {
                                                const selected = conversationId === item.id;
                                                return (
                                                    <List.Item
                                                        className="kl-sidebar-chat"
                                                        onClick={() => openConversation(item.id)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            marginBottom: 5,
                                                            padding: '10px 11px',
                                                            borderRadius: token.borderRadiusLG,
                                                            border: `1px solid ${
                                                                selected
                                                                    ? token.colorPrimaryBorder
                                                                    : token.colorBorderSecondary
                                                            }`,
                                                            background: selected
                                                                ? token.colorPrimaryBg
                                                                : token.colorBgContainer,
                                                        }}
                                                    >
                                                        <List.Item.Meta
                                                            avatar={
                                                                <div
                                                                    style={{
                                                                        width: 28,
                                                                        height: 28,
                                                                        borderRadius: token.borderRadius,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: selected
                                                                            ? token.colorPrimary
                                                                            : token.colorTextSecondary,
                                                                        background: selected
                                                                            ? token.colorPrimaryBgHover
                                                                            : token.colorFillQuaternary,
                                                                    }}
                                                                >
                                                                    <HistoryOutlined />
                                                                </div>
                                                            }
                                                            title={
                                                                <Text
                                                                    strong={selected}
                                                                    ellipsis
                                                                    style={{ maxWidth: 175, fontSize: 12 }}
                                                                >
                                                                    {item.title || 'Untitled conversation'}
                                                                </Text>
                                                            }
                                                            description={
                                                                <Text
                                                                    type="secondary"
                                                                    ellipsis
                                                                    style={{ display: 'block', maxWidth: 175, fontSize: 10 }}
                                                                >
                                                                    {item.updated_at
                                                                        ? new Date(item.updated_at).toLocaleString()
                                                                        : item.module || 'KiteLedger Copilot'}
                                                                </Text>
                                                            }
                                                        />
                                                    </List.Item>
                                                );
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                padding: '14px 12px',
                                                borderRadius: token.borderRadiusLG,
                                                border: `1px dashed ${token.colorBorder}`,
                                                background: token.colorFillQuaternary,
                                                textAlign: 'center',
                                            }}
                                        >
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Your recent conversations will appear here.
                                            </Text>
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        paddingTop: 12,
                                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                                    <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.45 }}>
                                        Permission-aware access to KiteLedger data
                                    </Text>
                                </div>
                            </Space>
                        </Card>
                    )}

                    <Card
                        className="kl-premium-main"
                        size="small"
                        style={styles.mainCard}
                        styles={{
                            body: { padding: 0 },
                            header: {
                                minHeight: isMobile ? 66 : 74,
                                paddingInline: isMobile ? 14 : 18,
                                flexWrap: 'wrap',
                                gap: 8,
                                alignItems: 'center',
                                background: token.colorBgContainer,
                            },
                            title: { minWidth: 0, flex: '1 1 280px' },
                            extra: { marginInlineStart: 0 },
                        }}
                        title={
                            <div style={styles.toolbar}>
                                <div style={{ minWidth: 0 }}>
                                    <Space size={8} align="center" wrap>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: isMobile ? 14 : 16,
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            Copilot workspace
                                        </Text>
                                        <Tag
                                            bordered={false}
                                            style={{ marginInlineEnd: 0, borderRadius: 999, fontSize: 11 }}
                                        >
                                            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                                        </Tag>
                                    </Space>
                                    {!isMobile && (
                                        <Text
                                            type="secondary"
                                            ellipsis
                                            style={{ display: 'block', marginTop: 3, fontSize: 12 }}
                                        >
                                            Ask, analyse, and take action without leaving KiteLedger
                                        </Text>
                                    )}
                                </div>

                                {isMobile && (
                                    <StatusBadge
                                        health={health}
                                        healthLoading={healthLoading}
                                        healthError={healthError}
                                        aiReady={aiReady}
                                    />
                                )}
                            </div>
                        }
                        extra={
                            <div style={styles.toolbarActions}>
                                <Button
                                    size="small"
                                    icon={<HistoryOutlined />}
                                    onClick={() => setHistoryOpen(true)}
                                    style={styles.compactButton}
                                >
                                    History
                                </Button>

                                <Button
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={clearConversation}
                                    style={styles.compactButton}
                                >
                                    New
                                </Button>

                                <Tooltip title="Clear this conversation">
                                    <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        aria-label="Clear conversation"
                                        onClick={clearConversation}
                                        disabled={!messages.length}
                                        style={{ borderRadius: token.borderRadiusLG }}
                                    />
                                </Tooltip>
                            </div>
                        }
                    >
                        <div ref={scrollRef} className="kl-chat-scroll" style={styles.chatArea}>
                            {messages.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <AiWelcome
                                        onSelect={send}
                                        disabled={!aiReady || sending}
                                        isMobile={isMobile}
                                    />
                                </div>
                            ) : (
                                <List
                                    dataSource={messages}
                                    split={false}
                                    renderItem={(item, index) => (
                                        <div
                                            key={item.id}
                                            className="kl-rise"
                                            style={{
                                                animationDelay: index < 6 ? `${index * 40}ms` : '0ms',
                                            }}
                                        >
                                            <MessageBubble
                                                message={item}
                                                token={token}
                                                isMobile={isMobile}
                                                onCopy={copy}
                                                onFollowup={send}
                                                actionStates={actionStates}
                                                onApprove={approveAction}
                                                onReject={rejectAction}
                                            />
                                        </div>
                                    )}
                                />
                            )}

                            {sending && <AiThinkingIndicator isMobile={isMobile} />}
                        </div>

                        <div style={styles.composer}>
                            <div style={styles.composerSurface}>
                                <div style={styles.composerBox}>
                                    <Input.TextArea
                                        className="kl-composer-textarea"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={
                                            aiReady
                                                ? 'Ask about invoices, cash flow, customers, inventory, reports, or KiteLedger workflows…'
                                                : notReadyReason || 'KiteLedger Copilot is not ready.'
                                        }
                                        autoSize={{ minRows: isMobile ? 2 : 1, maxRows: 6 }}
                                        bordered={false}
                                        disabled={!aiReady || sending}
                                        onPressEnter={(e) => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                send();
                                            }
                                        }}
                                        style={{
                                            minHeight: isMobile ? 48 : 42,
                                            resize: 'none',
                                            fontSize: 14,
                                        }}
                                    />

                                    <Space size={8} style={{ width: isMobile ? '100%' : 'auto' }}>
                                        <Tooltip title="Retry the last prompt">
                                            <Button
                                                icon={<ReloadOutlined />}
                                                onClick={retry}
                                                disabled={sending || !messages.length}
                                                aria-label="Retry last prompt"
                                                style={{
                                                    width: isMobile ? '42%' : 44,
                                                    height: 44,
                                                    borderRadius: token.borderRadiusLG,
                                                }}
                                            />
                                        </Tooltip>

                                        {sending ? (
                                            <Button
                                                danger
                                                type="primary"
                                                icon={<StopOutlined />}
                                                onClick={stop}
                                                style={{
                                                    width: isMobile ? '58%' : 104,
                                                    height: 44,
                                                    borderRadius: token.borderRadiusLG,
                                                    fontWeight: 650,
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
                                                    width: isMobile ? '58%' : 104,
                                                    height: 44,
                                                    borderRadius: token.borderRadiusLG,
                                                    boxShadow: token.boxShadowTertiary,
                                                    fontWeight: 650,
                                                }}
                                            >
                                                Send
                                            </Button>
                                        )}
                                    </Space>
                                </div>

                                <div
                                    style={{
                                        marginTop: 9,
                                        paddingTop: 9,
                                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 8,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        Enter to send · Shift + Enter for a new line
                                    </Text>

                                    <Space size={6}>
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: aiReady
                                                    ? token.colorSuccess
                                                    : token.colorTextQuaternary,
                                            }}
                                        />
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            Context · Auto
                                        </Text>
                                    </Space>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Drawer
                    title={<HeaderTitle token={token} compact />}
                    open={historyOpen}
                    onClose={() => setHistoryOpen(false)}
                    width={isMobile ? '100%' : 430}
                    styles={{
                        header: { borderBottom: `1px solid ${token.colorBorderSecondary}` },
                        body: { padding: 12 },
                    }}
                >
                    <Text
                        type="secondary"
                        style={{ display: 'block', margin: '2px 4px 12px', fontSize: 12 }}
                    >
                        Select a conversation to continue where you left off.
                    </Text>
                    <List
                        loading={historyLoading}
                        dataSource={conversations}
                        locale={{ emptyText: 'No saved conversations yet.' }}
                        split={false}
                        renderItem={(item) => (
                            <List.Item
                                className="kl-sidebar-chat"
                                onClick={() => openConversation(item.id)}
                                style={{
                                    cursor: 'pointer',
                                    marginBottom: 7,
                                    padding: '11px 12px',
                                    borderRadius: token.borderRadiusLG,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                }}
                                actions={[
                                    <Button
                                        key="delete"
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        aria-label="Delete conversation"
                                        onClick={(event) => deleteConversation(event, item.id)}
                                    />,
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <div
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: token.borderRadiusLG,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: token.colorPrimary,
                                                background: token.colorPrimaryBg,
                                                border: `1px solid ${token.colorPrimaryBorder}`,
                                            }}
                                        >
                                            <HistoryOutlined />
                                        </div>
                                    }
                                    title={item.title || 'Untitled conversation'}
                                    description={
                                        item.updated_at
                                            ? new Date(item.updated_at).toLocaleString()
                                            : item.module || 'KiteLedger Copilot'
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </Drawer>
            </div>
        </AuthenticatedLayout>
    );
}
