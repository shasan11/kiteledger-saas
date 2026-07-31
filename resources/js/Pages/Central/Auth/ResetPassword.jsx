import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button, Form, Input, Typography } from 'antd';

export default function ResetPassword({ token, email }) {
    const form = useForm({ token, email, password: '', password_confirmation: '' });
    return <GuestLayout><Head title="Choose a new Super Admin password"/><Typography.Title level={3}>Choose a new password</Typography.Title><Form layout="vertical" onFinish={() => form.post(route('central.password.update'))}><Form.Item label="Email" validateStatus={form.errors.email ? 'error' : ''} help={form.errors.email}><Input type="email" value={form.data.email} onChange={event => form.setData('email', event.target.value)}/></Form.Item><Form.Item label="New password" validateStatus={form.errors.password ? 'error' : ''} help={form.errors.password}><Input.Password autoComplete="new-password" value={form.data.password} onChange={event => form.setData('password', event.target.value)}/></Form.Item><Form.Item label="Confirm password"><Input.Password autoComplete="new-password" value={form.data.password_confirmation} onChange={event => form.setData('password_confirmation', event.target.value)}/></Form.Item><Button block size="large" type="primary" htmlType="submit" loading={form.processing}>Reset password</Button></Form></GuestLayout>;
}
