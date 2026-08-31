import { Typography } from 'antd';

export default function PageHeader({ eyebrow, title, description, actions, children }) {
    return (
        <div className="central-page-header">
            <div className="central-page-header__copy">
                {eyebrow && <span className="central-page-header__eyebrow">{eyebrow}</span>}
                <Typography.Title level={2}>{title}</Typography.Title>
                {description && <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>}
            </div>
            {actions && <div className="central-page-header__actions">{actions}</div>}
            {children}
        </div>
    );
}
