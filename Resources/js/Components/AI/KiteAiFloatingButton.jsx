import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import KiteAiDrawer from './KiteAiDrawer';

export default function KiteAiFloatingButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Tooltip title="Kite AI — command your business" placement="left">
                <Button
                    type="primary"
                    shape="round"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={() => setOpen(true)}
                    style={{
                        position: 'fixed',
                        right: 28,
                        bottom: 100, // sits above the existing quick-add FAB (which is at bottom: 28)
                        zIndex: 150,
                        height: 48,
                        paddingInline: 20,
                        background: '#0f1419',
                        borderColor: '#0f1419',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        fontWeight: 600,
                        letterSpacing: 0.2,
                    }}
                >
                    Kite AI
                </Button>
            </Tooltip>

            <KiteAiDrawer open={open} onClose={() => setOpen(false)} />
        </>
    );
}
