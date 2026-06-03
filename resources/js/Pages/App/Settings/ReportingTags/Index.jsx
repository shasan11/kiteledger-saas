import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button, Card, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message, theme } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, TagsOutlined } from '@ant-design/icons';
import axios from 'axios';
import ActionDropdown from '@/Components/ActionDropdown';
import { humanizeLabel, humanizeOptions } from '@/utils/humanizeLabel';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const listFrom = (data) => (Array.isArray(data) ? data : data?.results || data?.data || []);
const getError = (error, fallback) => error?.response?.data?.message || Object.values(error?.response?.data || {})?.[0]?.[0] || fallback;
const tagTypes = ['text', 'number', 'date', 'select', 'multi_select', 'boolean'];
const optionTypes = ['select', 'multi_select'];

export default function ReportingTags() {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const type = Form.useWatch('type', form);
  const showOptions = optionTypes.includes(type);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/reporting-tags'), { params: { page_size: 100 } });
      setRows(listFrom(data));
    } catch (error) {
      message.error(getError(error, 'Failed to load reporting tags'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openForm = (record = null) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      name: record?.name || '',
      code: record?.code || '',
      type: record?.type || 'text',
      description: record?.description || '',
      color: record?.color || '#1677ff',
      sort_order: record?.sort_order ?? 0,
      lines: (record?.lines || record?.reporting_tag_lines || []).map((line) => ({
        id: line.id,
        name: line.name,
        value: line.value || line.name,
        color: line.color || '',
        sort_order: line.sort_order ?? 0,
      })),
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        lines: optionTypes.includes(values.type) ? values.lines || [] : [],
        deleted_line_ids: [],
      };

      if (editing?.id) {
        await axios.patch(api(`/api/reporting-tags/${editing.id}`), payload);
        message.success('Reporting tag updated');
      } else {
        await axios.post(api('/api/reporting-tags'), payload);
        message.success('Reporting tag created');
      }
      setOpen(false);
      await load();
    } catch (error) {
      if (!error?.errorFields) message.error(getError(error, 'Failed to save reporting tag'));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', render: (value) => <Text strong>{value}</Text> },
    { title: 'Type', dataIndex: 'type', render: (value) => <Tag>{humanizeLabel(value)}</Tag> },
    { title: 'Options Count', render: (_, row) => (row.lines || row.reporting_tag_lines || []).length },
    { title: 'Color', dataIndex: 'color', render: (color) => color ? <Tag color={color}>{color}</Tag> : '-' },
    { title: 'Sort Order', dataIndex: 'sort_order', width: 120 },
    {
      title: 'Actions',
      width: 80,
      render: (_, record) => (
        <ActionDropdown items={[
          { label: 'View', icon: <EyeOutlined />, onClick: () => setViewing(record) },
          { label: 'Edit', icon: <EditOutlined />, onClick: () => openForm(record) },
        ]} />
      ),
    },
  ], []);

  return (
    <div style={{ padding: token.padding }}>
      <Head title="Reporting Tags" />
      <Card
        size="small"
        title={<><TagsOutlined /> Reporting Tags</>}
        extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>New Tag</Button></Space>}
      >
        <Table rowKey="id" loading={loading} size="small" columns={columns} dataSource={rows} scroll={{ x: 900 }} />
      </Card>

      <Drawer
        title={editing ? 'Edit Reporting Tag' : 'New Reporting Tag'}
        open={open}
        onClose={() => setOpen(false)}
        width={920}
        extra={<Space><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save</Button></Space>}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="code" label="Code"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="type" label="Tag Type" rules={[{ required: true }]}><Select options={humanizeOptions(tagTypes)} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="color" label="Color"><Input type="color" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="sort_order" label="Display Order"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24}><Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>

          {showOptions ? (
            <Card size="small" title="Options" style={{ marginTop: token.marginSM }}>
              <Form.List
                name="lines"
                rules={[{ validator: async (_, value) => (value?.length ? Promise.resolve() : Promise.reject(new Error('Add at least one option'))) }]}
              >
                {(fields, { add, remove }, { errors }) => (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {fields.map((field) => (
                      <Row key={field.key} gutter={8} align="middle">
                        <Col xs={24} md={7}><Form.Item {...field} name={[field.name, 'name']} label="Label" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col xs={24} md={7}><Form.Item {...field} name={[field.name, 'value']} label="Value" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col xs={12} md={4}><Form.Item {...field} name={[field.name, 'color']} label="Color"><Input type="color" /></Form.Item></Col>
                        <Col xs={12} md={4}><Form.Item {...field} name={[field.name, 'sort_order']} label="Order"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col xs={24} md={2}><Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></Col>
                      </Row>
                    ))}
                    <Button icon={<PlusOutlined />} onClick={() => add({ name: '', value: '', color: '', sort_order: fields.length })}>Add Option</Button>
                    <Form.ErrorList errors={errors} />
                  </Space>
                )}
              </Form.List>
            </Card>
          ) : null}
        </Form>
      </Drawer>

      <Drawer title="Reporting Tag" width={520} open={!!viewing} onClose={() => setViewing(null)}>
        {viewing ? (
          <Space direction="vertical" size={8}>
            <Text strong>{viewing.name}</Text>
            <Tag>{humanizeLabel(viewing.type)}</Tag>
            <Text>{viewing.description || 'No description'}</Text>
            <Space wrap>{(viewing.lines || viewing.reporting_tag_lines || []).map((line) => <Tag key={line.id || line.name} color={line.color}>{line.name}</Tag>)}</Space>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
