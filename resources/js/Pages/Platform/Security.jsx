import { useForm } from '@inertiajs/react';
import { Button, Col, Descriptions, Form, Input, Row } from 'antd';
import SectionCard from '@/Components/Central/SectionCard';
import { formatDate } from '@/Components/Central/formatters';
import { PortalDetailHeader } from '@/Components/Platform/PortalDetailHeader';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformSecurity({ security }) {
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const sessions = useForm({ current_password: '' });

    return (
        <PlatformLayout title="Security">
            <PortalDetailHeader
                avatar={security.email?.slice(0, 2).toUpperCase()}
                eyebrow="Your account"
                title="Security"
                description="Password and active session controls for your KiteLedger account."
                backHref={route('central.account.tenants.index')}
                tabs={[
                    { label: 'Profile details', href: route('central.account.profile.edit') },
                    { label: 'Security', href: route('central.account.security'), active: true },
                ]}
            />
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <SectionCard title="Account">
                        <Descriptions column={1} size="small" bordered items={[
                            { key: 'email', label: 'Email', children: security.email },
                            { key: 'verified', label: 'Email verified', children: security.email_verified_at ? formatDate(security.email_verified_at, true) : 'Not verified' },
                            { key: 'login', label: 'Last sign in', children: formatDate(security.last_login_at, true) },
                            { key: 'ip', label: 'Last sign-in IP', children: security.last_login_ip || '-' },
                            { key: 'changed', label: 'Password changed', children: formatDate(security.password_changed_at, true) },
                        ]} />
                    </SectionCard>
                </Col>
                <Col xs={24} lg={12}>
                    <SectionCard title="Change password">
                        <Form layout="vertical" onFinish={() => password.put(route('central.account.security.password'), { preserveScroll: true, onSuccess: () => password.reset() })}>
                            <Form.Item label="Current password" validateStatus={password.errors.current_password ? 'error' : ''} help={password.errors.current_password}>
                                <Input.Password autoComplete="current-password" value={password.data.current_password} onChange={(event) => password.setData('current_password', event.target.value)} />
                            </Form.Item>
                            <Form.Item label="New password" validateStatus={password.errors.password ? 'error' : ''} help={password.errors.password || 'Use at least 12 characters.'}>
                                <Input.Password autoComplete="new-password" value={password.data.password} onChange={(event) => password.setData('password', event.target.value)} />
                            </Form.Item>
                            <Form.Item label="Confirm new password">
                                <Input.Password autoComplete="new-password" value={password.data.password_confirmation} onChange={(event) => password.setData('password_confirmation', event.target.value)} />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" loading={password.processing}>Update password</Button>
                        </Form>
                    </SectionCard>

                    <SectionCard title="Other sessions" description="Sign out every other browser signed in to this account." style={{ marginTop: 16 }}>
                        <Form layout="vertical" onFinish={() => sessions.post(route('central.account.security.sign-out-others'), { preserveScroll: true, onSuccess: () => sessions.reset() })}>
                            <Form.Item label="Confirm with your password" validateStatus={sessions.errors.current_password ? 'error' : ''} help={sessions.errors.current_password}>
                                <Input.Password autoComplete="current-password" value={sessions.data.current_password} onChange={(event) => sessions.setData('current_password', event.target.value)} />
                            </Form.Item>
                            <Button danger htmlType="submit" loading={sessions.processing}>Sign out other sessions</Button>
                        </Form>
                    </SectionCard>
                </Col>
            </Row>
        </PlatformLayout>
    );
}
