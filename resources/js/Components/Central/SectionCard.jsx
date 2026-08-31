import { Card, Typography } from 'antd';

export default function SectionCard({ title, description, extra, children, className = '', ...props }) {
    return (
        <Card
            className={`central-section-card ${className}`}
            title={title ? <div><Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title>{description && <Typography.Text type="secondary" className="central-section-card__description">{description}</Typography.Text>}</div> : null}
            extra={extra}
            {...props}
        >
            {children}
        </Card>
    );
}
