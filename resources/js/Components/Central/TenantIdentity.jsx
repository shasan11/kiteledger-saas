import { Avatar, Space, Typography } from 'antd';
import { initials } from './formatters';

export default function TenantIdentity({ tenant, subtitle, size = 38 }) {
    return <Space size={11}>
        <Avatar size={size} className="central-tenant-avatar">{initials(tenant?.company_name)}</Avatar>
        <div className="central-tenant-identity">
            <Typography.Text strong>{tenant?.company_name || 'Unknown tenant'}</Typography.Text>
            <Typography.Text type="secondary">{subtitle || tenant?.owner_email || 'No owner email'}</Typography.Text>
        </div>
    </Space>;
}
