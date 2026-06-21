import { router } from '@inertiajs/react';
import { Tabs } from 'antd';
import { SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';

export default function AccessControlTabs({ activeKey }) {
  return (
    <div>
      <h2 className="text-xl font-semibold" style={{ marginBottom: 8 }}>Access Control</h2>
      <Tabs
        activeKey={activeKey}
        size="small"
        onChange={(key) => {
          if (key === 'users') router.visit(route('hrm.users.index'));
          if (key === 'roles') router.visit(route('hrm.roles.index'));
        }}
        items={[
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined /> Users
              </span>
            ),
          },
          {
            key: 'roles',
            label: (
              <span>
                <SafetyCertificateOutlined /> Roles
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
