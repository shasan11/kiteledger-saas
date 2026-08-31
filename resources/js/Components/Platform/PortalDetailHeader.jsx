import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from '@inertiajs/react';
import { Avatar, Button, Space, Typography } from 'antd';

export function PortalDetailHeader({
    avatar,
    icon,
    eyebrow,
    title,
    description,
    badges,
    actions,
    backHref,
    tabs = [],
}) {
    const avatarIsImage = typeof avatar === 'string' && /^(https?:|\/)/i.test(avatar);

    return <header className="portal-detail-header">
        <div className="portal-detail-header__top">
            <div className="portal-detail-header__identity">
                {backHref && <Button className="portal-detail-header__back" type="text" shape="circle" icon={<ArrowLeftOutlined />} onClick={() => window.location.assign(backHref)} aria-label="Go back" />}
                {(avatar || icon) && <Avatar className="portal-detail-header__avatar" size={56} src={avatarIsImage ? avatar : undefined} icon={!avatar ? icon : undefined}>{avatarIsImage ? null : avatar}</Avatar>}
                <div className="portal-detail-header__copy">
                    {eyebrow && <span className="portal-detail-header__eyebrow">{eyebrow}</span>}
                    <div className="portal-detail-header__title-row">
                        <Typography.Title level={2}>{title}</Typography.Title>
                        {badges && <Space size={6} wrap>{badges}</Space>}
                    </div>
                    {description && <Typography.Text type="secondary">{description}</Typography.Text>}
                </div>
            </div>
            {actions && <div className="portal-detail-header__actions">{actions}</div>}
        </div>
        {tabs.length > 0 && <nav className="portal-detail-header__tabs" aria-label={`${title} sections`}>
            {tabs.filter((tab) => tab.visible !== false).map((tab) => <Link key={tab.label} href={tab.href} className={`portal-detail-header__tab${tab.active ? ' is-active' : ''}`}>{tab.label}</Link>)}
        </nav>}
    </header>;
}

export function PortalDetailPanel({ icon, title, description, items = [], children }) {
    return <section className="portal-detail-panel">
        <header className="portal-detail-panel__header">
            {icon && <span className="portal-detail-panel__icon">{icon}</span>}
            <div><Typography.Title level={4}>{title}</Typography.Title>{description && <Typography.Text type="secondary">{description}</Typography.Text>}</div>
        </header>
        {items.length > 0 && <dl className="portal-detail-panel__list">{items.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>}
        {children}
    </section>;
}
