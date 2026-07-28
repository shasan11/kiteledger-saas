import CentralLayout from '@/Layouts/CentralLayout';
import ActionDropdown from '@/Components/ActionDropdown';
import DeleteCustomerModal from '@/Components/Central/DeleteCustomerModal';
import MetricCard from '@/Components/Central/MetricCard';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import TenantIdentity from '@/Components/Central/TenantIdentity';
import { formatDate } from '@/Components/Central/formatters';
import { Link, router } from '@inertiajs/react';
import { AppstoreOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Col, Input, Row, Select, Table, Tabs, Typography } from 'antd';
import { useState } from 'react';

const statuses = ['all', 'active', 'trialing', 'provisioning', 'suspended', 'provisioning_failed', 'deletion_pending'];

export default function Index({ tenants, filters = {}, plans = [], summary = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [deleteTenant, setDeleteTenant] = useState(null);
    const apply = (extra = {}) => router.get(route('central.tenants.index'), { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const open = (tenant) => router.visit(route('central.tenants.show', tenant.id));
    const actions = (tenant) => [{ label:'Open customer',icon:<EyeOutlined />,onClick:()=>open(tenant) },{ label:'Edit details',icon:<EditOutlined />,onClick:()=>router.visit(route('central.tenants.edit',tenant.id)) },{ label:'Delete customer',icon:<DeleteOutlined />,danger:true,onClick:()=>setDeleteTenant(tenant) }];
    const columns = [
        { title: 'Customer', render: (_, tenant) => <button onClick={() => open(tenant)} style={{ border:0,background:'transparent',padding:0,textAlign:'left',cursor:'pointer',maxWidth:280 }}><TenantIdentity tenant={tenant} /></button> },
        { title: 'Primary domain', render: (_, tenant) => tenant.domains?.find((domain) => domain.is_primary)?.domain || <Typography.Text type="secondary">Not assigned</Typography.Text> },
        { title: 'Plan', render: (_, tenant) => tenant.plan?.name || 'No plan' },
        { title: 'Status', render: (_, tenant) => <StatusBadge value={tenant.status} /> },
        { title: 'Created', render: (_, tenant) => formatDate(tenant.created_at) },
        { title: '', width: 52, render: (_, tenant) => <ActionDropdown items={actions(tenant)} /> },
    ];
    const tabItems = statuses.map((status) => ({ key: status, label: status === 'all' ? 'All customers' : status.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()) }));

    return <CentralLayout title="Customers">
        <PageHeader eyebrow="Customer management" title="Customers" description="Manage every customer account, subscription, and support relationship from one place." actions={<Link href={route('central.tenants.create')}><Button type="primary" icon={<PlusOutlined />}>Create customer</Button></Link>} />
        <Row gutter={[14,14]} style={{ marginBottom: 16 }}>
            <Col xs={12} xl={6}><MetricCard label="All customers" value={summary.total || 0} helper="Across every lifecycle stage" icon={<TeamOutlined />} /></Col>
            <Col xs={12} xl={6}><MetricCard label="Active" value={summary.active || 0} helper="Operational workspaces" icon={<AppstoreOutlined />} tone="blue" /></Col>
            <Col xs={12} xl={6}><MetricCard label="On trial" value={summary.trialing || 0} helper="Evaluation accounts" icon={<SearchOutlined />} tone="violet" /></Col>
            <Col xs={12} xl={6}><MetricCard label="Needs attention" value={summary.attention || 0} helper="Failed, expired, or suspended" icon={<WarningOutlined />} tone={summary.attention ? 'rose' : 'amber'} /></Col>
        </Row>
        <SectionCard>
            <Tabs activeKey={filters.status || 'all'} items={tabItems} onChange={(status) => apply({ status: status === 'all' ? undefined : status, page: undefined })} />
            <div className="central-toolbar">
                <Input.Search className="central-toolbar__search" prefix={<SearchOutlined />} value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => apply({ page: undefined })} placeholder="Search company or owner email" allowClear />
                <Select allowClear value={filters.plan_id ? Number(filters.plan_id) : undefined} placeholder="All plans" style={{ minWidth: 170 }} options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} onChange={(plan_id) => apply({ plan_id, page: undefined })} />
                {(filters.search || filters.status || filters.plan_id) && <Button onClick={() => { setSearch(''); router.get(route('central.tenants.index')); }}>Clear filters</Button>}
                <span className="central-filter-summary">Showing {tenants.from || 0}–{tenants.to || 0} of {tenants.total || 0}</span>
            </div>
            <div className="central-table central-table--responsive">
                <TableShim columns={columns} tenants={tenants} filters={filters} />
            </div>
            <div className="central-mobile-list">{tenants.data.map((tenant) => <div className="central-mobile-card" key={tenant.id}><TenantIdentity tenant={tenant} /><div className="central-mobile-card__row"><StatusBadge value={tenant.status} /><Typography.Text type="secondary">{tenant.plan?.name || 'No plan'}</Typography.Text><ActionDropdown items={actions(tenant)} /></div></div>)}</div>
        </SectionCard>
        <DeleteCustomerModal open={Boolean(deleteTenant)} onClose={()=>setDeleteTenant(null)} tenant={deleteTenant} />
    </CentralLayout>;
}

function TableShim({ columns, tenants, filters }) {
    return <Table rowKey="id" dataSource={tenants.data} columns={columns} scroll={{ x: 850 }} pagination={{ current:tenants.current_page,total:tenants.total,pageSize:tenants.per_page,showSizeChanger:false,onChange:(page)=>router.get(tenants.path,{...filters,page},{preserveState:true}) }} />;
}
