import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button, Form, Input, Typography } from 'antd';

export default function MfaChallenge() {
    const form = useForm({ code: '' });
    return <GuestLayout><Head title="Verify Super Admin sign in"/><Typography.Title level={3}>Verify your sign in</Typography.Title><Typography.Paragraph type="secondary">Enter the six-digit code from your authenticator app or one recovery code.</Typography.Paragraph><Form layout="vertical" onFinish={() => form.post(route('central.mfa.verify'))}><Form.Item label="Authentication code" validateStatus={form.errors.code ? 'error' : ''} help={form.errors.code}><Input autoFocus autoComplete="one-time-code" value={form.data.code} onChange={event => form.setData('code', event.target.value)}/></Form.Item><Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Verify</Button></Form></GuestLayout>;
}
