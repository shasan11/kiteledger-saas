import { useState } from 'react';
import { Button, Input, Space, theme } from 'antd';
import { SendOutlined } from '@ant-design/icons';

export default function KiteAiCommandInput({ onSubmit, loading = false }) {
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
                    placeholder="Ask Kite AI… e.g. Create invoice for ABC Traders for 5 laptops"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    onPressEnter={(e) => {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    disabled={loading}
                />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={submit}
                    loading={loading}
                    style={{ height: 'auto' }}
                />
            </Space.Compact>
        </div>
    );
}
