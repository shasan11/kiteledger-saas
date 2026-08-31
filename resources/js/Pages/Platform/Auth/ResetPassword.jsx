import { Head, useForm } from '@inertiajs/react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import GuestLayout from '@/Layouts/GuestLayout';

export default function PlatformResetPassword({ token, email }) {
    const form = useForm({ token, email, password: '', password_confirmation: '' });

    return (
        <GuestLayout>
            <Head title="Choose a new password" />
            <Typography.Title level={3}>Choose a new password</Typography.Title>
            {form.errors.email && <Alert type="error" showIcon message={form.errors.email} style={{ marginBottom: 16 }} />}
            <Form layout="vertical" onFinish={() => form.post(route('central.account.password.update'))}>
                <Form.Item label="Email">
                    <Input type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                </Form.Item>
                <Form.Item label="New password" validateStatus={form.errors.password ? 'error' : ''} help={form.errors.password || 'Use at least 12 characters.'}>
                    <Input.Password autoComplete="new-password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} />
                </Form.Item>
                <Form.Item label="Confirm new password">
                    <Input.Password autoComplete="new-password" value={form.data.password_confirmation} onChange={(event) => form.setData('password_confirmation', event.target.value)} />
                </Form.Item>
                <Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Reset password</Button>
            </Form>
        </GuestLayout>
    );
}
