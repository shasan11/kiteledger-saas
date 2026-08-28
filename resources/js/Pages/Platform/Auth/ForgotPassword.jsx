import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import GuestLayout from '@/Layouts/GuestLayout';

export default function PlatformForgotPassword() {
    const form = useForm({ email: '' });
    const flash = usePage().props?.flash;

    return (
        <GuestLayout>
            <Head title="Reset your password" />
            <Typography.Title level={3}>Forgot your password?</Typography.Title>
            <Typography.Paragraph type="secondary">We will email you a link to choose a new one.</Typography.Paragraph>
            {flash?.success && <Alert type="success" showIcon message={flash.success} style={{ marginBottom: 16 }} />}
            <Form layout="vertical" onFinish={() => form.post(route('central.account.password.email'))}>
                <Form.Item label="Email" validateStatus={form.errors.email ? 'error' : ''} help={form.errors.email}>
                    <Input type="email" autoFocus value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                </Form.Item>
                <Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Email reset link</Button>
                <div style={{ marginTop: 14, textAlign: 'center' }}><Link href={route('central.account.login')}>Back to sign in</Link></div>
            </Form>
        </GuestLayout>
    );
}
