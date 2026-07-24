import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { useState } from 'react';

export default function Menus({ location, locations, menus, pages }) {
    const [record, setRecord] = useState(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const edit = (menu = null) => { setRecord(menu); form.resetFields(); form.setFieldsValue(menu || { location, target: 'same_tab', is_active: true, sort_order: menus.length }); setOpen(true); };
    const save = (values) => { const options = { preserveScroll: true, onSuccess: () => setOpen(false) }; record ? router.put(route('central.website-menus.update', record.id), values, options) : router.post(route('central.website-menus.store'), values, options); };
    const move = (index, direction) => { const ids = menus.map((menu) => menu.id); const target = index + direction; if (target < 0 || target >= ids.length) return; [ids[index], ids[target]] = [ids[target], ids[index]]; router.put(route('central.website-menus.reorder'), { location, ids }, { preserveScroll: true }); };
    const remove = (menu) => Modal.confirm({ title: `Delete ${menu.label}?`, content: 'This item will be removed from public navigation.', okText: 'Delete item', okButtonProps: { danger: true }, onOk: () => router.delete(route('central.website-menus.destroy', menu.id)) });
    const columns = [
        { title: 'Order', width: 100, render: (_, row, index) => <Space><Button size="small" icon={<ArrowUpOutlined/>} disabled={index === 0} onClick={() => move(index, -1)}/><Button size="small" icon={<ArrowDownOutlined/>} disabled={index === menus.length - 1} onClick={() => move(index, 1)}/></Space> },
        { title: 'Label', dataIndex: 'label', render: (value, row) => <><strong>{value}</strong>{row.parent_id && <Tag style={{ marginLeft: 8 }}>Nested</Tag>}</> },
        { title: 'Destination', render: (_, row) => row.page ? `${row.page.title} (/${row.page.slug})` : row.url },
        { title: 'Target', dataIndex: 'target' },
        { title: 'Icon', dataIndex: 'icon', render: (value) => value || '—' },
        { title: 'Status', dataIndex: 'is_active', render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Hidden'}</Tag> },
        { title: '', width: 130, render: (_, row) => <Space><Button icon={<EditOutlined/>} onClick={() => edit(row)}/><Button danger icon={<DeleteOutlined/>} onClick={() => remove(row)}/></Space> },
    ];
    return <CentralLayout title="Navigation Menus"><PageHeader eyebrow="Website" title="Navigation Menus" description="Maintain header, footer, legal, product, and resource navigation with internal, external, and nested links." actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => edit()}>Add menu item</Button>}/><SectionCard><div className="central-toolbar"><Select value={location} style={{ minWidth: 220 }} options={locations.map((value) => ({ value, label: `${value[0].toUpperCase()}${value.slice(1)} menu` }))} onChange={(next) => router.get(route('central.website-menus.index'), { location: next })}/><span className="central-filter-summary">{menus.length} items</span></div><Table rowKey="id" dataSource={menus} columns={columns} pagination={false} scroll={{ x: 850 }}/></SectionCard><Drawer open={open} onClose={() => setOpen(false)} width={560} title={record ? 'Edit menu item' : 'Add menu item'} extra={<Button type="primary" onClick={() => form.submit()}>Save</Button>}><Form form={form} layout="vertical" onFinish={save}><Form.Item name="label" label="Label" rules={[{ required: true }]}><Input/></Form.Item><Form.Item name="location" label="Menu" rules={[{ required: true }]}><Select options={locations.map((value) => ({ value, label: value }))}/></Form.Item><Form.Item name="page_id" label="Internal page"><Select allowClear showSearch optionFilterProp="label" options={pages.map((page) => ({ value: page.id, label: page.title }))}/></Form.Item><Form.Item name="url" label="External or custom URL" extra="Used when no internal page is selected."><Input/></Form.Item><Form.Item name="parent_id" label="Parent item"><Select allowClear options={menus.filter((menu) => menu.id !== record?.id).map((menu) => ({ value: menu.id, label: menu.label }))}/></Form.Item><div className="central-two-column"><Form.Item name="target" label="Target" rules={[{ required: true }]}><Select options={[{ value: 'same_tab', label: 'Same tab' }, { value: 'new_tab', label: 'New tab' }]}/></Form.Item><Form.Item name="icon" label="Icon name"><Input/></Form.Item></div><Space size="large"><Form.Item name="sort_order" label="Sort order"><InputNumber min={0}/></Form.Item><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch/></Form.Item></Space></Form></Drawer></CentralLayout>;
}
