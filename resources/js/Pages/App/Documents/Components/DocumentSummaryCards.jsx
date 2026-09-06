import { Skeleton, Typography, theme } from 'antd';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    InboxOutlined,
    LoadingOutlined,
    WarningOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/*
 * Counts cover the whole filtered dataset, not the current page - a "3 need
 * review" that only counts page one is worse than showing nothing, because it
 * reads as complete.
 */
const CARDS = [
    { key: 'uploaded', label: 'Uploaded', icon: <InboxOutlined />, tone: 'default' },
    { key: 'processing', label: 'Processing', icon: <LoadingOutlined />, tone: 'processing' },
    { key: 'needs_review', label: 'Needs review', icon: <WarningOutlined />, tone: 'warning' },
    { key: 'converted', label: 'Converted', icon: <CheckCircleOutlined />, tone: 'success' },
    { key: 'failed', label: 'Failed', icon: <ExclamationCircleOutlined />, tone: 'error' },
];

export default function DocumentSummaryCards({ summary, loading = false, onSelect, activeStatus }) {
    const { token } = theme.useToken();

    const toneColor = {
        default: token.colorTextTertiary,
        processing: token.colorInfo,
        warning: token.colorWarning,
        success: token.colorSuccess,
        error: token.colorError,
    };

    if (loading && !summary) {
        return (
            <div style={{ display: 'flex', gap: 1, padding: 8, marginBottom: 10, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` }}>
                {CARDS.map((card) => <Skeleton.Button key={card.key} active size="small" style={{ width: 110 }} />)}
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'stretch',
                marginBottom: 10,
                overflowX: 'auto',
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
            }}
        >
            <button
                type="button"
                onClick={() => onSelect?.(undefined)}
                style={{
                    appearance: 'none', display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 14px', minWidth: 100, border: 0,
                    borderRight: `1px solid ${token.colorBorderSecondary}`,
                    borderBottom: !activeStatus ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                    background: !activeStatus ? token.colorPrimaryBg : 'transparent',
                    color: token.colorText, cursor: onSelect ? 'pointer' : 'default',
                }}
            >
                <strong style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{Number(summary.total ?? 0)}</strong>
                <Text type="secondary" style={{ fontSize: 11 }}>All</Text>
            </button>
            {CARDS.map((card) => {
                const count = Number(summary[card.key] ?? 0);
                const isActive = activeStatus === card.key;

                return (
                    <button
                            key={card.key}
                            type="button"
                            onClick={() => onSelect?.(isActive ? undefined : card.key)}
                            style={{
                                appearance: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                minWidth: 118,
                                padding: '8px 12px',
                                border: 0,
                                borderRight: `1px solid ${token.colorBorderSecondary}`,
                                borderBottom: isActive ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                                background: isActive ? token.colorPrimaryBg : 'transparent',
                                color: token.colorText,
                                cursor: onSelect ? 'pointer' : 'default',
                                textAlign: 'left',
                            }}
                        >
                        <span style={{ color: toneColor[card.tone], fontSize: 14 }}>{card.icon}</span>
                        <span style={{ minWidth: 0 }}>
                            <strong style={{ display: 'block', fontSize: 14, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{count}</strong>
                            <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{card.label}</Text>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
