import { Head, router, usePage } from '@inertiajs/react';
import {
    AppstoreOutlined, BankOutlined, BellOutlined, BookOutlined, CheckCircleOutlined, CloudServerOutlined,
    CodeSandboxOutlined, CreditCardOutlined, DashboardOutlined, DatabaseOutlined, FileTextOutlined,
    GlobalOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, PlusOutlined,
    QuestionCircleOutlined, SearchOutlined, SettingOutlined, ShopOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Breadcrumb, Button, Drawer, Dropdown, Input, Layout, Menu, Modal, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { humanize, initials } from '@/Components/Central/formatters';

const { Header, Sider, Content } = Layout;
const navGroups = [
    ['Workspace', [['central.dashboard','Command center',<DashboardOutlined />],['central.tenants.index','Tenants',<TeamOutlined />]]],
    ['Revenue', [['central.plans.index','Plans & pricing',<AppstoreOutlined />],['central.subscriptions.index','Subscriptions',<CreditCardOutlined />],['central.invoices.index','Invoices',<FileTextOutlined />],['central.payments.index','Payments',<BankOutlined />],['central.gateways.index','Payment gateways',<CreditCardOutlined />]]],
    ['Operations', [['central.provisioning-logs.index','Provisioning',<CloudServerOutlined />],['central.usage.index','Usage metering',<DashboardOutlined />],['central.tenant-databases.index','Database registry',<DatabaseOutlined />],['central.default-templates.index','Data templates',<CodeSandboxOutlined />]]],
    ['Product', [['central.features.index','Features',<AppstoreOutlined />],['central.tenant-feature-overrides.index','Feature overrides',<SettingOutlined />],['central.website-pages.index','Website content',<GlobalOutlined />],['central.blog-posts.index','Blog',<BookOutlined />]]],
    ['Administration', [['central.central-admins.index','Administrators',<UserOutlined />],['central.platform-settings.index','Platform settings',<SettingOutlined />]]],
];

export default function CentralLayout({ title, subtitle, breadcrumbs = [], children }) {
    const page = usePage();
    const user = page.props?.auth?.user || page.props?.centralAdmin || {};
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('central.sidebar.collapsed') === '1');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const allNav = useMemo(() => navGroups.flatMap(([group, entries]) => entries.map(([name,label,icon]) => ({ group, name, label, icon, url: route(name) }))), []);
    const currentPath = page.url.split('?')[0];
    const active = [...allNav].sort((a,b) => new URL(b.url, location.origin).pathname.length - new URL(a.url, location.origin).pathname.length).find((item) => currentPath.startsWith(new URL(item.url, location.origin).pathname));

    useEffect(() => { localStorage.setItem('central.sidebar.collapsed', collapsed ? '1' : '0'); }, [collapsed]);
    useEffect(() => {
        const listener = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); } };
        window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
    }, []);

    const menuItems = navGroups.map(([label, entries]) => ({
        type: 'group', label,
        children: entries.map(([name, itemLabel, icon]) => ({ key: name, label: itemLabel, icon, onClick: () => { setMobileOpen(false); router.visit(route(name)); } })),
    }));
    const searchResults = useMemo(() => allNav.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase())), [query]);
    const trail = [{ title: 'Control Center' }, ...(breadcrumbs.length ? breadcrumbs : active && active.label !== title ? [{ title: active.label }] : []), { title }].filter((item, index, array) => item.title && array.findIndex((x) => x.title === item.title) === index);
    const profileItems = [
        { key: 'site', label: 'View public website', icon: <ShopOutlined />, onClick: () => router.visit(route('central.home')) },
        { type: 'divider' },
        { key: 'logout', label: 'Sign out', danger: true, icon: <LogoutOutlined />, onClick: () => router.post(route('central.logout')) },
    ];
    const renderMenu = (isCollapsed) => <><div className="central-sider__brand"><span className="central-sider__mark">K</span>{!isCollapsed && <span className="central-sider__brand-copy"><strong>KiteLedger</strong><span>CONTROL CENTER</span></span>}</div><div className="central-sider__menu"><Menu theme="dark" mode="inline" inlineCollapsed={isCollapsed} selectedKeys={[active?.name]} items={menuItems} /></div><div className="central-sider__footer"><CheckCircleOutlined style={{ color: '#34d399', marginRight: 9 }} />{!isCollapsed && 'Platform operational'}</div></>;

    return <Layout className="central-shell">
        <Head title={title} />
        <Sider className="central-sider" width={252} collapsedWidth={80} collapsed={collapsed} trigger={null}>{renderMenu(collapsed)}</Sider>
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} placement="left" width={280} closable={false} styles={{ body: { padding: 0, background: '#101827' } }}><div style={{ width: 280, minHeight: '100vh' }}>{renderMenu(false)}</div></Drawer>
        <Layout className={`central-main${collapsed ? ' central-main--collapsed' : ''}`}>
            <Header className="central-topbar">
                <div className="central-topbar__left">
                    <Button className="central-desktop-toggle" type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((value) => !value)} />
                    <Button className="central-mobile-toggle" type="text" icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} />
                    <Breadcrumb className="central-topbar__crumbs" items={trail} />
                </div>
                <div className="central-topbar__spacer" />
                <button className="central-topbar__search" onClick={() => setSearchOpen(true)}><SearchOutlined /><span>Search control center</span><span className="central-topbar__shortcut">Ctrl K</span></button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => router.visit(route('central.tenants.create'))}>New tenant</Button>
                <Badge dot><Button type="text" shape="circle" icon={<BellOutlined />} aria-label="Notifications" /></Badge>
                <Button type="text" shape="circle" icon={<QuestionCircleOutlined />} aria-label="Help" />
                <Dropdown menu={{ items: profileItems }} trigger={['click']} placement="bottomRight"><button className="central-profile"><Avatar size={34}>{initials(user.name || user.email)}</Avatar><span className="central-profile__copy"><strong>{user.name || 'Administrator'}</strong><span>{humanize(user.role || 'super admin')}</span></span></button></Dropdown>
            </Header>
            <Content className="central-content"><div className="central-content__inner">{subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}{children}</div></Content>
        </Layout>
        <Modal open={searchOpen} onCancel={() => { setSearchOpen(false); setQuery(''); }} footer={null} title="Search control center" width={620}>
            <Input autoFocus size="large" prefix={<SearchOutlined />} placeholder="Find tenants, billing, settings…" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div style={{ marginTop: 14, maxHeight: 390, overflowY: 'auto' }}>{searchResults.map((item) => <button key={item.name} onClick={() => { setSearchOpen(false); setQuery(''); router.visit(item.url); }} style={{ width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px',border:0,borderBottom:'1px solid #eef2f7',background:'transparent',cursor:'pointer',textAlign:'left' }}><span className="central-tone--emerald" style={{ width:34,height:34,display:'grid',placeItems:'center',borderRadius:9 }}>{item.icon}</span><span style={{ flex:1 }}><strong style={{ display:'block' }}>{item.label}</strong><Typography.Text type="secondary" style={{ fontSize:12 }}>{item.group}</Typography.Text></span></button>)}</div>
        </Modal>
        <style>{`.central-mobile-toggle{display:none}@media(max-width:991px){.central-desktop-toggle{display:none}.central-mobile-toggle{display:inline-flex}}`}</style>
    </Layout>;
}
