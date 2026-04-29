import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import {
    BranchesOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
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
} from 'antd';
import { useState } from 'react';

const { Header } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function AppNavbar({
    user,
    branch,
    setBranch,
    branchOptions,
    quickAddItems,
    profileItems,
    getUrl,
}) {
    const screens = useBreakpoint();
    const [searchOpen, setSearchOpen] = useState(false);

    const isMobile = !screens.md;
    const isTablet = !screens.lg;

    return (
        <>
            <Header
                className="app-navbar-dark"
                style={{
                    height: 64,
                    padding: isMobile ? '0 10px' : '0 18px',
                    background: '#111827',
                    borderBottom: '1px solid #1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 8 : 12,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                }}
            >
                <div
                    style={{
                        width: isMobile ? 'auto' : isTablet ? 230 : 300,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexShrink: 0,
                    }}
                >
                    <Link
                        href={getUrl('dashboard', '/dashboard')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            textDecoration: 'none',
                        }}
                    >
                        <ApplicationLogo className="block h-9 w-auto fill-current text-white" />

                        {!isMobile && (
                            <Text
                                strong
                                style={{
                                    fontSize: 17,
                                    color: '#ffffff',
                                    whiteSpace: 'nowrap',
                                    letterSpacing: 0.2,
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
                                <BranchesOutlined style={{ color: '#d1d5db' }} />
                            }
                            className="dark-navbar-select"
                            popupClassName="dark-navbar-select-dropdown"
                            style={{
                                width: isTablet ? 120 : 140,
                            }}
                        />
                    )}
                </div>

                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: isMobile ? 'flex-end' : 'center',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 0,
                    }}
                >
                    {!isMobile && (
                        <Input
                            allowClear
                            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                            placeholder={
                                isTablet
                                    ? 'Search...'
                                    : 'Search invoices, contacts, accounts...'
                            }
                            className="dark-navbar-search"
                            style={{
                                maxWidth: isTablet ? 300 : 440,
                                height: 38,
                                borderRadius: 10,
                            }}
                        />
                    )}

                    {isMobile && (
                        <Button
                            type="text"
                            icon={<SearchOutlined />}
                            onClick={() => setSearchOpen(true)}
                            className="dark-navbar-icon-button"
                        />
                    )}

                    {!isMobile && (
                        <Button
                            icon={<QuestionCircleOutlined />}
                            className="dark-navbar-button"
                        >
                            {!isTablet && 'Support'}
                        </Button>
                    )}

                    <Dropdown
                        menu={{ items: quickAddItems }}
                        placement="bottom"
                        trigger={['click']}
                    >
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            style={{
                                height: 38,
                                borderRadius: 10,
                                fontWeight: 600,
                                paddingInline: isMobile ? 10 : 15,
                            }}
                        >
                            {!isMobile && 'Quick Add'}
                        </Button>
                    </Dropdown>
                </div>

                <div
                    style={{
                        width: isMobile ? 'auto' : isTablet ? 70 : 220,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        flexShrink: 0,
                    }}
                >
                    <Dropdown
                        menu={{ items: profileItems }}
                        placement="bottomRight"
                        trigger={['click']}
                    >
                        <Button
                            type="text"
                            style={{
                                height: 44,
                                paddingInline: isMobile ? 4 : 8,
                                color: '#ffffff',
                            }}
                        >
                            <Space size={8}>
                                <Avatar
                                    size="small"
                                    icon={<UserOutlined />}
                                    style={{
                                        background: '#374151',
                                        color: '#ffffff',
                                    }}
                                />

                                {!isTablet && (
                                    <span
                                        style={{
                                            fontWeight: 500,
                                            color: '#ffffff',
                                            maxWidth: 130,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {user.name}
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
                height={180}
                className="dark-mobile-search-drawer"
            >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Input
                        autoFocus
                        allowClear
                        size="large"
                        prefix={<SearchOutlined />}
                        placeholder="Search invoices, contacts, accounts..."
                    />

                    <Select
                        size="large"
                        value={branch}
                        onChange={setBranch}
                        options={branchOptions}
                        suffixIcon={<BranchesOutlined />}
                        style={{ width: '100%' }}
                    />

                    <Button
                        block
                        icon={<QuestionCircleOutlined />}
                    >
                        Support
                    </Button>
                </Space>
            </Drawer>
        </>
    );
}