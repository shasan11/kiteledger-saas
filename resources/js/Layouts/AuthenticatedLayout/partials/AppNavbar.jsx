import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import {
    BranchesOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    RobotOutlined,
    SearchOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    Avatar,
    Button,
    Drawer,
    Dropdown,
    Grid,
    Input,
    Layout,
    Select,
    Space,
    Typography,
    theme,
} from 'antd';
import { useState } from 'react';

const { Header } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function AppNavbar({
    user,
    branch,
    setBranch,
    branchOptions = [],
    quickAddItems = [],
    profileItems = [],
    getUrl,
}) {
    const { token } = theme.useToken();
    const screens = useBreakpoint();

    const [searchOpen, setSearchOpen] = useState(false);

    const isMobile = !screens.md;
    const isTablet = !screens.lg;

    const darkBg = '#111827';
    const darkSoft = '#1f2937';
    const darkSoftHover = '#263244';
    const darkBorder = 'rgba(255,255,255,0.12)';
    const darkText = '#ffffff';
    const mutedText = '#9ca3af';

    const controlHeight = 40;
    const radius = 8;

    return (
        <>
            <Header
                className="app-navbar"
                style={{
                    height: 64,
                    padding: isMobile ? '0 12px' : '0 18px',
                    background: darkBg,
                    borderBottom: `1px solid ${darkBorder}`,
                    display: 'grid',
                    gridTemplateColumns: isMobile
                        ? 'auto 1fr auto'
                        : isTablet
                          ? '260px minmax(0, 1fr) 220px'
                          : '340px minmax(0, 1fr) 330px',
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
                        className="app-navbar__brand"
                    >
                        <div className="app-navbar__logo-box">
                            <ApplicationLogo className="block h-7 w-auto fill-current text-white" />
                        </div>

                         
                    </Link>

                    {!isMobile && (
                        <Select
                            size="small"
                            value={branch}
                            onChange={setBranch}
                            options={branchOptions}
                            suffixIcon={
                                <BranchesOutlined style={{ color: mutedText }} />
                            }
                            className="app-dark-select"
                            type="text"
                             popupMatchSelectWidth={230}
                            style={{
                                width: 150,
                                height: controlHeight,
                            }}
                        />
                    )}
                </div>

                <div className="app-navbar__center">
                    {!isMobile && (
                        <Input
                            allowClear
                            prefix={
                                <SearchOutlined style={{ color: mutedText }} />
                            }
                            placeholder={
                                isTablet
                                    ? 'Search...'
                                    : 'Search invoices, contacts, accounts...'
                            }
                            className="app-dark-search"
                            style={{
                                width: '100%',
                                maxWidth: isTablet ? 330 : 520,
                                height: controlHeight,
                                borderRadius: radius,
                                background: darkSoft,
                                borderColor: darkBorder,
                                color: darkText,
                            }}
                        />
                    )}

                    {isMobile && (
                        <Button
                            type="text"
                            icon={<SearchOutlined />}
                            onClick={() => setSearchOpen(true)}
                            className="app-navbar__icon-btn"
                        />
                    )}

                   
                    <Dropdown
                        menu={{ items: quickAddItems }}
                        placement="bottomRight"
                        trigger={['click']}
                    >
                        <Button
                            type="primary"
                            shape='circle'
                            icon={<PlusOutlined />}
                            className="app-navbar__primary-btn"
                        >
                     
                        </Button>
                    </Dropdown>
                </div>

                <div className="app-navbar__right">
                    {!isMobile && (
                        <Button
                            icon={<QuestionCircleOutlined />}
                            className="app-navbar__soft-btn"
                            shape='circle'
                            type='text'
                        >
                             
                        </Button>
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

                                 
                            </Space>
                        </Button>
                    </Dropdown>
                </div>
            </Header>

            <Drawer
                title="Search"
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                placement="top"
                height={280}
            >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Input
                        autoFocus
                        allowClear
                        size="large"
                        prefix={<SearchOutlined />}
                        placeholder="Search invoices, contacts, accounts..."
                    />

                    <Button block size="large" icon={<RobotOutlined />} />
                    <Button block size="large" icon={<QuestionCircleOutlined />}/>
                </Space>
            </Drawer>

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
                        background: #1f2937;
                        border: 1px solid rgba(255,255,255,0.08);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }

                    .app-navbar__brand-text {
                        display: flex;
                        flex-direction: column;
                        line-height: 1.1;
                        min-width: 0;
                    }

                    .app-navbar__brand-name {
                        color: #ffffff !important;
                        font-size: 16px;
                        line-height: 1.15;
                        white-space: nowrap;
                    }

                    .app-navbar__brand-sub {
                        color: #9ca3af !important;
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
                        color: #ffffff;
                        background: #1f2937;
                        border-color: rgba(255,255,255,0.12);
                        padding-inline: 14px;
                    }

                    .app-navbar__primary-btn {
                        padding-inline: 16px;
                        box-shadow: none;
                    }

                    .app-navbar__icon-btn {
                        width: ${controlHeight}px;
                        color: #ffffff;
                    }

                    .app-navbar__profile-btn {
                        height: 44px;
                        padding: 0 8px;
                        color: #ffffff;
                        border-radius: ${radius}px;
                        display: inline-flex;
                        align-items: center;
                    }

                    .app-navbar__avatar {
                        background: #1f2937;
                        color: #ffffff;
                        border: 1px solid rgba(255,255,255,0.12);
                    }

                    .app-navbar__user-name {
                        font-weight: 600;
                        color: #ffffff;
                        max-width: 135px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        display: inline-block;
                        line-height: 1;
                    }

                    .app-dark-search.ant-input-affix-wrapper {
                        padding-inline: 13px;
                    }

                    .app-dark-search input {
                        color: #ffffff !important;
                        background: transparent !important;
                        font-weight: 500;
                    }

                    .app-dark-search input::placeholder {
                        color: #9ca3af !important;
                    }

                    .app-dark-search .ant-input-clear-icon {
                        color: #9ca3af !important;
                    }

                    .app-dark-search:hover,
                    .app-dark-search:focus-within {
                        border-color: ${token.colorPrimary} !important;
                        background: ${darkSoftHover} !important;
                    }

                    .app-dark-select .ant-select-selector {
                        height: ${controlHeight}px !important;
                        background: #1f2937 !important;
                        border-color: rgba(255,255,255,0.12) !important;
                        border-radius: ${radius}px !important;
                        color: #ffffff !important;
                        display: flex;
                        align-items: center;
                    }

                    .app-dark-select .ant-select-selection-item {
                        color: #ffffff !important;
                        font-weight: 600;
                        line-height: ${controlHeight}px !important;
                    }

                    .app-dark-select:hover .ant-select-selector,
                    .app-dark-select.ant-select-focused .ant-select-selector {
                        border-color: ${token.colorPrimary} !important;
                        background: ${darkSoftHover} !important;
                    }

                    .app-dark-select-dropdown {
                        background: #111827 !important;
                        border: 1px solid rgba(255,255,255,0.12) !important;
                        border-radius: ${radius}px !important;
                        padding: 6px !important;
                    }

                    .app-dark-select-dropdown .ant-select-item {
                        color: #e5e7eb !important;
                        border-radius: ${token.borderRadiusSM}px !important;
                    }

                    .app-dark-select-dropdown .ant-select-item-option-active {
                        background: #1f2937 !important;
                    }

                    .app-dark-select-dropdown .ant-select-item-option-selected {
                        background: ${token.colorPrimary} !important;
                        color: #ffffff !important;
                    }

                    .app-navbar .ant-btn-text:hover {
                        background: rgba(255,255,255,0.08) !important;
                        color: #ffffff !important;
                    }

                    .app-navbar .ant-btn-default:hover {
                        color: #ffffff !important;
                        border-color: ${token.colorPrimary} !important;
                        background: ${darkSoftHover} !important;
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