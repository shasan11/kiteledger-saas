import CentralLayout from '@/Layouts/CentralLayout';
import ActionDropdown from '@/Components/ActionDropdown';
import MetricCard from '@/Components/Central/MetricCard';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, formatMoney, humanize } from '@/Components/Central/formatters';
import { DeleteOutlined, EditOutlined, FilePdfOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Col, Drawer, Form, Input, InputNumber, Modal, Row, Select, Switch, Table, Typography } from 'antd';
import { useState } from 'react';

const meta = {
    subscriptions: ['Subscriptions', 'Manage renewals, pauses, cancellations, and customer access.'],
    invoices: ['Invoices', 'Track receivables, due dates, and manually approved payments.'],
    payments: ['Payments', 'Review gateway transactions, failures, and refunds.'],
    gateways: ['Payment gateways', 'Configure provider credentials, modes, and accepted currencies.'],
    'website-pages': ['Website pages', 'Publish and maintain the public marketing website.'],
    'website-sections': ['Website sections', 'Arrange reusable content blocks across public pages.'],
    'website-menus': ['Website navigation', 'Control public header and footer navigation.'],
    'website-faqs': ['Frequently asked questions', 'Maintain answers displayed on the public website.'],
    'website-testimonials': ['Testimonials', 'Manage customer proof used across public pages.'],
    'blog-posts': ['Blog', 'Draft and publish product and company updates.'],
    'default-templates': ['Default data templates', 'Seed new tenants with country or industry defaults.'],
    'platform-settings': ['Platform settings', 'Manage global configuration shared by the SaaS control plane.'],
    'provisioning-logs': ['Provisioning operations', 'Monitor every tenant setup step and investigate failures.'],
    'tenant-databases': ['Database registry', 'Validate and monitor databases registered for tenant allocation.'],
    usage: ['Usage metering', 'Review collected tenant limits and consumption by period.'],
    features: ['Feature catalog', 'Define capabilities that plans and tenant overrides can control.'],
    'tenant-feature-overrides': ['Feature overrides', 'Grant or restrict capabilities for individual tenants.'],
    'central-admins': ['Administrators', 'Control who can access the SaaS control center and their operating role.'],
};
const moneyColumns = ['amount','total','subtotal','tax','discount','refunded_amount'];
const dateColumns = ['created_at','updated_at','paid_at','due_date','published_at','validated_at','allocated_at','started_at','finished_at','period_start','period_end','current_period_starts_at','current_period_ends_at','expires_at'];

