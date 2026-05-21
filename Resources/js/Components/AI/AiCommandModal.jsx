import { RobotOutlined, SendOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Alert, Button, Divider, Input, List, Modal, Space, Tag, Typography, theme } from 'antd';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

const { Text, Paragraph } = Typography;

const INTENT_COLORS = {
    search_records:    'blue',
    explain_report:    'purple',
    review_transaction:'orange',
    draft_invoice:     'cyan',
    draft_message:     'green',
    explain_accounting:'geekblue',
    collection_plan:   'red',
    inventory_insight: 'volcano',
    unsupported:       'default',
};

export default function AiCommandModal({ open, onClose, branchId }) {
    const { token } = theme.useToken();
    const inputRef = useRef(null);

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setResult(null);
            setError(null);
            setMessage('');
        }
    }, [open]);

    const handleSend = useCallback(async () => {
        if (!message.trim()) return;

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const { data } = await axios.post('/api/ai/command', {
                message: message.trim(),
                branch_id: branchId,
            });

            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'AI command failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [message, branchId]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleAction = (action) => {
        if (action.type === 'navigate' && action.url) {
            onClose?.();
            router.visit(action.url);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title={
                <Space>
                    <RobotOutlined style={{ color: token.colorPrimary }} />
                    <span>AI Command Center</span>
                </Space>
            }
            width={600}
            destroyOnHidden
        >
            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything: 'Show unpaid invoices for ABC', 'Explain trial balance'…"
                    size="large"
                    disabled={loading}
                />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    size="large"
                    loading={loading}
                    onClick={handleSend}
                    disabled={!message.trim()}
                >
                    Send
                </Button>
            </Space.Compact>

            {error && (
                <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />
            )}

            {result && (
                <div>
                    <Divider style={{ margin: '8px 0' }} />

                    <Space style={{ marginBottom: 8 }}>
                        <Tag color={INTENT_COLORS[result.intent] ?? 'default'}>
                            {result.intent?.replace(/_/g, ' ')}
                        </Tag>
                        {result.module && <Tag>{result.module}</Tag>}
                    </Space>

                    {result.answer && (
                        <Paragraph style={{ marginBottom: 8, fontSize: 13 }}>
                            {result.answer}
                        </Paragraph>
                    )}

                    {result.actions?.length > 0 && (
                        <List
                            size="small"
                            dataSource={result.actions}
                            renderItem={(action) => (
                                <List.Item style={{ padding: '4px 0' }}>
                                    <Button
                                        type="link"
                                        size="small"
                                        onClick={() => handleAction(action)}
                                        style={{ padding: 0 }}
                                    >
                                        → {action.label}
                                    </Button>
                                </List.Item>
                            )}
                        />
                    )}
                </div>
            )}

            <Divider style={{ margin: '8px 0' }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
                AI provides suggestions only. It cannot approve, void, or delete records.
            </Text>
        </Modal>
    );
}
