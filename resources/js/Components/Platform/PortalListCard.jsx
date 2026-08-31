import { RightOutlined } from '@ant-design/icons';
import { Avatar, Button, Empty, Space, Typography } from 'antd';

export function PortalList({ children, emptyText = 'Nothing to show yet.' }) {
    const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
    if (items.length === 0) return <div className="portal-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /></div>;
    return <div className="portal-list">{items}</div>;
}

export function PortalListCard({
    avatar,
    icon,
    title,
    subtitle,
    meta = [],
    badges,
    actions,
    onClick,
    children,
}) {
    const avatarIsImage = typeof avatar === 'string' && /^(https?:|\/)/i.test(avatar);
    const card = (
        <article className={`portal-list-card${onClick ? ' is-clickable' : ''}`}>
            <div className="portal-list-card__identity">
                {avatar || icon ? <Avatar size={46} src={avatarIsImage ? avatar : undefined} icon={!avatar ? icon : undefined}>{avatarIsImage ? null : avatar}</Avatar> : null}
                <div className="portal-list-card__copy">
                    <div className="portal-list-card__title-row">
                        <Typography.Title level={5}>{title}</Typography.Title>
                        {badges && <Space size={6} wrap>{badges}</Space>}
                    </div>
                    {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
                </div>
            </div>
            {meta.length > 0 && <dl className="portal-list-card__meta">{meta.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value ?? '-'}</dd></div>)}</dl>}
            {children && <div className="portal-list-card__content">{children}</div>}
            {(actions || onClick) && <div className="portal-list-card__actions" onClick={(event) => event.stopPropagation()}>{actions || <RightOutlined />}</div>}
        </article>
    );

    return onClick ? <div role="link" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onClick(); }}>{card}</div> : card;
}

export function PortalSection({ title, description, action, children, className = '' }) {
    return <section className={`portal-section ${className}`.trim()}>
        {(title || description || action) && <header className="portal-section__header"><div>{title && <Typography.Title level={4}>{title}</Typography.Title>}{description && <Typography.Text type="secondary">{description}</Typography.Text>}</div>{action}</header>}
        {children}
    </section>;
}

export function PortalAction({ children, ...props }) {
    return <Button type="primary" {...props}>{children}</Button>;
}
