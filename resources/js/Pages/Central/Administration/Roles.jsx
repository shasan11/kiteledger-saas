import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import { humanize } from '@/Components/Central/formatters';
import { router } from '@inertiajs/react';
import { Alert, Button, Checkbox, Col, Input, Row, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';

export default function Roles({ roles, permissions }) {
    const [selectedId, setSelectedId] = useState(roles[0]?.id);
    const selected = roles.find((role) => role.id === selectedId) || roles[0];
    const [drafts, setDrafts] = useState(() => Object.fromEntries(roles.map((role) => [role.id, { label: role.label, permissions: role.permissions.map((permission) => permission.id) }])));
    const draft = drafts[selected?.id] || { label: '', permissions: [] };
    const allIds = useMemo(() => Object.values(permissions).flat().map((permission) => permission.id), [permissions]);
    const locked = selected?.name === 'super_administrator';
    const update = (changes) => setDrafts((current) => ({ ...current, [selected.id]: { ...current[selected.id], ...changes } }));
    const save = () => router.put(route('central.roles.update', selected.id), draft, { preserveScroll: true });

    return <CentralLayout title="Roles and Permissions">
        <PageHeader eyebrow="Administration" title="Roles and Permissions" description="Grant the least privilege needed for each control-center responsibility. Every change is audited." actions={<Button type="primary" onClick={save}>Save role</Button>}/>
        <Row gutter={[18, 18]}>
            <Col xs={24} lg={7}><SectionCard title="Platform roles"><Space direction="vertical" style={{ width: '100%' }} size={6}>{roles.map((role) => <Button key={role.id} type={role.id === selected?.id ? 'primary' : 'text'} onClick={() => setSelectedId(role.id)} style={{ height: 'auto', minHeight: 48, justifyContent: 'space-between', textAlign: 'left' }}><span><strong>{role.label}</strong><br/><Typography.Text type="secondary">{role.permissions_count} permissions</Typography.Text></span></Button>)}</Space></SectionCard></Col>
            <Col xs={24} lg={17}><SectionCard title={selected?.label} description={selected ? `Stable role key: ${selected.name}` : ''} extra={!locked && <Button size="small" onClick={() => update({ permissions: draft.permissions.length === allIds.length ? [] : allIds })}>{draft.permissions.length === allIds.length ? 'Clear all' : 'Select all'}</Button>}>
                {locked && <Alert type="info" showIcon message="Super Administrator always retains every platform permission." style={{ marginBottom: 18 }}/>} 
                <label className="central-field-label" htmlFor="role-label">Display name</label><Input id="role-label" value={draft.label} onChange={(event) => update({ label: event.target.value })} style={{ marginBottom: 20 }} />
                <Row gutter={[14, 14]}>{Object.entries(permissions).map(([group, entries]) => <Col xs={24} md={12} key={group}><div className="central-permission-group"><Typography.Title level={5}>{humanize(group)}</Typography.Title><Checkbox.Group disabled={locked} value={draft.permissions} onChange={(values) => update({ permissions: values })} style={{ display: 'grid', gap: 9 }}>{entries.map((permission) => <Checkbox key={permission.id} value={permission.id}><span>{permission.label}</span> <Tag>{permission.name}</Tag></Checkbox>)}</Checkbox.Group></div></Col>)}</Row>
            </SectionCard></Col>
        </Row>
    </CentralLayout>;
}
