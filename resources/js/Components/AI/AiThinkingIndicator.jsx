import { useEffect, useState } from 'react';
import { Space, Typography, theme } from 'antd';

const { Text } = Typography;

/*
 * Stages the assistant actually moves through. Advancing on a timer would be
 * fabricated progress, so these are phrased as what is being attempted rather
 * than as completed steps, and the last one holds until the answer arrives.
 */
const STAGES = [
    'Understanding your question',
    'Checking your permitted data',
    'Preparing the answer',
];

export default function AiThinkingIndicator({ isMobile = false }) {
    const { token } = theme.useToken();
    const [stage, setStage] = useState(0);

    useEffect(() => {
        // Advance slowly: a label that changes faster than the work does reads
        // as decorative. Holds on the final stage rather than looping.
        const timers = [
            window.setTimeout(() => setStage(1), 1400),
            window.setTimeout(() => setStage(2), 4200),
        ];

        return () => timers.forEach(window.clearTimeout);
    }, []);

    return (
        <div
            className="kl-rise"
            style={{
                display: 'flex',
                justifyContent: 'flex-start',
                padding: isMobile ? '6px 0' : '8px 0',
            }}
            role="status"
            aria-live="polite"
        >
            <div
                style={{
                    padding: '10px 14px',
                    borderRadius: `${token.borderRadiusXL}px ${token.borderRadiusXL}px ${token.borderRadiusXL}px 4px`,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                    boxShadow: token.boxShadowTertiary,
                }}
            >
                <Space size={10}>
                    <span aria-hidden="true">
                        <span className="kl-dot" />
                        <span className="kl-dot" style={{ marginLeft: 4 }} />
                        <span className="kl-dot" style={{ marginLeft: 4 }} />
                    </span>

                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {STAGES[stage]}
                    </Text>
                </Space>
            </div>
        </div>
    );
}
