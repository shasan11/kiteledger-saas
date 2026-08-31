import { Head, useForm } from '@inertiajs/react';
import { Alert, Button, Form, Input, Tag, Typography } from 'antd';
import GuestLayout from '@/Layouts/GuestLayout';
import { formatDate } from '@/Components/Central/formatters';

export default function AcceptInvitation({ token, email, tenant, role, expiresAt, accountExists }) {
    const form = useForm({ token, first_name: '', last_name: '', password: '', password_confirmation: '' });

    return (
        <GuestLayout>
            <Head title={`Join ${tenant}`} />
            <Typography.Title level={3}>Join {tenant}</Typography.Title>
            <Typography.Paragraph type="secondary">
                {email} · <Tag>{role}</Tag> · expires {formatDate(expiresAt, true)}
            </Typography.Paragraph>
            {accountExists && <Alert type="info" showIcon message="You already have a KiteLedger account. Accepting adds this company to it." style={{ marginBottom: 16 }} />}
            <Form layout="vertical" onFinish={() => form.post(route('central.account.invitations.accept'))}>
                {!accountExists && (
                    <>
                        <Form.Item label="First name" validateStatus={form.errors.first_name ? 'error' : ''} help={form.errors.first_name}>
                            <Input value={form.data.first_name} onChange={(event) => form.setData('first_name', event.target.value)} />
                        </Form.Item>
                        <Form.Item label="Last name" validateStatus={form.errors.last_name ? 'error' : ''} help={form.errors.last_name}>
                            <Input value={form.data.last_name} onChange={(event) => form.setData('last_name', event.target.value)} />
                        </Form.Item>
                        <Form.Item label="Password" validateStatus={form.errors.password ? 'error' : ''} help={form.errors.password || 'Use at least 12 characters.'}>
                            <Input.Password autoComplete="new-password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} />
                        </Form.Item>
                        <Form.Item label="Confirm password">
                            <Input.Password autoComplete="new-password" value={form.data.password_confirmation} onChange={(event) => form.setData('password_confirmation', event.target.value)} />
                        </Form.Item>
                    </>
                )}
                <Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Accept invitation</Button>
            </Form>
        </GuestLayout>
    );
}
