import { Button, Empty, Layout, Menu, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

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
}) {
    const { token } = theme.useToken();

    const [isMobile, setIsMobile] = useState(false);

    const navbarHeight = 64;

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

    const activeParentKeys = useMemo(() => {
        const activeKey = selectedKeys?.[0];

        if (!activeKey) return [];

        return parentKeyMap[activeKey] || [];
    }, [parentKeyMap, selectedKeys]);

    const [openKeys, setOpenKeys] = useState(activeParentKeys);

    useEffect(() => {
        if (collapsed) return;

        setOpenKeys(activeParentKeys);
    }, [activeParentKeys, collapsed]);

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

    return (
        <Sider
            width={212}
            collapsedWidth={84}
            collapsed={collapsed}
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
                        overflow-y: auto;
                        overflow-x: hidden;
                        padding: ${token.paddingSM}px ${token.paddingXS}px ${token.padding}px;
                        background: var(--sidebar-bg);
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

                    .app-sidebar-footer {
                        height: 60px;
                        padding: ${token.paddingSM}px ${token.padding}px;
                        border-top: 1px solid var(--sidebar-border);
                        background: var(--sidebar-footer-bg);
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        flex-shrink: 0;
                    }

                    .app-sidebar-footer-collapsed {
                        justify-content: center;
                        padding: ${token.paddingSM}px;
                    }

                    .app-sidebar-toggle {
                        width: ${token.controlHeightLG}px !important;
                        height: ${token.controlHeightLG}px !important;
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
                        openKeys={collapsed ? [] : openKeys}
                        onOpenChange={handleOpenChange}
                        inlineCollapsed={collapsed}
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
                    collapsed
                        ? 'app-sidebar-footer app-sidebar-footer-collapsed'
                        : 'app-sidebar-footer'
                }
            >
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
        </Sider>
    );
}
