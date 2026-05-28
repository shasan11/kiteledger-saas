import { useEffect, useRef, useState } from 'react';
import { Drawer, Typography, theme } from 'antd';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

import KiteAiEmptyState from './KiteAiEmptyState';
import KiteAiSuggestionCards from './KiteAiSuggestionCards';
import KiteAiMessageList from './KiteAiMessageList';
import KiteAiCommandInput from './KiteAiCommandInput';
import KiteAiTypingIndicator from './KiteAiTypingIndicator';

const { Title, Text } = Typography;

const resolveContextType = (page) => {
    const explicit = page.props?.module || page.props?.context_type;

    if (explicit) {
        return explicit;
    }

    const url = String(page.url || '').toLowerCase();

    if (url.includes('/payment-in') || url.includes('/sales')) return 'sales';
    if (url.includes('/payment-out') || url.includes('/purchase')) return 'purchase';
    if (url.includes('/inventory') || url.includes('/warehouse')) return 'inventory';
    if (url.includes('/accounting')) return 'accounting';
    if (url.includes('/reports')) return 'report';
    if (url.includes('/crm')) return 'sales';

    return 'general';
};

export default function KiteAiDrawer({ open, onClose }) {
    const { token } = theme.useToken();
    const page = usePage();
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const send = async (text) => {
        const cleanText = String(text || '').trim();
        if (!cleanText || loading) return;

        const controller = new AbortController();
        abortRef.current = controller;

        setMessages((prev) => [...prev, { role: 'user', content: cleanText }]);
        setLoading(true);

        try {
            const { data } = await axios.post('/api/ai/chat', {
                message: cleanText,
                conversation_id: conversationId,
                context_type: resolveContextType(page),
                context_payload: {
                    url: page.url,
                    record_id: page.props?.record_id || page.props?.id || null,
                    module: page.props?.module || null,
                },
                cache: true,
            }, {
                signal: controller.signal,
                timeout: 90000,
            });

            setConversationId(data.conversation_id || conversationId);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.message?.content || data.message || '',
                    actions: data.actions || [],
                    sources: data.sources || [],
                    provider: data.provider,
                    model: data.model,
                    cached: data.cached,
                },
            ]);
        } catch (e) {
            if (axios.isCancel(e) || e.name === 'CanceledError') {
                setMessages((prev) => [...prev, { role: 'assistant', content: 'Request stopped.', error: true }]);
                return;
            }

            const data = e?.response?.data || {};
            const msg = data.message || e?.message || 'Kite AI is unavailable.';
            const code = data.code ? ` (${data.code})` : '';
            setMessages((prev) => [...prev, { role: 'assistant', content: `${msg}${code}`, error: true }]);
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width={460}
            destroyOnHidden
            closeIcon={null}
            styles={{
                header: { display: 'none' },
                body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
                wrapper: { maxWidth: '100vw' },
            }}
            rootClassName="kite-ai-drawer"
        >
            <div
                style={{
                    background: '#0f1419',
                    color: '#fff',
                    padding: '16px 20px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <Title level={5} style={{ color: '#fff', margin: 0 }}>Kite AI</Title>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                    Command your business with approval-safe AI.
                </Text>
            </div>

            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: token.colorBgLayout,
                }}
            >
                {messages.length === 0 ? (
                    <>
                        <KiteAiEmptyState />
                        <KiteAiSuggestionCards onPick={send} />
                    </>
                ) : (
                    <KiteAiMessageList
                        messages={messages}
                        onActionUpdated={() => {}}
                    />
                )}

                {loading && (
                    <div style={{ padding: '8px 12px' }}>
                        <KiteAiTypingIndicator />
                    </div>
                )}
            </div>

            <KiteAiCommandInput onSubmit={send} loading={loading} />
        </Drawer>
    );
}
