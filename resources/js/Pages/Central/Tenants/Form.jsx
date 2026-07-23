import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import { useForm } from '@inertiajs/react';
import { Alert, Button, Col, Form, Input, InputNumber, Row, Select, Space } from 'antd';

const currencies = ['USD','EUR','GBP','NPR','INR','AED'];

export default function TenantForm({ tenant, plans = [], templates = [] }) {
    const editing = Boolean(tenant);
    const form = useForm({
        company_name:tenant?.company_name || '',legal_name:tenant?.legal_name || '',owner_name:tenant?.owner_name || '',owner_email:tenant?.owner_email || '',owner_phone:tenant?.owner_phone || '',country:tenant?.country || '',address:tenant?.address || '',timezone:tenant?.timezone || 'UTC',currency:tenant?.currency || 'USD',plan_id:tenant?.plan_id || null,default_template_id:tenant?.default_template_id || null,subdomain:'',owner_password:'',owner_password_confirmation:'',tenancy_db_host:tenant?.tenancy_db_host || '127.0.0.1',tenancy_db_port:tenant?.tenancy_db_port || 3306,tenancy_db_name:tenant?.tenancy_db_name || tenant?.database_name || '',tenancy_db_username:tenant?.tenancy_db_username || '',tenancy_db_password:'',
    });
    const field = (name,label,node,required=false) => <Form.Item label={label} required={required} validateStatus={form.errors[name]?'error':''} help={form.errors[name]}>{node || <Input value={form.data[name]} onChange={(event)=>form.setData(name,event.target.value)}/>}</Form.Item>;
    const submit = () => editing ? form.put(route('central.tenants.update',tenant.id)) : form.post(route('central.tenants.store'));

    return <CentralLayout title={editing?'Edit tenant':'Create tenant'} breadcrumbs={[{title:'Tenants'}]}>
        <PageHeader eyebrow="Tenant onboarding" title={editing?`Edit ${tenant.company_name}`:'Create a tenant'} description={editing?'Update workspace ownership, plan, and its manually managed database connection.':'Create the customer workspace, owner account, subscription defaults, and database connection in one guided form.'}/>
        <Form layout="vertical" onFinish={submit}>
            <Row gutter={[16,16]}>
                <Col xs={24} xl={15}>
                    <SectionCard title="Company and owner" description="The legal workspace identity and primary account holder.">
                        <Row gutter={16}><Col xs={24} md={12}>{field('company_name','Company name',null,true)}</Col><Col xs={24} md={12}>{field('legal_name','Legal name')}</Col><Col xs={24} md={12}>{field('owner_name','Owner name',null,true)}</Col><Col xs={24} md={12}>{field('owner_email','Owner email',<Input type="email" disabled={editing} value={form.data.owner_email} onChange={(event)=>form.setData('owner_email',event.target.value)}/>,true)}</Col><Col xs={24} md={12}>{field('owner_phone','Owner phone')}</Col><Col xs={24} md={12}>{field('country','Country code')}</Col><Col xs={24}>{field('address','Address',<Input.TextArea rows={3} value={form.data.address} onChange={(event)=>form.setData('address',event.target.value)}/>)}</Col></Row>
                    </SectionCard>
                    <SectionCard title="Workspace defaults" description="Regional settings and the initial commercial configuration." style={{marginTop:16}}>
                        <Row gutter={16}><Col xs={24} md={12}>{field('timezone','Timezone',null,true)}</Col><Col xs={24} md={12}>{field('currency','Currency',<Select style={{width:'100%'}} value={form.data.currency} onChange={(value)=>form.setData('currency',value)} options={currencies.map((value)=>({value,label:value}))}/>,true)}</Col><Col xs={24} md={12}>{field('plan_id','Plan',<Select allowClear style={{width:'100%'}} value={form.data.plan_id} onChange={(value)=>form.setData('plan_id',value)} options={plans.map((plan)=>({value:plan.id,label:plan.name}))}/>)}</Col><Col xs={24} md={12}>{field('default_template_id','Default data template',<Select allowClear style={{width:'100%'}} value={form.data.default_template_id} onChange={(value)=>form.setData('default_template_id',value)} options={templates.map((template)=>({value:template.id,label:template.name}))}/>)}</Col></Row>
                    </SectionCard>
                    {!editing && <SectionCard title="Workspace access" description="The subdomain and first owner credentials." style={{marginTop:16}}><Row gutter={16}><Col xs={24}>{field('subdomain','Subdomain',<Input addonAfter={`.${window.location.hostname}`} value={form.data.subdomain} onChange={(event)=>form.setData('subdomain',event.target.value)}/>,true)}</Col><Col xs={24} md={12}>{field('owner_password','Owner password',<Input.Password autoComplete="new-password" value={form.data.owner_password} onChange={(event)=>form.setData('owner_password',event.target.value)}/>,true)}</Col><Col xs={24} md={12}>{field('owner_password_confirmation','Confirm password',<Input.Password autoComplete="new-password" value={form.data.owner_password_confirmation} onChange={(event)=>form.setData('owner_password_confirmation',event.target.value)}/>,true)}</Col></Row></SectionCard>}
                </Col>
                <Col xs={24} xl={9}>
                    <SectionCard title="Tenant database" description="Connect the empty database prepared for this customer.">
                        <Alert type="info" showIcon message="Create this database manually first" description="In cPanel or your hosting panel, create an empty database and database user, then grant that user full privileges. KiteLedger will verify the connection and run tenant migrations; the central installer never creates tenant databases." style={{marginBottom:18}}/>
                        <Row gutter={12}><Col xs={16}>{field('tenancy_db_host','Database host',null,true)}</Col><Col xs={8}>{field('tenancy_db_port','Port',<InputNumber min={1} max={65535} style={{width:'100%'}} value={form.data.tenancy_db_port} onChange={(value)=>form.setData('tenancy_db_port',value)}/>,true)}</Col><Col xs={24}>{field('tenancy_db_name','Database name',null,true)}</Col><Col xs={24}>{field('tenancy_db_username','Database username',null,true)}</Col><Col xs={24}>{field('tenancy_db_password',editing?'Database password (leave blank to keep existing)':'Database password',<Input.Password autoComplete="new-password" value={form.data.tenancy_db_password} onChange={(event)=>form.setData('tenancy_db_password',event.target.value)}/>)}</Col></Row>
                    </SectionCard>
                    <div style={{position:'sticky',bottom:16,marginTop:16,padding:16,background:'rgba(255,255,255,.96)',border:'1px solid #e5e7eb',borderRadius:14,boxShadow:'0 12px 30px rgba(15,23,42,.1)'}}><Space style={{width:'100%',justifyContent:'flex-end'}}><Button onClick={()=>window.history.back()}>Cancel</Button><Button type="primary" htmlType="submit" loading={form.processing}>{editing?'Save changes':'Verify database and provision'}</Button></Space></div>
                </Col>
            </Row>
        </Form>
    </CentralLayout>;
}
