import ApplicationLogo from '@/Components/ApplicationLogo';
import BranchToggle from '@/Components/BranchToggle';
import FiscalYearToggle from '@/Components/FiscalYearToggle';
import GlobalSearch from '@/Components/GlobalSearch';
import AiCommandModal from '@/Components/AI/AiCommandModal';
import { useAiAvailability } from '@/hooks/useAiAvailability';
import { fetchBrandSettings, subscribeToBrandSettings } from '@/brandSettings';
import { Link } from '@inertiajs/react';
import {
    LogoutOutlined,
    MenuOutlined,
    MoonOutlined,
    PlusOutlined,
    ProfileOutlined,
    RobotOutlined,
    SunOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    Avatar,
    Button,
    Dropdown,
    Grid,
    Layout,
    Space,
    Switch,
    theme,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Header } = Layout;
const { useBreakpoint } = Grid;

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

const getStoredThemeMode = () => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('themeMode') || 'light';
};

export default function AppNavbar({
    user,
    branchContext,
    quickAddItems = [],
    profileItems = [],
    getUrl,
    onSidebarToggle,
}) {
    const { token } = theme.useToken();
    const screens = useBreakpoint();

    const [brandSettings, setBrandSettings] = useState(null);
    const [themeMode, setThemeMode] = useState(getStoredThemeMode);
    const [aiCommandOpen, setAiCommandOpen] = useState(false);
    const { aiEnabled, canUseAiModule, hasPermission } = useAiAvailability();
    const showAiCommand = aiEnabled
        && canUseAiModule('global_command')
        && hasPermission('ai.global_command.use');

    useEffect(() => {
        let mounted = true;

        fetchBrandSettings()
            .then((settings) => {
                if (mounted) setBrandSettings(settings);
            })
            .catch(() => {});

        const unsubscribeBrandSettings = subscribeToBrandSettings(setBrandSettings);

        return () => {
            mounted = false;
            unsubscribeBrandSettings();
        };
    }, []);

    useEffect(() => {
        const handleThemeModeChange = (event) => {
            setThemeMode(event.detail?.mode || getStoredThemeMode());
        };

        const handleStorage = (event) => {
            if (event.key === 'themeMode') {
                setThemeMode(event.newValue || 'light');
            }
        };

        window.addEventListener('kiteledger-theme-mode-change', handleThemeModeChange);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('kiteledger-theme-mode-change', handleThemeModeChange);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
                e.preventDefault();
                if (showAiCommand) setAiCommandOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showAiCommand]);

    const isMobile = !screens.md;
    const isTablet = screens.md && !screens.lg;
    const isLaptop = screens.lg && !screens.xl;
    const isDesktop = screens.lg; // includes laptop and larger

    const isDarkMode = themeMode === 'dark';

    const controlHeight = isMobile ? 38 : 34;
    const headerHeight = isMobile ? 'auto' : '60px';
    const radius = 10;

    const logoWidth = isMobile ? 116 : isTablet ? 132 : 150;
    const searchMaxWidth = isDesktop ? (isLaptop ? 360 : 460) : 500;
    const branchToggleWidth = isMobile ? '100%' : isTablet ? 150 : 180;
    const fiscalYearToggleWidth = isMobile ? '100%' : isTablet ? 122 : 142;

    const initials = (user?.display_name || user?.name || user?.email || 'User')
        .split(' ')
        .map((part) => part?.[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const enhancedProfileItems = [
        {
            key: 'profile-summary',
            disabled: true,
            label: (
                <div className="app-navbar__dropdown-user">
                    <Avatar
                        size={42}
                        src={user?.image_url}
                        icon={!user?.image_url ? <UserOutlined /> : null}
                        className="app-navbar__avatar"
                    >
                        {!user?.image_url ? initials : null}
                    </Avatar>
                    <div className="app-navbar__dropdown-user-copy">
                        <strong>{user?.display_name || user?.name || 'User'}</strong>
                        <span>{user?.email || 'No email available'}</span>
                    </div>
                </div>
            ),
        },
        { type: 'divider' },
        ...profileItems.map((item) => {
            if (item?.key === 'profile') {
                return { ...item, icon: item.icon || <ProfileOutlined />, label: 'View Profile' };
            }
            if (item?.key === 'logout') {
                return { ...item, icon: <LogoutOutlined /> };
            }
            return item;
        }),
    ];

    const dark = useMemo(() => {
        const primary = isHexColor(brandSettings?.brand_primary_color)
            ? brandSettings.brand_primary_color.trim()
            : token.colorPrimary;

        return {
            nav: '#080d18',
            navSoft: '#101827',
            navElevated: '#172234',
            border: 'rgba(148, 163, 184, 0.12)',
            borderStrong: 'rgba(148, 163, 184, 0.24)',
            text: '#f8fafc',
            textSecondary: '#cbd5e1',
            textMuted: '#94a3b8',
            primarySoft: rgba(primary, 0.16),
            primaryBorder: rgba(primary, 0.35),
        };
    }, [brandSettings?.brand_primary_color, token.colorPrimary]);

    const toggleThemeMode = (checked) => {
        const nextMode = checked ? 'dark' : 'light';
        setThemeMode(nextMode);
        localStorage.setItem('themeMode', nextMode);
        localStorage.setItem('theme_mode', nextMode);
        window.dispatchEvent(
            new CustomEvent('kiteledger-theme-mode-change', {
                detail: { mode: nextMode },
            }),
        );
    };

    return (
        <>
            <Header
                className="app-navbar"
                style={{
                    minHeight: headerHeight,
                    height: headerHeight,
                    padding: isMobile ? '8px 12px' : '0 20px',
                    background: dark.nav,
                    borderBottom: `1px solid ${dark.border}`,
                    display: 'flex',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    alignItems: 'center',
                    gap: isMobile ? 8 : 16,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    lineHeight: 1,
                }}
            >
                {/* Left section: menu button, logo, branch toggle */}
                <div className="app-navbar__left">
                    {isMobile && (
                        <Button
                            type="text"
                            icon={<MenuOutlined />}
                            className="app-navbar__soft-btn"
                            shape="circle"
                            onClick={onSidebarToggle}
                            aria-label="Open navigation"
                        />
                    )}

                    <Link
                        href={getUrl('dashboard', '/dashboard')}
                        className="app-navbar__brand-link"
                    >
                        <div className="app-navbar__logo-wrap">
                            <ApplicationLogo
                                className="app-navbar__logo"
                                dark
                                style={{
                                    width: logoWidth,
                                    maxWidth: '200px',
                                    padding: 2,
                                }}
                            />
                        </div>
                    </Link>

                    {!isMobile && (
                        <BranchToggle
                            className="app-dark-select"
                            style={{
                                width: branchToggleWidth,
                                height: controlHeight,
                            }}
                        />
                    )}
                </div>

                {/* Center: global search (hidden on mobile, shown in right group) */}
                {!isMobile && (
                    <div className="app-navbar__center">
                        <GlobalSearch
                            branchContext={branchContext}
                            className="global-search-command__trigger app-navbar__search"
                            style={{
                                width: '100%',
                                maxWidth: searchMaxWidth,
                                height: controlHeight,
                            }}
                        />
                    </div>
                )}

                {/* Right section: search (mobile only), fiscal year, theme, profile */}
                <div className="app-navbar__right">
                    {isMobile && (
                        <GlobalSearch
                            branchContext={branchContext}
                            compact
                            className="app-navbar__icon-btn app-navbar__search-compact"
                            style={{
                                width: controlHeight,
                                height: controlHeight,
                                color: dark.text,
                                background: dark.navSoft,
                                border: `1px solid ${dark.border}`,
                                borderRadius: radius,
                            }}
                        />
                    )}

                    <div className="app-navbar__fy-wrap">
                        <FiscalYearToggle
                            className="app-dark-select"
                            style={{
                                width: fiscalYearToggleWidth,
                                height: controlHeight,
                            }}
                        />
                    </div>

                    {showAiCommand && (
                        <Button
                            type="text"
                            icon={<RobotOutlined />}
                            className="app-navbar__soft-btn"
                            onClick={() => setAiCommandOpen(true)}
                            title="AI Command (Ctrl+J)"
                            style={{ color: token.colorPrimary }}
                        />
                    )}

                    {quickAddItems.length > 0 && (
                        <Dropdown
                            menu={{ items: quickAddItems }}
                            placement="bottomRight"
                            trigger={['click']}
                            overlayClassName="app-navbar-dropdown"
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                className="app-navbar__quick-add"
                                title="Quick Add"
                            >
                                {!isMobile && !isTablet ? 'Quick Add' : null}
                            </Button>
                        </Dropdown>
                    )}

                    <Switch
                        checked={isDarkMode}
                        checkedChildren={<MoonOutlined />}
                        unCheckedChildren={<SunOutlined />}
                        onChange={toggleThemeMode}
                        aria-label="Toggle between light and dark mode"
                        className="app-navbar__theme-switch"
                    />

                    <Dropdown
                        menu={{ items: enhancedProfileItems }}
                        placement="bottomRight"
                        trigger={['click']}
                        overlayClassName="app-navbar-dropdown"
                    >
                        <Button type="text" className="app-navbar__profile-btn">
                            <Space size={8} wrap={false}>
                                <Avatar
                                    size={32}
                                    src={user?.image_url}
                                    icon={!user?.image_url ? <UserOutlined /> : null}
                                    className="app-navbar__avatar"
                                >
                                    {!user?.image_url ? initials : null}
                                </Avatar>
                                {/* Show name only on larger screens to keep things minimal */}
                                {!isMobile && !isTablet && !isLaptop && (
                                    <span className="app-navbar__user-name">
                                        {user?.name || 'User'}
                                    </span>
                                )}
                            </Space>
                        </Button>
                    </Dropdown>
                </div>

                {/* Second row on mobile for branch & fiscal year toggles */}
                {isMobile && (
                    <div className="app-navbar__mobile-context">
                        <BranchToggle
                            className="app-dark-select app-navbar__mobile-context-select"
                            style={{
                                width: '100%',
                                height: controlHeight,
                            }}
                        />
                        <div className="app-navbar__mobile-fy-wrap">
                            <FiscalYearToggle
                                className="app-dark-select app-navbar__mobile-context-select"
                                style={{
                                    width: '100%',
                                    height: controlHeight,
                                }}
                            />
                        </div>
                    </div>
                )}
            </Header>

            {showAiCommand && (
                <AiCommandModal
                    open={aiCommandOpen}
                    onClose={() => setAiCommandOpen(false)}
                    branchId={branchContext?.selectedBranchId}
                />
            )}

            <style>
                {`
                    .app-navbar {
                        width: 100%;
                        box-sizing: border-box;
                    }

                    /* Left group */
                    .app-navbar__left {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        flex: 0 0 auto;
                        min-width: 0;
                    }

                    /* Center (search) - fills remaining space */
                    .app-navbar__center {
                        flex: 1 1 auto;
                        display: flex;
                        justify-content: center;
                        min-width: 0;
                    }

                    /* Right group */
                    .app-navbar__right {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        flex: 0 0 auto;
                        min-width: 0;
                    }

                    /* Mobile second row */
                    .app-navbar__mobile-context {
                        width: 100%;
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                        gap: 8px;
                        margin-top: 2px;
                    }

                    /* Logo & link */
                    .app-navbar__brand-link {
                        display: inline-flex;
                        align-items: center;
                        text-decoration: none;
                        flex-shrink: 1;
                        min-width: 0;
                        overflow: hidden;
                    }

                    .app-navbar__logo-wrap {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 0;
                        max-width: 100%;
                        overflow: hidden;
                    }

                    .app-navbar__logo {
                        display: block;
                        height: auto;
                        max-height: 36px;
                        object-fit: contain;
                    }

                    /* Buttons */
                    .app-navbar__soft-btn,
                    .app-navbar__icon-btn,
                    .app-navbar__quick-add {
                        height: ${controlHeight}px;
                        border-radius: ${radius}px;
                        font-weight: 600;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }

                    .app-navbar__soft-btn,
                    .app-navbar__icon-btn {
                        width: ${controlHeight}px;
                    }

                    .app-navbar__quick-add {
                        padding-inline: ${isMobile || isTablet ? 0 : 12}px;
                        width: ${isMobile || isTablet ? `${controlHeight}px` : 'auto'};
                    }

                    .app-navbar__soft-btn {
                        color: ${dark.textSecondary} !important;
                        background: transparent !important;
                        border: 1px solid transparent !important;
                    }

                    .app-navbar__soft-btn:hover {
                        color: ${dark.text} !important;
                        background: ${dark.navElevated} !important;
                        border-color: ${dark.borderStrong} !important;
                    }

                    .app-navbar__icon-btn {
                        color: ${dark.text};
                        flex-shrink: 0;
                    }

                    /* Profile button */
                    .app-navbar__profile-btn {
                        height: ${controlHeight}px;
                        padding: 0 6px;
                        color: ${dark.textSecondary} !important;
                        border-radius: ${radius}px;
                        background: transparent !important;
                        flex-shrink: 0;
                    }

                    .app-navbar__profile-btn:hover {
                        background: ${dark.navSoft} !important;
                        color: ${dark.text} !important;
                    }

                    /* Theme switch */
                    .app-navbar__theme-switch {
                        flex-shrink: 0;
                        transform: scale(0.92);
                    }

                    /* Fiscal year group */
                    .app-navbar__fy-wrap,
                    .app-navbar__mobile-fy-wrap {
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        min-width: 0;
                        flex-shrink: 0;
                    }

                    .app-navbar__fy-badge .ant-badge-status-text {
                        color: ${dark.textMuted};
                        font-size: 11px;
                    }

                    /* Avatar */
                    .app-navbar__avatar {
                        background: ${dark.primarySoft} !important;
                        color: ${token.colorPrimary} !important;
                        border: 1px solid ${dark.primaryBorder} !important;
                    }

                    /* User name (only visible on larger screens) */
                    .app-navbar__user-name {
                        font-weight: 600;
                        color: ${dark.text};
                        max-width: 110px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        display: inline-block;
                        line-height: 1;
                    }

                    /* Dropdown user header */
                    .app-navbar__dropdown-user {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        min-width: 220px;
                        padding: 4px 2px;
                    }

                    .app-navbar__dropdown-user-copy {
                        display: flex;
                        flex-direction: column;
                        min-width: 0;
                    }

                    .app-navbar__dropdown-user-copy strong,
                    .app-navbar__dropdown-user-copy span {
                        max-width: 160px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .app-navbar__dropdown-user-copy strong {
                        color: ${dark.text};
                        font-size: 13px;
                    }

                    .app-navbar__dropdown-user-copy span {
                        color: ${dark.textMuted};
                        font-size: 12px;
                    }

                    /* Dark select overrides (Branch & Fiscal Year) */
                    .app-dark-select {
                        min-width: 0;
                    }

                    .app-dark-select .ant-select-selector {
                        height: ${controlHeight}px !important;
                        background: ${dark.navSoft} !important;
                        border-color: transparent !important;
                        border-radius: ${radius}px !important;
                        color: ${dark.text} !important;
                        display: flex;
                        align-items: center;
                        box-shadow: none !important;
                        padding-inline: 12px !important;
                    }

                    .app-dark-select .ant-select-selection-search-input {
                        height: ${controlHeight}px !important;
                        color: ${dark.text} !important;
                    }

                    .app-dark-select .ant-select-selection-placeholder {
                        color: ${dark.textMuted} !important;
                    }

                    .app-dark-select .ant-select-selection-item {
                        color: ${dark.text} !important;
                        font-weight: 500;
                        font-size: 13px;
                        line-height: ${controlHeight}px !important;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .app-dark-select:hover .ant-select-selector,
                    .app-dark-select.ant-select-focused .ant-select-selector {
                        border-color: ${dark.borderStrong} !important;
                        background: ${dark.navElevated} !important;
                    }

                    .app-dark-select .ant-select-arrow {
                        color: ${dark.textMuted} !important;
                    }

                    /* Dropdowns for dark selects */
                    .app-dark-select-dropdown {
                        background: ${dark.navSoft} !important;
                        border: 1px solid ${dark.border} !important;
                        border-radius: ${radius}px !important;
                        padding: 6px !important;
                        box-shadow: 0 18px 45px rgba(2, 6, 23, 0.45) !important;
                    }

                    .app-dark-select-dropdown .ant-select-item {
                        color: ${dark.textSecondary} !important;
                        border-radius: ${token.borderRadiusSM}px !important;
                    }

                    .app-dark-select-dropdown .ant-select-item-option-active {
                        background: ${dark.navElevated} !important;
                        color: ${dark.text} !important;
                    }

                    .app-dark-select-dropdown .ant-select-item-option-selected {
                        background: ${dark.primarySoft} !important;
                        color: ${dark.text} !important;
                        font-weight: 700 !important;
                    }

                    /* Global search styling */
                    .app-navbar__search,
                    .app-navbar__search button,
                    .app-navbar__search .ant-btn,
                    .app-navbar__search .ant-input,
                    .app-navbar__search .ant-input-affix-wrapper {
                        background: ${dark.navSoft} !important;
                        color: ${dark.textSecondary} !important;
                        border-color: transparent !important;
                        border-radius: ${radius}px !important;
                        box-shadow: none !important;
                    }

                    .app-navbar__search:hover,
                    .app-navbar__search button:hover,
                    .app-navbar__search .ant-btn:hover,
                    .app-navbar__search .ant-input-affix-wrapper:hover {
                        background: ${dark.navElevated} !important;
                        color: ${dark.text} !important;
                        border-color: ${dark.borderStrong} !important;
                    }

                    .app-navbar__search input::placeholder,
                    .app-navbar__search .ant-input::placeholder {
                        color: ${dark.textMuted} !important;
                    }

                    /* Dropdown menu (profile) */
                    .app-navbar-dropdown .ant-dropdown-menu {
                        background: ${dark.navSoft} !important;
                        border: 1px solid ${dark.border} !important;
                        border-radius: ${radius}px !important;
                        box-shadow: 0 18px 45px rgba(2, 6, 23, 0.45) !important;
                    }

                    .app-navbar-dropdown .ant-dropdown-menu-item,
                    .app-navbar-dropdown .ant-dropdown-menu-submenu-title {
                        color: ${dark.textSecondary} !important;
                    }

                    .app-navbar-dropdown .ant-dropdown-menu-item:hover,
                    .app-navbar-dropdown .ant-dropdown-menu-submenu-title:hover {
                        background: ${dark.navElevated} !important;
                        color: ${dark.text} !important;
                    }

                    /* Responsive fine‑tuning */
                    @media (max-width: 767px) {
                        .app-navbar__left {
                            gap: 6px;
                        }
                        .app-navbar__right {
                            gap: 5px;
                        }
                        .app-navbar__profile-btn {
                            padding: 0 2px;
                            height: 38px;
                        }
                        .app-navbar__logo {
                            max-height: 36px;
                        }
                    }

                    @media (min-width: 768px) and (max-width: 991px) {
                        .app-navbar__left {
                            gap: 8px;
                        }
                        .app-navbar__right {
                            gap: 6px;
                        }
                    }

                    @media (min-width: 992px) and (max-width: 1199px) {
                        /* Laptop – everything stays minimal; user name hidden already */
                    }

                    @media (min-width: 1200px) {
                        .app-navbar__user-name {
                            max-width: 130px;   /* a bit more room on wide screens */
                        }
                    }
                `}
            </style>
        </>
    );
}
