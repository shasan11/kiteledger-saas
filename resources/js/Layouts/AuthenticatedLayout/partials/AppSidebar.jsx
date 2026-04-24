import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { Button, Empty, Input, Layout, Menu, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Sider } = Layout;

function getTextFromLabel(label) {
    if (typeof label === 'string') return label;
    if (typeof label === 'number') return String(label);
    return '';
}

function buildParentKeyMap(items = [], parentKeys = [], map = {}) {
    items.forEach((item) => {
        if (!item?.key) return;

        map[item.key] = parentKeys;

        if (Array.isArray(item.children) && item.children.length > 0) {
            buildParentKeyMap(item.children, [...parentKeys, item.key], map);
        }
    });

    return map;
}

function filterMenuItems(items = [], searchText = '') {
    const value = searchText.trim().toLowerCase();

    if (!value) return items;

    return items
        .map((item) => {
            const labelText = getTextFromLabel(item.label).toLowerCase();
            const hasChildren =
                Array.isArray(item.children) && item.children.length > 0;

            const matchedChildren = hasChildren
                ? filterMenuItems(item.children, value)
                : [];

            const isMatched = labelText.includes(value);

            if (isMatched) {
                return item;
            }

            if (matchedChildren.length > 0) {
                return {
                    ...item,
                    children: matchedChildren,
                };
            }

            return null;
        })
        .filter(Boolean);
}

function getAllParentKeys(items = []) {
    const keys = [];

    items.forEach((item) => {
        if (Array.isArray(item.children) && item.children.length > 0) {
            keys.push(item.key);
            keys.push(...getAllParentKeys(item.children));
        }
    });

    return keys;
}

