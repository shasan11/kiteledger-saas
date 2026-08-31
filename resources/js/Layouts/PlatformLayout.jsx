import { LogoutOutlined, MenuOutlined, PlusOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Alert, Avatar, Button, Dropdown } from 'antd';
import { useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { initials } from '@/Components/Central/formatters';

const pathFor = (href) => {
    if (typeof window === 'undefined') return href;
    return new URL(href, window.location.origin).pathname;
};

export default function PlatformLayout({ title, children }) {
    const { props } = usePage();
    const user = props.auth?.user;
    const flash = props.flash;
    const [mobileOpen, setMobileOpen] = useState(false);
    const currentPath = typeof window === 'undefined' ? '' : window.location.pathname;
    const navigation = [
        { label: 'Your Organization', href: route('central.account.tenants.index'), active: currentPath.includes('/account/tenants') || currentPath === '/account' },
        { label: 'Requests', href: route('central.account.requests.index'), active: currentPath.includes('/account/requests') },
        { label: 'Invitation', href: route('central.account.invitations.index'), active: currentPath === pathFor(route('central.account.invitations.index')) },
        { label: 'Invoices', href: route('central.account.invoices.index'), active: currentPath.includes('/account/invoices') },
    ];

    const profileMenu = {
        items: [
            { key: 'identity', disabled: true, label: <div className="platform-portal__profile-identity"><strong>{user?.name || 'Account'}</strong><span>{user?.email}</span></div> },
            { type: 'divider' },
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
    };

    const links = navigation.map((item) => <Link key={item.label} href={item.href} className={`platform-portal__link${item.active ? ' is-active' : ''}`} onClick={() => setMobileOpen(false)}>{item.label}</Link>);

    return <div className="platform-portal">
        <Head title={title ? `${title} · KiteLedger` : 'KiteLedger Account'} />
        <header className="platform-portal__header">
            <div className="platform-portal__nav">
                <Link href={route('central.account.tenants.index')} className="platform-portal__logo" aria-label="KiteLedger customer portal home"><ApplicationLogo /></Link>
                <div className="platform-portal__actions">
                    <Button className="platform-portal__add" type="primary" size="large" icon={<PlusOutlined />} onClick={() => router.visit(route('central.account.requests.create'))}>Add new organization</Button>
                    <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
                        <button type="button" className="platform-portal__profile" aria-label="Open profile menu">
                            <Avatar size={40} src={user?.avatar || undefined}>{initials(user?.name)}</Avatar>
                        </button>
                    </Dropdown>
                    <Button className="platform-portal__mobile-toggle" icon={<MenuOutlined />} onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label="Open portal navigation" />
                </div>
            </div>
            <nav className="platform-portal__subnav" aria-label="Customer portal"><div className="platform-portal__links">{links}</div></nav>
            <nav className={`platform-portal__mobile-menu${mobileOpen ? ' is-open' : ''}`} aria-label="Mobile customer portal">
                {links}
                <Button className="platform-portal__add" type="primary" icon={<PlusOutlined />} onClick={() => router.visit(route('central.account.requests.create'))}>Add new organization</Button>
            </nav>
        </header>
        <main className="platform-portal__main">
            {flash?.success && <Alert type="success" showIcon message={flash.success} closable style={{ marginBottom: 18 }} />}
            {flash?.error && <Alert type="error" showIcon message={flash.error} closable style={{ marginBottom: 18 }} />}
            {children}
        </main>
    </div>;
}
