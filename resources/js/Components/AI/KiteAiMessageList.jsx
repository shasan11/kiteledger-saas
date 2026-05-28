import { Typography, theme } from 'antd';

const { Text } = Typography;

export default function KiteAiMessageList({ messages = [] }) {
    const { token } = theme.useToken();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 12px' }}>
            {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div
                        style={{
                            maxWidth: '88%',
                            padding: '8px 12px',
                            borderRadius: 12,
                            background:
                                m.role === 'user'
                                    ? token.colorPrimary
                                    : token.colorBgContainer,
                            color: m.role === 'user' ? token.colorTextLightSolid : token.colorText,
                            border: m.role === 'user' ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                            fontSize: 13,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        <Text style={{ color: 'inherit', fontSize: 13 }}>{m.content}</Text>
                        {m.provider && (
                            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
                                {m.provider}{m.model ? ` · ${m.model}` : ''}{m.cached ? ' · cached' : ''}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
