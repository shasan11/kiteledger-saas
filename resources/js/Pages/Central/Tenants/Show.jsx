import CentralLayout from '@/Layouts/CentralLayout';
import ActionDropdown from '@/Components/ActionDropdown';
import DeleteCustomerModal from '@/Components/Central/DeleteCustomerModal';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, formatMoney, initials } from '@/Components/Central/formatters';
import { router } from '@inertiajs/react';
import {
    DatabaseOutlined, DeleteOutlined, EditOutlined, GlobalOutlined, LoginOutlined,
    PlayCircleOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, StopOutlined,
} from '@ant-design/icons';
import { Alert, Avatar, Button, Checkbox, Col, DatePicker, Empty, Form, Input, Modal, Row, Select, Space, Table, Tabs, Timeline, Typography, message } from 'antd';
import { useState } from 'react';

export default function Show({ tenant, options = {} }) {
    const plans = options.plans || [];
    const billingCycles = options.billingCycles || ['monthly', 'yearly'];
    const tenantBaseDomain = options.tenantBaseDomain;
    const [domainOpen, setDomainOpen] = useState(false);
    const [subscriptionOpen, setSubscriptionOpen] = useState(false);
    const [planOpen, setPlanOpen] = useState(false);
    const [pauseOpen, setPauseOpen] = useState(false);
    const [domainForm] = Form.useForm();
    const [subscriptionForm] = Form.useForm();
    const [planForm] = Form.useForm();
    const [pauseForm] = Form.useForm();
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [impersonateOpen, setImpersonateOpen] = useState(false);
    const [retryOpen, setRetryOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [operation, setOperation] = useState(null);
    const [form] = Form.useForm();
    const [impersonateForm] = Form.useForm();
    const [retryForm] = Form.useForm();
    const [operationForm] = Form.useForm();
    const post = (name, data = {}) => router.post(route(name, tenant.id), data, { preserveScroll: true });
    const suspend = ({ reason }) => post('central.tenants.suspend', { reason });
    const domainAction = (name, domain, data = {}) => router.post(route(name, [tenant.id, domain.id]), data, { preserveScroll: true });
    const removeDomain = (domain) => Modal.confirm({
        title: 'Remove domain',
        content: `${domain.domain} will stop resolving to this workspace.`,
        okText: 'Remove domain', okButtonProps: { danger: true },
        onOk: () => router.delete(route('central.tenants.domains.destroy', [tenant.id, domain.id]), { preserveScroll: true }),
    });
    const subscriptionAction = (action, data = {}) => router.post(route('central.subscriptions.action', tenant.subscription.id), { action, ...data }, { preserveScroll: true });
    const confirmSubscription = (action, title, content, danger = false) => Modal.confirm({
        title, content, okText: title, okButtonProps: { danger }, onOk: () => subscriptionAction(action),
    });
    const health = async () => {
        const hide = message.loading('Checking customer workspace…', 0);
        try {
            const response = await fetch(route('central.tenants.health', tenant.id), { headers: { Accept: 'application/json' } });
            const data = await response.json(); hide();
            Modal.info({ title: data.healthy ? 'Customer workspace is healthy' : 'Health check failed', content: data.healthy ? 'The customer workspace is connected and up to date.' : data.message, okText: 'Done' });
        } catch { hide(); message.error('The health check could not be completed.'); }
    };
    const primaryDomain = tenant.domains?.find((domain) => domain.is_primary);
    const latestUsage = [...(tenant.usage_metrics || [])].sort((a,b) => new Date(b.period_end) - new Date(a.period_end))[0];
    const latestInvoice = [...(tenant.invoices || [])].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const operationItems = [
        { label:'Run health check',icon:<SafetyCertificateOutlined />,onClick:health },
        { label:'Run migrations now',icon:<DatabaseOutlined />,onClick:()=>setOperation({ route:'central.tenants.migrate', title:'Run tenant migrations' }) },
        { label:'Run seeders now',icon:<PlayCircleOutlined />,onClick:()=>setOperation({ route:'central.tenants.seed', title:'Run tenant seeders' }) },
    ];

    const overview = <Row gutter={[16,16]}>
        <Col xs={24} lg={15}><SectionCard title="Customer profile" description="Company ownership and workspace configuration"><div className="central-data-grid">
            <Data label="Legal name" value={tenant.legal_name || tenant.company_name} /><Data label="Owner" value={tenant.owner_name} /><Data label="Owner email" value={tenant.owner_email} /><Data label="Phone" value={tenant.owner_phone || '-'} /><Data label="Country" value={tenant.country || '-'} /><Data label="Timezone" value={tenant.timezone} /><Data label="Currency" value={tenant.currency} /><Data label="Created" value={formatDate(tenant.created_at)} />
        </div></SectionCard></Col>
        <Col xs={24} lg={9}><SectionCard title="Account snapshot" description="Current commercial state"><div className="central-data-grid" style={{ gridTemplateColumns:'1fr' }}>
            <Data label="Plan" value={tenant.plan?.name || 'No plan'} /><Data label="Subscription" value={<StatusBadge value={tenant.subscription?.status || tenant.status} />} /><Data label="Trial ends" value={formatDate(tenant.trial_ends_at)} /><Data label="Latest invoice" value={latestInvoice ? formatMoney(latestInvoice.total, latestInvoice.currency) : '-'} />
        </div></SectionCard></Col>
    </Row>;
    const active = tenant.subscription;
    const subscriptionActions = active ? <Space wrap>
        <Button onClick={() => { planForm.setFieldsValue({ plan_id: active.plan_id, immediate: false }); setPlanOpen(true); }}>Change plan</Button>
        <Button onClick={() => confirmSubscription('renew', 'Renew now', 'The billing period is rolled forward by one cycle.')}>Renew now</Button>
        {active.status === 'paused'
            ? <Button onClick={() => confirmSubscription('reactivate', 'Resume', 'Access is restored immediately.')}>Resume</Button>
            : <Button onClick={() => { pauseForm.resetFields(); setPauseOpen(true); }}>Pause</Button>}
        {['cancelled', 'expired'].includes(active.status)
            ? <Button type="primary" onClick={() => confirmSubscription('reactivate', 'Reactivate', 'The subscription is made active again.')}>Reactivate</Button>
            : <>
                <Button danger onClick={() => confirmSubscription('cancel', 'Cancel at period end', 'Access continues until the current period ends.', true)}>Cancel at period end</Button>
                <Button danger onClick={() => confirmSubscription('cancel_now', 'Cancel immediately', 'Access is revoked as soon as this is confirmed.', true)}>Cancel now</Button>
            </>}
    </Space> : <Button type="primary" onClick={() => { subscriptionForm.setFieldsValue({ plan_id: tenant.plan_id || plans[0]?.id, billing_cycle: billingCycles[0], mode: 'active' }); setSubscriptionOpen(true); }}>Start subscription</Button>;
    const subscription = <SectionCard title="Subscription" description="Plan assignment, billing cycle, and access window" extra={subscriptionActions}>
        {active ? <div className="central-data-grid">
            <Data label="Plan" value={active.plan?.name || tenant.plan?.name || 'No plan'} />
            <Data label="Status" value={<StatusBadge value={active.status} />} />
            <Data label="Billing cycle" value={humanize(active.billing_cycle)} />
            <Data label="Scheduled plan change" value={active.scheduled_plan_id ? `${plans.find((plan) => plan.id === active.scheduled_plan_id)?.name || 'Plan'} on ${formatDate(active.scheduled_change_at)}` : '-'} />
            <Data label="Current period starts" value={formatDate(active.current_period_starts_at)} />
            <Data label="Current period ends" value={formatDate(active.current_period_ends_at)} />
            <Data label="Trial ends" value={formatDate(active.trial_ends_at)} />
            <Data label="Subscription ends" value={formatDate(tenant.subscription_ends_at)} />
        </div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="This customer has no subscription yet" />}
    </SectionCard>;
    const usage = <SectionCard title="Latest usage window" description={latestUsage ? `${formatDate(latestUsage.period_start)} to ${formatDate(latestUsage.period_end)}` : 'Usage has not been collected yet'}>{latestUsage ? <Row gutter={[12,12]}>{[['Users',latestUsage.users_count],['Branches',latestUsage.branches_count],['Products',latestUsage.products_count],['Invoices',latestUsage.invoices_count],['Storage',`${latestUsage.storage_mb || 0} MB`],['AI requests',latestUsage.ai_requests_count]].map(([label,value])=><Col xs={12} md={8} key={label}><div className="central-mobile-card"><Typography.Text type="secondary">{label}</Typography.Text><Typography.Title level={4} style={{margin:'5px 0 0'}}>{value || 0}</Typography.Title></div></Col>)}</Row> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No usage metrics recorded" />}</SectionCard>;
    const infrastructure = <Row gutter={[16,16]}><Col xs={24} lg={14}><SectionCard title="Tenant database" description="Manually managed connection assigned during tenant creation" extra={<Button icon={<SafetyCertificateOutlined />} onClick={health}>Check health</Button>}><div className="central-data-grid" style={{ gridTemplateColumns:'1fr' }}><Data label="Provisioning mode" value={tenant.database_provisioning_mode || 'manual'} /><Data label="Database" value={<code className="central-code">{tenant.tenancy_db_name || tenant.database_name || '-'}</code>} /><Data label="Host" value={<code className="central-code">{tenant.tenancy_db_host || tenant.database_server || 'Configured securely'}</code>} /><Data label="Status" value={<StatusBadge value={tenant.status} />} /></div></SectionCard></Col><Col xs={24} lg={10}><SectionCard title="Operational actions" description="Run customer database tasks immediately"><Space direction="vertical" style={{width:'100%'}}>{operationItems.map((item)=><Button key={item.label} block icon={item.icon} style={{justifyContent:'flex-start'}} onClick={item.onClick}>{item.label}</Button>)}</Space></SectionCard></Col></Row>;
    const pendingCustom = (tenant.domains || []).filter((domain) => domain.type === 'custom' && domain.status !== 'active');
    const domains = <SectionCard title="Domains" description="Hostnames that resolve to this workspace" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { domainForm.setFieldsValue({ type: 'subdomain', value: '', is_primary: false }); setDomainOpen(true); }}>Add domain</Button>}>
        {pendingCustom.length > 0 && <Alert
            type="info"
            showIcon
            style={{ marginBottom: 14 }}
            message="A custom domain needs a DNS record before it can be verified"
            description={<span>Add a TXT record at <code className="central-code">_kiteledger.{pendingCustom[0].domain}</code> with the value <code className="central-code">kiteledger-verification={pendingCustom[0].verification_token}</code>, then choose Verify.</span>}
        />}
        <Table
            className="central-table"
            pagination={false}
            rowKey="id"
            dataSource={tenant.domains || []}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No domains yet" /> }}
            columns={[
                { title: 'Domain', render: (_, row) => <span><Typography.Text strong>{row.domain}</Typography.Text>{row.is_primary && <Typography.Text type="secondary"> · primary</Typography.Text>}</span> },
                { title: 'Type', render: (_, row) => humanize(row.type) },
                { title: 'Status', render: (_, row) => <StatusBadge value={row.status} /> },
                { title: 'Verified', render: (_, row) => formatDate(row.verified_at) },
                { title: '', width: 220, render: (_, row) => <Space size={4}>
                    {row.type === 'custom' && row.status !== 'active' && <Button size="small" onClick={() => domainAction('central.tenants.domains.verify', row)}>Verify</Button>}
                    {!row.is_primary && row.status === 'active' && row.verified_at && <Button size="small" onClick={() => domainAction('central.tenants.domains.primary', row)}>Make primary</Button>}
                    {!row.is_primary && (tenant.domains || []).length > 1 && <Button size="small" danger icon={<DeleteOutlined />} aria-label="Remove domain" onClick={() => removeDomain(row)} />}
                </Space> },
            ]}
            scroll={{ x: 780 }}
        />
    </SectionCard>;
    const billing = <SectionCard title="Invoices" description="Recent invoices issued to this customer"><Table className="central-table" rowKey="id" dataSource={tenant.invoices || []} pagination={false} columns={[{title:'Invoice',dataIndex:'invoice_number'},{title:'Total',render:(_,row)=>formatMoney(row.total,row.currency)},{title:'Status',render:(_,row)=><StatusBadge value={row.status}/>},{title:'Due',render:(_,row)=>formatDate(row.due_date)},{title:'Paid',render:(_,row)=>formatDate(row.paid_at)}]} scroll={{x:650}} /></SectionCard>;
    const activity = <SectionCard title="Provisioning timeline" description="Step-by-step history from the tenant provisioning pipeline">{tenant.provisioning_logs?.length ? <Timeline items={[...(tenant.provisioning_logs || [])].reverse().map((log)=>({color:log.status==='success'?'green':log.status==='failed'?'red':'blue',children:<div><Space><Typography.Text strong>{log.step}</Typography.Text><StatusBadge value={log.status}/></Space><Typography.Paragraph type="secondary" style={{margin:'5px 0 0'}}>{log.message || 'No additional detail'} · {formatDate(log.finished_at || log.created_at,true)}</Typography.Paragraph></div>}))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No provisioning activity recorded" />}</SectionCard>;
    const tabs = [{key:'overview',label:'Overview',children:overview},{key:'subscription',label:'Subscription',children:subscription},{key:'usage',label:'Usage',children:usage},{key:'infrastructure',label:'Infrastructure',children:infrastructure},{key:'domains',label:'Domains',children:domains},{key:'billing',label:'Billing',children:billing},{key:'activity',label:'Activity',children:activity}];

    return <CentralLayout title={tenant.company_name} breadcrumbs={[{title:'Customers'}]}>
        <div className="central-detail-hero">
            <div className="central-detail-hero__identity"><Avatar size={54} className="central-tenant-avatar">{initials(tenant.company_name)}</Avatar><div className="central-detail-hero__copy"><Typography.Title level={2}>{tenant.company_name}</Typography.Title><div className="central-detail-hero__meta"><StatusBadge value={tenant.status}/><Typography.Text type="secondary"><GlobalOutlined /> {primaryDomain?.domain || 'No primary domain'}</Typography.Text><Typography.Text type="secondary">{tenant.plan?.name || 'No plan'}</Typography.Text></div></div></div>
            <div className="central-detail-hero__actions"><Button icon={<EditOutlined />} onClick={()=>router.visit(route('central.tenants.edit',tenant.id))}>Edit</Button>{tenant.status === 'suspended' ? <Button type="primary" icon={<ReloadOutlined />} onClick={()=>post('central.tenants.reactivate')}>Reactivate</Button> : <Button danger icon={<StopOutlined />} onClick={()=>setSuspendOpen(true)}>Suspend</Button>}{['pending','failed','provisioning_failed'].includes(tenant.status) && <Button type="primary" icon={<ReloadOutlined />} onClick={()=>setRetryOpen(true)}>Run provisioning</Button>}<Button icon={<LoginOutlined />} onClick={()=>setImpersonateOpen(true)}>Sign in</Button><Button danger icon={<DeleteOutlined />} onClick={()=>setDeleteOpen(true)}>Delete</Button><ActionDropdown size="middle" items={operationItems}/></div>
        </div>
        {tenant.status_reason && <div style={{marginBottom:16}}><Typography.Text type="danger">Account note: {tenant.status_reason}</Typography.Text></div>}
        <Tabs items={tabs} defaultActiveKey="overview" destroyInactiveTabPane={false} />
        <Modal open={suspendOpen} title="Suspend customer" okText="Suspend customer" okButtonProps={{danger:true}} onCancel={()=>setSuspendOpen(false)} onOk={()=>form.submit()}><Typography.Paragraph type="secondary">Users will lose access until an administrator reactivates this customer.</Typography.Paragraph><Form form={form} layout="vertical" onFinish={(values)=>{setSuspendOpen(false);suspend(values);}} initialValues={{reason:'Suspended by central administrator'}}><Form.Item name="reason" label="Reason" rules={[{required:true,message:'Explain why this customer is being suspended.'}]}><Input.TextArea rows={4}/></Form.Item></Form></Modal>
        <Modal open={retryOpen} title="Retry customer setup" okText="Run setup" onCancel={()=>setRetryOpen(false)} onOk={()=>retryForm.submit()}><Alert type="info" showIcon message="Set the customer owner's login password" description="The password is required to recover a setup attempt created before the owner account was completed." style={{marginBottom:16}}/><Form form={retryForm} layout="vertical" onFinish={(values)=>{setRetryOpen(false);post('central.tenants.retry',values);retryForm.resetFields();}}><Form.Item name="owner_password" label="Owner password" rules={[{required:true,min:12,message:'Enter at least 12 characters.'}]}><Input.Password autoComplete="new-password"/></Form.Item><Form.Item name="owner_password_confirmation" label="Confirm owner password" dependencies={['owner_password']} rules={[{required:true,message:'Confirm the owner password.'},({getFieldValue})=>({validator(_,value){return !value || getFieldValue('owner_password')===value ? Promise.resolve() : Promise.reject(new Error('The passwords do not match.'));}})]}><Input.Password autoComplete="new-password"/></Form.Item></Form></Modal>
        <Modal open={impersonateOpen} title="Sign in as customer" okText="Start secure session" onCancel={()=>setImpersonateOpen(false)} onOk={()=>impersonateForm.submit()}><Alert type="warning" showIcon message="This action is security-sensitive and fully audited." style={{marginBottom:16}}/><Form form={impersonateForm} layout="vertical" onFinish={(values)=>post('central.tenants.impersonate',values)}><Form.Item name="reason" label="Reason" rules={[{required:true,min:10,message:'Enter at least 10 characters.'}]}><Input.TextArea rows={3}/></Form.Item><Form.Item name="current_password" label="Current administrator password" rules={[{required:true}]}><Input.Password autoComplete="current-password"/></Form.Item></Form></Modal>
        <Modal open={Boolean(operation)} title={operation?.title} okText="Confirm and run" okButtonProps={{danger:true}} onCancel={()=>{setOperation(null);operationForm.resetFields();}} onOk={()=>operationForm.submit()}><Alert type="warning" showIcon message="This changes the customer database and will be recorded in the audit log." style={{marginBottom:16}}/><Form form={operationForm} layout="vertical" onFinish={(values)=>{post(operation.route,values);setOperation(null);operationForm.resetFields();}}><Form.Item name="reason" label="Reason" rules={[{required:true,min:10,message:'Enter at least 10 characters.'}]}><Input.TextArea rows={3}/></Form.Item><Form.Item name="current_password" label="Current administrator password" rules={[{required:true}]}><Input.Password autoComplete="current-password"/></Form.Item></Form></Modal>
        <Modal open={domainOpen} title="Add domain" okText="Add domain" onCancel={() => setDomainOpen(false)} onOk={() => domainForm.submit()}>
            <Form form={domainForm} layout="vertical" onFinish={(values) => { setDomainOpen(false); post('central.tenants.domains.store', values); }}>
                <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                    <Select options={[{ value: 'subdomain', label: 'Platform subdomain' }, { value: 'custom', label: 'Custom domain' }]} />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.type !== next.type}>
                    {({ getFieldValue }) => getFieldValue('type') === 'custom'
                        ? <Form.Item name="value" label="Hostname" rules={[{ required: true, message: 'Enter a hostname such as books.example.com.' }]} extra="No scheme, port, or path. It stays pending until DNS verification succeeds.">
                            <Input placeholder="books.example.com" />
                        </Form.Item>
                        : <Form.Item name="value" label="Subdomain" rules={[{ required: true, message: 'Enter a subdomain.' }]} extra={tenantBaseDomain ? `Becomes <subdomain>.${tenantBaseDomain} and is active immediately.` : 'Active immediately.'}>
                            <Input addonAfter={tenantBaseDomain ? `.${tenantBaseDomain}` : undefined} placeholder="acme" />
                        </Form.Item>}
                </Form.Item>
                <Form.Item name="is_primary" valuePropName="checked"><Checkbox>Make this the primary domain</Checkbox></Form.Item>
            </Form>
        </Modal>
        <Modal open={subscriptionOpen} title="Start subscription" okText="Start subscription" onCancel={() => setSubscriptionOpen(false)} onOk={() => subscriptionForm.submit()}>
            <Form form={subscriptionForm} layout="vertical" onFinish={(values) => { setSubscriptionOpen(false); post('central.tenants.subscription.store', values); }}>
                <Form.Item name="plan_id" label="Plan" rules={[{ required: true }]}><Select options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} /></Form.Item>
                <Form.Item name="billing_cycle" label="Billing cycle" rules={[{ required: true }]}><Select options={billingCycles.map((value) => ({ value, label: humanize(value) }))} /></Form.Item>
                <Form.Item name="mode" label="Start as" rules={[{ required: true }]} extra="Trial requires the plan to define trial days.">
                    <Select options={[{ value: 'active', label: 'Active' }, { value: 'trial', label: 'Trial' }, { value: 'auto', label: 'Automatic (trial when the plan offers one)' }]} />
                </Form.Item>
            </Form>
        </Modal>
        <Modal open={planOpen} title="Change plan" okText="Change plan" onCancel={() => setPlanOpen(false)} onOk={() => planForm.submit()}>
            <Form form={planForm} layout="vertical" onFinish={(values) => { setPlanOpen(false); post('central.tenants.subscription.plan', values); }}>
                <Form.Item name="plan_id" label="Plan" rules={[{ required: true }]}><Select options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} /></Form.Item>
                <Form.Item name="immediate" valuePropName="checked" extra="Otherwise the change is scheduled for the end of the current period."><Checkbox>Apply immediately</Checkbox></Form.Item>
            </Form>
        </Modal>
        <Modal open={pauseOpen} title="Pause subscription" okText="Pause subscription" onCancel={() => setPauseOpen(false)} onOk={() => pauseForm.submit()}>
            <Form form={pauseForm} layout="vertical" onFinish={(values) => { setPauseOpen(false); subscriptionAction('pause', values.resume_at ? { resume_at: values.resume_at.toISOString() } : {}); }}>
                <Form.Item name="resume_at" label="Resume on" extra="Leave blank to resume manually. Automatic resume needs the scheduler running.">
                    <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
            </Form>
        </Modal>
        <DeleteCustomerModal open={deleteOpen} onClose={()=>setDeleteOpen(false)} tenant={tenant} />
    </CentralLayout>;
}

function Data({ label, value }) { return <div className="central-data-item"><span className="central-data-item__label">{label}</span><span>{value ?? '-'}</span></div>; }
function humanize(value) { return value ? String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '-'; }
