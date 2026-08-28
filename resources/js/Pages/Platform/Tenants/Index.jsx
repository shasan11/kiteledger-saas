import { router } from '@inertiajs/react';
import { Button, Empty, Space, Table, Tag } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformTenantsIndex({ tenants }) {
    const columns = [
        { title: 'Company', dataIndex: 'company_name', render: (value, row) => <>{value}{row.is_primary && <Tag color="green" style={{ marginLeft: 8 }}>Primary</Tag>}</> },
        { title: 'Role', dataIndex: 'role_label', render: (value, row) => <Tag color={row.role === 'owner' ? 'gold' : 'blue'}>{value}</Tag> },
        { title: 'Plan', dataIndex: 'plan', render: (value) => value || '-' },
        { title: 'Subscription', dataIndex: 'subscription_status', render: (value) => value ? <StatusBadge value={value} /> : '-' },
        { title: 'Renews', dataIndex: 'renews_at', responsive: ['md'], render: (value) => formatDate(value) },
        {
            title: '', key: 'actions', width: 220,
            render: (_, row) => (
                <Space size={4} wrap>
                    <Button size="small" onClick={() => router.post(route('central.account.tenants.switch'), { tenant_id: row.id })}>Open</Button>
                    {row.can_manage_billing && <Button size="small" onClick={() => router.visit(route('central.account.tenants.billing', row.id))}>Billing</Button>}
                </Space>
            ),
        },
    ];

    return (
        <PlatformLayout title="My Companies">
            <PageHeader eyebrow="Companies" title="My Companies" description="Switch between the companies you belong to." />
            <SectionCard>
                <Table rowKey="id" size="middle" scroll={{ x: 720 }} dataSource={tenants} columns={columns} pagination={tenants.length > 20 ? { pageSize: 20 } : false} locale={{ emptyText: <Empty description="No companies yet." /> }} />
            </SectionCard>
        </PlatformLayout>
    );
}
