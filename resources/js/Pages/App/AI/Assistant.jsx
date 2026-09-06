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
    Modal,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
    message as antMessage,
    theme,
} from 'antd';
import {
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
import CopilotMark from '@/Components/AI/CopilotMark';

const { Title, Text } = Typography;

const UUID_PATTERN = /\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi;
const AI_HEALTH_CACHE_TTL_MS = 60_000;

function conversationLabel(item) {
    const title = String(item?.title || '').replace(UUID_PATTERN, '').trim();
    return title || 'Untitled conversation';
}

function readHealthCache(key) {
    if (typeof window === 'undefined') return null;

    try {
        const cached = JSON.parse(window.sessionStorage.getItem(key) || 'null');
        if (!cached?.value || Date.now() - Number(cached.savedAt || 0) > AI_HEALTH_CACHE_TTL_MS) {
            window.sessionStorage.removeItem(key);
            return null;
        }

        return cached.value;
    } catch {
        return null;
    }
}

function writeHealthCache(key, value) {
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
    } catch {
        // Storage may be disabled or full. The network path remains authoritative.
    }
}


function hasAnyPermission(perms = [], required = []) {
    if (!Array.isArray(perms)) return false;
    return required.some((r) => perms.includes(r));
}

async function postCopilotStream(payload, signal, onStage, onDelta) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        credentials: 'same-origin',
        signal,
        headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        },
        body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/event-stream') || !response.body) {
        let errorPayload = {};
        try {
            errorPayload = await response.json();
        } catch {
            // Proxies can replace API errors with an HTML response.
        }
        const error = new Error(errorPayload.message || 'Streaming is unavailable.');
        error.code = errorPayload.code || 'AI_STREAM_UNAVAILABLE';
        // Nothing was orchestrated yet, so retrying on the JSON endpoint cannot
        // duplicate a tool call or an action proposal.
        error.allowFallback = true;
        error.status = response.status;
        throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = null;
    let streamError = null;
    // Tracks whether the server actually began producing this turn. Once it
    // has, a retry could re-run tools or re-create a pending action, so the
    // JSON fallback is refused from that point on.
    let started = false;

    const consume = (frame) => {
        let event = 'message';
        const data = [];
        frame.split(/\r?\n/).forEach((line) => {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
        });
        if (!data.length) return;

        let payloadData;
        try {
            payloadData = JSON.parse(data.join('\n'));
        } catch {
            return;
        }

        if (event === 'stage') onStage(payloadData.label || 'Working on your request');
        if (event === 'delta' && payloadData.text) {
            started = true;
            onDelta?.(payloadData.text);
        }
        if (event === 'answer') {
            started = true;
            answer = payloadData;
        }
        if (event === 'error') streamError = payloadData;
    };

    while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || '';
        frames.forEach(consume);
        if (done) break;
    }
    if (buffer.trim()) consume(buffer);

    if (streamError) {
        const error = new Error(streamError.message || 'Copilot could not complete the request.');
        error.code = streamError.code || 'AI_PROVIDER_ERROR';
        // A server-reported failure is the real answer for this turn; repeating
        // it over the JSON endpoint would only fail the same way.
        error.allowFallback = false;
        throw error;
    }
    if (!answer) {
        const error = new Error('Copilot ended the response before an answer was received.');
        error.code = 'AI_STREAM_INCOMPLETE';
        // A stream cut off before any output — a buffering proxy, a dropped
        // connection — is safe to retry as plain JSON. One that died mid-answer
        // is not: the turn already ran on the server.
        error.allowFallback = !started;
        throw error;
    }

    return answer;
}

function HeaderTitle({ token, compact = false }) {
    const iconSize = compact ? 30 : 34;

    return (
        <Space size={9} align="center" style={{ minWidth: 0 }}>
            <CopilotMark size={iconSize} />

            <div style={{ minWidth: 0 }}>
                <Title
                    level={5}
                    style={{
                        margin: 0,
                        fontSize: compact ? 14 : 15,
                        fontWeight: 700,
                        lineHeight: 1.15,
                        letterSpacing: '-0.015em',
                    }}
                >
                    KiteLedger Copilot
                </Title>
                {!compact && (
                    <Text
                        type="secondary"
                        ellipsis
                        style={{ display: 'block', marginTop: 1, fontSize: 11, lineHeight: 1.25 }}
                    >
                        Business assistant
                    </Text>
                )}
            </div>
        </Space>
    );
}

