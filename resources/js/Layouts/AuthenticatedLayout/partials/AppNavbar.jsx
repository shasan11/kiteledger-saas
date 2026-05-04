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
    const darkBorder = 'rgba(255,255,255,0.10)';
    const darkText = '#ffffff';
    const mutedText = '#9ca3af';

    return (
        <>
            <Header
                style={{
                    height: 60,
                    padding: isMobile ? '0 10px' : '0 16px',
                    background: darkBg,
                    borderBottom: `1px solid ${darkBorder}`,
                    display: 'grid',
                    gridTemplateColumns: isMobile
                        ? 'auto 1fr auto'
                        : '300px 1fr 260px',
                    alignItems: 'center',
                    gap: 12,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}
            >
                {/* LEFT: LOGO + BRANCH */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 0,
                    }}
                >
                    <Link
                        href={getUrl('dashboard', '/dashboard')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            textDecoration: 'none',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: token.borderRadius,
                                background: darkSoft,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ApplicationLogo className="block h-6 w-auto fill-current text-white" />
                        </div>

                        {!isMobile && (
                            <Text
                                strong
                                style={{
                                    fontSize: 15,
                                    color: darkText,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                KiteLedger
                            </Text>
                        )}
                    </Link>

                    {!isMobile && (
                        <Select
                            size="middle"
                            value={branch}
                            onChange={setBranch}
                            options={branchOptions}
                            
                            suffixIcon={
                                <BranchesOutlined style={{ color: mutedText }} />
                            }
                            className="app-dark-select"
                            popupClassName="app-dark-select-dropdown"
                            popupMatchSelectWidth={210}
                            style={{
                                width: isTablet ? 125 : 150,
                            }}
                        />
                    )}
                </div>

                {/* CENTER: SEARCH + AI + QUICK ADD */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 0,
                    }}
                >
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
                                maxWidth: isTablet ? 280 : 420,
                                height: 36,
                                borderRadius: token.borderRadius,
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
                            style={{
                                width: 36,
                                height: 36,
                                color: darkText,
                                borderRadius: token.borderRadius,
                            }}
                        />
                    )}

                    <Button
                        icon={<RobotOutlined />}
                        style={{
                            height: 36,
                            borderRadius: token.borderRadius,
                            color: darkText,
                            background: darkSoft,
                            borderColor: darkBorder,
                            fontWeight: 500,
                        }}
                    >
                        {!isTablet && 'AI'}
                    </Button>

                    <Dropdown
                        menu={{ items: quickAddItems }}
                        placement="bottomRight"
                        trigger={['click']}
                    >
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            style={{
                                height: 36,
                                borderRadius: token.borderRadius,
                                fontWeight: 500,
                                boxShadow: 'none',
                                paddingInline: isMobile ? 10 : 14,
                            }}
                        >
                            {!isMobile && 'Quick Add'}
                        </Button>
                    </Dropdown>
                </div>

                {/* RIGHT: SUPPORT + PROFILE */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 0,
                    }}
                >
                    {!isMobile && (
                        <Button
                            icon={<QuestionCircleOutlined />}
                            style={{
                                height: 36,
                                borderRadius: token.borderRadius,
                                color: darkText,
                                background: darkSoft,
                                borderColor: darkBorder,
                                fontWeight: 500,
                            }}
                        >
                            {!isTablet && 'Support'}
                        </Button>
                    )}

                    <Dropdown
                        menu={{ items: profileItems }}
                        placement="bottomRight"
                        trigger={['click']}
                    >
                        <Button
                            type="text"
                            style={{
                                height: 38,
                                paddingInline: isMobile ? 4 : 6,
                                color: darkText,
                                borderRadius: token.borderRadius,
                            }}
                        >
                            <Space size={8}>
                                <Avatar
                                    size={28}
                                    icon={<UserOutlined />}
                                    style={{
                                        background: darkSoft,
                                        color: darkText,
                                    }}
                                />

                                {!isTablet && (
                                    <span
                                        style={{
                                            fontWeight: 500,
                                            color: darkText,
                                            maxWidth: 120,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            display: 'inline-block',
                                        }}
                                    >
                                        {user?.name || 'User'}
                                    </span>
                                )}
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
                height={250}
            >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Input
                        autoFocus
                        allowClear
                        size="large"
                        prefix={<SearchOutlined />}
                        placeholder="Search invoices, contacts, accounts..."
                    />

                    

                    <Button block icon={<RobotOutlined />}>
                        AI Assistant
                    </Button>

                    <Button block icon={<QuestionCircleOutlined />}>
                        Support
                    </Button>
                </Space>
            </Drawer>

            <style>
                {`
                    .app-dark-search input {
                        color: #ffffff !important;
                        background: transparent !important;
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
                        background: #1f2937 !important;
                        border-color: rgba(255,255,255,0.10) !important;
                        border-radius: ${token.borderRadius}px !important;
                        color: #ffffff !important;
                    }

                    .app-dark-select .ant-select-selection-item {
                        color: #ffffff !important;
                        font-weight: 500;
                    }

                    .app-dark-select:hover .ant-select-selector,
                    .app-dark-select.ant-select-focused .ant-select-selector {
                        border-color: ${token.colorPrimary} !important;
                        background: ${darkSoftHover} !important;
                    }

                    .app-dark-select-dropdown {
                        background: #111827 !important;
                        border: 1px solid rgba(255,255,255,0.10) !important;
                        border-radius: ${token.borderRadius}px !important;
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

                    .ant-layout-header .ant-btn-text:hover {
                        background: rgba(255,255,255,0.06) !important;
                    }

                    .ant-layout-header .ant-btn-default:hover {
                        color: #ffffff !important;
                        border-color: ${token.colorPrimary} !important;
                        background: ${darkSoftHover} !important;
                    }
                `}
            </style>
        </>
    );
}