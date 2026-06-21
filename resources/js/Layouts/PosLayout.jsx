import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button, Drawer, Grid, Layout, Menu, Space, theme, Typography } from 'antd';
import { ArrowLeftOutlined, MenuOutlined } from '@ant-design/icons';
import ApplicationLogo from '@/Components/ApplicationLogo';

const { Header, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const NAV_ITEMS = [
    { key: 'screen', label: 'Sell', path: '/pos/screen', match: (url) => url.startsWith('/pos/screen') },
    { key: 'terminal', label: 'Terminals', path: '/pos', match: (url) => url === '/pos' || url === '/pos/' },
    { key: 'shifts', label: 'Shifts', path: '/pos/shifts', match: (url) => url.startsWith('/pos/shifts') },
    { key: 'sales', label: 'Sales', path: '/pos/sales', match: (url) => url.startsWith('/pos/sales') },
    { key: 'returns', label: 'Returns', path: '/pos/returns', match: (url) => url.startsWith('/pos/returns') },
    { key: 'cash', label: 'Cash', path: '/pos/cash-movements', match: (url) => url.startsWith('/pos/cash-movements') },
    { key: 'setup', label: 'Setup', path: '/pos/terminals', match: (url) => url.startsWith('/pos/terminals') },
];

const resolveActiveKey = (url = '') => {
    const clean = url.split('?')[0];
    return NAV_ITEMS.find((item) => item.match(clean))?.key ?? 'terminal';
};

const navigateBack = () => {
    try {
        if (typeof route === 'function') {
            router.visit(route('dashboard'));
            return;
        }
    } catch {
        // ignore
    }
    window.location.href = '/';
};

export default function PosLayout({ children }) {
    const { token } = theme.useToken();
    const { url } = usePage();
    const screens = useBreakpoint();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const activeKey = resolveActiveKey(url);
    const isMobile = !screens.md;
    const isSmall = !screens.sm;

    const handleNavClick = ({ key }) => {
        const item = NAV_ITEMS.find((i) => i.key === key);
        if (item) {
            router.visit(item.path);
            setDrawerOpen(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
            <Header
                style={{
                    height: 72,
                    lineHeight: '72px',
                    padding: '0 24px',
                    background: token.colorBgContainer,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    position: 'sticky',
                    top: 0,
                    zIndex: 200,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                }}
            >
                {/* Left — logo + brand name */}
                <Space size={10} align="center" style={{ flexShrink: 0 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 48,
                        }}
                    >
                        <ApplicationLogo style={{ height: 52, width: 'auto', maxWidth: 180 }} />
                    </div>
                    
                </Space>

                {/* Center — horizontal navigation (desktop) */}
                {!isMobile && (
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            justifyContent: 'center',
                            minWidth: 0,
                            overflow: 'hidden',
                        }}
                    >
                        <Menu
                            mode="horizontal"
                            selectedKeys={[activeKey]}
                            items={NAV_ITEMS.map(({ key, label }) => ({ key, label }))}
                            onClick={handleNavClick}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                lineHeight: '70px',
                                flex: 1,
                                justifyContent: 'center',
                                minWidth: 0,
                            }}
                        />
                    </div>
                )}

                {/* Right — back button + mobile hamburger */}
                <Space size={8} style={{ flexShrink: 0 }}>
                    {isMobile && (
                        <Button icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
                    )}
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={navigateBack}
                    >
                        {!isSmall && 'Back to Application'}
                    </Button>
                </Space>
            </Header>

            <Content style={{ minHeight: 'calc(100vh - 72px)', background: token.colorBgLayout }}>
                {children}
            </Content>

            {/* Mobile navigation drawer */}
            <Drawer
                title="POS Navigation"
                placement="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={240}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[activeKey]}
                    items={NAV_ITEMS.map(({ key, label }) => ({ key, label }))}
                    onClick={handleNavClick}
                    style={{ border: 'none' }}
                />
            </Drawer>
        </Layout>
    );
}