function PremiumCopilotStyles({ token }) {
    return (
        <style>{`
            .kl-premium-page * {
                box-sizing: border-box;
            }

            .kl-premium-page .ant-card-head {
                border-bottom-color: ${token.colorBorderSecondary};
            }

            .kl-premium-page .kl-premium-main,
            .kl-premium-page .kl-premium-sidebar {
                box-shadow: none !important;
            }

            .kl-premium-page .kl-premium-main > .ant-card-body {
                min-height: 0;
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .kl-premium-page .kl-sidebar-chat {
                transition: background-color 140ms ease, border-color 140ms ease;
            }

            .kl-premium-page .kl-premium-sidebar .ant-list-items {
                display: grid;
                gap: 4px;
            }

            .kl-premium-page .kl-recent-conversations {
                scrollbar-width: thin;
                scrollbar-color: transparent transparent;
                scrollbar-gutter: stable;
            }

            .kl-premium-page .kl-recent-conversations:hover {
                scrollbar-color: ${token.colorFillSecondary} transparent;
            }

            .kl-premium-page .kl-recent-conversations::-webkit-scrollbar {
                width: 6px;
            }

            .kl-premium-page .kl-recent-conversations::-webkit-scrollbar-thumb {
                background: transparent;
                border-radius: 999px;
            }

            .kl-premium-page .kl-recent-conversations:hover::-webkit-scrollbar-thumb {
                background: ${token.colorFillSecondary};
            }

            .kl-premium-page .kl-sidebar-chat:hover {
                background: ${token.colorFillTertiary} !important;
            }

            .kl-premium-page .kl-message-bubble {
                transition: border-color 140ms ease, background-color 140ms ease;
            }

            .kl-premium-page .kl-message-bubble .kl-copy-button {
                opacity: .42;
                transition: opacity 140ms ease;
            }

            .kl-premium-page .kl-message-bubble:hover .kl-copy-button {
                opacity: 1;
            }

            .kl-premium-page .kl-chat-scroll {
                scrollbar-width: thin;
                scrollbar-color: ${token.colorFillSecondary} transparent;
                overscroll-behavior: contain;
            }

            .kl-premium-page .kl-chat-scroll::-webkit-scrollbar {
                width: 6px;
            }

            .kl-premium-page .kl-chat-scroll::-webkit-scrollbar-thumb {
                background: ${token.colorFillSecondary};
                border-radius: 999px;
            }

            .kl-premium-page .kl-composer-textarea textarea {
                padding: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                line-height: 1.5 !important;
            }

            .kl-premium-page .kl-composer-textarea,
            .kl-premium-page .kl-composer-textarea:hover,
            .kl-premium-page .kl-composer-textarea:focus,
            .kl-premium-page .kl-composer-textarea.ant-input-affix-wrapper-focused {
                border: 0 !important;
                box-shadow: none !important;
                background: transparent !important;
            }

            .kl-premium-page .kl-ai-preparing-mark {
                position: relative;
                width: 72px;
                height: 72px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 22px;
                background: ${token.colorPrimaryBg};
                border: 1px solid ${token.colorPrimaryBorder};
                box-shadow: 0 14px 36px ${token.colorPrimaryBgHover};
                animation: kl-ai-preparing-float 2.4s ease-in-out infinite;
            }

            .kl-premium-page .kl-ai-preparing-mark::before,
            .kl-premium-page .kl-ai-preparing-mark::after {
                content: '';
                position: absolute;
                inset: -8px;
                border-radius: 28px;
                border: 1px solid ${token.colorPrimaryBorder};
                opacity: 0;
                animation: kl-ai-preparing-ring 2.2s ease-out infinite;
            }

            .kl-premium-page .kl-ai-preparing-mark::after {
                animation-delay: 1.1s;
            }

            .kl-premium-page .kl-ai-preparing-dots {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                height: 10px;
            }

            .kl-premium-page .kl-ai-preparing-dots span {
                width: 5px;
                height: 5px;
                border-radius: 999px;
                background: ${token.colorPrimary};
                animation: kl-ai-preparing-dot 1.2s ease-in-out infinite;
            }

            .kl-premium-page .kl-ai-preparing-dots span:nth-child(2) { animation-delay: 140ms; }
            .kl-premium-page .kl-ai-preparing-dots span:nth-child(3) { animation-delay: 280ms; }

            @keyframes kl-ai-preparing-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
            }

            @keyframes kl-ai-preparing-ring {
                0% { transform: scale(.86); opacity: .52; }
                75%, 100% { transform: scale(1.18); opacity: 0; }
            }

            @keyframes kl-ai-preparing-dot {
                0%, 60%, 100% { transform: translateY(0); opacity: .35; }
                30% { transform: translateY(-3px); opacity: 1; }
            }

            @media (prefers-reduced-motion: reduce) {
                .kl-premium-page .kl-ai-preparing-mark,
                .kl-premium-page .kl-ai-preparing-mark::before,
                .kl-premium-page .kl-ai-preparing-mark::after,
                .kl-premium-page .kl-ai-preparing-dots span {
                    animation: none !important;
                }
            }

            @media (max-width: 767px) {
                .kl-premium-page .kl-premium-main > .ant-card-body {
                    height: 100%;
                }

                .kl-premium-page .kl-copy-button {
                    opacity: .72 !important;
                }
            }
        `}</style>
    );
}

