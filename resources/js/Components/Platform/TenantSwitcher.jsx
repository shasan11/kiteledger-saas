import { DownOutlined, ShopOutlined } from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import { Avatar, Button, Dropdown, Empty, Space, Tag, Typography } from 'antd';
import { initials } from '@/Components/Central/formatters';

/**
 * Company switcher. Selection is posted to the server, which re-verifies the
 * membership before it becomes the active tenant - the browser is never trusted.
 */
export default function TenantSwitcher({ block = false }) {
    const { platform } = usePage().props;
    const tenants = platform?.tenants || [];
    const activeId = platform?.activeTenantId;
    const active = tenants.find((tenant) => tenant.id === activeId);

    const items = tenants.length
        ? tenants.map((tenant) => ({
            key: tenant.id,
            label: (
                <Space>
                    <Avatar size="small">{initials(tenant.company_name)}</Avatar>
                    <span>{tenant.company_name}</span>
                    <Tag color={tenant.role === 'owner' ? 'gold' : 'blue'}>{tenant.role_label}</Tag>
                </Space>
            ),
        }))
        : [{ key: 'empty', disabled: true, label: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No companies yet" /> }];

    const select = ({ key }) => {
        if (key !== 'empty') {
            router.post(route('central.account.tenants.switch'), { tenant_id: key }, { preserveScroll: true });
        }
    };

    return (
        <Dropdown menu={{ items, onClick: select, selectedKeys: activeId ? [activeId] : [] }} trigger={['click']}>
            <Button block={block} icon={<ShopOutlined />}>
                <Space>
                    <Typography.Text ellipsis style={{ maxWidth: 160 }}>{active?.company_name || 'Select a company'}</Typography.Text>
                    <DownOutlined />
                </Space>
            </Button>
        </Dropdown>
    );
}
