import { useForm } from '@inertiajs/react';
import { Avatar, Button, Col, Form, Input, Row, Space, Typography } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import { initials } from '@/Components/Central/formatters';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformProfile({ profile, account }) {
    const form = useForm({
        first_name: account.first_name || '', last_name: account.last_name || '', phone: account.phone || '', avatar: account.avatar || '',
        job_title: profile?.job_title || '', company: profile?.company || '', phone_secondary: profile?.phone_secondary || '',
        address_line_1: profile?.address_line_1 || '', address_line_2: profile?.address_line_2 || '',
        city: profile?.city || '', state: profile?.state || '', postal_code: profile?.postal_code || '', country: profile?.country || '',
        timezone: profile?.timezone || account.timezone || '', preferred_language: profile?.preferred_language || '',
        preferred_currency: profile?.preferred_currency || '', bio: profile?.bio || '',
    });

    const field = (name, label, extra = {}) => (
        <Form.Item label={label} validateStatus={form.errors[name] ? 'error' : ''} help={form.errors[name]}>
            <Input value={form.data[name]} onChange={(event) => form.setData(name, event.target.value)} {...extra} />
        </Form.Item>
    );

    return (
        <PlatformLayout title="Profile">
            <PageHeader eyebrow="Your account" title="Profile" description="These details are shared across every company you belong to." />
            <SectionCard>
                <Space align="center" style={{ marginBottom: 16 }}>
                    <Avatar size={56} src={form.data.avatar || undefined}>{initials(`${form.data.first_name} ${form.data.last_name}`)}</Avatar>
                    <Typography.Text type="secondary">{account.email}</Typography.Text>
                </Space>
                <Form layout="vertical" onFinish={() => form.put(route('central.account.profile.update'), { preserveScroll: true })}>
                    <Row gutter={12}>
                        <Col xs={24} md={8}>{field('first_name', 'First name')}</Col>
                        <Col xs={24} md={8}>{field('last_name', 'Last name')}</Col>
                        <Col xs={24} md={8}>{field('phone', 'Phone')}</Col>
                        <Col xs={24} md={8}>{field('avatar', 'Avatar URL')}</Col>
                        <Col xs={24} md={8}>{field('job_title', 'Job title')}</Col>
                        <Col xs={24} md={8}>{field('company', 'Company')}</Col>
                        <Col xs={24} md={16}>{field('address_line_1', 'Address')}</Col>
                        <Col xs={24} md={8}>{field('address_line_2', 'Address line 2')}</Col>
                        <Col xs={24} md={6}>{field('city', 'City')}</Col>
                        <Col xs={24} md={6}>{field('state', 'State')}</Col>
                        <Col xs={24} md={6}>{field('postal_code', 'Postal code')}</Col>
                        <Col xs={24} md={6}>{field('country', 'Country (ISO-2)', { maxLength: 2 })}</Col>
                        <Col xs={24} md={8}>{field('timezone', 'Timezone')}</Col>
                        <Col xs={24} md={8}>{field('preferred_language', 'Preferred language')}</Col>
                        <Col xs={24} md={8}>{field('preferred_currency', 'Preferred currency', { maxLength: 3 })}</Col>
                        <Col xs={24}>
                            <Form.Item label="Bio" validateStatus={form.errors.bio ? 'error' : ''} help={form.errors.bio}>
                                <Input.TextArea rows={3} value={form.data.bio} onChange={(event) => form.setData('bio', event.target.value)} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Button type="primary" htmlType="submit" loading={form.processing}>Save profile</Button>
                </Form>
            </SectionCard>
        </PlatformLayout>
    );
}
