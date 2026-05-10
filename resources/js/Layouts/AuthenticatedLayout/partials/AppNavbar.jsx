import ApplicationLogo from '@/Components/ApplicationLogo';
import GlobalSearchCommand from '@/Components/App/GlobalSearchCommand';
import { Link } from '@inertiajs/react';
import {
    BranchesOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    Avatar,
    Button,
    Dropdown,
    Grid,
    Layout,
    Select,
    Space,
    theme,
} from 'antd';

const { Header } = Layout;
const { useBreakpoint } = Grid;

export default function AppNavbar({
    user,
    branch,
    setBranch,
    branchContext,
    branchOptions = [],
    quickAddItems = [],
    profileItems = [],
    getUrl,
}) {
    const { token } = theme.useToken();
    const screens = useBreakpoint();

    const isMobile = !screens.md;
    const isTablet = !screens.lg;

    const controlHeight = 38;
    const radius = token.borderRadiusLG;

    const dark = {
        nav: '#0b1220',
        navSoft: '#111827',
        navElevated: '#162033',
        border: 'rgba(148, 163, 184, 0.18)',
        borderStrong: 'rgba(148, 163, 184, 0.28)',
        text: '#f8fafc',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        primarySoft: 'rgba(59, 130, 246, 0.16)',
        primaryBorder: 'rgba(59, 130, 246, 0.35)',
    };

    return (
        <>
            <Header
                className="app-navbar"
                style={{
                    height: 72,
                    padding: isMobile ? '0 12px' : '0 18px',
                    background: dark.nav,
                    borderBottom: `1px solid ${dark.border}`,
                    boxShadow: '0 10px 30px rgba(2, 6, 23, 0.28)',
                    display: 'grid',
                    gridTemplateColumns: isMobile
                        ? 'auto 1fr auto'
                        : isTablet
                          ? '280px minmax(0, 1fr) 220px'
                          : '360px minmax(0, 1fr) 330px',
                    alignItems: 'center',
                    gap: 14,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}
            >
                <div className="app-navbar__left">
                    <Link
                        href={getUrl('dashboard', '/dashboard')}
                        className="app-navbar__brand-link"
                    >
                        <div className="app-navbar__logo-wrap">
                            <ApplicationLogo
                                className="app-navbar__logo"
                                style={{
                                    width: '200px',
                                    padding: '3px',
                                }}
                            />
                        </div>
                    </Link>

                    {!isMobile && (
                        <Select
                            size="middle"
                            value={branch}
                            onChange={setBranch}
                            options={branchOptions}
                            suffixIcon={
                                <BranchesOutlined
                                    style={{ color: dark.textMuted }}
                                />
                            }
                            className="app-dark-select"
                            popupClassName="app-dark-select-dropdown"
                            popupMatchSelectWidth={230}
                            style={{
                                width: 160,
                                height: controlHeight,
                            }}
                        />
                    )}
                </div>

                <div className="app-navbar__center">
                    {!isMobile ? (
                        <GlobalSearchCommand
                            branchContext={branchContext}
                            className="global-search-command__trigger app-navbar__search"
                            style={{
                                width: '100%',
                                maxWidth: isTablet ? 380 : 560,
                                height: controlHeight,
                            }}
                        />
                    ) : (
                        <GlobalSearchCommand
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

                    <Dropdown
                        menu={{ items: quickAddItems }}
                        placement="bottomRight"
                        trigger={['click']}
                        overlayClassName="app-navbar-dropdown"
                    >
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<PlusOutlined />}
                            className="app-navbar__primary-btn"
                        />
                    </Dropdown>
                </div>

                <div className="app-navbar__right">
                    {!isMobile && (
                        <Button
                            icon={<QuestionCircleOutlined />}
                            className="app-navbar__soft-btn"
                            shape="circle"
                            type="text"
                        />
                    )}

                    <Dropdown
                        menu={{ items: profileItems }}
                        placement="bottomRight"
                        trigger={['click']}
                        overlayClassName="app-navbar-dropdown"
                    >
                        <Button type="text" className="app-navbar__profile-btn">
                            <Space size={10}>
                                <Avatar
                                    size={34}
                                    icon={<UserOutlined />}
                                    className="app-navbar__avatar"
                                />

                                {!isTablet && (
                                    <span className="app-navbar__user-name">
                                        {user?.name || 'User'}
                                    </span>
                                )}
                            </Space>
                        </Button>
                    </Dropdown>
                </div>
            </Header>

            <style>
                {`
                    .app-navbar__left,
                    .app-navbar__center,
                    .app-navbar__right {
                        display: flex;
                        align-items: center;
                        min-width: 0;
                    }

                    .app-navbar__left {
                        justify-content: flex-start;
                        gap: 14px;
                    }

                    .app-navbar__center {
                        justify-content: center;
                        gap: 10px;
                    }

                    .app-navbar__right {
                        justify-content: flex-end;
                        gap: 10px;
                    }

                    .app-navbar__brand-link {
                        display: inline-flex;
                        align-items: center;
                        text-decoration: none;
                        flex-shrink: 0;
                        min-width: 0;
                    }

                    .app-navbar__logo-wrap {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 0;
                    }

                    .app-navbar__logo {
                        display: block;
                        height: auto;
                        max-height: 50px;
                        object-fit: contain;
                    }

                    .app-navbar__soft-btn,
                    .app-navbar__primary-btn,
                    .app-navbar__icon-btn {
                        height: ${controlHeight}px;
                        border-radius: ${radius}px;
                        font-weight: 600;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .app-navbar__soft-btn {
                        width: ${controlHeight}px;
                        color: ${dark.textSecondary} !important;
                        background: ${dark.navSoft} !important;
                        border: 1px solid ${dark.border} !important;
                    }

                    .app-navbar__soft-btn:hover {
                        color: ${dark.text} !important;
                        background: ${dark.navElevated} !important;
                        border-color: ${dark.borderStrong} !important;
                    }

                    .app-navbar__primary-btn {
                        width: ${controlHeight}px;
                        min-width: ${controlHeight}px;
                        box-shadow: none;
                        font-weight: 700;
                    }

                    .app-navbar__icon-btn {
                        width: ${controlHeight}px;
                        color: ${dark.text};
                    }

                    .app-navbar__profile-btn {
                        height: 42px;
                        padding: 0 8px;
                        color: ${dark.textSecondary} !important;
                        border-radius: ${radius}px;
                        display: inline-flex;
                        align-items: center;
                        background: transparent !important;
                    }

                    .app-navbar__profile-btn:hover {
                        background: ${dark.navSoft} !important;
                        color: ${dark.text} !important;
                    }

                    .app-navbar__avatar {
                        background: ${dark.primarySoft} !important;
                        color: ${token.colorPrimary} !important;
                        border: 1px solid ${dark.primaryBorder} !important;
                    }

                    .app-navbar__user-name {
                        font-weight: 600;
                        color: ${dark.text};
                        max-width: 135px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        display: inline-block;
                        line-height: 1;
                    }

                    .app-dark-select .ant-select-selector {
                        height: ${controlHeight}px !important;
                        background: ${dark.navSoft} !important;
                        border-color: ${dark.border} !important;
                        border-radius: ${radius}px !important;
                        color: ${dark.text} !important;
                        display: flex;
                        align-items: center;
                        box-shadow: none !important;
                    }

                    .app-dark-select .ant-select-selection-item {
                        color: ${dark.text} !important;
                        font-weight: 600;
                        line-height: ${controlHeight}px !important;
                    }

                    .app-dark-select:hover .ant-select-selector,
                    .app-dark-select.ant-select-focused .ant-select-selector {
                        border-color: ${token.colorPrimary} !important;
                        background: ${dark.navElevated} !important;
                    }

                    .app-dark-select .ant-select-arrow {
                        color: ${dark.textMuted} !important;
                    }

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

                    .app-navbar__search,
                    .app-navbar__search button,
                    .app-navbar__search .ant-btn,
                    .app-navbar__search .ant-input,
                    .app-navbar__search .ant-input-affix-wrapper {
                        background: ${dark.navSoft} !important;
                        color: ${dark.textSecondary} !important;
                        border-color: ${dark.border} !important;
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

                    .app-navbar .ant-btn-text:hover {
                        background: ${dark.navSoft} !important;
                        color: ${dark.text} !important;
                    }

                    .app-navbar .ant-btn-default:hover {
                        color: ${dark.text} !important;
                        border-color: ${dark.borderStrong} !important;
                        background: ${dark.navElevated} !important;
                    }

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

                    @media (max-width: 767px) {
                        .app-navbar__center {
                            justify-content: flex-end;
                        }

                        .app-navbar__left {
                            gap: 8px;
                        }

                        .app-navbar__logo {
                            max-width: 150px;
                        }

                        .app-navbar__soft-btn,
                        .app-navbar__primary-btn {
                            width: 40px;
                            min-width: 40px;
                            padding-inline: 0;
                        }

                        .app-navbar__right {
                            gap: 4px;
                        }
                    }
                `}
            </style>
        </>
    );
}