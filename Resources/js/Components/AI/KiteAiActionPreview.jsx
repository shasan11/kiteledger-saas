import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Space, Tag, Typography, message, theme } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import KiteAiRiskBadge from './KiteAiRiskBadge';

const { Text, Paragraph } = Typography;

export default function KiteAiActionPreview({ action, onUpdated }) {
    const { token } = theme.useToken();
    const [busy, setBusy] = useState(null); // 'approve' | 'reject' | null
    const [localStatus, setLocalStatus] = useState(action.status || 'pending');

    const isFinal = ['executed', 'rejected', 'failed', 'expired'].includes(localStatus);

    const approve = async () => {
        setBusy('approve');
        try {
            const { data } = await axios.post(`/api/ai/actions/${action.id}/approve`);
            if (data.success) {
                message.success('Action executed successfully.');
                setLocalStatus('executed');
                onUpdated?.(data);
            } else {
                message.error(data.message || 'Action could not be executed.');
                setLocalStatus(data.action?.status || 'failed');
            }
        } catch (e) {
            message.error(e?.response?.data?.message || 'Action could not be executed.');
            setLocalStatus('failed');
        } finally {
            setBusy(null);
        }
    };

    const reject = async () => {
        setBusy('reject');
        try {
            const { data } = await axios.post(`/api/ai/actions/${action.id}/reject`);
            if (data.success) {
                message.info('Action rejected.');
                setLocalStatus('rejected');
                onUpdated?.(data);
            }
        } catch (e) {
            message.error(e?.response?.data?.message || 'Could not reject.');
        } finally {
            setBusy(null);
        }
    };

    const payloadPreview = renderPayload(action.payload, action.action_type);

    return (
        <Card
            size="small"
            style={{
                marginTop: 8,
                background: token.colorBgContainer,
                borderColor: token.colorBorderSecondary,
            }}
            styles={{ body: { padding: 12 } }}
        >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text strong>{action.title}</Text>
                    <KiteAiRiskBadge level={action.risk_level} />
                </Space>

                {action.summary && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{action.summary}</Text>
                )}

                {action.module && <Tag color="default">{action.module}</Tag>}

                {payloadPreview}

                {action.risk_reasons?.length > 0 && (
                    <Alert
                        type={action.risk_level === 'low' ? 'info' : 'warning'}
                        showIcon
                        message="Review notes"
                        description={
                            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                                {action.risk_reasons.map((r, i) => <li key={i} style={{ fontSize: 12 }}>{r}</li>)}
                            </ul>
                        }
                    />
                )}

                {action.missing_fields?.length > 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Missing or ambiguous fields"
                        description={
                            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                                {action.missing_fields.map((m, i) => (
                                    <li key={i} style={{ fontSize: 12 }}>{m.reason}</li>
                                ))}
                            </ul>
                        }
                    />
                )}

                {isFinal ? (
                    <Tag color={localStatus === 'executed' ? 'green' : 'red'}>{localStatus.toUpperCase()}</Tag>
                ) : (
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            icon={<CheckOutlined />}
                            loading={busy === 'approve'}
                            onClick={approve}
                        >
                            Approve & Execute
                        </Button>
                        <Button
                            size="small"
                            icon={<CloseOutlined />}
                            loading={busy === 'reject'}
                            onClick={reject}
                        >
                            Reject
                        </Button>
                    </Space>
                )}

                <Paragraph type="secondary" style={{ fontSize: 11, margin: 0 }}>
                    AI prepared this action. Review before execution.
                </Paragraph>
            </Space>
        </Card>
    );
}

function renderPayload(payload = {}, actionType = '') {
    if (!payload || typeof payload !== 'object') return null;

    if (actionType === 'create_invoice_draft') {
        return (
            <Descriptions size="small" column={1} colon={false} styles={{ label: { fontSize: 11 }, content: { fontSize: 12 } }}>
                <Descriptions.Item label="Customer">{payload.contact_name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Date">{payload.invoice_date}</Descriptions.Item>
                <Descriptions.Item label="Items">
                    {(payload.lines || []).map((l, i) => (
                        <div key={i}>{l.product_name} × {l.quantity} @ {l.rate} = {l.amount}</div>
                    ))}
                </Descriptions.Item>
                <Descriptions.Item label="Subtotal">{format(payload.subtotal)}</Descriptions.Item>
                <Descriptions.Item label="Tax">{format(payload.tax_total)}</Descriptions.Item>
                <Descriptions.Item label="Total"><b>{format(payload.total)}</b></Descriptions.Item>
            </Descriptions>
        );
    }

    if (actionType === 'create_journal_voucher_draft') {
        return (
            <Descriptions size="small" column={1} colon={false} styles={{ label: { fontSize: 11 }, content: { fontSize: 12 } }}>
                <Descriptions.Item label="Date">{payload.voucher_date}</Descriptions.Item>
                <Descriptions.Item label="Narration">{payload.narration || '—'}</Descriptions.Item>
                <Descriptions.Item label="Debit">
                    {(payload.debits || []).map((l, i) => (
                        <div key={i}>{l.account_name} — {format(l.amount)}</div>
                    ))}
                </Descriptions.Item>
                <Descriptions.Item label="Credit">
                    {(payload.credits || []).map((l, i) => (
                        <div key={i}>{l.account_name} — {format(l.amount)}</div>
                    ))}
                </Descriptions.Item>
                <Descriptions.Item label="Balanced">
                    {payload.balanced ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>}
                </Descriptions.Item>
            </Descriptions>
        );
    }

    return null;
}

function format(n) {
    if (n === null || n === undefined || n === '') return '—';
    const num = Number(n);
    if (Number.isNaN(num)) return n;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
