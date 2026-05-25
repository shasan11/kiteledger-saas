import { Typography, theme } from 'antd';
import KiteAiActionPreview from './KiteAiActionPreview';
import KiteAiSourceList from './KiteAiSourceList';

const { Text } = Typography;

export default function KiteAiMessageList({ messages = [], onActionUpdated }) {
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

                        {m.actions?.map((a) => (
                            <KiteAiActionPreview key={a.id} action={a} onUpdated={onActionUpdated} />
                        ))}

                        {m.sources?.length > 0 && <KiteAiSourceList sources={m.sources} />}
                    </div>
                </div>
            ))}
        </div>
    );
}
