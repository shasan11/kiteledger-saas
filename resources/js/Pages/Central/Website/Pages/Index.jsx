import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Input, Modal, Select, Table, Tag } from 'antd';
import { useState } from 'react';

export default function PagesIndex({ pages, filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const apply = (extra = {}) => router.get(route('central.website-pages.index'), { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const remove = (page) => Modal.confirm({ title: `Delete ${page.title}?`, content: 'The page will be moved to the archive and removed from public navigation.', okText: 'Delete page', okButtonProps: { danger: true }, onOk: () => router.delete(route('central.website-pages.destroy', page.id)) });
    const columns = [
        { title: 'Page', key: 'page', render: (_, row) => <><strong>{row.title}</strong><br/><span className="central-muted">/{row.slug}</span></> },
        { title: 'Type', dataIndex: 'page_type', render: (value) => <Tag>{value}</Tag> },
        { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge value={value}/> },
        { title: 'Visibility', dataIndex: 'visibility' },
        { title: 'Sections', dataIndex: 'sections_count' },
        { title: 'Publication', key: 'publication', render: (_, row) => formatDate(row.scheduled_at || row.published_at, true) },
        { title: '', width: 150, render: (_, row) => <span style={{ display: 'flex', gap: 6 }}><Button icon={<EyeOutlined/>} aria-label={`Preview ${row.title}`} onClick={() => window.open(route('central.website-pages.preview', row.id), '_blank', 'noopener,noreferrer')}/><Button icon={<EditOutlined/>} aria-label={`Edit ${row.title}`} onClick={() => router.visit(route('central.website-pages.edit', row.id))}/><Button danger icon={<DeleteOutlined/>} aria-label={`Delete ${row.title}`} onClick={() => remove(row)}/></span> },
    ];
    return <CentralLayout title="Website Pages">
        <PageHeader eyebrow="Website" title="Pages" description="Create, schedule, preview, and revise every public page without code changes." actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => router.visit(route('central.website-pages.create'))}>Create page</Button>}/>
        <SectionCard><div className="central-toolbar"><Input.Search className="central-toolbar__search" prefix={<SearchOutlined/>} value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => apply({ page: undefined })} allowClear placeholder="Search title or slug"/><Select allowClear placeholder="All statuses" value={filters.status || undefined} onChange={(status) => apply({ status, page: undefined })} options={['draft', 'scheduled', 'published', 'archived'].map((value) => ({ value, label: value }))}/><span className="central-filter-summary">{pages.total} pages</span></div><Table rowKey="id" dataSource={pages.data} columns={columns} scroll={{ x: 900 }} pagination={{ current: pages.current_page, total: pages.total, pageSize: pages.per_page, showSizeChanger: false, onChange: (page) => apply({ page }) }}/></SectionCard>
    </CentralLayout>;
}
