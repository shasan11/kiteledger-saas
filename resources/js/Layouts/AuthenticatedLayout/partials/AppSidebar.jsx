import { Button, Empty, Input, Layout, Menu, theme } from 'antd';
import {
    Children,
    isValidElement,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    LuChevronLeft,
    LuChevronRight,
    LuSearch,
} from 'react-icons/lu';

const { Sider } = Layout;

const MOBILE_QUERY = '(max-width: 767.98px)';

function getTextFromLabel(label) {
    if (typeof label === 'string') return label;
    if (typeof label === 'number') return String(label);

    if (Array.isArray(label)) {
        return label.map(getTextFromLabel).join(' ');
    }

    if (isValidElement(label)) {
        return getTextFromLabel(label.props?.children);
    }

    if (label?.props?.children) {
        return Children.toArray(label.props.children)
            .map(getTextFromLabel)
            .join(' ');
    }

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

            if (isMatched) return item;

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

function getRootSubmenuKeys(items = []) {
    return items
        .filter((item) => Array.isArray(item.children) && item.children.length > 0)
        .map((item) => item.key);
}

export default function AppSidebar({
    collapsed,
    setCollapsed,
    selectedKeys = [],
    menuItems = [],
    colorBgContainer,
    colorBorderSecondary,
}) {
    const { token } = theme.useToken();

    const [searchText, setSearchText] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    const sidebarBg = colorBgContainer || '#ffffff';
    const sidebarBorder = colorBorderSecondary || token.colorBorderSecondary;

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia(MOBILE_QUERY);

        const syncMobileState = () => {
            const mobile = mediaQuery.matches;

            setIsMobile(mobile);

            if (mobile) {
                setCollapsed(true);
            }
        };

        syncMobileState();

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', syncMobileState);
        } else {
            mediaQuery.addListener(syncMobileState);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', syncMobileState);
            } else {
                mediaQuery.removeListener(syncMobileState);
            }
        };
    }, [setCollapsed]);

    const filteredMenuItems = useMemo(
        () => filterMenuItems(menuItems, searchText),
        [menuItems, searchText],
    );

    const parentKeyMap = useMemo(
        () => buildParentKeyMap(menuItems),
        [menuItems],
    );

    const rootSubmenuKeys = useMemo(
        () => getRootSubmenuKeys(menuItems),
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

    const handleOpenChange = (keys) => {
        if (searchText.trim()) {
            setOpenKeys(keys);
            return;
        }

        const latestOpenKey = keys.find((key) => !openKeys.includes(key));

        if (!latestOpenKey) {
            setOpenKeys([]);
            return;
        }

        if (rootSubmenuKeys.includes(latestOpenKey)) {
            setOpenKeys([latestOpenKey]);
            return;
        }

        setOpenKeys(keys);
    };

    return (
        <Sider
            width={230}
            collapsedWidth={88}
            collapsed={collapsed}
            trigger={null}
            className="app-sidebar"
            style={{
                '--sidebar-bg': sidebarBg,
                '--sidebar-border': sidebarBorder,
                '--sidebar-text': token.colorText,
                '--sidebar-text-muted': token.colorTextSecondary,
                '--sidebar-text-light': token.colorTextTertiary,
                '--sidebar-hover-bg': '#f3f6fb',
                '--sidebar-active-bg': token.colorPrimaryBg,
                '--sidebar-active-color': token.colorPrimary,
                '--sidebar-icon-bg': '#eef2f7',
                '--sidebar-icon-hover-bg': '#e7eef8',
                '--sidebar-input-bg': '#f8fafc',
                '--sidebar-input-border': '#e5e7eb',
                '--sidebar-radius': `${token.borderRadiusLG + 2}px`,
                '--sidebar-radius-sm': `${token.borderRadius + 4}px`,
                '--sidebar-shadow': '8px 0 28px rgba(15, 23, 42, 0.06)',
                background: sidebarBg,
                borderRight: `1px solid ${sidebarBorder}`,
                height: 'calc(100vh - 52px)',
                position: isMobile ? 'fixed' : 'sticky',
                top: 52,
                left: 0,
                overflow: 'hidden',
                boxShadow: 'var(--sidebar-shadow)',
                zIndex: isMobile ? 120 : 90,
            }}
        >
            <style>
                {`
                    .app-sidebar {
                        display: flex;
                        flex-direction: column;
                    }

                    .app-sidebar-header {
                        height: 62px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 14px;
                        border-bottom: 1px solid var(--sidebar-border);
                        background: var(--sidebar-bg);
                        flex-shrink: 0;
                    }

                    .app-sidebar-header-collapsed {
                        justify-content: center;
                        padding: 12px 10px;
                    }

                    .app-sidebar-search {
                        flex: 1;
                        min-width: 0;
                    }

                    .app-sidebar-search .ant-input-affix-wrapper {
                        height: 42px;
                        border-radius: 14px;
                        background: var(--sidebar-input-bg);
                        border-color: var(--sidebar-input-border);
                        box-shadow: none;
                        transition: all 0.2s ease;
                    }

                    .app-sidebar-search .ant-input-affix-wrapper:hover,
                    .app-sidebar-search .ant-input-affix-wrapper-focused {
                        background: #ffffff;
                        border-color: var(--sidebar-active-color);
                        box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.08);
                    }

                    .app-sidebar-search .ant-input {
                        font-size: 14px;
                        font-weight: 600;
                        background: transparent;
                        color: var(--sidebar-text);
                    }

                    .app-sidebar-search .ant-input::placeholder {
                        color: var(--sidebar-text-light);
                        font-weight: 500;
                    }

                    .app-sidebar-search .ant-input-prefix {
                        color: var(--sidebar-text-muted);
                        margin-inline-end: 9px;
                    }

                    .app-sidebar-toggle {
                        width: 40px !important;
                        height: 40px !important;
                        border-radius: 14px !important;
                        color: var(--sidebar-text-muted) !important;
                        background: #f8fafc !important;
                        border: 1px solid var(--sidebar-input-border) !important;
                        flex-shrink: 0;
                        transition: all 0.2s ease;
                    }

                    .app-sidebar-toggle:hover {
                        background: var(--sidebar-active-bg) !important;
                        border-color: var(--sidebar-active-bg) !important;
                        color: var(--sidebar-active-color) !important;
                    }

                    .app-sidebar-toggle svg,
                    .app-sidebar-search svg {
                        display: block;
                    }

                    .app-sidebar-scroll {
                        flex: 1;
                        overflow-y: auto;
                        overflow-x: hidden;
                        padding: 12px 10px 16px;
                        background: var(--sidebar-bg);
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
                        background: #cbd5e1;
                    }

                    .app-sidebar .ant-menu {
                        background: transparent !important;
                        border-inline-end: 0 !important;
                        font-size: 14px;
                    }

                    .app-sidebar .ant-menu-item,
                    .app-sidebar .ant-menu-submenu-title {
                        position: relative;
                        height: 46px !important;
                        line-height: 46px !important;
                        margin: 4px 0 !important;
                        width: 100% !important;
                        border-radius: 16px !important;
                        color: var(--sidebar-text-muted);
                        font-weight: 700;
                        letter-spacing: -0.015em;
                        transition: all 0.18s ease;
                    }

                    .app-sidebar .ant-menu-item {
                        padding-left: 12px !important;
                    }

                    .app-sidebar .ant-menu-submenu-title {
                        padding-left: 12px !important;
                    }

                    .app-sidebar .ant-menu-item:hover,
                    .app-sidebar .ant-menu-submenu-title:hover {
                        background: var(--sidebar-hover-bg) !important;
                        color: var(--sidebar-text) !important;
                    }

                    .app-sidebar .ant-menu-item:hover .ant-menu-item-icon,
                    .app-sidebar .ant-menu-submenu-title:hover .ant-menu-item-icon {
                        background: var(--sidebar-icon-hover-bg);
                        color: var(--sidebar-active-color);
                    }

                    .app-sidebar .ant-menu-item-selected {
                        background: var(--sidebar-active-bg) !important;
                        color: var(--sidebar-active-color) !important;
                        font-weight: 800;
                    }

                    .app-sidebar .ant-menu-item-selected::before,
                    .app-sidebar .ant-menu-item-selected::after,
                    .app-sidebar .ant-menu-sub .ant-menu-item-selected::before,
                    .app-sidebar .ant-menu-sub .ant-menu-item-selected::after,
                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-item-selected::before,
                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-item-selected::after {
                        display: none !important;
                        content: none !important;
                    }

                    .app-sidebar .ant-menu-submenu-selected > .ant-menu-submenu-title {
                        color: var(--sidebar-active-color) !important;
                        font-weight: 800;
                        background: rgba(22, 119, 255, 0.04) !important;
                    }

                    .app-sidebar .ant-menu-item-selected .ant-menu-item-icon,
                    .app-sidebar .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-item-icon {
                        background: var(--sidebar-active-color);
                        color: #ffffff;
                    }

                    .app-sidebar .ant-menu-item-icon,
                    .app-sidebar .ant-menu-submenu-title .ant-menu-item-icon {
                        width: 32px !important;
                        height: 32px !important;
                        min-width: 32px !important;
                        border-radius: 999px;
                        background: var(--sidebar-icon-bg);
                        color: inherit;
                        display: inline-flex !important;
                        align-items: center;
                        justify-content: center;
                        margin-inline-end: 0px !important;
                        transition: all 0.18s ease;
                    }

                    .app-sidebar .ant-menu-item svg,
                    .app-sidebar .ant-menu-submenu-title svg {
                        font-size: 17px;
                        width: 17px;
                        height: 17px;
                        stroke-width: 2.15;
                        color: inherit;
                        display: block;
                    }

                    .app-sidebar .ant-menu-title-content {
                        line-height: 1.2;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .app-sidebar .ant-menu-sub {
                        background: transparent !important;
                        padding: 3px 0 6px 12px;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item {
                        height: 38px !important;
                        line-height: 38px !important;
                        margin: 2px 0 !important;
                        padding-left: 50px !important;
                        font-size: 13px;
                        font-weight: 500;
                        border-radius: 13px !important;
                        color: var(--sidebar-text-muted);
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item:hover {
                        background: #f8fafc !important;
                        color: var(--sidebar-text) !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item-selected {
                        background: var(--sidebar-active-bg) !important;
                        color: var(--sidebar-active-color) !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item .ant-menu-item-icon {
                        width: 26px !important;
                        height: 26px !important;
                        min-width: 26px !important;
                        margin-inline-end: 9px !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item svg {
                        width: 14px;
                        height: 14px;
                        font-size: 14px;
                    }

                    .app-sidebar .ant-menu-submenu-arrow {
                        color: var(--sidebar-text-light) !important;
                        inset-inline-end: 14px !important;
                    }

                    .app-sidebar .ant-menu-submenu-open > .ant-menu-submenu-title .ant-menu-submenu-arrow,
                    .app-sidebar .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-submenu-arrow {
                        color: var(--sidebar-active-color) !important;
                    }

                    .app-sidebar .ant-menu-inline-collapsed {
                        width: 100% !important;
                    }

                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-item,
                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title {
                        padding-inline: 0 !important;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                    }

                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-item-icon,
                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title .ant-menu-item-icon {
                        margin-inline-end: 0 !important;
                        width: 38px !important;
                        height: 38px !important;
                        min-width: 38px !important;
                    }

                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-item svg,
                    .app-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title svg {
                        width: 18px;
                        height: 18px;
                        font-size: 18px;
                    }

                    .app-sidebar-empty {
                        height: 220px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .app-sidebar-empty .ant-empty {
                        margin: 0;
                    }

                    .app-sidebar-empty .ant-empty-description {
                        color: var(--sidebar-text-muted);
                        font-size: 13px;
                        font-weight: 600;
                    }

                    @media (max-width: 767.98px) {
                        .app-sidebar {
                            height: calc(100vh - 52px) !important;
                        }
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
                        variant="filled"
                        className="app-sidebar-search"
                        placeholder="Search menu..."
                        prefix={<LuSearch size={16} />}
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
                            <LuChevronRight size={19} />
                        ) : (
                            <LuChevronLeft size={19} />
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
                        onOpenChange={handleOpenChange}
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