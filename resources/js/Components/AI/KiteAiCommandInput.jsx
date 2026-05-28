import { useState } from 'react';
import { Button, Input, Space, Tooltip, theme } from 'antd';
import { ReloadOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';

export default function KiteAiCommandInput({
    onSubmit,
    onStop,
    onRetry,
    loading = false,
    canRetry = false,
}) {
    const { token } = theme.useToken();
    const [value, setValue] = useState('');

    const submit = () => {
        const v = value.trim();
        if (!v || loading) return;
        onSubmit?.(v);
        setValue('');
    };

    return (
        <div
            style={{
                padding: 12,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
            }}
        >
            <Space.Compact style={{ width: '100%' }}>
                <Input.TextArea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Ask Kite AI… e.g. Summarize today's sales"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    onPressEnter={(e) => {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    disabled={loading}
                />
                {loading && onStop ? (
                    <Tooltip title="Stop generating">
                        <Button danger icon={<StopOutlined />} onClick={onStop} style={{ height: 'auto' }} />
                    </Tooltip>
                ) : (
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={submit}
                        loading={loading}
                        style={{ height: 'auto' }}
                    />
                )}
                {canRetry && !loading && onRetry && (
                    <Tooltip title="Retry last message">
                        <Button icon={<ReloadOutlined />} onClick={onRetry} style={{ height: 'auto' }} />
                    </Tooltip>
                )}
            </Space.Compact>
        </div>
    );
}
