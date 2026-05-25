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

export default function KiteAiDrawer({ open, onClose }) {
    const { token } = theme.useToken();
    const page = usePage();
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const send = async (text) => {
        setMessages((prev) => [...prev, { role: 'user', content: text }]);
        setLoading(true);
        try {
            const { data } = await axios.post('/api/ai/chat', {
                message: text,
                conversation_id: conversationId,
                page_context: {
                    url: page.url,
                    module: page.props?.module,
                    record_id: page.props?.record_id,
                },
            });
            setConversationId(data.conversation_id);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.message?.content || '',
                    actions: data.actions || [],
                    sources: data.sources || [],
                    intent: data.intent,
                },
            ]);
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || 'Kite AI is unavailable.';
            setMessages((prev) => [...prev, { role: 'assistant', content: msg, error: true }]);
        } finally {
            setLoading(false);
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
            {/* Premium dark header */}
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

            {/* Scroll area */}
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
                        onActionUpdated={() => { /* could refresh audit timeline */ }}
                    />
                )}

                {loading && (
                    <div style={{ padding: '8px 12px' }}>
                        <KiteAiTypingIndicator />
                    </div>
                )}
            </div>

            {/* Sticky input */}
            <KiteAiCommandInput onSubmit={send} loading={loading} />
        </Drawer>
    );
}
