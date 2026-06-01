import { LogoutOutlined, ProfileOutlined, UserOutlined,MenuFoldOutlined,MenuUnfoldOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Empty, Layout, Menu, Tooltip, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

import { useAppContext } from '@/Contexts/AppContext';

const { Sider } = Layout;

const MOBILE_QUERY = '(max-width: 767.98px)';

const isHexColor = (value) =>
    typeof value === 'string' && /^#(?:[0-9a-f]{3}){1,2}$/i.test(value.trim());

const hexToRgb = (hex) => {
    if (!isHexColor(hex)) return null;

    const normalized =
        hex.trim().length === 4
            ? `#${hex
                  .trim()
                  .slice(1)
                  .split('')
                  .map((char) => `${char}${char}`)
                  .join('')}`
            : hex.trim();

    return {
        r: parseInt(normalized.slice(1, 3), 16),
        g: parseInt(normalized.slice(3, 5), 16),
        b: parseInt(normalized.slice(5, 7), 16),
    };
};

const rgba = (hex, opacity) => {
    const rgb = hexToRgb(hex);

    if (!rgb) return hex;

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

const colorizeMenuItems = (items = [], primaryColor, depth = 0) =>
    items.map((item) => {
        if (!item || item.type) return item;

        return {
            ...item,
            className: [
                item.className,
                'app-sidebar-menu-item',
                depth === 0 ? 'app-sidebar-menu-root' : 'app-sidebar-menu-child',
            ]
                .filter(Boolean)
                .join(' '),
            style: {
                ...item.style,
                '--sidebar-item-color': primaryColor,
                '--sidebar-item-hover-bg': rgba(primaryColor, 0.1),
                '--sidebar-item-active-bg': rgba(primaryColor, 0.15),
                '--sidebar-item-icon-bg': rgba(primaryColor, 0.12),
                '--sidebar-item-icon-border': rgba(primaryColor, 0.24),
            },
            children: Array.isArray(item.children)
                ? colorizeMenuItems(item.children, primaryColor, depth + 1)
                : item.children,
        };
    });

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
    user,
    profileItems = [],
    collapsible = true,
}) {
    const { token } = theme.useToken();

    const { currentBranch, currentBranchId, accessibleBranches, permissions } =
        useAppContext();

    const [isMobile, setIsMobile] = useState(false);

    const navbarHeight = 64;

    const canCollapse = collapsible || isMobile;
    const isCollapsed = canCollapse ? collapsed : false;

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

    const parentKeyMap = useMemo(
        () => buildParentKeyMap(menuItems),
        [menuItems],
    );

    const rootSubmenuKeys = useMemo(
        () => getRootSubmenuKeys(menuItems),
        [menuItems],
    );

    const coloredMenuItems = useMemo(
        () => colorizeMenuItems(menuItems, token.colorPrimary),
        [menuItems, token.colorPrimary],
    );

    const userName = user?.display_name || user?.name || user?.email || 'User';

    const initials = userName
        .split(' ')
        .map((part) => part?.[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const branchLabel = useMemo(() => {
        if (currentBranchId === 'all' || (permissions?.view_all_branches && !currentBranchId)) {
            return 'All Branches';
        }

        const branch =
            currentBranch ||
            (accessibleBranches || []).find(
                (item) => String(item.id) === String(currentBranchId),
            );

        if (!branch) return 'No branch selected';

        return branch.code ? `${branch.name} (${branch.code})` : branch.name;
    }, [accessibleBranches, currentBranch, currentBranchId, permissions?.view_all_branches]);

    const enhancedProfileItems = useMemo(
        () => [
            {
                key: 'profile-summary',
                disabled: true,
                label: (
                    <div className="app-sidebar-profile-menu__summary">
                        <Avatar
                            size={42}
                            src={user?.image_url}
                            icon={!user?.image_url ? <UserOutlined /> : null}
                            className="app-sidebar-profile__avatar"
                        >
                            {!user?.image_url ? initials : null}
                        </Avatar>

                        <div className="app-sidebar-profile-menu__copy">
                            <strong>{userName}</strong>
                            <span>{branchLabel}</span>
                        </div>
                    </div>
                ),
            },
            { type: 'divider' },
            ...profileItems.map((item) => {
                if (item?.key === 'profile') {
                    return {
                        ...item,
                        icon: item.icon || <ProfileOutlined />,
                        label: 'View Profile',
                    };
                }

                if (item?.key === 'logout') {
                    return {
                        ...item,
                        icon: <LogoutOutlined />,
                    };
                }

                return item;
            }),
        ],
        [branchLabel, initials, profileItems, user?.image_url, userName],
    );

    const activeParentKeys = useMemo(() => {
        const activeKey = selectedKeys?.[0];

        if (!activeKey) return [];

        return parentKeyMap[activeKey] || [];
    }, [parentKeyMap, selectedKeys]);

    const [openKeys, setOpenKeys] = useState(activeParentKeys);

    useEffect(() => {
        if (isCollapsed) return;

        setOpenKeys(activeParentKeys);
    }, [activeParentKeys, isCollapsed]);

    const handleOpenChange = (keys) => {
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

    const sidebarNode = (
        <Sider
            width={230}
            collapsedWidth={isMobile ? 0 : 84}
            collapsed={isCollapsed}
            trigger={null}
            className="app-sidebar app-sidebar-light"
            style={{
                '--sidebar-bg': token.colorBgLayout,
                '--sidebar-bg-soft': token.colorFillQuaternary,
                '--sidebar-bg-hover': token.colorFillTertiary,
                '--sidebar-bg-active': token.colorPrimaryBg,
                '--sidebar-bg-active-strong': token.colorPrimary,
                '--sidebar-border': token.colorBorderSecondary,
                '--sidebar-text': token.colorText,
                '--sidebar-text-muted': token.colorTextSecondary,
                '--sidebar-text-soft': token.colorTextTertiary,
                '--sidebar-icon-bg': token.colorBgContainer,
                '--sidebar-icon-hover-bg': token.colorPrimaryBg,
                '--sidebar-footer-bg': token.colorBgContainer,
                '--sidebar-scrollbar': token.colorBorder,
                '--sidebar-radius': `${token.borderRadiusLG + 4}px`,
                '--sidebar-radius-sm': `${token.borderRadiusLG}px`,
                background: token.colorBgLayout,
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                height: `calc(100vh - ${navbarHeight}px)`,
                position: isMobile ? 'fixed' : 'sticky',
                top: navbarHeight,
                left: 0,
                overflow: 'hidden',
                transform: isMobile && isCollapsed ? 'translateX(-100%)' : 'translateX(0)',
                transition: `transform ${token.motionDurationMid} ${token.motionEaseInOut}, width ${token.motionDurationMid} ${token.motionEaseInOut}`,
                boxShadow: token.boxShadowTertiary,
                zIndex: isMobile ? 120 : 90,
            }}
        >
            <style>
                {`
                    .app-sidebar {
                        display: flex;
                        flex-direction: column;
                    }

                    .app-sidebar-scroll {
                        flex: 1;
                        min-height: 0;
                        overflow-y: auto;
                        overflow-x: hidden;
                        padding: ${token.paddingXS}px ${token.paddingXS}px ${token.padding}px;
                        background: var(--sidebar-bg);
                    }

                    .app-sidebar-bottom {
                        position: sticky;
                        bottom: 0;
                        z-index: 3;
                        flex-shrink: 0;
                        padding: ${token.paddingSM}px ${token.paddingXS}px;
                        border-top: 1px solid var(--sidebar-border);
                        background: var(--sidebar-footer-bg);
                        box-shadow: 0 -10px 24px ${rgba(token.colorTextBase || '#000000', 0.06)};
                    }

                    .app-sidebar-bottom__inner {
                        display: flex;
                        align-items: center;
                        gap: ${token.marginXS}px;
                    }

                    .app-sidebar-bottom-collapsed .app-sidebar-bottom__inner {
                        flex-direction: column;
                        justify-content: center;
                    }

                    .app-sidebar-profile {
                        min-width: 0;
                        flex: 1;
                    }

                    .app-sidebar-profile-collapsed {
                        flex: 0 0 auto;
                    }

                    .app-sidebar-profile__button {
                        width: 100%;
                        height: 50px !important;
                        padding: ${token.paddingXS}px !important;
                        border-radius: var(--sidebar-radius) !important;
                        display: flex !important;
                        align-items: center;
                        justify-content: flex-start;
                        gap: ${token.marginSM}px;
                        color: var(--sidebar-text) !important;
                        background: var(--sidebar-bg) !important;
                        border: 1px solid var(--sidebar-border) !important;
                        box-shadow: none !important;
                    }

                    .app-sidebar-profile__button:hover {
                        background: var(--sidebar-bg-active) !important;
                        border-color: ${token.colorPrimary} !important;
                    }

                    .app-sidebar-profile__button-collapsed {
                        width: 48px !important;
                        height: 48px !important;
                        justify-content: center;
                        padding: 0 !important;
                        margin: 0 auto;
                    }

                    .app-sidebar-profile__avatar {
                        flex: 0 0 auto;
                        background: ${rgba(token.colorPrimary, 0.14)} !important;
                        color: ${token.colorPrimary} !important;
                        border: 1px solid ${rgba(token.colorPrimary, 0.32)} !important;
                        font-weight: ${token.fontWeightStrong};
                    }

                    .app-sidebar-profile__copy,
                    .app-sidebar-profile-menu__copy {
                        min-width: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 2px;
                    }

                    .app-sidebar-profile__name,
                    .app-sidebar-profile__branch,
                    .app-sidebar-profile-menu__copy strong,
                    .app-sidebar-profile-menu__copy span {
                        max-width: 126px;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        line-height: ${token.lineHeightSM};
                    }

                    .app-sidebar-profile__name,
                    .app-sidebar-profile-menu__copy strong {
                        color: var(--sidebar-text);
                        font-size: 11px;
                        font-weight: ${token.fontWeightStrong};
                    }

                    .app-sidebar-profile__branch,
                    .app-sidebar-profile-menu__copy span {
                        color: var(--sidebar-text-muted);
                        font-size: 10px;
                    }

                    .app-sidebar-profile-menu__summary {
                        min-width: 230px;
                        padding: 4px 2px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .app-sidebar-profile-menu .ant-dropdown-menu {
                        border-radius: var(--sidebar-radius-sm) !important;
                    }

                    .app-sidebar-scroll::-webkit-scrollbar {
                        width: ${token.lineWidth * 5}px;
                    }

                    .app-sidebar-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    .app-sidebar-scroll::-webkit-scrollbar-thumb {
                        background: transparent;
                        border-radius: ${token.borderRadiusLG}px;
                    }

                    .app-sidebar-scroll:hover::-webkit-scrollbar-thumb {
                        background: var(--sidebar-scrollbar);
                    }

                    .app-sidebar-toggle {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        border-radius: var(--sidebar-radius-sm) !important;
                        color: var(--sidebar-text-muted) !important;
                        background: var(--sidebar-bg-soft) !important;
                        border: 1px solid var(--sidebar-border) !important;
                        flex-shrink: 0;
                        transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
                    }

                    .app-sidebar-toggle:hover {
                        background: var(--sidebar-bg-active) !important;
                        border-color: ${token.colorPrimary} !important;
                        color: ${token.colorPrimary} !important;
                    }

                    .app-sidebar-toggle svg {
                        display: block;
                    }

                    .app-sidebar .ant-menu {
                        background: transparent !important;
                        border-inline-end: 0 !important;
                        font-size: ${token.fontSize}px;
                        color: var(--sidebar-text-muted);
                    }

                    .app-sidebar .ant-menu-item,
                    .app-sidebar .ant-menu-submenu-title {
                        position: relative;
                        height: 42px !important;
                        line-height: 42px !important;
                        margin: ${token.marginXXS}px 0 !important;
                        width: 100% !important;
                        border-radius: var(--sidebar-radius) !important;
                        color: var(--sidebar-text-muted) !important;
                        font-weight: ${token.fontWeightStrong};
                        letter-spacing: -0.015em;
                        transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
                    }

                    .app-sidebar .ant-menu-item {
                        padding-left: ${token.paddingSM}px !important;
                    }

                    .app-sidebar .ant-menu-submenu-title {
                        padding-left: ${token.paddingSM}px !important;
                    }

                    .app-sidebar .ant-menu-item:hover,
                    .app-sidebar .ant-menu-submenu-title:hover {
                        background: var(--sidebar-item-hover-bg, var(--sidebar-bg-hover)) !important;
                        color: var(--sidebar-item-color, var(--sidebar-text)) !important;
                    }

                    .app-sidebar .ant-menu-item:hover .ant-menu-item-icon,
                    .app-sidebar .ant-menu-submenu-title:hover .ant-menu-item-icon {
                        background: var(--sidebar-item-icon-bg, var(--sidebar-icon-hover-bg));
                        color: var(--sidebar-item-color, ${token.colorPrimary});
                        box-shadow: inset 0 0 0 1px var(--sidebar-item-icon-border, var(--sidebar-border));
                    }

                    .app-sidebar .ant-menu-item-selected {
                        background: var(--sidebar-item-active-bg, var(--sidebar-bg-active)) !important;
                        color: var(--sidebar-item-color, ${token.colorPrimary}) !important;
                        font-weight: ${token.fontWeightStrong};
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
                        color: var(--sidebar-item-color, ${token.colorPrimary}) !important;
                        font-weight: ${token.fontWeightStrong};
                        background: var(--sidebar-item-active-bg, var(--sidebar-bg-active)) !important;
                    }

                    .app-sidebar .ant-menu-item-selected .ant-menu-item-icon,
                    .app-sidebar .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-item-icon {
                        background: var(--sidebar-item-color, ${token.colorPrimary});
                        color: ${token.colorTextLightSolid};
                        box-shadow: inset 0 0 0 1px var(--sidebar-item-color, ${token.colorPrimary});
                    }

                    .app-sidebar .ant-menu-item-icon,
                    .app-sidebar .ant-menu-submenu-title .ant-menu-item-icon {
                        width: 32px !important;
                        height: 32px !important;
                        min-width: 32px !important;
                        border-radius: ${token.borderRadiusLG * 4}px;
                        background: var(--sidebar-icon-bg);
                        color: inherit;
                        display: inline-flex !important;
                        align-items: center;
                        justify-content: center;
                        margin-inline-end: 0 !important;
                        box-shadow: inset 0 0 0 1px var(--sidebar-border);
                        transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
                    }

                    .app-sidebar .ant-menu-item svg,
                    .app-sidebar .ant-menu-submenu-title svg {
                        font-size: ${token.fontSizeSM}px;
                        width: 17px;
                        height: 17px;
                        stroke-width: 2.15;
                        color: inherit;
                        display: block;
                    }

                    .app-sidebar .ant-menu-title-content {
                        line-height: ${token.lineHeightSM};
                        overflow: hidden;
                        font-size: ${token.fontSize}px !important;
                        text-overflow: ellipsis;
                    }

                    .app-sidebar .ant-menu-sub {
                        background: transparent !important;
                        padding: ${token.paddingXXS}px 0 ${token.paddingXS}px ${token.paddingSM}px;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item {
                        height: 36px !important;
                        line-height: 36px !important;
                        margin: ${token.marginXXS}px 0 !important;
                        padding-left: 50px !important;
                        font-size: ${token.fontSizeSM}px;
                        font-weight: ${token.fontWeightStrong};
                        border-radius: var(--sidebar-radius-sm) !important;
                        color: var(--sidebar-text-soft) !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item:hover {
                        background: var(--sidebar-item-hover-bg, var(--sidebar-bg-hover)) !important;
                        color: var(--sidebar-item-color, var(--sidebar-text)) !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item-selected {
                        background: var(--sidebar-item-active-bg, var(--sidebar-bg-active)) !important;
                        color: var(--sidebar-item-color, ${token.colorPrimary}) !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item .ant-menu-item-icon {
                        width: 18px !important;
                        height: 18px !important;
                        min-width: 18px !important;
                        margin-inline-end: ${token.marginXS}px !important;
                    }

                    .app-sidebar .ant-menu-sub .ant-menu-item svg {
                        width: 14px;
                        height: 14px;
                        font-size: ${token.fontSize}px;
                    }

                    .app-sidebar .ant-menu-submenu-arrow {
                        color: var(--sidebar-text-soft) !important;
                        inset-inline-end: ${token.padding}px !important;
                    }

                    .app-sidebar .ant-menu-submenu-open > .ant-menu-submenu-title .ant-menu-submenu-arrow,
                    .app-sidebar .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-submenu-arrow {
                        color: var(--sidebar-item-color, ${token.colorPrimary}) !important;
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
                        font-size: ${token.fontSizeLG}px;
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
                        font-size: ${token.fontSizeSM}px;
                        font-weight: ${token.fontWeightStrong};
                    }

                    @media (max-width: 767.98px) {
                        .app-sidebar {
                            height: calc(100vh - ${navbarHeight}px) !important;
                            max-width: min(86vw, 312px) !important;
                            width: min(86vw, 312px) !important;
                            flex: 0 0 min(86vw, 312px) !important;
                        }

                        .app-sidebar-profile__name,
                        .app-sidebar-profile__branch,
                        .app-sidebar-profile-menu__copy strong,
                        .app-sidebar-profile-menu__copy span {
                            max-width: 180px;
                        }
                    }
                `}
            </style>

            <div className="app-sidebar-scroll">
                {menuItems.length > 0 ? (
                    <Menu
                        mode="inline"
                        theme="light"
                        selectedKeys={selectedKeys}
                        openKeys={isCollapsed ? [] : openKeys}
                        onOpenChange={handleOpenChange}
                        onClick={() => {
                            if (isMobile) {
                                setCollapsed(true);
                            }
                        }}
                        inlineCollapsed={isCollapsed}
                        items={coloredMenuItems}
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

            <div
                className={
                    isCollapsed
                        ? 'app-sidebar-bottom app-sidebar-bottom-collapsed'
                        : 'app-sidebar-bottom'
                }
            >
                <div className="app-sidebar-bottom__inner">
                    <div
                        className={
                            isCollapsed
                                ? 'app-sidebar-profile app-sidebar-profile-collapsed'
                                : 'app-sidebar-profile'
                        }
                    >
                        <Tooltip
                            title={isCollapsed ? `${userName} - ${branchLabel}` : null}
                            placement="right"
                        >
                            <Dropdown
                                menu={{ items: enhancedProfileItems }}
                                placement={isCollapsed ? 'rightBottom' : 'topLeft'}
                                trigger={['click']}
                                overlayClassName="app-sidebar-profile-menu"
                            >
                                <Button
                                    type="text"
                                    className={
                                        isCollapsed
                                            ? 'app-sidebar-profile__button app-sidebar-profile__button-collapsed'
                                            : 'app-sidebar-profile__button'
                                    }
                                >
                                    <Avatar
                                        size={isCollapsed ? 36 : 38}
                                        src={user?.image_url}
                                        icon={!user?.image_url ? <UserOutlined /> : null}
                                        className="app-sidebar-profile__avatar"
                                    >
                                        {!user?.image_url ? initials : null}
                                    </Avatar>

                                    {!isCollapsed && (
                                        <span className="app-sidebar-profile__copy">
                                            <span className="app-sidebar-profile__name">
                                                {userName}
                                            </span>
                                            <span className="app-sidebar-profile__branch">
                                                {branchLabel}
                                            </span>
                                        </span>
                                    )}
                                </Button>
                            </Dropdown>
                        </Tooltip>
                    </div>

                    {canCollapse && (
                        <Button
                            type="text"
                            size="small"
                            className="app-sidebar-toggle"
                            icon={
                                isCollapsed ? (
                                    <MenuUnfoldOutlined/>
                                ) : (
                                    <MenuFoldOutlined/>
                                )
                            }
                            onClick={() => setCollapsed(!isCollapsed)}
                        />
                    )}
                </div>
            </div>
        </Sider>
    );

    if (!isMobile) {
        return sidebarNode;
    }

    return (
        <>
            {!isCollapsed && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="app-sidebar-backdrop"
                    onClick={() => setCollapsed(true)}
                />
            )}

            {sidebarNode}

            <style>
                {`
                    .app-sidebar-backdrop {
                        position: fixed;
                        inset: ${navbarHeight}px 0 0 0;
                        border: 0;
                        padding: 0;
                        margin: 0;
                        background: rgba(15, 23, 42, 0.42);
                        z-index: 119;
                    }
                `}
            </style>
        </>
    );
}