import { Head, router, useForm } from '@inertiajs/react';
import { Button, Card, Form, Input, Typography } from 'antd';

export default function MfaChallenge() {
    const form = useForm({ code: '' });
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Head title="MFA verification"/><Card style={{ width: 380 }}><Typography.Title level={3}>Two-factor verification</Typography.Title><Form layout="vertical" onFinish={() => form.post(route('central.mfa.verify'))}><Form.Item label="Authenticator or recovery code" validateStatus={form.errors.code ? 'error' : ''} help={form.errors.code}><Input value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} autoFocus autoComplete="one-time-code"/></Form.Item><Button htmlType="submit" type="primary" loading={form.processing} block>Verify</Button></Form></Card></main>;
}