export default function Index({ resource, rows, columns = [], editable = false, fields = [], summary = null, filters = {} }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [record, setRecord] = useState(null);
    const [search, setSearch] = useState(filters.search || '');
    const [financialAction, setFinancialAction] = useState(null);
    const [form] = Form.useForm();
    const [actionForm] = Form.useForm();
    const isTenantDatabases = resource === 'tenant-databases';
    const [title, description] = meta[resource] || [humanize(resource), `Manage ${humanize(resource).toLowerCase()} across the platform.`];
    const isAllocated = (row) => isTenantDatabases && (row.tenant_id || row.status === 'allocated');

    const edit = (row = null) => { if (row && isAllocated(row)) return; setRecord(row); form.resetFields(); form.setFieldsValue(row || {}); setDrawerOpen(true); };
    const save = (values) => {
        if (typeof values.supported_currencies === 'string') values.supported_currencies = values.supported_currencies.split(',').map((value) => value.trim()).filter(Boolean);
        const options = { preserveScroll:true,onSuccess:()=>{setDrawerOpen(false);form.resetFields();} };
        record ? router.patch(route(`central.${resource}.update`,record.id),values,options) : router.post(route(`central.${resource}.store`),values,options);
    };
    const remove = (row) => Modal.confirm({ title:`Remove ${title.toLowerCase().replace(/s$/,'')}?`,content:'This action is recorded in the audit trail and may not be reversible.',okText:'Remove',okButtonProps:{danger:true},onOk:()=>router.delete(route(`central.${resource}.destroy`,row.id),{preserveScroll:true}) });
    const lifecycle = (row, action) => router.post(route('central.subscriptions.action',row.id),{action},{preserveScroll:true});
    const openFinancialAction = (type,row) => { setFinancialAction({type,row}); actionForm.setFieldsValue({amount:row.total || row.amount,reference:''}); };
    const submitFinancialAction = (values) => {
        const {type,row} = financialAction;
        const target = type === 'payment' ? route('central.invoices.manual-payment',row.id) : route('central.payments.refund',row.id);
        router.post(target,values,{preserveScroll:true,onSuccess:()=>{setFinancialAction(null);actionForm.resetFields();}});
    };
    const renderValue = (key,value,row) => {
        if (key === 'status') return <StatusBadge value={value}/>;
        if (key.startsWith('is_') || key === 'enabled') return <StatusBadge value={value ? 'active' : 'disabled'}/>;
        if (moneyColumns.includes(key)) return formatMoney(value,row.currency || 'USD');
        if (dateColumns.includes(key)) return formatDate(value,key.includes('_at'));
        if (value && typeof value === 'object') return <Typography.Text ellipsis={{tooltip:JSON.stringify(value)}} style={{maxWidth:260}}>{JSON.stringify(value)}</Typography.Text>;
        return String(value ?? '—');
    };
    const actionItems = (row) => [
        editable && {label:'Edit',icon:<EditOutlined/>,disabled:isAllocated(row),onClick:()=>edit(row)},
        isTenantDatabases && {label:'Revalidate connection',icon:<ReloadOutlined/>,disabled:isAllocated(row),onClick:()=>router.post(route('central.tenant-databases.revalidate',row.id),{},{preserveScroll:true})},
        resource === 'subscriptions' && {label:row.status === 'paused' || row.status === 'cancelled' ? 'Reactivate' : 'Pause subscription',onClick:()=>lifecycle(row,row.status === 'paused' || row.status === 'cancelled'?'reactivate':'pause')},
        resource === 'subscriptions' && {label:'Cancel at period end',danger:true,onClick:()=>lifecycle(row,'cancel')},
        resource === 'invoices' && {label:'Download PDF',icon:<FilePdfOutlined/>,onClick:()=>window.location.assign(route('central.invoices.pdf',row.id))},
        resource === 'invoices' && row.status !== 'paid' && {label:'Approve manual payment',onClick:()=>openFinancialAction('payment',row)},
        resource === 'payments' && row.status === 'success' && {label:'Issue refund',danger:true,onClick:()=>openFinancialAction('refund',row)},
        editable && !['gateways','platform-settings'].includes(resource) && {label:'Delete',icon:<DeleteOutlined/>,danger:true,disabled:isAllocated(row),onClick:()=>remove(row)},
    ];
    const tableColumns = columns.map((key)=>({title:humanize(key),dataIndex:key,key,render:(value,row)=>renderValue(key,value,row),ellipsis:key === 'message' || key === 'last_error'}));
    if (editable || ['subscriptions','invoices','payments'].includes(resource)) tableColumns.push({title:'',key:'actions',fixed:'right',width:52,render:(_,row)=><ActionDropdown items={actionItems(row)}/>});
    const input = (field) => {
        if (field.startsWith('is_') || field === 'enabled') return <Switch/>;
        if (field === 'mode') return <Select options={['sandbox','live'].map((value)=>({value,label:humanize(value)}))}/>;
        if (field === 'status') return <Select options={['draft','active','published'].map((value)=>({value,label:humanize(value)}))}/>;
        if (field === 'type') return <Select options={['string','boolean','integer','json','limit'].map((value)=>({value,label:humanize(value)}))}/>;
        if (field === 'role') return <Select options={['super_admin','operator'].map((value)=>({value,label:humanize(value)}))}/>;
        if (field.includes('sort_order') || field.endsWith('_id') || field === 'limit_value') return <InputNumber style={{width:'100%'}}/>;
        if (field.includes('secret') || ['public_key','secret_key','password'].includes(field)) return <Input.Password autoComplete="new-password"/>;
        return <Input.TextArea autoSize={{minRows:1,maxRows:5}}/>;
    };
    const apply = (extra={}) => router.get(window.location.pathname,{...filters,search:search || undefined,...extra},{preserveState:true,replace:true});

    return <CentralLayout title={title}>
        <PageHeader eyebrow={resource.includes('website') || resource === 'blog-posts' ? 'Content' : 'Control plane'} title={title} description={description} actions={editable && <Button type="primary" icon={<PlusOutlined/>} onClick={()=>edit()}>Add {title.toLowerCase().replace(/s$/,'')}</Button>}/>
        {isTenantDatabases && summary && <Row gutter={[12,12]} style={{marginBottom:16}}>{[['Available',summary.available,'emerald'],['Allocated',summary.allocated,'blue'],['Failed',summary.failed,'rose'],['Registered',summary.total,'violet']].map(([label,value,tone])=><Col xs={12} lg={6} key={label}><MetricCard label={label} value={value} helper="Tenant databases" icon={<DatabaseGlyph/>} tone={tone}/></Col>)}</Row>}
        <SectionCard>
            <div className="central-toolbar"><Input.Search className="central-toolbar__search" value={search} onChange={(event)=>setSearch(event.target.value)} onSearch={()=>apply({page:undefined})} allowClear prefix={<SearchOutlined/>} placeholder={`Search ${title.toLowerCase()}`}/>{columns.includes('status') && <Select allowClear value={filters.status || undefined} placeholder="All statuses" style={{minWidth:160}} options={['active','pending','success','failed','paid','issued','draft','published','available','allocated'].map((value)=>({value,label:humanize(value)}))} onChange={(status)=>apply({status,page:undefined})}/>}<span className="central-filter-summary">{rows.total || 0} records</span></div>
            <Table className="central-table" rowKey="id" dataSource={rows.data || []} columns={tableColumns} scroll={{x:Math.max(800,columns.length*150)}} pagination={{current:rows.current_page,total:rows.total,pageSize:rows.per_page,showSizeChanger:false,onChange:(page)=>apply({page})}}/>
        </SectionCard>
        <Drawer open={drawerOpen} title={record ? `Edit ${title.toLowerCase().replace(/s$/,'')}` : `Add ${title.toLowerCase().replace(/s$/,'')}`} width={520} onClose={()=>setDrawerOpen(false)} destroyOnClose extra={<Button type="primary" onClick={()=>form.submit()}>Save</Button>}><Form form={form} layout="vertical" onFinish={save}>{fields.map((field)=><Form.Item key={field} name={field} label={humanize(field)} valuePropName={field.startsWith('is_') || field === 'enabled'?'checked':'value'}>{input(field)}</Form.Item>)}</Form></Drawer>
        <Modal open={!!financialAction} title={financialAction?.type === 'refund'?'Issue refund':'Approve manual payment'} onCancel={()=>setFinancialAction(null)} onOk={()=>actionForm.submit()} okText={financialAction?.type === 'refund'?'Issue refund':'Approve payment'} okButtonProps={{danger:financialAction?.type === 'refund'}}><Typography.Paragraph type="secondary">{financialAction?.type === 'refund'?'Confirm the amount to return through the original payment gateway.':'Record an externally received payment and its reference.'}</Typography.Paragraph><Form form={actionForm} layout="vertical" onFinish={submitFinancialAction}><Form.Item name="amount" label="Amount" rules={[{required:true}]}><InputNumber min={0.01} precision={2} style={{width:'100%'}}/></Form.Item>{financialAction?.type === 'payment' && <Form.Item name="reference" label="Payment reference" rules={[{required:true,message:'Enter the bank or transaction reference.'}]}><Input/></Form.Item>}</Form></Modal>
    </CentralLayout>;
}

function DatabaseGlyph(){ return <span style={{fontWeight:800}}>DB</span>; }
