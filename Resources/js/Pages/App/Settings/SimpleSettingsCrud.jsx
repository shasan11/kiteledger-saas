import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  DownOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import axios from 'axios';
import JoditEditor from 'jodit-react';
import 'jodit/es2021/jodit.min.css';

import { api, cleanPayload } from './settingsApi';

const { Text } = Typography;

const stripHtml = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const renderValue = (field, value, record) => {
  if (field.render) return field.render(value, record);

  if (field.type === 'boolean') {
    return <Tag color={value ? 'green' : 'default'}>{value ? 'Yes' : 'No'}</Tag>;
  }

  if (Array.isArray(value)) return value.join(', ');

  if (field.type === 'richtext') {
    const plain = stripHtml(value);
    return plain ? `${plain.slice(0, 120)}${plain.length > 120 ? '...' : ''}` : '-';
  }

  return value ?? '-';
};

const normalizeTemplateKeys = (keys = []) => {
  if (!Array.isArray(keys)) return [];

  return keys
    .map((item) => {
      if (typeof item === 'string') {
        return {
          label: item,
          value: item,
          group: 'Keys',
        };
      }

      return {
        label: item.label || item.name || item.key || item.value,
        value: item.value || item.key || item.name,
        group: item.group || 'Keys',
      };
    })
    .filter((item) => item.label && item.value);
};

function JoditRichTextInput({
  value = '',
  onChange,
  templateKeys = [],
  placeholder = 'Write your template here...',
  height = 620,
  disabled = false,
}) {
  const editorRef = useRef(null);
  const { token } = theme.useToken();

  const normalizedKeys = useMemo(() => normalizeTemplateKeys(templateKeys), [templateKeys]);

  const keyMenuItems = useMemo(
    () =>
      normalizedKeys.map((item, index) => ({
        key: `${item.value}-${index}`,
        label: (
          <Space direction="vertical" size={0}>
            <Text strong>{item.label}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.value}
            </Text>
          </Space>
        ),
        value: item.value,
      })),
    [normalizedKeys]
  );

  const insertHtml = (html) => {
    const editor = editorRef.current;

    if (!editor || disabled) return;

    editor.selection.insertHTML(html);
    const nextHtml = editor.value;
    onChange?.(nextHtml);
  };

  const insertKey = ({ key }) => {
    const selected = keyMenuItems.find((item) => item.key === key);
    if (!selected?.value) return;

    insertHtml(selected.value);
  };

  const config = useMemo(
    () => ({
      readonly: disabled,
      placeholder,
      height,
      minHeight: height,

      toolbarAdaptive: false,
      toolbarSticky: true,
      toolbarStickyOffset: 0,

      showCharsCounter: true,
      showWordsCounter: true,
      showXPathInStatusbar: false,

      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: 'insert_as_html',

      saveModeInStorage: false,

      cleanHTML: {
        fillEmptyParagraph: false,
        removeEmptyElements: false,
        replaceNBSP: true,
      },

      buttons: [
        'source',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'superscript',
        'subscript',
        '|',
        'ul',
        'ol',
        'outdent',
        'indent',
        '|',
        'font',
        'fontsize',
        'brush',
        'paragraph',
        '|',
        'left',
        'center',
        'right',
        'justify',
        '|',
        'table',
        'link',
        'image',
        'video',
        '|',
        'hr',
        'eraser',
        'copyformat',
        '|',
        'undo',
        'redo',
        '|',
        'fullsize',
        'preview',
        'print',
      ],

      uploader: {
        insertImageAsBase64URI: true,
      },

      image: {
        editSrc: true,
        useImageEditor: false,
        openOnDblClick: true,
      },

      table: {
        allowCellSelection: true,
        useExtraClassesOptions: false,
      },

      controls: {
        font: {
          list: {
            Arial: 'Arial',
            Helvetica: 'Helvetica',
            'Times New Roman': 'Times New Roman',
            Georgia: 'Georgia',
            Verdana: 'Verdana',
            Tahoma: 'Tahoma',
            Courier: 'Courier',
            Consolas: 'Consolas',
          },
        },
        fontsize: {
          list: [
            '8',
            '10',
            '12',
            '14',
            '16',
            '18',
            '20',
            '24',
            '28',
            '32',
            '36',
            '48',
          ],
        },
      },

      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '14px',
        lineHeight: '1.62',
        color: token.colorText,
      },

      events: {
        afterInit: (editor) => {
          editorRef.current = editor;
        },
      },
    }),
    [disabled, placeholder, height, token.colorText]
  );

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        background: token.colorBgContainer,
      }}
    >
      <Space
        wrap
        size={8}
        style={{
          width: '100%',
          padding: token.paddingXS,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillAlter,
        }}
      >
        <Dropdown
          trigger={['click']}
          disabled={!keyMenuItems.length || disabled}
          menu={{
            items: keyMenuItems.length
              ? keyMenuItems
              : [
                  {
                    key: 'empty',
                    label: 'No keys provided',
                    disabled: true,
                  },
                ],
            onClick: insertKey,
          }}
        >
          <Button size="small">
            Insert Key <DownOutlined />
          </Button>
        </Dropdown>

        <Button
          size="small"
          disabled={disabled}
          onClick={() => {
            insertHtml(`
              <table style="width:100%; border-collapse:collapse;" border="1">
                <thead>
                  <tr>
                    <th style="padding:8px;">Label</th>
                    <th style="padding:8px;">Value</th>
                    <th style="padding:8px;">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:8px;">{{label}}</td>
                    <td style="padding:8px;">{{value}}</td>
                    <td style="padding:8px;">{{remarks}}</td>
                  </tr>
                </tbody>
              </table>
            `);
          }}
        >
          Default Table
        </Button>

        <Button
          size="small"
          disabled={disabled}
          onClick={() => {
            insertHtml(`
              <div style="border:1px solid #d9d9d9; padding:12px; border-radius:6px;">
                <h3 style="margin-top:0;">Section Title</h3>
                <p>Write your section content here...</p>
              </div>
            `);
          }}
        >
          Section Box
        </Button>

        <Button
          size="small"
          disabled={disabled}
          onClick={() => {
            insertHtml(`
              <div style="display:flex; justify-content:space-between; gap:16px;">
                <div style="width:50%;">
                  <strong>From:</strong><br />
                  {{company.name}}<br />
                  {{company.address}}
                </div>
                <div style="width:50%; text-align:right;">
                  <strong>To:</strong><br />
                  {{customer.name}}<br />
                  {{customer.address}}
                </div>
              </div>
            `);
          }}
        >
          From / To Block
        </Button>
      </Space>

      <JoditEditor
        ref={editorRef}
        value={value || ''}
        config={config}
        onBlur={(newContent) => {
          onChange?.(newContent);
        }}
        onChange={() => {}}
      />
    </div>
  );
}