function StatusBadge({ health, healthLoading, healthError, aiReady }) {
    const sharedStyle = {
        height: 22,
        marginInlineEnd: 0,
        paddingInline: 8,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 650,
        lineHeight: '20px',
    };

    if (healthLoading) {
        return (
            <Tag icon={<Spin size="small" />} bordered={false} style={sharedStyle}>
                Preparing
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

function PreparingAi({ token }) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Preparing AI"
            style={{
                width: '100%',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                padding: 24,
                textAlign: 'center',
            }}
        >
            <div className="kl-ai-preparing-mark" aria-hidden="true">
                <CopilotMark size={44} />
            </div>

            <div>
                <Space size={8} align="center">
                    <Title level={4} style={{ margin: 0, fontSize: 18, letterSpacing: '-0.02em' }}>
                        Preparing AI
                    </Title>
                    <span className="kl-ai-preparing-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                </Space>
                <Text
                    type="secondary"
                    style={{ display: 'block', maxWidth: 420, marginTop: 7, lineHeight: 1.55 }}
                >
                    Loading your secure business context and capabilities…
                </Text>
            </div>
        </div>
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
    const bubbleStyle = {
        width: 'fit-content',
        maxWidth: isMobile ? '96%' : isUser ? 'min(720px, 76%)' : 'min(920px, 90%)',
        borderRadius: 8,
        padding: isMobile ? '8px 0' : '10px 0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: 1.52,
        fontSize: 14,
        boxShadow: 'none',
        border: 0,
        background: 'transparent',
        color: token.colorText,
    };

    if (isUser) {
        bubbleStyle.background = token.colorPrimaryBg;
        bubbleStyle.color = token.colorText;
        bubbleStyle.padding = isMobile ? '9px 11px' : '10px 13px';
    }

    if (isSystem) {
        bubbleStyle.background = token.colorWarningBg;
        bubbleStyle.border = `1px solid ${token.colorWarningBorder}`;
        bubbleStyle.padding = isMobile ? '9px 11px' : '10px 13px';
        bubbleStyle.color = token.colorText;
    }

    return (
        <List.Item
            style={{
                border: 'none',
                padding: isMobile ? '4px 0' : '5px 0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: 8,
            }}
        >
            {!isUser && (
                <div
                    aria-hidden="true"
                    style={{
                        width: 26,
                        height: 26,
                        marginTop: 2,
                        flex: '0 0 26px',
                        borderRadius: 7,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isAssistant ? token.colorPrimary : token.colorWarning,
                        background: isAssistant ? 'transparent' : token.colorWarningBg,
                        border: 0,
                        boxShadow: 'none',
                    }}
                >
                    {isAssistant ? <CopilotMark size={26} /> : <ExclamationCircleOutlined />}
                </div>
            )}

            <div className="kl-message-bubble" style={bubbleStyle}>
                {!isUser && (
                    <div
                        style={{
                            marginBottom: 5,
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
                            marginTop: 8,
                            paddingTop: 6,
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
    const healthCacheKey = useMemo(() => {
        const userId = page.props?.auth?.user?.id || 'guest';
        const branchId = page.props?.branchContext?.selectedBranchId
            || page.props?.auth?.currentBranchId
            || 'all';
        const fiscalYearId = page.props?.branchContext?.current_fiscal_year_id || 'current';
        const company = page.props?.tenantContext?.companyName || 'tenant';

        return `kiteledger:ai-health:v1:${encodeURIComponent(company)}:${userId}:${branchId}:${fiscalYearId}`;
    }, [
        page.props?.auth?.user?.id,
        page.props?.auth?.currentBranchId,
        page.props?.branchContext?.selectedBranchId,
        page.props?.branchContext?.current_fiscal_year_id,
        page.props?.tenantContext?.companyName,
    ]);
    const initialHealth = useMemo(() => readHealthCache(healthCacheKey), [healthCacheKey]);

    const canUseAi =
        canBypass || hasAnyPermission(permissions, ['ai.view', 'ai.use', 'ai.chat', 'ai.manage']);

    const [health, setHealth] = useState(initialHealth);
    const [healthError, setHealthError] = useState(null);
    const [healthLoading, setHealthLoading] = useState(!initialHealth);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [error, setError] = useState(null);
    const [actionStates, setActionStates] = useState({});
    const [conversations, setConversations] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [lastFailedPrompt, setLastFailedPrompt] = useState(null);
    const [progressLabel, setProgressLabel] = useState('Working on your request');
    /*
     * Text streamed so far for the turn in flight. Kept out of `messages` on
     * purpose: the final `answer` event carries the authoritative structured
     * response (cards, tables, evidence, warnings), and that — not the
     * accumulated deltas — is what gets committed to the transcript. The
     * streamed copy exists only so the user sees words appear immediately.
     */
    const [streamedText, setStreamedText] = useState('');

    const abortRef = useRef(null);
    const scrollRef = useRef(null);

    /*
     * The backend `ready` flag is authoritative - it already accounts for the
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
        if (health.provider_connection_verified === false) {
            return 'The shared AI provider and selected model have not passed the administrator connection test.';
        }
        if (health.selected_model_valid === false) {
            return 'The selected AI model is unavailable. Ask the platform administrator to test another model.';
        }

        return 'KiteLedger Copilot is not ready.';
    }, [health, healthError, healthLoading, aiReady, canUseAi]);

    const refreshConversations = useCallback(async () => {
        if (!canUseAi) return;

        try {
            setHistoryError(null);
            const response = await axios.get('/api/ai/conversations');
            const items = response.data?.conversations?.data || response.data?.conversations || [];
            setConversations(Array.isArray(items) ? items : []);
        } catch (err) {
            setHistoryError(
                err.response?.data?.message ||
                    'Conversation history could not be loaded. Chat remains available.',
            );
        }
    }, [canUseAi]);

    const styles = useMemo(() => {
        const radius = 12;

        return {
            page: {
                padding: isMobile ? '0 6px 6px' : '0 10px 10px',
                background: token.colorBgLayout,
                height: isMobile ? 'calc(100dvh - 110px)' : 'calc(100dvh - 118px)',
                minHeight: 360,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            },
            shell: {
                display: 'grid',
                gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '248px minmax(0, 1fr)',
                gap: 0,
                alignItems: 'stretch',
                width: '100%',
                maxWidth: 1680,
                margin: '0 auto',
                flex: '1 1 auto',
                minHeight: 0,
            },
            sideCard: {
                height: '100%',
                margin: 0,
                borderRadius: 0,
                border: 0,
                overflow: 'hidden',
                background: token.colorBgLayout,
            },
            mainCard: {
                height: '100%',
                borderRadius: isMobile ? 0 : `0 0 ${radius}px 0`,
                border: 0,
                borderLeft: isMobile ? 0 : `1px solid ${token.colorBorderSecondary}`,
                overflow: 'hidden',
                minWidth: 0,
                background: token.colorBgContainer,
            },
            chatArea: {
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: isMobile ? '12px' : '20px 24px',
                background: token.colorBgContainer,
            },
            composer: {
                flex: '0 0 auto',
                padding: isMobile ? 7 : 9,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                position: 'sticky',
                bottom: 0,
                zIndex: 5,
            },
            composerSurface: {
                padding: isMobile ? '8px 9px' : '8px 10px',
                borderRadius: 8,
                background: token.colorBgElevated,
                border: `1px solid ${token.colorBorder}`,
                transition: 'border-color 140ms ease',
            },
            composerBox: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 8,
            },
            sidebarSection: {
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                width: '100%',
                height: '100%',
                minHeight: 0,
                overflowY: 'auto',
            },
            sectionLabel: {
                margin: 0,
                color: token.colorTextTertiary,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0,
            },
            toolbar: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 7,
                width: '100%',
                minWidth: 0,
            },
            toolbarActions: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
                width: 'auto',
            },
            compactButton: {
                borderRadius: 8,
                paddingInline: isMobile ? 8 : 10,
            },
            emptyState: {
                width: '100%',
                maxWidth: 760,
                minHeight: '100%',
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
        const cachedHealth = readHealthCache(healthCacheKey);

        setHealth(cachedHealth);
        setHealthLoading(!cachedHealth);
        setHealthError(null);

        axios
            .get('/api/ai/health')
            .then((res) => {
                if (!cancelled) {
                    setHealth(res.data);
                    writeHealthCache(healthCacheKey, res.data);
                }
            })
            .catch((err) => {
                if (cancelled) return;

                if (cachedHealth) return;

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
    }, [canUseAi, healthCacheKey]);

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
        setLastFailedPrompt(null);

        const userMsg = {
            role: 'user',
            content: text,
            id: `${Date.now()}-user`,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setSending(true);
        setStreamedText('');
        setProgressLabel('Understanding your question');

        const appendStreamedText = (chunk) => setStreamedText((prev) => prev + chunk);
        const clearStreamedText = () => setStreamedText('');

        const controller = new AbortController();
        abortRef.current = controller;
        let timedOut = false;
        const requestTimeout = (Number(health?.runtime_timeout_seconds || 180) + 30) * 1000;
        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, requestTimeout);

        const payload = {
            message: text,
            conversation_id: conversationId,
            context_type: 'auto',
            context_payload: {
                url: page.url,
            },
            cache: true,
        };

        try {
            let responseData;
            if (health?.stream_enabled) {
                try {
                    responseData = await postCopilotStream(
                        payload,
                        controller.signal,
                        setProgressLabel,
                        appendStreamedText,
                    );
                } catch (streamError) {
                    // Only fall back when the turn had not begun producing
                    // output. Retrying a stream that already started could
                    // duplicate tool calls or action proposals.
                    if (!streamError.allowFallback || controller.signal.aborted) throw streamError;
                    clearStreamedText();
                    setProgressLabel('Preparing your answer');
                    responseData = (await axios.post('/api/ai/chat', payload, {
                        signal: controller.signal,
                        timeout: requestTimeout,
                    })).data;
                }
            } else {
                responseData = (await axios.post('/api/ai/chat', payload, {
                    signal: controller.signal,
                    timeout: requestTimeout,
                })).data;
            }

            const reply = responseData?.message?.content || '(no reply)';

            setConversationId(responseData?.conversation_id || conversationId);
            refreshConversations();

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: reply,
                    id: `${Date.now()}-assistant`,
                    cached: responseData?.cached,
                    actions: responseData?.actions || [],
                    sources: responseData?.sources || [],
                    cards: responseData?.cards || [],
                    tables: responseData?.tables || [],
                    warnings: responseData?.warnings || [],
                    source_note: responseData?.source_note || null,
                    followups: responseData?.followups || [],
                    answer_type: responseData?.answer_type || null,
                    answer: responseData?.answer || null,
                    // V2 evidence metadata: lets the user tell a verified live
                    // figure apart from a documentation answer.
                    evidence: responseData?.evidence || null,
                    // How to write the amounts in the cards and tables above:
                    // the tenant's own code, symbol and decimal places.
                    currency: responseData?.currency || null,
                },
            ]);
        } catch (err) {
            if ((axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') && !timedOut) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'system',
                        content:
                            'Response display was stopped. The provider may still be finishing the request on the server.',
                        id: `${Date.now()}-system`,
                    },
                ]);
            } else {
                setLastFailedPrompt(text);
                const data = err.response?.data;
                const code = timedOut || err.code === 'ECONNABORTED'
                    ? 'AI_TIMEOUT'
                    : (data?.code || err.code || null);

                let msg = data?.message || err.message || 'AI request failed.';

                if (code === 'AI_TIMEOUT') {
                    msg =
                        'AI request timed out. Try a shorter prompt. If this continues, ask the platform administrator to review the shared model and timeout settings.';
                }

                if (code === 'AI_PERMISSION_DENIED' && data?.required_permission) {
                    msg = data.message || 'You do not have permission to use KiteLedger Copilot.';
                }

                setError({ message: msg, code });
            }
        } finally {
            window.clearTimeout(timeoutId);
            setSending(false);
            setStreamedText('');
            setProgressLabel('Working on your request');
            abortRef.current = null;
        }
    };

    const stop = () => {
        abortRef.current?.abort();
    };

    const retry = () => {
        const prompt = lastFailedPrompt || [...messages].reverse().find((m) => m.role === 'user')?.content;
        if (!prompt) return;

        // Replace the failed visible attempt instead of silently adding a
        // second identical user message.
        setMessages((current) => {
            const index = current.findLastIndex((item) => item.role === 'user' && item.content === prompt);
            return index >= 0 ? current.slice(0, index) : current;
        });
        setError(null);
        send(prompt);
    };

    const copy = async (text) => {
        try {
            await navigator.clipboard?.writeText(text);
            antMessage.success('Copied');
        } catch {
            antMessage.error('Copy failed');
        }
    };

    const newConversation = () => {
        setMessages([]);
        setConversationId(null);
        setError(null);
        setActionStates({});
        setLastFailedPrompt(null);
    };

    const clearScreen = () => {
        setMessages([]);
        setError(null);
        setActionStates({});
        setLastFailedPrompt(null);
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
        Modal.confirm({
            title: 'Delete this conversation permanently?',
            content: 'Its messages cannot be recovered. This does not delete accounting records or drafts.',
            okText: 'Delete conversation',
            okButtonProps: { danger: true },
            cancelText: 'Keep conversation',
            onOk: async () => {
                try {
                    await axios.delete(`/api/ai/conversations/${encodeURIComponent(id)}`);
                    if (conversationId === id) newConversation();
                    await refreshConversations();
                    antMessage.success('Conversation deleted.');
                } catch (err) {
                    antMessage.error(err.response?.data?.message || 'Could not delete that conversation.');
                    throw err;
                }
            },
        });
    };

    const removeCurrentConversation = (event) => {
        if (conversationId) {
            deleteConversation(event, conversationId);
            return;
        }

        clearScreen();
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

    const statusLabel = healthLoading
        ? 'Preparing KiteLedger Copilot'
        : healthError
          ? 'Copilot unavailable'
          : aiReady
            ? 'Copilot ready'
            : 'Copilot not ready';
    const statusColor = healthLoading
        ? token.colorWarning
        : healthError
          ? token.colorError
          : aiReady
            ? token.colorSuccess
            : token.colorWarning;
    const copilotHeader = (
        <div style={styles.toolbar}>
            <HeaderTitle token={token} compact={isMobile} />

            <div style={styles.toolbarActions}>
                {isMobile ? (
                    <Tooltip title={statusLabel}>
                        <span
                            role="status"
                            aria-label={statusLabel}
                            style={{
                                width: 10,
                                height: 10,
                                flex: '0 0 10px',
                                borderRadius: '50%',
                                background: statusColor,
                                boxShadow: `0 0 0 3px ${token.colorFillQuaternary}`,
                            }}
                        />
                    </Tooltip>
                ) : (
                    <StatusBadge
                        health={health}
                        healthLoading={healthLoading}
                        healthError={healthError}
                        aiReady={aiReady}
                    />
                )}

                <Button
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => setHistoryOpen(true)}
                    aria-label="Open conversation history"
                    style={styles.compactButton}
                >
                    {!isMobile && 'History'}
                </Button>

                <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={newConversation}
                    aria-label="Start a new conversation"
                    style={styles.compactButton}
                >
                    {!isMobile && 'New'}
                </Button>

                <Tooltip title={conversationId ? 'Delete this conversation' : 'Clear this conversation'}>
                    <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={conversationId ? 'Delete conversation' : 'Clear conversation'}
                        onClick={removeCurrentConversation}
                        disabled={!messages.length}
                        style={{ borderRadius: token.borderRadiusLG }}
                    />
                </Tooltip>
            </div>
        </div>
    );

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
        <AuthenticatedLayout header={copilotHeader}>
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
                            bordered={false}
                            style={styles.sideCard}
                            styles={{
                                body: { padding: 10, height: '100%', overflow: 'hidden' },
                            }}
                        >
                            <div className="kl-recent-conversations" style={styles.sidebarSection}>
                                <Text style={styles.sectionLabel}>Recent conversations</Text>

                                {conversations.length ? (
                                        <List
                                            size="small"
                                            split={false}
                                            dataSource={conversations.slice(0, 7)}
                                            renderItem={(item) => {
                                                const selected = conversationId === item.id;
                                                return (
                                                    <List.Item
                                                        className="kl-sidebar-chat"
                                                        onClick={() => openConversation(item.id)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            margin: 0,
                                                            padding: '9px 10px',
                                                            borderRadius: 7,
                                                            border: '1px solid transparent',
                                                            background: selected
                                                                ? token.colorPrimaryBg
                                                                : 'transparent',
                                                        }}
                                                    >
                                                        <List.Item.Meta
                                                            avatar={
                                                                <div
                                                                    style={{
                                                                        width: 24,
                                                                        height: 24,
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
                                                                    style={{ maxWidth: 152, fontSize: 12 }}
                                                                >
                                                                    {conversationLabel(item)}
                                                                </Text>
                                                            }
                                                            description={
                                                                <Text
                                                                    type="secondary"
                                                                    ellipsis
                                                                    style={{ display: 'block', maxWidth: 152, fontSize: 11 }}
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
                                                padding: '10px 8px',
                                                borderRadius: token.borderRadiusLG,
                                                border: `1px dashed ${token.colorBorder}`,
                                                background: token.colorFillQuaternary,
                                                textAlign: 'center',
                                            }}
                                        >
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Recent chats appear here.
                                            </Text>
                                        </div>
                                )}
                            </div>
                        </Card>
                    )}

                    <Card
                        className="kl-premium-main"
                        size="small"
                        bordered={false}
                        style={styles.mainCard}
                        styles={{
                            body: { padding: 0 },
                        }}
                    >
                        <div
                            ref={scrollRef}
                            className="kl-chat-scroll"
                            style={styles.chatArea}
                            aria-busy={healthLoading || sending}
                        >
                            {healthLoading && !health ? (
                                <PreparingAi token={token} />
                            ) : messages.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <AiWelcome
                                        onSelect={send}
                                        disabled={!aiReady || sending}
                                        isMobile={isMobile}
                                        capabilities={{
                                            financialTools: Boolean(health?.financial_tools_available),
                                            toolCalling: Boolean(health?.tool_calling_available),
                                            rag: Boolean(health?.rag_index_ready),
                                            writeProposals: Boolean(health?.write_proposals_available),
                                        }}
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

                            {/*
                              * Once the answer starts arriving, the progress
                              * indicator gives way to the text itself. The
                              * bubble is provisional — the completed turn
                              * replaces it with the full structured response.
                              */}
                            {sending && streamedText ? (
                                <div className="kl-rise">
                                    <MessageBubble
                                        message={{
                                            id: 'streaming',
                                            role: 'assistant',
                                            content: streamedText,
                                            streaming: true,
                                        }}
                                        token={token}
                                        isMobile={isMobile}
                                        onCopy={copy}
                                        onFollowup={send}
                                        actionStates={actionStates}
                                        onApprove={approveAction}
                                        onReject={rejectAction}
                                    />
                                </div>
                            ) : (
                                sending && <AiThinkingIndicator isMobile={isMobile} label={progressLabel} />
                            )}
                        </div>

                        <div style={styles.composer}>
                            <div style={styles.composerSurface}>
                                <div style={styles.composerBox}>
                                    <Input.TextArea
                                        className="kl-composer-textarea"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={
                                            healthLoading
                                                ? 'Preparing AI…'
                                                : aiReady
                                                ? 'Ask about invoices, cash flow, customers, inventory, reports, or KiteLedger workflows…'
                                                : notReadyReason || 'KiteLedger Copilot is not ready.'
                                        }
                                        autoSize={{ minRows: 1, maxRows: isMobile ? 4 : 5 }}
                                        bordered={false}
                                        disabled={!aiReady || sending}
                                        onPressEnter={(e) => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                send();
                                            }
                                        }}
                                        style={{
                                            minHeight: 36,
                                            resize: 'none',
                                            fontSize: 14,
                                        }}
                                    />

                                    <Space size={5} style={{ flex: '0 0 auto' }}>
                                        <Tooltip title="Retry the last prompt">
                                            <Button
                                                icon={<ReloadOutlined />}
                                                onClick={retry}
                                                disabled={sending || !messages.length}
                                                aria-label="Retry last prompt"
                                                style={{
                                                    width: 38,
                                                    height: 38,
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
                                                    width: isMobile ? 40 : 84,
                                                    height: 38,
                                                    borderRadius: token.borderRadiusLG,
                                                    fontWeight: 650,
                                                }}
                                            >
                                                {!isMobile && 'Stop'}
                                            </Button>
                                        ) : (
                                            <Button
                                                type="primary"
                                                icon={<SendOutlined />}
                                                onClick={() => send()}
                                                disabled={!aiReady || !input.trim()}
                                                style={{
                                                    width: isMobile ? 40 : 84,
                                                    height: 38,
                                                    borderRadius: token.borderRadiusLG,
                                                    boxShadow: token.boxShadowTertiary,
                                                    fontWeight: 650,
                                                }}
                                            >
                                                {!isMobile && 'Send'}
                                            </Button>
                                        )}
                                    </Space>
                                </div>

                                {!isMobile && (
                                    <Text
                                        type="secondary"
                                        style={{ display: 'block', marginTop: 7, fontSize: 11 }}
                                    >
                                        Enter send · Shift + Enter newline
                                    </Text>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <Drawer
                    title={<HeaderTitle token={token} compact />}
                    open={historyOpen}
                    onClose={() => setHistoryOpen(false)}
                    width={isMobile ? '100%' : 380}
                    styles={{
                        header: { borderBottom: `1px solid ${token.colorBorderSecondary}` },
                        body: { padding: 10 },
                    }}
                >
                    {historyError && (
                        <Alert
                            type="warning"
                            showIcon
                            closable
                            message={historyError}
                            onClose={() => setHistoryError(null)}
                            style={{ marginBottom: 12 }}
                        />
                    )}
                    <Text
                        type="secondary"
                        style={{ display: 'block', margin: '0 2px 12px', fontSize: 12 }}
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
                                    marginBottom: 4,
                                    padding: '8px 9px',
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
                                                width: 28,
                                                height: 28,
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
                                    title={conversationLabel(item)}
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
