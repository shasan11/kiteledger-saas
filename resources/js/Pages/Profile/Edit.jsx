import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import dayjs from 'dayjs';
import {
    Alert,
    Avatar,
    Button,
    Card,
    Descriptions,
    Empty,
    Grid,
    Space,
    Tabs,
    Tag,
    Typography,
    theme,
} from 'antd';
import {
    CalendarOutlined,
    DeleteOutlined,
    EditOutlined,
    LockOutlined,
    LogoutOutlined,
    MailOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useMemo, useState } from 'react';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const fmtDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-');

const initialsFor = (user) =>
    (user?.display_name || user?.name || user?.email || 'User')
        .split(' ')
        .map((part) => part?.[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

function InfoCard({ title, icon, children, extra }) {
    return (
        <Card
            className="profile-page__card"
            title={<Space>{icon}{title}</Space>}
            extra={extra}
            bordered
        >
            {children}
        </Card>
    );
}

function MetaItem({ label, value }) {
    return (
        <div className="profile-page__meta-item">
            <Text type="secondary">{label}</Text>
            <strong>{value || '-'}</strong>
        </div>
    );
}

export default function Edit({
    mustVerifyEmail,
    status,
    profileUser,
    employeeProfile,
    accountInfo = {},
}) {
    const page = usePage();
    const user = profileUser || page.props.auth.user;
    const screens = useBreakpoint();
    const [activeTab, setActiveTab] = useState('profile');
    const { token } = theme.useToken();

    const roleLabel = useMemo(() => {
        const roles = accountInfo?.roles || [];
        if (roles.length) return roles.join(', ');
        return user?.role?.name || employeeProfile?.designation?.name || 'Team member';
    }, [accountInfo, user, employeeProfile]);

    const branchLabel =
        employeeProfile?.branch?.name ||
        user?.branch?.name ||
        page.props.branchContext?.branches?.find((branch) => branch.id === page.props.auth?.currentBranchId)?.name ||
        null;

    const address = [user?.street, user?.city, user?.state, user?.zip_code, user?.country]
        .filter(Boolean)
        .join(', ');

    const tabItems = [
        {
            key: 'profile',
            label: 'Profile',
            children: (
                <InfoCard title="Personal information" icon={<EditOutlined />}>
                    <UpdateProfileInformationForm
                        user={user}
                        employeeProfile={employeeProfile}
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </InfoCard>
            ),
        },
        {
            key: 'security',
            label: 'Security',
            children: (
                <InfoCard title="Account security" icon={<LockOutlined />}>
                    <UpdatePasswordForm />
                </InfoCard>
            ),
        },
        {
            key: 'account',
            label: 'Account info',
            children: (
                <InfoCard title="Account information" icon={<SafetyCertificateOutlined />}>
                    <Descriptions
                        bordered
                        size="small"
                        column={{ xs: 1, md: 2 }}
                    >
                        <Descriptions.Item label="User ID">
                            <code>{user?.id || '-'}</code>
                        </Descriptions.Item>
                        <Descriptions.Item label="Employee code">
                            <code>{employeeProfile?.employee_id || user?.employee_id || '-'}</code>
                        </Descriptions.Item>
                        <Descriptions.Item label="Roles">
                            {roleLabel ? <Tag>{roleLabel}</Tag> : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Permissions">
                            {accountInfo?.permissions_count ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Branch">{branchLabel || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Department">
                            {employeeProfile?.department?.name || user?.department?.name || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Created">{fmtDate(user?.created_at)}</Descriptions.Item>
                        <Descriptions.Item label="Last updated">{fmtDate(user?.updated_at)}</Descriptions.Item>
                        <Descriptions.Item label="Last login">Not tracked</Descriptions.Item>
                        <Descriptions.Item label="Email verification">
                            {user?.email_verified_at ? (
                                <Tag color="green">Verified</Tag>
                            ) : (
                                <Tag color="gold">Pending</Tag>
                            )}
                        </Descriptions.Item>
                    </Descriptions>
                </InfoCard>
            ),
        },
        {
            key: 'employee',
            label: 'Employee profile',
            children: (
                <InfoCard title="Employee profile" icon={<TeamOutlined />}>
                    {employeeProfile ? (
                        <Descriptions
                            bordered
                            size="small"
                            column={{ xs: 1, md: 2 }}
                        >
                            <Descriptions.Item label="Employee code">
                                <code>{employeeProfile.employee_id || '-'}</code>
                            </Descriptions.Item>
                            <Descriptions.Item label="Employment status">
                                {employeeProfile.employment_status?.name || employeeProfile.employmentStatus?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Department">
                                {employeeProfile.department?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Designation">
                                {employeeProfile.designation?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Phone">
                                {user?.phone || employeeProfile.emergency_contact_phone || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Joining date">
                                {fmtDate(employeeProfile.join_date)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Branch">
                                {employeeProfile.branch?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Reporting manager">Not assigned</Descriptions.Item>
                            <Descriptions.Item label="Address" span={2}>
                                {employeeProfile.address || address || '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <Empty description="No employee profile linked to this account." />
                    )}
                </InfoCard>
            ),
        },
        {
            key: 'danger',
            label: 'Danger Zone',
            children: (
                <InfoCard title="Danger Zone" icon={<DeleteOutlined />}>
                    <DeleteUserForm />
                </InfoCard>
            ),
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="profile-page__header">
                    <div>
                        <Text type="secondary">Account settings</Text>
                        <Title level={4} style={{ margin: 0 }}>
                            Profile
                        </Title>
                    </div>
                </div>
            }
        >
            <Head title="Profile" />

            <style>{`
                .profile-page {
                    min-height: calc(100vh - 120px);
                    background: ${token.colorBgLayout};
                    padding: 18px;
                }

                .profile-page__shell {
                    max-width: 1280px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .profile-page__summary.ant-card,
                .profile-page__identity.ant-card,
                .profile-page__card.ant-card {
                    border-color: ${token.colorBorderSecondary};
                    border-radius: ${token.borderRadiusLG}px;
                    box-shadow: none;
                }

                .profile-page__summary .ant-card-body {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 18px;
                    flex-wrap: wrap;
                }

                .profile-page__person {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    min-width: 0;
                }

                .profile-page__avatar {
                    background: ${token.colorPrimaryBg};
                    color: ${token.colorPrimary};
                    border: 1px solid ${token.colorPrimaryBorder};
                    font-weight: 700;
                }

                .profile-page__title {
                    min-width: 0;
                }

                .profile-page__title h3 {
                    max-width: 520px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .profile-page__chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 8px;
                }

                .profile-page__quick-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: flex-end;
                }

                .profile-page__body {
                    display: grid;
                    grid-template-columns: 300px minmax(0, 1fr);
                    gap: 16px;
                    align-items: start;
                }

                .profile-page__identity .ant-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .profile-page__identity-head {
                    text-align: center;
                    padding-bottom: 16px;
                    border-bottom: 1px solid ${token.colorBorderSecondary};
                }

                .profile-page__meta-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .profile-page__meta-item {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    min-width: 0;
                }

                .profile-page__meta-item strong {
                    color: ${token.colorText};
                    font-weight: 600;
                    overflow-wrap: anywhere;
                }

                .profile-page__main {
                    min-width: 0;
                }

                .profile-page__tabs .ant-tabs-nav {
                    margin-bottom: 12px;
                }

                .profile-form__avatar-row {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid ${token.colorBorderSecondary};
                }

                .profile-form__avatar-copy {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .profile-security__strength {
                    margin-top: -12px;
                    margin-bottom: 18px;
                }

                .profile-danger__body {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    margin-top: 16px;
                    flex-wrap: wrap;
                }

                @media (max-width: 991px) {
                    .profile-page__body {
                        grid-template-columns: 1fr;
                    }

                    .profile-page__identity {
                        order: 2;
                    }

                    .profile-page__main {
                        order: 1;
                    }
                }

                @media (max-width: 575px) {
                    .profile-page {
                        padding: 12px;
                    }

                    .profile-page__summary .ant-card-body,
                    .profile-page__person,
                    .profile-form__avatar-row {
                        align-items: flex-start;
                    }

                    .profile-page__person,
                    .profile-form__avatar-row {
                        flex-direction: column;
                    }

                    .profile-page__quick-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }

                    .profile-page__quick-actions .ant-btn {
                        flex: 1 1 auto;
                    }

                    .profile-page__title h3 {
                        max-width: 100%;
                        white-space: normal;
                    }
                }
            `}</style>

            <div className="profile-page">
                <div className="profile-page__shell">
                    <Card className="profile-page__summary" bordered>
                        <div className="profile-page__person">
                            <Avatar
                                size={screens.xs ? 64 : 76}
                                src={user?.image_url}
                                icon={!user?.image_url ? <UserOutlined /> : null}
                                className="profile-page__avatar"
                            >
                                {!user?.image_url ? initialsFor(user) : null}
                            </Avatar>
                            <div className="profile-page__title">
                                <Title level={3} style={{ margin: 0 }}>
                                    {user?.display_name || user?.name || 'User'}
                                </Title>
                                <Text type="secondary">
                                    <MailOutlined /> {user?.email || 'No email available'}
                                </Text>
                                <div className="profile-page__chips">
                                    <Tag color={user?.active === false ? 'red' : 'green'}>
                                        {user?.active === false ? 'Inactive' : 'Active'}
                                    </Tag>
                                    <Tag>{roleLabel}</Tag>
                                    {branchLabel && <Tag>{branchLabel}</Tag>}
                                    <Tag icon={<CalendarOutlined />}>
                                        Updated {fmtDate(user?.updated_at)}
                                    </Tag>
                                </div>
                            </div>
                        </div>

                        <div className="profile-page__quick-actions">
                            <Button icon={<EditOutlined />} onClick={() => setActiveTab('profile')}>
                                Edit Profile
                            </Button>
                            <Button icon={<LockOutlined />} onClick={() => setActiveTab('security')}>
                                Change Password
                            </Button>
                            <Button icon={<SafetyCertificateOutlined />} onClick={() => setActiveTab('account')}>
                                Security
                            </Button>
                            <Button danger icon={<LogoutOutlined />} onClick={() => router.post(route('logout'))}>
                                Logout
                            </Button>
                        </div>
                    </Card>

                    {mustVerifyEmail && user?.email_verified_at === null && (
                        <Alert
                            showIcon
                            type="warning"
                            message="Your email address is unverified."
                            description="Some account actions may remain limited until you verify your email address."
                        />
                    )}

                    <div className="profile-page__body">
                        <Card className="profile-page__identity" bordered>
                            <div className="profile-page__identity-head">
                                <Avatar
                                    size={96}
                                    src={user?.image_url}
                                    icon={!user?.image_url ? <UserOutlined /> : null}
                                    className="profile-page__avatar"
                                >
                                    {!user?.image_url ? initialsFor(user) : null}
                                </Avatar>
                                <Title level={4} style={{ margin: '12px 0 0' }}>
                                    {user?.display_name || user?.name || 'User'}
                                </Title>
                                <Text type="secondary">{roleLabel}</Text>
                            </div>

                            <div className="profile-page__meta-list">
                                <MetaItem label="Email" value={user?.email} />
                                <MetaItem label="Phone" value={user?.phone} />
                                <MetaItem label="Branch" value={branchLabel} />
                                <MetaItem
                                    label="Department"
                                    value={employeeProfile?.department?.name || user?.department?.name}
                                />
                                <MetaItem
                                    label="Employee code"
                                    value={employeeProfile?.employee_id || user?.employee_id}
                                />
                                <MetaItem label="Address" value={address} />
                            </div>
                        </Card>

                        <main className="profile-page__main">
                            <Tabs
                                className="profile-page__tabs"
                                activeKey={activeTab}
                                onChange={setActiveTab}
                                items={tabItems}
                            />
                        </main>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
