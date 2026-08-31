import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Checkbox, Divider, Form, Input, Typography } from 'antd';
import GuestLayout from '@/Layouts/GuestLayout';

/** Google's mark, inlined so the button renders without an external request. */
function GoogleMark() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
        </svg>
    );
}

export default function PlatformLogin({ googleEnabled = false }) {
    const form = useForm({ email: '', password: '', remember: false });
    const flash = usePage().props?.flash;

    return (
        <GuestLayout>
            <Head title="Sign in to KiteLedger" />
            <Typography.Title level={3}>Sign in</Typography.Title>
            <Typography.Paragraph type="secondary">Access every company you belong to from one account.</Typography.Paragraph>
            {flash?.success && <Alert type="success" showIcon message={flash.success} style={{ marginBottom: 16 }} />}
            {form.errors.email && <Alert type="error" showIcon message={form.errors.email} style={{ marginBottom: 16 }} />}
            {googleEnabled && (
                <>
                    {/* A full page load, not an Inertia visit: this leaves the app for Google. */}
                    <Button block size="large" href={route('central.account.google.redirect')} icon={<GoogleMark />}>
                        Continue with Google
                    </Button>
                    <Divider plain style={{ marginBlock: 20 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>or sign in with email</Typography.Text>
                    </Divider>
                </>
            )}
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
