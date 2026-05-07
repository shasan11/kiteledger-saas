import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { api, cleanPayload } from './settingsApi';

const renderValue = (field, value, record) => {
  if (field.render) return field.render(value, record);
  if (field.type === 'boolean') return <Tag color={value ? 'green' : 'default'}>{value ? 'Yes' : 'No'}</Tag>;
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '-';
};

function RichTextInput({ value = '', onChange }) {
  return (
    <div>
      <Space size={4} style={{ marginBottom: 8 }}>
        {[
          ['Bold', 'bold'],
          ['Italic', 'italic'],
          ['List', 'insertUnorderedList'],
        ].map(([label, command]) => (
          <Button
            key={command}
            size="small"
            onMouseDown={(event) => {
              event.preventDefault();
              document.execCommand(command);
            }}
          >
            {label}
          </Button>
        ))}
      </Space>
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange?.(event.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        style={{
          minHeight: 180,
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          padding: 10,
          background: '#fff',
        }}
      />
    </div>
  );
}

export default function SimpleSettingsCrud({ endpoint, columns, fields, initialValues, rowKey = 'id' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api(endpoint), { params: { page_size: 100 } });
      setRows(data?.results || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [endpoint]);

  const tableColumns = useMemo(() => [
    ...columns.map((column) => ({
      ...column,
      render: (value, record) => renderValue(column, value, record),
    })),
    {
      title: '',
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Button size="small" onClick={() => {
          setEditing(record);
          form.setFieldsValue(record);
          setOpen(true);
        }}>
          Edit
        </Button>
      ),
    },
  ], [columns, form]);

  const save = async () => {
    const values = cleanPayload(await form.validateFields());
    if (editing?.[rowKey]) {
      await axios.patch(api(`${endpoint}/${editing[rowKey]}`), values);
      message.success('Updated');
    } else {
      await axios.post(api(endpoint), values);
      message.success('Created');
    }
    setOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const renderInput = (field) => {
    if (field.type === 'number') return <InputNumber min={field.min} max={field.max} style={{ width: '100%' }} />;
    if (field.type === 'switch') return <Switch />;
    if (field.type === 'textarea') return <Input.TextArea rows={4} />;
    if (field.type === 'richtext') return <RichTextInput />;
    if (field.type === 'select') return <Select options={field.options || []} allowClear mode={field.mode} />;
    return <Input />;
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null);
          form.setFieldsValue(initialValues);
          setOpen(true);
        }}>
          Add
        </Button>
      </Space>
      <Table rowKey={rowKey} size="middle" loading={loading} columns={tableColumns} dataSource={rows} pagination={{ pageSize: 20 }} />
      <Modal title={editing ? 'Edit configuration' : 'Add configuration'} open={open} onCancel={() => setOpen(false)} onOk={save} width={760} destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={initialValues}>
          {fields.map((field) => (
            <Form.Item key={field.name} name={field.name} label={field.label} valuePropName={field.type === 'switch' ? 'checked' : 'value'} rules={field.rules || []}>
              {renderInput(field)}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </Space>
  );
}
