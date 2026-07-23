import CentralLayout from '@/Layouts/CentralLayout';
import ActionDropdown from '@/Components/ActionDropdown';
import MetricCard from '@/Components/Central/MetricCard';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import TenantIdentity from '@/Components/Central/TenantIdentity';
import { formatDate } from '@/Components/Central/formatters';
import { Link, router } from '@inertiajs/react';
import { AppstoreOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Col, Input, Row, Select, Table, Tabs, Typography } from 'antd';
import { useState } from 'react';

const statuses = ['all', 'active', 'trialing', 'provisioning', 'suspended', 'provisioning_failed'];

export default function Index({ tenants, filters = {}, plans = [], summary = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const apply = (extra = {}) => router.get(route('central.tenants.index'), { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const open = (tenant) => router.visit(route('central.tenants.show', tenant.id));
    const columns = [
        { title: 'Tenant', render: (_, tenant) => <button onClick={() => open(tenant)} style={{ border:0,background:'transparent',padding:0,textAlign:'left',cursor:'pointer',maxWidth:280 }}><TenantIdentity tenant={tenant} /></button> },
        { title: 'Primary domain', render: (_, tenant) => tenant.domains?.find((domain) => domain.is_primary)?.domain || <Typography.Text type="secondary">Not assigned</Typography.Text> },
        { title: 'Plan', render: (_, tenant) => tenant.plan?.name || 'No plan' },
        { title: 'Status', render: (_, tenant) => <StatusBadge value={tenant.status} /> },
        { title: 'Created', render: (_, tenant) => formatDate(tenant.created_at) },
        { title: '', width: 52, render: (_, tenant) => <ActionDropdown items={[{ label:'Open tenant',icon:<EyeOutlined />,onClick:()=>open(tenant) },{ label:'Edit details',icon:<EditOutlined />,onClick:()=>router.visit(route('central.tenants.edit',tenant.id)) }]} /> },
    ];
    const tabItems = statuses.map((status) => ({ key: status, label: status === 'all' ? 'All tenants' : status.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()) }));

    return <CentralLayout title="Tenants">
        <PageHeader eyebrow="Workspace management" title="Tenants" description="Provision, monitor, and support every customer workspace from one place." actions={<Link href={route('central.tenants.create')}><Button type="primary" icon={<PlusOutlined />}>Create tenant</Button></Link>} />
        <Row gutter={[14,14]} style={{ marginBottom: 16 }}>
            <Col xs={12} xl={6}><MetricCard label="All tenants" value={summary.total || 0} helper="Across every lifecycle stage" icon={<TeamOutlined />} /></Col>
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
            <div className="central-mobile-list">{tenants.data.map((tenant) => <div className="central-mobile-card" key={tenant.id}><TenantIdentity tenant={tenant} /><div className="central-mobile-card__row"><StatusBadge value={tenant.status} /><Typography.Text type="secondary">{tenant.plan?.name || 'No plan'}</Typography.Text><ActionDropdown items={[{label:'Open tenant',onClick:()=>open(tenant)},{label:'Edit details',onClick:()=>router.visit(route('central.tenants.edit',tenant.id))}]} /></div></div>)}</div>
        </SectionCard>
    </CentralLayout>;
}

function TableShim({ columns, tenants, filters }) {
    return <Table rowKey="id" dataSource={tenants.data} columns={columns} scroll={{ x: 850 }} pagination={{ current:tenants.current_page,total:tenants.total,pageSize:tenants.per_page,showSizeChanger:false,onChange:(page)=>router.get(tenants.path,{...filters,page},{preserveState:true}) }} />;
}
