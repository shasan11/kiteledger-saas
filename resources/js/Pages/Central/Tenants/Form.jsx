import CentralLayout from '@/Layouts/CentralLayout';
import { useForm } from '@inertiajs/react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select } from 'antd';
const currencies = ['USD', 'EUR', 'GBP', 'NPR', 'INR', 'AED'];

export default function TenantForm({ tenant, plans = [], templates = [] }) {
    const editing = !!tenant;
    const form = useForm({
        company_name: tenant?.company_name || '',
        legal_name: tenant?.legal_name || '',
        owner_name: tenant?.owner_name || '',
        owner_email: tenant?.owner_email || '',
        owner_phone: tenant?.owner_phone || '',
        country: tenant?.country || '',
        address: tenant?.address || '',
        timezone: tenant?.timezone || 'UTC',
        currency: tenant?.currency || 'USD',
        plan_id: tenant?.plan_id || null,
        default_template_id: tenant?.default_template_id || null,
        subdomain: '',
        owner_password: '',
        owner_password_confirmation: '',
        tenancy_db_host: tenant?.tenancy_db_host || '127.0.0.1',
        tenancy_db_port: tenant?.tenancy_db_port || 3306,
        tenancy_db_name: tenant?.tenancy_db_name || '',
        tenancy_db_username: tenant?.tenancy_db_username || '',
        tenancy_db_password: '',
    });

    const field = (name, label, node) => (
        <Form.Item label={label} validateStatus={form.errors[name] ? 'error' : ''} help={form.errors[name]}>
            {node || <Input value={form.data[name]} onChange={(event) => form.setData(name, event.target.value)} />}
        </Form.Item>
    );
    const submit = () => editing
        ? form.put(route('central.tenants.update', tenant.id))
        : form.post(route('central.tenants.store'));

    return (
        <CentralLayout title={editing ? 'Edit tenant' : 'Create tenant'}>
            <Card>
                <Form layout="vertical" onFinish={submit}>
                    <Row gutter={16}>
                        <Col md={12} xs={24}>
                            {field('company_name', 'Company name')}
                            {field('legal_name', 'Legal name')}
                            {field('owner_name', 'Owner name')}
                            {field('owner_email', 'Owner email', <Input type="email" disabled={editing} value={form.data.owner_email} onChange={(event) => form.setData('owner_email', event.target.value)} />)}
                        </Col>
                        <Col md={12} xs={24}>
                            {field('owner_phone', 'Owner phone')}
                            {field('country', 'Country code')}
                            {field('timezone', 'Timezone')}
                            {field('currency', 'Currency', <Select style={{ width: '100%' }} value={form.data.currency} onChange={(value) => form.setData('currency', value)} options={currencies.map((value) => ({ value, label: value }))} />)}
                        </Col>
                    </Row>
                    {field('address', 'Address', <Input.TextArea value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} />)}
                    <Row gutter={16}>
                        <Col md={12} xs={24}>{field('plan_id', 'Plan', <Select allowClear style={{ width: '100%' }} value={form.data.plan_id} onChange={(value) => form.setData('plan_id', value)} options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} />)}</Col>
                        <Col md={12} xs={24}>{field('default_template_id', 'Default template', <Select allowClear style={{ width: '100%' }} value={form.data.default_template_id} onChange={(value) => form.setData('default_template_id', value)} options={templates.map((template) => ({ value: template.id, label: template.name }))} />)}</Col>
                    </Row>
                    {!editing && (
                        <Row gutter={16}>
                            <Col md={8} xs={24}>{field('subdomain', 'Subdomain')}</Col>
                            <Col md={8} xs={24}>{field('owner_password', 'Owner password', <Input.Password value={form.data.owner_password} onChange={(event) => form.setData('owner_password', event.target.value)} />)}</Col>
                            <Col md={8} xs={24}>{field('owner_password_confirmation', 'Confirm password', <Input.Password value={form.data.owner_password_confirmation} onChange={(event) => form.setData('owner_password_confirmation', event.target.value)} />)}</Col>
                        </Row>
                    )}
                    <Card type="inner" title="Tenant database (create it in cPanel or your hosting panel first)" style={{ marginBottom: 16 }}>
                        <Row gutter={16}>
                            <Col md={12} xs={24}>{field('tenancy_db_host', 'Database host')}</Col>
                            <Col md={12} xs={24}>{field('tenancy_db_port', 'Database port', <InputNumber min={1} max={65535} style={{ width: '100%' }} value={form.data.tenancy_db_port} onChange={(value) => form.setData('tenancy_db_port', value)} />)}</Col>
                            <Col md={12} xs={24}>{field('tenancy_db_name', 'Database name')}</Col>
                            <Col md={12} xs={24}>{field('tenancy_db_username', 'Database username')}</Col>
                            <Col md={24} xs={24}>{field('tenancy_db_password', editing ? 'Database password (leave blank to keep existing)' : 'Database password', <Input.Password value={form.data.tenancy_db_password} onChange={(event) => form.setData('tenancy_db_password', event.target.value)} autoComplete="new-password" />)}</Col>
                        </Row>
                    </Card>
                    <Button type="primary" htmlType="submit" loading={form.processing}>{editing ? 'Save changes' : 'Verify database and provision tenant'}</Button>
                </Form>
            </Card>
        </CentralLayout>
    );
}
