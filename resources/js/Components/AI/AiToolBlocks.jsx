import { Alert, Button, Card, Space, Table, Tag, Typography, message as antMessage } from 'antd';
import axios from 'axios';
import { useState } from 'react';
import { CheckOutlined, CloseOutlined, DatabaseOutlined, FileTextOutlined, LinkOutlined, SafetyOutlined } from '@ant-design/icons';

const { Text } = Typography;

function openUrl(url) {
    if (url) window.location.href = url;
}

export default function AiToolBlocks({ message = {}, onActionUpdated }) {
    const results = message.results || [];
    const actions = message.actions || [];

    if (!results.length && !actions.length) return null;

    return (
        <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 10 }}>
            {results.map((result, index) => (
                <ToolResultCard key={`business-result-${index}`} result={result} />
            ))}

            {actions.map((action) => (
                <PendingActionCard key={action.id} action={action} onActionUpdated={onActionUpdated} />
            ))}
        </Space>
    );
}

function ToolResultCard({ result }) {
    const isReport = result.type === 'report';
    const records = Array.isArray(result.records) ? result.records : [];
    const columns = records[0]
        ? Object.keys(records[0])
            .filter((key) => key !== 'open_url' && !key.endsWith('_id') && key !== 'id')
            .slice(0, 6)
            .map((key) => ({
                title: businessLabel(key),
                dataIndex: key,
                key,
                ellipsis: true,
                render: (value) => renderBusinessValue(key, value),
            }))
        : [];

    if (records[0]?.open_url) {
        columns.push({
            title: '',
            key: 'open',
            width: 52,
            render: (_, row) => (
                <Button size="small" type="text" icon={<LinkOutlined />} onClick={() => openUrl(row.open_url)} />
            ),
        });
    }

    return (
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap size={6}>
                    <Tag icon={isReport ? <FileTextOutlined /> : <DatabaseOutlined />} color={isReport ? 'purple' : 'blue'} bordered={false}>
                        {isReport ? 'Report' : 'Business data'}
                    </Tag>
                    <Text strong>{result.title || (isReport ? 'KiteLedger report' : 'Business data')}</Text>
                </Space>

                {result.summary && <Text type="secondary" style={{ fontSize: 12 }}>{result.summary}</Text>}

                {isReport ? (
                    <Button size="small" icon={<FileTextOutlined />} onClick={() => openUrl(result.open_url)}>
                        Open Report
                    </Button>
                ) : records.length ? (
                    <Table
                        size="small"
                        rowKey={(_, idx) => `business-row-${idx}`}
                        columns={columns}
                        dataSource={records}
                        pagination={records.length > 5 ? { pageSize: 5, size: 'small' } : false}
                        scroll={{ x: true }}
                    />
                ) : (
                    <Alert type="info" showIcon message="No data found" />
                )}
            </Space>
        </Card>
    );
}

function businessLabel(key) {
    const labels = {
        voucher_no: 'Voucher',
        voucher_date: 'Date',
        invoice_no: 'Invoice',
        bill_no: 'Bill',
        account_name: 'Account',
        contact_name: 'Contact',
        customer_name: 'Customer',
        supplier_name: 'Supplier',
        debit_total: 'Debit',
        credit_total: 'Credit',
        net_movement: 'Net Movement',
        total: 'Amount',
        balance: 'Balance',
        outstanding: 'Outstanding',
    };

    return labels[key] || key.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderBusinessValue(key, value) {
    if (value === null || value === undefined) return '';
    if (['total', 'amount', 'balance', 'outstanding', 'debit', 'credit', 'debit_total', 'credit_total', 'net_movement'].includes(key)) {
        return `NPR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return String(value);
}

function PendingActionCard({ action, onActionUpdated }) {
    const [busy, setBusy] = useState(null);
    const [state, setState] = useState(action);
    const missing = state.missing_fields || [];
    const disabled = state.status !== 'pending' || missing.length > 0;

    const submit = async (kind) => {
        setBusy(kind);
        try {
            const { data } = await axios.post(`/api/ai/actions/${state.id}/${kind}`);
            setState(data.action || state);
            antMessage.success(data.message || `Action ${kind}d.`);
            onActionUpdated?.(data.action || state);
        } catch (error) {
            antMessage.error(error.response?.data?.message || `Failed to ${kind} action.`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap size={6}>
                    <Tag icon={<SafetyOutlined />} color={riskColor(state.risk_level)} bordered={false}>
                        {state.risk_level || 'medium'} risk
                    </Tag>
                    <Tag bordered={false}>{state.status}</Tag>
                    <Text strong>{state.title}</Text>
                </Space>

                <Text type="secondary" style={{ fontSize: 12 }}>{state.summary}</Text>

                {missing.length > 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Missing required fields"
                        description={missing.map((item) => `${item.field}: ${item.reason}`).join(' ')}
                    />
                )}

                {Array.isArray(state.risk_reasons) && state.risk_reasons.length > 0 && (
                    <Space size={[4, 4]} wrap>
                        {state.risk_reasons.map((reason) => <Tag key={reason} bordered={false}>{reason}</Tag>)}
                    </Space>
                )}

                <Space>
                    <Button
                        size="small"
                        type="primary"
                        icon={<CheckOutlined />}
                        loading={busy === 'approve'}
                        disabled={disabled}
                        onClick={() => submit('approve')}
                    >
                        Approve
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        loading={busy === 'reject'}
                        disabled={state.status !== 'pending'}
                        onClick={() => submit('reject')}
                    >
                        Reject
                    </Button>
                </Space>
            </Space>
        </Card>
    );
}

function riskColor(level) {
    if (level === 'low') return 'green';
    if (level === 'high') return 'red';
    if (level === 'blocked') return 'red';
    return 'orange';
}
