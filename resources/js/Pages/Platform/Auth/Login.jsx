import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Checkbox, Form, Input, Typography } from 'antd';
import GuestLayout from '@/Layouts/GuestLayout';

export default function PlatformLogin() {
    const form = useForm({ email: '', password: '', remember: false });
    const flash = usePage().props?.flash;

    return (
        <GuestLayout>
            <Head title="Sign in to KiteLedger" />
            <Typography.Title level={3}>Sign in</Typography.Title>
            <Typography.Paragraph type="secondary">Access every company you belong to from one account.</Typography.Paragraph>
            {flash?.success && <Alert type="success" showIcon message={flash.success} style={{ marginBottom: 16 }} />}
            {form.errors.email && <Alert type="error" showIcon message={form.errors.email} style={{ marginBottom: 16 }} />}
            <Form layout="vertical" onFinish={() => form.post(route('central.account.login.store'))}>
                <Form.Item label="Email" validateStatus={form.errors.email ? 'error' : ''}>
                    <Input type="email" autoFocus autoComplete="username" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                </Form.Item>
                <Form.Item label="Password" validateStatus={form.errors.password ? 'error' : ''} help={form.errors.password}>
                    <Input.Password autoComplete="current-password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} />
                </Form.Item>
                <Form.Item>
                    <Checkbox checked={form.data.remember} onChange={(event) => form.setData('remember', event.target.checked)}>Remember me</Checkbox>
                </Form.Item>
                <Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Sign in</Button>
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                    <Link href={route('central.account.password.request')}>Forgot your password?</Link>
                </div>
            </Form>
        </GuestLayout>
    );
}
