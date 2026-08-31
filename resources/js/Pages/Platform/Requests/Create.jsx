import { ArrowLeftOutlined } from '@ant-design/icons';
import { router, useForm } from '@inertiajs/react';
import { Button, Col, Form, Input, Row } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import { PortalSection } from '@/Components/Platform/PortalListCard';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function CreateOrganizationRequest({ defaults = {} }) {
    const form = useForm({ company_name: '', legal_name: '', contact_email: defaults.contact_email || '', contact_phone: defaults.contact_phone || '', country: defaults.country || '', notes: '' });
    const field = (name, label, input, rules = []) => <Form.Item label={label} required={rules.includes('required')} validateStatus={form.errors[name] ? 'error' : ''} help={form.errors[name]}>{input}</Form.Item>;
    return <PlatformLayout title="Add new organization">
        <PageHeader eyebrow="New organization" title="Tell us about your organization" description="Submit the details below and the KiteLedger team will review your workspace request." actions={<Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('central.account.requests.index'))}>Back to requests</Button>} />
        <PortalSection className="portal-request-form">
            <Form layout="vertical" onFinish={() => form.post(route('central.account.requests.store'))}>
                <Row gutter={16}>
                    <Col xs={24} md={12}>{field('company_name', 'Organization name', <Input size="large" value={form.data.company_name} onChange={(e) => form.setData('company_name', e.target.value)} />, ['required'])}</Col>
                    <Col xs={24} md={12}>{field('legal_name', 'Legal name', <Input size="large" value={form.data.legal_name} onChange={(e) => form.setData('legal_name', e.target.value)} />)}</Col>
                    <Col xs={24} md={12}>{field('contact_email', 'Contact email', <Input size="large" type="email" value={form.data.contact_email} onChange={(e) => form.setData('contact_email', e.target.value)} />, ['required'])}</Col>
                    <Col xs={24} md={12}>{field('contact_phone', 'Contact phone', <Input size="large" value={form.data.contact_phone} onChange={(e) => form.setData('contact_phone', e.target.value)} />)}</Col>
                    <Col xs={24} md={8}>{field('country', 'Country code', <Input size="large" maxLength={2} value={form.data.country} onChange={(e) => form.setData('country', e.target.value.toUpperCase())} placeholder="US" />)}</Col>
                    <Col xs={24}>{field('notes', 'What do you need?', <Input.TextArea rows={5} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} placeholder="Tell us about your team, branches, and the workflow you want to manage." />)}</Col>
                </Row>
                <Button type="primary" size="large" htmlType="submit" loading={form.processing}>Submit organization request</Button>
            </Form>
        </PortalSection>
    </PlatformLayout>;
}
