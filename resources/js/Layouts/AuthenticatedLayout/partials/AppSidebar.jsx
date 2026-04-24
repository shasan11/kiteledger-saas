import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;

export default function AppSidebar({
    collapsed,
    setCollapsed,
    selectedKeys,
    menuItems,
    colorBgContainer,
    colorBorderSecondary,
}) {
    return (
        <Sider
            width={230}
            collapsedWidth={76}
            collapsed={collapsed}
            trigger={null}
            className="app-sidebar"
            style={{
                background: colorBgContainer,
                borderRight: `1px solid ${colorBorderSecondary}`,
                height: 'calc(100vh - 64px)',
                position: 'sticky',
                top: 64,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? 0 : '0 14px',
                    borderBottom: `1px solid ${colorBorderSecondary}`,
                    flexShrink: 0,
                }}
            >
                {!collapsed && (
                    <Text strong style={{ fontSize: 13 }}>
                        Modules
                    </Text>
                )}

                <Button
                    type="text"
                    size="small"
                    icon={
                        collapsed ? (
                            <MenuUnfoldOutlined />
                        ) : (
                            <MenuFoldOutlined />
                        )
                    }
                    onClick={() => setCollapsed(!collapsed)}
                />
            </div>

            <div className="app-sidebar-scroll">
                <Menu
                    mode="inline"
                    selectedKeys={selectedKeys}
                    items={menuItems}
                    style={{
                        borderInlineEnd: 0,
                        paddingTop: 8,
                    }}
                />
            </div>
        </Sider>
    );
}