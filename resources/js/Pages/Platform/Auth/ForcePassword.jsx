import { Head, useForm } from '@inertiajs/react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import GuestLayout from '@/Layouts/GuestLayout';

export default function PlatformForcePassword({ email }) {
    const form = useForm({ current_password: '', password: '', password_confirmation: '' });

    return (
        <GuestLayout>
            <Head title="Update your password" />
            <Typography.Title level={3}>Update your password</Typography.Title>
            <Alert type="warning" showIcon message="A KiteLedger administrator has asked you to set a new password before continuing." style={{ marginBottom: 16 }} />
            <Typography.Paragraph type="secondary">{email}</Typography.Paragraph>
            <Form layout="vertical" onFinish={() => form.post(route('central.account.password.force.update'))}>
                <Form.Item label="Current password" validateStatus={form.errors.current_password ? 'error' : ''} help={form.errors.current_password}>
                    <Input.Password autoComplete="current-password" value={form.data.current_password} onChange={(event) => form.setData('current_password', event.target.value)} />
                </Form.Item>
                <Form.Item label="New password" validateStatus={form.errors.password ? 'error' : ''} help={form.errors.password || 'Use at least 12 characters.'}>
                    <Input.Password autoComplete="new-password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} />
                </Form.Item>
                <Form.Item label="Confirm new password">
                    <Input.Password autoComplete="new-password" value={form.data.password_confirmation} onChange={(event) => form.setData('password_confirmation', event.target.value)} />
                </Form.Item>
                <Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Save password</Button>
            </Form>
        </GuestLayout>
    );
}
