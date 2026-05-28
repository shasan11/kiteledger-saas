import { theme } from 'antd';

export default function KiteAiTypingIndicator({ label = 'AI is preparing draft…' }) {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 10,
                background: token.colorFillSecondary,
                color: token.colorTextSecondary,
                fontSize: 13,
            }}
        >
            <span className="kite-ai-dot" style={dotStyle(token, 0)} />
            <span className="kite-ai-dot" style={dotStyle(token, 150)} />
            <span className="kite-ai-dot" style={dotStyle(token, 300)} />
            <span>{label}</span>
            <style>{`
                @keyframes kiteAiPulse {
                    0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
                    30% { opacity: 1; transform: translateY(-2px); }
                }
            `}</style>
        </div>
    );
}

function dotStyle(token, delay) {
    return {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: token.colorPrimary,
        display: 'inline-block',
        animation: 'kiteAiPulse 1.2s ease-in-out infinite',
        animationDelay: `${delay}ms`,
    };
}
