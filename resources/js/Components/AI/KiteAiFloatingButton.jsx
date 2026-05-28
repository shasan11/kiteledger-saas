import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { usePage } from '@inertiajs/react';
import KiteAiDrawer from './KiteAiDrawer';

const AI_PERMS = ['ai.view', 'ai.use', 'ai.chat', 'ai.manage'];

export default function KiteAiFloatingButton() {
    const [open, setOpen] = useState(false);
    const page = usePage();
    const perms = page.props?.auth?.permissions || [];
    const canBypass = !!page.props?.auth?.canBypassPermissions;
    const canShow = canBypass || (Array.isArray(perms) && AI_PERMS.some((p) => perms.includes(p)));

    if (!canShow) return null;

    return (
        <>
            <Tooltip title="Kite AI — ask anything about your business" placement="left">
                <Button
                    type="primary"
                    shape="round"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={() => setOpen(true)}
                    style={{
                        position: 'fixed',
                        right: 28,
                        bottom: 100,
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