export default function SimpleSettingsCrud({
  endpoint,
  columns,
  fields,
  initialValues = {},
  rowKey = 'id',
  formMode = 'modal',
  drawerWidth = 1080,
  templateKeys = [],
  richTextProps = {},
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get(api(endpoint), {
        params: {
          page_size: 100,
        },
      });

      setRows(Array.isArray(data) ? data : data?.results || data?.data || []);
    } catch (error) {
      message.error(error?.response?.data?.detail || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const tableColumns = useMemo(
    () => [
      ...columns
        .filter((column) => !column.hidden)
        .map((column) => ({
          ...column,
          render: (value, record) => renderValue(column, value, record),
        })),
      {
        title: '',
        key: 'actions',
        width: 110,
        fixed: 'right',
        render: (_, record) => (
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              form.setFieldsValue({
                ...initialValues,
                ...record,
              });
              setOpen(true);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [columns, form, initialValues]
  );

  const save = async () => {
    try {
      const formValues = await form.validateFields();
      const baseValues = editing ? editing : initialValues;
      const allowedNames = fields.map((field) => field.name).filter(Boolean);

      const values = cleanPayload(
        Object.fromEntries(
          allowedNames.map((name) => [
            name,
            formValues[name] ?? baseValues?.[name] ?? null,
          ])
        )
      );

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
    } catch (error) {
      if (error?.errorFields) return;

      const response = error?.response?.data;

      if (response && typeof response === 'object') {
        const firstKey = Object.keys(response)[0];
        const firstValue = response[firstKey];

        message.error(
          Array.isArray(firstValue)
            ? `${firstKey}: ${firstValue[0]}`
            : response.detail || 'Save failed'
        );
        return;
      }

      message.error('Save failed');
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue(initialValues);
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const renderInput = (field) => {
    if (field.type === 'number') {
      return (
        <InputNumber
          min={field.min}
          max={field.max}
          precision={field.precision}
          style={{ width: '100%' }}
          placeholder={field.placeholder}
          disabled={field.disabled}
        />
      );
    }

    if (field.type === 'switch') {
      return <Switch disabled={field.disabled} />;
    }

    if (field.type === 'textarea') {
      return (
        <Input.TextArea
          rows={field.rows || 4}
          placeholder={field.placeholder}
          disabled={field.disabled}
        />
      );
    }

    if (field.type === 'richtext') {
      return (
        <JoditRichTextInput
          templateKeys={field.templateKeys || templateKeys}
          placeholder={field.placeholder || richTextProps.placeholder}
          height={field.height || richTextProps.height || 620}
          disabled={field.disabled}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <Select
          options={field.options || []}
          allowClear={field.allowClear !== false}
          mode={field.mode}
          showSearch={field.showSearch !== false}
          optionFilterProp="label"
          placeholder={field.placeholder}
          disabled={field.disabled}
        />
      );
    }

    return <Input placeholder={field.placeholder} disabled={field.disabled} />;
  };

  const formNode = (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      {fields
        .filter((field) => !field.hidden)
        .map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            valuePropName={field.type === 'switch' ? 'checked' : 'value'}
            rules={field.rules || []}
            extra={field.extra}
          >
            {renderInput(field)}
          </Form.Item>
        ))}
    </Form>
  );

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Refresh
        </Button>

        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add
        </Button>
      </Space>

      <Table
        rowKey={rowKey}
        size="middle"
        loading={loading}
        columns={tableColumns}
        dataSource={rows}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
        }}
        scroll={{
          x: 'max-content',
        }}
      />

      {formMode === 'drawer' ? (
        <Drawer
          title={editing ? 'Edit template' : 'Add template'}
          open={open}
          onClose={closeForm}
          width={drawerWidth}
          destroyOnHidden
          extra={
            <Space>
              <Button onClick={closeForm}>Cancel</Button>
              <Button type="primary" onClick={save}>
                Save
              </Button>
            </Space>
          }
        >
          {formNode}
        </Drawer>
      ) : (
        <Modal
          title={editing ? 'Edit configuration' : 'Add configuration'}
          open={open}
          onCancel={closeForm}
          onOk={save}
          width={1080}
          destroyOnHidden
        >
          {formNode}
        </Modal>
      )}
    </Space>
  );
}