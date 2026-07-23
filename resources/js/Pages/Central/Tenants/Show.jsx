import CentralLayout from '@/Layouts/CentralLayout';
import ActionDropdown from '@/Components/ActionDropdown';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, formatMoney, initials } from '@/Components/Central/formatters';
import { router } from '@inertiajs/react';
import {
    CloudDownloadOutlined, DatabaseOutlined, EditOutlined, GlobalOutlined, LoginOutlined,
    PlayCircleOutlined, ReloadOutlined, SafetyCertificateOutlined, StopOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Col, Empty, Form, Input, Modal, Row, Space, Table, Tabs, Timeline, Typography, message } from 'antd';
import { useState } from 'react';

export default function Show({ tenant }) {
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [form] = Form.useForm();
    const post = (name, data = {}) => router.post(route(name, tenant.id), data, { preserveScroll: true });
    const suspend = ({ reason }) => post('central.tenants.suspend', { reason });
    const health = async () => {
        const hide = message.loading('Checking tenant database…', 0);
        try {
            const response = await fetch(route('central.tenants.health', tenant.id), { headers: { Accept: 'application/json' } });
            const data = await response.json(); hide();
            Modal.info({ title: data.healthy ? 'Tenant is healthy' : 'Health check failed', content: data.healthy ? `Connected to ${data.database}. ${data.migration_count} migrations recorded.` : data.message, okText: 'Done' });
        } catch { hide(); message.error('The health check could not be completed.'); }
    };
    const primaryDomain = tenant.domains?.find((domain) => domain.is_primary);
    const latestUsage = [...(tenant.usage_metrics || [])].sort((a,b) => new Date(b.period_end) - new Date(a.period_end))[0];
    const latestInvoice = [...(tenant.invoices || [])].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const operationItems = [
        { label:'Run health check',icon:<SafetyCertificateOutlined />,onClick:health },
        { label:'Queue migrations',icon:<DatabaseOutlined />,onClick:()=>post('central.tenants.migrate') },
        { label:'Queue seeders',icon:<PlayCircleOutlined />,onClick:()=>post('central.tenants.seed') },
        { label:'Create backup',icon:<CloudDownloadOutlined />,onClick:()=>post('central.tenants.backup') },
    ];

    const overview = <Row gutter={[16,16]}>
        <Col xs={24} lg={15}><SectionCard title="Tenant profile" description="Company ownership and workspace configuration"><div className="central-data-grid">
            <Data label="Legal name" value={tenant.legal_name || tenant.company_name} /><Data label="Owner" value={tenant.owner_name} /><Data label="Owner email" value={tenant.owner_email} /><Data label="Phone" value={tenant.owner_phone || '—'} /><Data label="Country" value={tenant.country || '—'} /><Data label="Timezone" value={tenant.timezone} /><Data label="Currency" value={tenant.currency} /><Data label="Created" value={formatDate(tenant.created_at)} />
        </div></SectionCard></Col>
        <Col xs={24} lg={9}><SectionCard title="Account snapshot" description="Current commercial state"><div className="central-data-grid" style={{ gridTemplateColumns:'1fr' }}>
            <Data label="Plan" value={tenant.plan?.name || 'No plan'} /><Data label="Subscription" value={<StatusBadge value={tenant.subscription?.status || tenant.status} />} /><Data label="Trial ends" value={formatDate(tenant.trial_ends_at)} /><Data label="Latest invoice" value={latestInvoice ? formatMoney(latestInvoice.total, latestInvoice.currency) : '—'} />
        </div></SectionCard></Col>
    </Row>;
    const subscription = <SectionCard title="Subscription" description="Plan assignment, billing cycle, and access window"><div className="central-data-grid"><Data label="Plan" value={tenant.subscription?.plan?.name || tenant.plan?.name || 'No plan'} /><Data label="Status" value={<StatusBadge value={tenant.subscription?.status || 'none'} />} /><Data label="Billing cycle" value={tenant.subscription?.billing_cycle || '—'} /><Data label="Current period starts" value={formatDate(tenant.subscription?.current_period_starts_at)} /><Data label="Current period ends" value={formatDate(tenant.subscription?.current_period_ends_at)} /><Data label="Subscription ends" value={formatDate(tenant.subscription_ends_at)} /></div></SectionCard>;
    const usage = <SectionCard title="Latest usage window" description={latestUsage ? `${formatDate(latestUsage.period_start)} to ${formatDate(latestUsage.period_end)}` : 'Usage has not been collected yet'}>{latestUsage ? <Row gutter={[12,12]}>{[['Users',latestUsage.users_count],['Branches',latestUsage.branches_count],['Products',latestUsage.products_count],['Invoices',latestUsage.invoices_count],['Storage',`${latestUsage.storage_mb || 0} MB`],['AI requests',latestUsage.ai_requests_count]].map(([label,value])=><Col xs={12} md={8} key={label}><div className="central-mobile-card"><Typography.Text type="secondary">{label}</Typography.Text><Typography.Title level={4} style={{margin:'5px 0 0'}}>{value || 0}</Typography.Title></div></Col>)}</Row> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No usage metrics recorded" />}</SectionCard>;
    const infrastructure = <Row gutter={[16,16]}><Col xs={24} lg={14}><SectionCard title="Tenant database" description="Manually managed connection assigned during tenant creation" extra={<Button icon={<SafetyCertificateOutlined />} onClick={health}>Check health</Button>}><div className="central-data-grid" style={{ gridTemplateColumns:'1fr' }}><Data label="Provisioning mode" value={tenant.database_provisioning_mode || 'manual'} /><Data label="Database" value={<code className="central-code">{tenant.tenancy_db_name || tenant.database_name || '—'}</code>} /><Data label="Host" value={<code className="central-code">{tenant.tenancy_db_host || tenant.database_server || 'Configured securely'}</code>} /><Data label="Status" value={<StatusBadge value={tenant.status} />} /></div></SectionCard></Col><Col xs={24} lg={10}><SectionCard title="Operational actions" description="Queue safe maintenance jobs for this workspace"><Space direction="vertical" style={{width:'100%'}}>{operationItems.map((item)=><Button key={item.label} block icon={item.icon} style={{justifyContent:'flex-start'}} onClick={item.onClick}>{item.label}</Button>)}</Space></SectionCard></Col></Row>;
    const domains = <SectionCard title="Domains" description="Routes currently associated with this tenant"><Table className="central-table" pagination={false} rowKey="id" dataSource={tenant.domains || []} columns={[{title:'Domain',dataIndex:'domain'},{title:'Type',dataIndex:'type'},{title:'Status',render:(_,row)=><StatusBadge value={row.status}/>},{title:'Primary',render:(_,row)=>row.is_primary?'Primary':'—'},{title:'Verified',render:(_,row)=>formatDate(row.verified_at)}]} scroll={{x:650}} /></SectionCard>;
    const billing = <SectionCard title="Invoices" description="Recent invoices issued to this tenant"><Table className="central-table" rowKey="id" dataSource={tenant.invoices || []} pagination={false} columns={[{title:'Invoice',dataIndex:'invoice_number'},{title:'Total',render:(_,row)=>formatMoney(row.total,row.currency)},{title:'Status',render:(_,row)=><StatusBadge value={row.status}/>},{title:'Due',render:(_,row)=>formatDate(row.due_date)},{title:'Paid',render:(_,row)=>formatDate(row.paid_at)}]} scroll={{x:650}} /></SectionCard>;
    const activity = <SectionCard title="Provisioning timeline" description="Step-by-step history from the tenant provisioning pipeline">{tenant.provisioning_logs?.length ? <Timeline items={[...(tenant.provisioning_logs || [])].reverse().map((log)=>({color:log.status==='success'?'green':log.status==='failed'?'red':'blue',children:<div><Space><Typography.Text strong>{log.step}</Typography.Text><StatusBadge value={log.status}/></Space><Typography.Paragraph type="secondary" style={{margin:'5px 0 0'}}>{log.message || 'No additional detail'} · {formatDate(log.finished_at || log.created_at,true)}</Typography.Paragraph></div>}))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No provisioning activity recorded" />}</SectionCard>;
    const tabs = [{key:'overview',label:'Overview',children:overview},{key:'subscription',label:'Subscription',children:subscription},{key:'usage',label:'Usage',children:usage},{key:'infrastructure',label:'Infrastructure',children:infrastructure},{key:'domains',label:'Domains',children:domains},{key:'billing',label:'Billing',children:billing},{key:'activity',label:'Activity',children:activity}];

    return <CentralLayout title={tenant.company_name} breadcrumbs={[{title:'Tenants'}]}>
        <div className="central-detail-hero">
            <div className="central-detail-hero__identity"><Avatar size={54} className="central-tenant-avatar">{initials(tenant.company_name)}</Avatar><div className="central-detail-hero__copy"><Typography.Title level={2}>{tenant.company_name}</Typography.Title><div className="central-detail-hero__meta"><StatusBadge value={tenant.status}/><Typography.Text type="secondary"><GlobalOutlined /> {primaryDomain?.domain || 'No primary domain'}</Typography.Text><Typography.Text type="secondary">{tenant.plan?.name || 'No plan'}</Typography.Text></div></div></div>
            <div className="central-detail-hero__actions"><Button icon={<EditOutlined />} onClick={()=>router.visit(route('central.tenants.edit',tenant.id))}>Edit</Button>{tenant.status === 'suspended' ? <Button type="primary" icon={<ReloadOutlined />} onClick={()=>post('central.tenants.reactivate')}>Reactivate</Button> : <Button danger icon={<StopOutlined />} onClick={()=>setSuspendOpen(true)}>Suspend</Button>}{tenant.status === 'provisioning_failed' && <Button type="primary" icon={<ReloadOutlined />} onClick={()=>post('central.tenants.retry')}>Retry</Button>}<Button icon={<LoginOutlined />} onClick={()=>post('central.tenants.impersonate')}>Sign in</Button><ActionDropdown size="middle" items={operationItems}/></div>
        </div>
        {tenant.status_reason && <div style={{marginBottom:16}}><Typography.Text type="danger">Account note: {tenant.status_reason}</Typography.Text></div>}
        <Tabs items={tabs} defaultActiveKey="overview" destroyInactiveTabPane={false} />
        <Modal open={suspendOpen} title="Suspend tenant" okText="Suspend tenant" okButtonProps={{danger:true}} onCancel={()=>setSuspendOpen(false)} onOk={()=>form.submit()}><Typography.Paragraph type="secondary">Users will lose access until an administrator reactivates this tenant.</Typography.Paragraph><Form form={form} layout="vertical" onFinish={(values)=>{setSuspendOpen(false);suspend(values);}} initialValues={{reason:'Suspended by central administrator'}}><Form.Item name="reason" label="Reason" rules={[{required:true,message:'Explain why this tenant is being suspended.'}]}><Input.TextArea rows={4}/></Form.Item></Form></Modal>
    </CentralLayout>;
}

function Data({ label, value }) { return <div className="central-data-item"><span className="central-data-item__label">{label}</span><span>{value ?? '—'}</span></div>; }