export default function AppSidebar({
    collapsed,
    setCollapsed,
    selectedKeys,
    menuItems,
    colorBgContainer,
    colorBorderSecondary,
}) {
    const { token } = theme.useToken();

    const [searchText, setSearchText] = useState('');

    const sidebarBg = colorBgContainer || token.colorBgContainer;
    const sidebarBorder = colorBorderSecondary || token.colorBorderSecondary;

    const filteredMenuItems = useMemo(
        () => filterMenuItems(menuItems, searchText),
        [menuItems, searchText],
    );

    const parentKeyMap = useMemo(
        () => buildParentKeyMap(menuItems),
        [menuItems],
    );

    const activeParentKeys = useMemo(() => {
        const activeKey = selectedKeys?.[0];

        if (!activeKey) return [];

        return parentKeyMap[activeKey] || [];
    }, [parentKeyMap, selectedKeys]);

    const searchOpenKeys = useMemo(
        () => getAllParentKeys(filteredMenuItems),
        [filteredMenuItems],
    );

    const [openKeys, setOpenKeys] = useState(activeParentKeys);

    useEffect(() => {
        if (collapsed) return;

        if (searchText.trim()) {
            setOpenKeys(searchOpenKeys);
            return;
        }

        setOpenKeys(activeParentKeys);
    }, [activeParentKeys, collapsed, searchOpenKeys, searchText]);

    return (
        <Sider
            width={252}
            collapsedWidth={76}
            collapsed={collapsed}
            trigger={null}
            className="app-sidebar"
            style={{
                '--sidebar-bg': sidebarBg,
                '--sidebar-border': sidebarBorder,
                '--sidebar-text': token.colorText,
                '--sidebar-text-muted': token.colorTextSecondary,
                '--sidebar-hover-bg': token.colorFillTertiary,
                '--sidebar-active-bg': token.colorPrimaryBg,
                '--sidebar-active-color': token.colorPrimary,
                '--sidebar-radius': `${token.borderRadiusLG}px`,
                '--sidebar-radius-sm': `${token.borderRadius}px`,
                '--sidebar-shadow': token.boxShadowTertiary,
                '--sidebar-input-bg': token.colorBgContainer,
                '--sidebar-input-border': token.colorBorder,
                '--sidebar-danger-bg': token.colorErrorBg,
                background: sidebarBg,
                borderRight: `1px solid ${sidebarBorder}`,
                height: 'calc(100vh - 64px)',
                position: 'sticky',
                top: 64,
                overflow: 'hidden',
                boxShadow: token.boxShadowTertiary,
                zIndex: 90,
            }}
        >
            <style>
                {`
                    .app-sidebar {
                        display: flex;
                        flex-direction: column;
                    }

                    .app-sidebar-header {
                        height: 60px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 0 12px;
                        border-bottom: 1px solid var(--sidebar-border);
                        flex-shrink: 0;
                    }

                    .app-sidebar-header-collapsed {
                        justify-content: center;
                        padding: 0;
                    }

                    .app-sidebar-search {
                        flex: 1;
                        min-width: 0;
                    }

                    .app-sidebar-search .ant-input-affix-wrapper {
                        height: 36px;
                        border-radius: var(--sidebar-radius-sm);
                        background: var(--sidebar-input-bg);
                        border-color: var(--sidebar-input-border);
                    }

                    .app-sidebar-search .ant-input {
                        font-size: 13px;
                        background: transparent;
                    }

                    .app-sidebar-search .ant-input-prefix {
                        color: var(--sidebar-text-muted);
                        margin-inline-end: 8px;
                    }

                    .app-sidebar-toggle {
                        width: 34px !important;
                        height: 34px !important;
                        border-radius: var(--sidebar-radius-sm) !important;
                        color: var(--sidebar-text-muted) !important;
                        flex-shrink: 0;
                    }

                    .app-sidebar-toggle:hover {
                        background: var(--sidebar-hover-bg) !important;
                        color: var(--sidebar-text) !important;
                    }

                    .app-sidebar-scroll {
                        flex: 1;
                        overflow-y: auto;
                        overflow-x: hidden;
                        padding: 10px 8px 14px;
                    }

                    .app-sidebar-scroll::-webkit-scrollbar {
                        width: 5px;
                    }

                    .app-sidebar-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    .app-sidebar-scroll::-webkit-scrollbar-thumb {
                        background: transparent;
                        border-radius: 999px;
                    }

                    .app-sidebar-scroll:hover::-webkit-scrollbar-thumb {
                        background: var(--sidebar-border);
                    }

                    .app-sidebar .ant-menu {
                        background: transparent !important;
                        border-inline-end: 0 !important;
                        font-size: 13px;
                    }

                    .app-sidebar .ant-menu-item,
                    .app-sidebar .ant-menu-submenu-title {
                        height: 38px !important;
                        line-height: 38px !important;
                        margin: 3px 0 !important;
                        width: 100% !important;
                        border-radius: var(--sidebar-radius-sm) !important;
                        color: var(--sidebar-text-muted);
                    }

                    .app-sidebar .ant-menu-item:hover,
                    .app-sidebar .ant-menu-submenu-title:hover {
                        background: var(--sidebar-hover-bg) !important;
                        color: var(--sidebar-text) !important;
                    }

                    .app-sidebar .ant-menu-item-selected {
                        background: var(--sidebar-active-bg) !important;
                        color: var(--sidebar-active-color) !important;
                        font-weight: 700;
                    }

                    .app-sidebar .ant-menu-item-selected::after {
                        display: none !important;
                    }

                    .app-sidebar .ant-menu-submenu-selected > .ant-menu-submenu-title {
                        color: var(--sidebar-active-color) !important;
                        font-weight: 700;
                    }

                    .app-sidebar .ant-menu-item .anticon,
                    .app-sidebar .ant-menu-submenu-title .anticon {
                        font-size: 16px !important;
                    }

                    .app-sidebar .ant-menu-sub {
                        background: transparent !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item {
                        height: 34px !important;
                        line-height: 34px !important;
                        margin: 2px 0 !important;
                        padding-left: 42px !important;
                        font-size: 12.5px;
                        border-radius: var(--sidebar-radius-sm) !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item-selected {
                        background: var(--sidebar-active-bg) !important;
                    }

                    .app-sidebar .ant-menu-inline-collapsed {
                        width: 100% !important;
                    }

                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-item,
                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title {
                        padding-inline: calc(50% - 8px) !important;
                    }

                    .app-sidebar .ant-menu-title-content {
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .app-sidebar-empty {
                        height: 180px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .app-sidebar-empty .ant-empty-description {
                        color: var(--sidebar-text-muted);
                        font-size: 12px;
                    }
                `}
            </style>

            <div
                className={
                    collapsed
                        ? 'app-sidebar-header app-sidebar-header-collapsed'
                        : 'app-sidebar-header'
                }
            >
                {!collapsed && (
                    <Input
                        allowClear
                        className="app-sidebar-search"
                        placeholder="Search menu..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                    />
                )}

                <Button
                    type="text"
                    size="small"
                    className="app-sidebar-toggle"
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
                {filteredMenuItems.length > 0 ? (
                    <Menu
                        mode="inline"
                        selectedKeys={selectedKeys}
                        openKeys={collapsed ? [] : openKeys}
                        onOpenChange={setOpenKeys}
                        inlineCollapsed={collapsed}
                        items={filteredMenuItems}
                        style={{
                            borderInlineEnd: 0,
                        }}
                    />
                ) : (
                    <div className="app-sidebar-empty">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No menu found"
                        />
                    </div>
                )}
            </div>
        </Sider>
    );
}