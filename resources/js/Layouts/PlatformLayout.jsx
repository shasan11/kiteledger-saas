import {
    BankOutlined,
    CreditCardOutlined,
    HomeOutlined,
    LogoutOutlined,
    MenuOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    ShopOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Head, router, usePage } from '@inertiajs/react';
import { Alert, Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import TenantSwitcher from '@/Components/Platform/TenantSwitcher';
import { initials } from '@/Components/Central/formatters';

const { Header, Sider, Content } = Layout;

/**
 * Chrome for the customer account portal. Menu entries are filtered by the
 * membership permissions shared from the server; the backend policies stay
 * authoritative regardless of what is rendered here.
 */
export default function PlatformLayout({ title, children }) {
    const { props } = usePage();
    const user = props.auth?.user;
    const tenants = props.platform?.tenants || [];
    const activeId = props.platform?.activeTenantId;
    const active = tenants.find((tenant) => tenant.id === activeId);
    const flash = props.flash;
    const screens = Grid.useBreakpoint();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const items = useMemo(() => {
        const nav = [
            { key: 'dashboard', icon: <HomeOutlined />, label: 'Overview', href: route('central.account.dashboard') },
            { key: 'companies', icon: <ShopOutlined />, label: 'My Companies', href: route('central.account.tenants.index') },
            { key: 'profile', icon: <UserOutlined />, label: 'Profile', href: route('central.account.profile.edit') },
            { key: 'security', icon: <SafetyCertificateOutlined />, label: 'Security', href: route('central.account.security') },
        ];
        if (!active) return nav;
        const scoped = [{ key: 'tenant-overview', icon: <BankOutlined />, label: 'Overview', href: route('central.account.tenants.show', active.id) }];
        scoped.push({ key: 'tenant-company', icon: <SettingOutlined />, label: 'Company', href: route('central.account.tenants.settings', active.id) });
        if (active.can_manage_users) scoped.push({ key: 'tenant-members', icon: <TeamOutlined />, label: 'Members', href: route('central.account.tenants.members', active.id) });
        if (active.can_manage_billing) scoped.push({ key: 'tenant-billing', icon: <CreditCardOutlined />, label: 'Billing', href: route('central.account.tenants.billing', active.id) });

        return [...nav, { key: 'divider', type: 'divider' }, { key: 'tenant-group', type: 'group', label: active.company_name, children: scoped }];
    }, [active]);

    const flatten = (list) => list.flatMap((item) => (item.children ? flatten(item.children) : [item]));
    const onSelect = ({ key }) => {
        const target = flatten(items).find((item) => item.key === key);
        if (target?.href) {
            router.visit(target.href);
            setDrawerOpen(false);
        }
    };
    const selectedKey = flatten(items).find((item) => item.href && typeof window !== 'undefined' && window.location.pathname === new URL(item.href, window.location.origin).pathname)?.key;

    const navigation = <Menu mode="inline" items={items} selectedKeys={selectedKey ? [selectedKey] : []} onClick={onSelect} style={{ borderInlineEnd: 'none' }} />;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Head title={title ? `${title} · KiteLedger` : 'KiteLedger Account'} />
            {screens.lg && (
                <Sider theme="light" width={248} style={{ borderInlineEnd: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ padding: 16 }}><ApplicationLogo style={{ width: 140 }} /></div>
                    <div style={{ padding: '0 12px 12px' }}><TenantSwitcher block /></div>
                    {navigation}
                </Sider>
            )}
            <Layout>
                <Header style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 16 }}>
                    <Space>
                        {!screens.lg && <Button icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="Open navigation" />}
                        {!screens.lg && <TenantSwitcher />}
                    </Space>
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
                                { key: 'security', icon: <SafetyCertificateOutlined />, label: 'Security' },
                                { type: 'divider' },
                                { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
                            ],
                            onClick: ({ key }) => {
                                if (key === 'logout') router.post(route('central.account.logout'));
                                if (key === 'profile') router.visit(route('central.account.profile.edit'));
                                if (key === 'security') router.visit(route('central.account.security'));
                            },
                        }}
                    >
                        <Space style={{ cursor: 'pointer' }}>
                            <Avatar src={user?.avatar || undefined}>{initials(user?.name)}</Avatar>
                            {screens.md && <Typography.Text>{user?.name}</Typography.Text>}
                        </Space>
                    </Dropdown>
                </Header>
                <Content style={{ padding: screens.md ? 24 : 12 }}>
                    {flash?.success && <Alert type="success" showIcon message={flash.success} closable style={{ marginBottom: 16 }} />}
                    {flash?.error && <Alert type="error" showIcon message={flash.error} closable style={{ marginBottom: 16 }} />}
                    {children}
                </Content>
            </Layout>
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} placement="left" width={280} title={<ApplicationLogo style={{ width: 130 }} />}>
                {navigation}
            </Drawer>
        </Layout>
    );
}
