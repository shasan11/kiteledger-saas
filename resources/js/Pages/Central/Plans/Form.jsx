import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import { humanize } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';
import { useForm } from '@inertiajs/react';
import { Alert, Button, Checkbox, Col, Form, Input, InputNumber, Row, Select, Space, Switch, Typography } from 'antd';

const limits = ['max_users', 'max_branches', 'max_products', 'max_customers', 'max_invoices_per_month', 'max_storage_mb', 'max_ai_requests_per_month', 'max_api_requests_per_month', 'max_custom_domains', 'max_warehouses'];
const capabilities = ['allow_pos', 'allow_inventory', 'allow_hrm', 'allow_crm', 'allow_warehouse', 'allow_ai', 'allow_custom_domain', 'allow_multi_branch', 'allow_api_access'];

function FeatureValueInput({ feature, item, onChange }) {
    if (feature.type === 'integer' || feature.type === 'decimal') {
        return <InputNumber value={item.value} onChange={onChange} precision={feature.type === 'integer' ? 0 : undefined} placeholder="Plan value"/>;
    }
    if (feature.type === 'json') {
        const value = typeof item.value === 'string' ? item.value : JSON.stringify(item.value ?? {}, null, 2);
        return <Input.TextArea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="central-code" placeholder="Valid JSON" style={{ minWidth: 260 }}/>;
    }

    return <Input value={item.value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder="Plan value" style={{ width: 220 }}/>;
}

export default function PlanForm({ plan, featureCatalog = [], featureAssignments = {} }) {
    const editing = Boolean(plan);
    const assignments = featureCatalog.map((feature) => {
        const assigned = featureAssignments[feature.id] || {};
        return { feature_id: feature.id, enabled: assigned.enabled ?? true, value: assigned.value ?? assigned.limit_value ?? feature.default_value, inherit_default: assigned.inherit_default ?? true, display_on_pricing: assigned.display_on_pricing ?? feature.is_visible, pricing_label: assigned.pricing_label || feature.name };
    });
    const initial = { name: '', slug: '', description: '', price_monthly: 0, price_yearly: 0, currency: 'USD', trial_days: 14, sort_order: 0, is_active: true, is_featured: false, ...Object.fromEntries(limits.map((key) => [key, null])), ...Object.fromEntries(capabilities.map((key) => [key, false])), ...plan, feature_registry: assignments };
    const form = useForm(initial);
    const submit = () => editing ? form.put(route('central.plans.update', plan.id)) : form.post(route('central.plans.store'));
    const field = (name, label, node) => <Form.Item label={label} required={['name', 'slug', 'price_monthly', 'price_yearly', 'currency', 'trial_days'].includes(name)} validateStatus={form.errors[name] ? 'error' : ''} help={form.errors[name]}>{node || <Input value={form.data[name]} onChange={(event) => form.setData(name, event.target.value)}/>}</Form.Item>;
    const updateFeature = (index, key, value) => form.setData('feature_registry', form.data.feature_registry.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));

    return <CentralLayout title={editing ? 'Edit plan' : 'Create plan'} breadcrumbs={[{ title: 'Plans & pricing' }]}>
        <PageHeader eyebrow="Revenue configuration" title={editing ? `Edit ${plan.name}` : 'Create a plan'} description="Set pricing, workspace limits, and product capabilities. Changes apply to tenants assigned to this plan."/>
        <Form layout="vertical" onFinish={submit}><Row gutter={[16, 16]}><Col xs={24} xl={15}>
            <SectionCard title="Plan identity" description="Customer-facing plan name and description."><Row gutter={16}><Col xs={24} md={12}>{field('name', 'Plan name')}</Col><Col xs={24} md={12}>{field('slug', 'Slug')}</Col><Col xs={24}>{field('description', 'Description', <Input.TextArea rows={4} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)}/>)}</Col></Row></SectionCard>
            <SectionCard title="Usage limits" description="Leave any value blank for unlimited usage." style={{ marginTop: 16 }}><Row gutter={16}>{limits.map((key) => <Col xs={24} sm={12} md={8} key={key}>{field(key, humanize(key.replace('max_', '')), <InputNumber min={0} placeholder="Unlimited" style={{ width: '100%' }} value={form.data[key]} onChange={(value) => form.setData(key, value)}/>)}</Col>)}</Row></SectionCard>
            <SectionCard title="Legacy product capabilities" description="Compatibility flags for existing tenant modules." style={{ marginTop: 16 }}><Row gutter={[12, 16]}>{capabilities.map((key) => <Col xs={24} sm={12} md={8} key={key}><Checkbox checked={Boolean(form.data[key])} onChange={(event) => form.setData(key, event.target.checked)}>{humanize(key.replace('allow_', ''))}</Checkbox></Col>)}</Row></SectionCard>
            <SectionCard title="Feature registry" description="Typed plan values used by the canonical resolver, pricing page, and tenant overrides." style={{ marginTop: 16 }}>
                {!featureCatalog.length && <Alert type="info" showIcon message="Create features in the Product catalog to configure typed plan values."/>}
                {featureCatalog.map((feature, index) => {
                    const item = form.data.feature_registry[index];
                    return <div className="central-attention" key={feature.id} style={{ alignItems: 'flex-start' }}>
                        <span className="central-attention__copy" style={{ minWidth: 180 }}><Typography.Text strong>{feature.name}</Typography.Text><Typography.Text type="secondary">{feature.category} · {feature.type}{feature.unit_label ? ` · ${feature.unit_label}` : ''}</Typography.Text></span>
                        <Space wrap align="start">
                            <label><Switch checked={item.inherit_default} onChange={(value) => updateFeature(index, 'inherit_default', value)}/> Inherit default</label>
                            {!item.inherit_default && feature.type === 'boolean' ? <label><Switch checked={item.enabled} onChange={(value) => updateFeature(index, 'enabled', value)}/> Enabled</label> : !item.inherit_default && <FeatureValueInput feature={feature} item={item} onChange={(value) => updateFeature(index, 'value', value)}/>}
                            <label><Switch checked={item.display_on_pricing} onChange={(value) => updateFeature(index, 'display_on_pricing', value)}/> Show on pricing</label>
                            <Input value={item.pricing_label} onChange={(event) => updateFeature(index, 'pricing_label', event.target.value)} placeholder="Readable pricing label" style={{ width: 220 }}/>
                        </Space>
                    </div>;
                })}
            </SectionCard>
        </Col><Col xs={24} xl={9}>
            <SectionCard title="Pricing & availability" description="Billing cadence, trial window, and catalog visibility.">{field('currency', 'Currency', <Select value={form.data.currency} onChange={(value) => form.setData('currency', value)} options={['USD', 'EUR', 'GBP', 'NPR', 'INR', 'AED'].map((value) => ({ value, label: value }))}/>)}<Row gutter={12}><Col xs={12}>{field('price_monthly', 'Monthly price', <InputNumber min={0} precision={2} style={{ width: '100%' }} value={form.data.price_monthly} onChange={(value) => form.setData('price_monthly', value)}/>)}</Col><Col xs={12}>{field('price_yearly', 'Yearly price', <InputNumber min={0} precision={2} style={{ width: '100%' }} value={form.data.price_yearly} onChange={(value) => form.setData('price_yearly', value)}/>)}</Col><Col xs={12}>{field('trial_days', 'Trial days', <InputNumber min={0} max={365} style={{ width: '100%' }} value={form.data.trial_days} onChange={(value) => form.setData('trial_days', value)}/>)}</Col><Col xs={12}>{field('sort_order', 'Sort order', <InputNumber min={0} style={{ width: '100%' }} value={form.data.sort_order} onChange={(value) => form.setData('sort_order', value)}/>)}</Col></Row><Space direction="vertical"><Checkbox checked={Boolean(form.data.is_active)} onChange={(event) => form.setData('is_active', event.target.checked)}>Active and assignable</Checkbox><Checkbox checked={Boolean(form.data.is_featured)} onChange={(event) => form.setData('is_featured', event.target.checked)}>Feature as recommended</Checkbox></Space></SectionCard>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button onClick={() => window.history.back()}>Cancel</Button><Button type="primary" htmlType="submit" loading={form.processing}>Save plan</Button></div>
        </Col></Row></Form>
    </CentralLayout>;
}
