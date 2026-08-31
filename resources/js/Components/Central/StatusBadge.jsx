import { Badge, Tag } from 'antd';
import { humanize } from './formatters';

const tone = {
    active: 'success', success: 'success', paid: 'success', published: 'success', available: 'success', healthy: 'success', completed: 'success',
    trialing: 'processing', provisioning: 'processing', issued: 'processing', pending: 'processing', draft: 'default',
    suspended: 'warning', partially_paid: 'warning', overdue: 'warning', paused: 'warning',
    failed: 'error', provisioning_failed: 'error', expired: 'error', cancelled: 'error', refunded: 'warning',
};

export default function StatusBadge({ value, dot = false }) {
    const status = String(value || 'unknown').toLowerCase();
    return dot
        ? <Badge status={tone[status] || 'default'} text={humanize(status)} />
        : <Tag className={`central-status central-status--${tone[status] || 'default'}`}>{humanize(status)}</Tag>;
}
