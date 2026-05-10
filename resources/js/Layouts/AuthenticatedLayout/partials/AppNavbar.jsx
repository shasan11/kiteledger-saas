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
    Typography,
    theme,
} from 'antd';

const { Header } = Layout;
const { useBreakpoint } = Grid;
const { Text } = Typography;

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

    return (
        <>
            <Header
                className="app-navbar"
                style={{
                    height: 72,
                    padding: isMobile ? '0 12px' : '0 18px',
                    background: token.colorBgContainer,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    boxShadow: '0 1px 8px rgba(15, 23, 42, 0.04)',
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
                        
                    >
                        <div className="w-50">
                            <ApplicationLogo className="w-50" style={{width:"200px",padding:'3px'}}/>
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
                                    style={{ color: token.colorTextTertiary }}
                                />
                            }
                            className="app-light-select"
                            popupClassName="app-light-select-dropdown"
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
                            className="global-search-command__trigger"
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
                            className="app-navbar__icon-btn"
                            style={{
                                width: controlHeight,
                                height: controlHeight,
                                color: token.colorText,
                                background: token.colorBgContainer,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: radius,
                            }}
                        />
                    )}

                    <Dropdown
                        menu={{ items: quickAddItems }}
                        placement="bottomRight"
                        trigger={['click']}
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

                    .app-navbar__brand {
                        display: flex;
                        align-items: center;
                        gap: 11px;
                        min-width: 0;
                        text-decoration: none;
                        flex-shrink: 0;
                    }

                    .app-navbar__logo-box {
                        width: 42px;
                        height: 42px;
                        border-radius: ${radius}px;
                        background: ${token.colorPrimaryBg};
                        border: 1px solid ${token.colorPrimaryBorder};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        overflow: hidden;
                    }

                    .app-navbar__logo {
                        display: block;
                        height: 28px;
                        width: auto;
                        color: ${token.colorPrimary};
                        fill: currentColor;
                    }

                    .app-navbar__logo-box svg {
                        max-width: 30px;
                        max-height: 30px;
                        color: ${token.colorPrimary};
                        fill: currentColor;
                    }

                    .app-navbar__brand-text {
                        display: flex;
                        flex-direction: column;
                        line-height: 1.1;
                        min-width: 0;
                    }

                    .app-navbar__brand-name {
                        color: ${token.colorText} !important;
                        font-size: 15px;
                        line-height: 1.15;
                        white-space: nowrap;
                    }

                    .app-navbar__brand-sub {
                        color: ${token.colorTextTertiary} !important;
                        font-size: 11px;
                        margin-top: 2px;
                        line-height: 1.15;
                        white-space: nowrap;
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
                        color: ${token.colorTextSecondary};
                        background: ${token.colorFillQuaternary};
                        border: 1px solid ${token.colorBorderSecondary};
                    }

                    .app-navbar__primary-btn {
                        width: ${controlHeight}px;
                        min-width: ${controlHeight}px;
                        box-shadow: none;
                    }

                    .app-navbar__icon-btn {
                        width: ${controlHeight}px;
                        color: ${token.colorText};
                    }

                    .app-navbar__profile-btn {
                        height: 42px;
                        padding: 0 8px;
                        color: ${token.colorText};
                        border-radius: ${radius}px;
                        display: inline-flex;
                        align-items: center;
                    }

                    .app-navbar__avatar {
                        background: ${token.colorPrimaryBg};
                        color: ${token.colorPrimary};
                        border: 1px solid ${token.colorPrimaryBorder};
                    }

                    .app-navbar__user-name {
                        font-weight: 600;
                        color: ${token.colorText};
                        max-width: 135px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        display: inline-block;
                        line-height: 1;
                    }

                    .app-light-select .ant-select-selector {
                        height: ${controlHeight}px !important;
                        background: ${token.colorBgContainer} !important;
                        border-color: ${token.colorBorderSecondary} !important;
                        border-radius: ${radius}px !important;
                        color: ${token.colorText} !important;
                        display: flex;
                        align-items: center;
                        box-shadow: none !important;
                    }

                    .app-light-select .ant-select-selection-item {
                        color: ${token.colorText} !important;
                        font-weight: 600;
                        line-height: ${controlHeight}px !important;
                    }

                    .app-light-select:hover .ant-select-selector,
                    .app-light-select.ant-select-focused .ant-select-selector {
                        border-color: ${token.colorPrimary} !important;
                        background: ${token.colorPrimaryBg} !important;
                    }

                    .app-light-select-dropdown {
                        background: ${token.colorBgElevated} !important;
                        border: 1px solid ${token.colorBorderSecondary} !important;
                        border-radius: ${radius}px !important;
                        padding: 6px !important;
                        box-shadow: ${token.boxShadowSecondary} !important;
                    }

                    .app-light-select-dropdown .ant-select-item {
                        color: ${token.colorText} !important;
                        border-radius: ${token.borderRadiusSM}px !important;
                    }

                    .app-light-select-dropdown .ant-select-item-option-active {
                        background: ${token.colorFillTertiary} !important;
                    }

                    .app-light-select-dropdown .ant-select-item-option-selected {
                        background: ${token.colorPrimaryBg} !important;
                        color: ${token.colorPrimary} !important;
                        font-weight: 700 !important;
                    }

                    .app-navbar .ant-btn-text:hover {
                        background: ${token.colorFillTertiary} !important;
                        color: ${token.colorText} !important;
                    }

                    .app-navbar .ant-btn-default:hover {
                        color: ${token.colorPrimary} !important;
                        border-color: ${token.colorPrimary} !important;
                        background: ${token.colorPrimaryBg} !important;
                    }

                    .app-navbar .ant-btn-primary {
                        font-weight: 700;
                    }

                    @media (max-width: 767px) {
                        .app-navbar__center {
                            justify-content: flex-end;
                        }

                        .app-navbar__left {
                            gap: 8px;
                        }

                        .app-navbar__logo-box {
                            width: 40px;
                            height: 40px;
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