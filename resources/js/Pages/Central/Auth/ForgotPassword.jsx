import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Form, Input, Typography } from 'antd';

export default function ForgotPassword() {
    const form = useForm({ email: '' });
    const flash = usePage().props?.flash;
    return <GuestLayout><Head title="Reset Super Admin password"/><Typography.Title level={3}>Reset password</Typography.Title><Typography.Paragraph type="secondary">Enter your administrator email and we will send a time-limited reset link.</Typography.Paragraph>{flash?.success && <Alert type="success" message={flash.success} style={{marginBottom:16}}/>}<Form layout="vertical" onFinish={() => form.post(route('central.password.email'))}><Form.Item label="Email" validateStatus={form.errors.email ? 'error' : ''} help={form.errors.email}><Input type="email" autoFocus value={form.data.email} onChange={event => form.setData('email', event.target.value)}/></Form.Item><Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Send reset link</Button></Form></GuestLayout>;
}
