import MetricCard from '@/Components/Central/MetricCard';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';
import { AlertOutlined, ClockCircleOutlined, MessageOutlined, SearchOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Col, DatePicker, Input, Row, Select, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

export default function SupportIndex({ tickets, metrics, filters = {}, filterOptions }) {
    const [search, setSearch] = useState(filters.search || '');
    const apply = (extra) => router.get(window.location.pathname, { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const cards = [['Open', metrics.open, <MessageOutlined/>, 'blue'], ['Unassigned', metrics.unassigned, <UserDeleteOutlined/>, 'amber'], ['Urgent', metrics.urgent, <AlertOutlined/>, 'rose'], ['SLA breached', metrics.sla_breached, <ClockCircleOutlined/>, 'rose'], ['Awaiting support', metrics.pending_support, <MessageOutlined/>, 'violet'], ['Resolved today', metrics.resolved_today, <MessageOutlined/>, 'emerald']];
    const columns = [
        { title: 'Ticket', dataIndex: 'ticket_number' }, { title: 'Subject', dataIndex: 'subject' },
        { title: 'Tenant', render: (_, row) => row.tenant?.company_name || row.tenant_id },
        { title: 'Requester', render: (_, row) => <span>{row.requester_name}<Typography.Text type="secondary" style={{ display: 'block' }}>{row.requester_email}</Typography.Text></span> },
        { title: 'Priority', render: (_, row) => <StatusBadge value={row.priority}/> }, { title: 'Status', render: (_, row) => <StatusBadge value={row.status}/> },
        { title: 'Assignee', render: (_, row) => row.assignee?.name || 'Unassigned' }, { title: 'Last reply', render: (_, row) => formatDate(row.last_reply_at, true) },
    ];
    const option = (items, label) => items.map((item) => ({ value: item.id, label: item[label] }));
    const range = (from, to) => filters[from] || filters[to] ? [filters[from] ? dayjs(filters[from]) : null, filters[to] ? dayjs(filters[to]) : null] : null;
    const dateChange = (from, to, values) => apply({ [from]: values?.[0] || undefined, [to]: values?.[1] || undefined, page: undefined });

    return <CentralLayout title="Support Tickets">
        <PageHeader eyebrow="Support" title="Support Tickets" description="A tenant-aware inbox for assignments, conversations, internal notes, private attachments, and SLA response."/>
        <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>{cards.map(([label, value, icon, tone]) => <Col xs={12} md={8} xl={4} key={label}><MetricCard label={label} value={value} icon={icon} tone={tone}/></Col>)}</Row>
        <SectionCard>
            <div className="central-toolbar">
                <Input.Search prefix={<SearchOutlined/>} value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => apply({ page: undefined })} placeholder="Ticket, subject, or requester" allowClear/>
                <Select allowClear value={filters.view} placeholder="View" onChange={(view) => apply({ view, page: undefined })} options={['mine', 'unassigned', 'urgent', 'sla_breached', 'pending_customer', 'resolved', 'closed'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))}/>
                <Select allowClear value={filters.tenant_id} showSearch optionFilterProp="label" placeholder="Tenant" onChange={(tenant_id) => apply({ tenant_id, page: undefined })} options={option(filterOptions.tenants, 'company_name')}/>
                <Select allowClear value={filters.category_id && Number(filters.category_id)} placeholder="Category" onChange={(category_id) => apply({ category_id, page: undefined })} options={option(filterOptions.categories, 'name')}/>
                <Select allowClear value={filters.status} placeholder="Status" onChange={(status) => apply({ status, page: undefined })} options={['open', 'pending_support', 'pending_customer', 'resolved', 'closed'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))}/>
                <Select allowClear value={filters.priority} placeholder="Priority" onChange={(priority) => apply({ priority, page: undefined })} options={['low', 'normal', 'high', 'urgent'].map((value) => ({ value, label: value }))}/>
                <Select allowClear value={filters.assigned_admin_id && Number(filters.assigned_admin_id)} placeholder="Assignee" onChange={(assigned_admin_id) => apply({ assigned_admin_id, page: undefined })} options={option(filterOptions.admins, 'name')}/>
                <Select allowClear value={filters.source} placeholder="Source" onChange={(source) => apply({ source, page: undefined })} options={filterOptions.sources.map((source) => ({ value: source, label: source }))}/>
                <Select allowClear value={filters.sla_state} placeholder="SLA state" onChange={(sla_state) => apply({ sla_state, page: undefined })} options={[{ value: 'healthy', label: 'Healthy' }, { value: 'breached', label: 'Breached' }]}/>
                <DatePicker.RangePicker value={range('created_from', 'created_to')} onChange={(_, values) => dateChange('created_from', 'created_to', values)} placeholder={['Created from', 'Created to']}/>
                <DatePicker.RangePicker value={range('last_reply_from', 'last_reply_to')} onChange={(_, values) => dateChange('last_reply_from', 'last_reply_to', values)} placeholder={['Last reply from', 'Last reply to']}/>
                <Button onClick={() => router.get(window.location.pathname)}>Clear filters</Button>
            </div>
            <Table rowKey="id" dataSource={tickets.data} columns={columns} scroll={{ x: 1100 }} onRow={(row) => ({ onClick: () => router.visit(route('central.support.tickets.show', row.id)), style: { cursor: 'pointer' } })} pagination={{ current: tickets.current_page, total: tickets.total, pageSize: tickets.per_page, onChange: (page) => apply({ page }), showSizeChanger: false }}/>
        </SectionCard>
    </CentralLayout>;
}
