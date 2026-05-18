import {
  Component as ReactComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Button,
  AutoComplete,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
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
  BorderOutlined,
  ColumnHeightOutlined,
  ColumnWidthOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons';

import axios from 'axios';
import JoditEditor from 'jodit-react';
import 'jodit/es2021/jodit.min.css';

import { api, cleanPayload } from './settingsApi';

const { Text, Title } = Typography;

const stripHtml = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const normalizePath = (value = '') =>
  String(value)
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

const listUrl = (endpoint) => api(normalizePath(endpoint));

const detailUrl = (endpoint, id) => {
  const cleanEndpoint = normalizePath(endpoint);
  const cleanId = encodeURIComponent(String(id));

  return api(`${cleanEndpoint}/${cleanId}`);
};

const getRecordKey = (record, rowKey) => {
  if (!record) return undefined;

  if (typeof rowKey === 'function') {
    return rowKey(record);
  }

  return record?.[rowKey];
};

const getFieldNameKey = (name) => {
  if (Array.isArray(name)) return name.join('.');
  return String(name);
};

const getErrorMessage = (error, fallback = 'Something went wrong') => {
  const response = error?.response?.data;

  if (!response) return fallback;

  if (typeof response === 'string') return response;

  if (response.detail) return response.detail;
  if (response.message) return response.message;

  if (typeof response === 'object') {
    const firstKey = Object.keys(response)[0];
    const firstValue = response[firstKey];

    if (Array.isArray(firstValue)) {
      return `${firstKey}: ${firstValue[0]}`;
    }

    if (typeof firstValue === 'string') {
      return `${firstKey}: ${firstValue}`;
    }
  }

  return fallback;
};

const renderValue = (field, value, record) => {
  if (field.render) return field.render(value, record);

  if (field.type === 'boolean' || field.type === 'switch') {
    return <Tag color={value ? 'green' : 'default'}>{value ? 'Yes' : 'No'}</Tag>;
  }

  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';

  if (field.type === 'richtext') {
    const plain = stripHtml(value);

    return plain
      ? `${plain.slice(0, 120)}${plain.length > 120 ? '...' : ''}`
      : '-';
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

const buildTableHtml = (rows = 3, cols = 3) => {
  const safeRows = Math.max(1, Number(rows) || 1);
  const safeCols = Math.max(1, Number(cols) || 1);
  const cellWidth = `${100 / safeCols}%`;

  const bodyRows = Array.from({ length: safeRows })
    .map(() => {
      const cells = Array.from({ length: safeCols })
        .map(
          () => `
            <td style="border:1px solid #222; padding:8px; min-height:24px; width:${cellWidth}; vertical-align:top;">
              <br />
            </td>
          `
        )
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin:10px 0;" border="1">
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <p><br /></p>
  `;
};

const clearCell = (cell) => {
  if (!cell) return;

  cell.innerHTML = '<br />';
};

const copyCellStyle = (fromCell, toCell) => {
  if (!fromCell || !toCell) return;

  toCell.style.cssText =
    fromCell.style.cssText ||
    'border:1px solid #222; padding:8px; min-height:24px; vertical-align:top;';

  toCell.setAttribute('style', toCell.style.cssText);

  if (!toCell.style.border) {
    toCell.style.border = '1px solid #222';
  }

  if (!toCell.style.padding) {
    toCell.style.padding = '8px';
  }

  toCell.innerHTML = '<br />';
};

const getSelectionNode = (editor) => {
  if (!editor) return null;

  const current = editor.s?.current?.();

  if (current) {
    return current.nodeType === 3 ? current.parentElement : current;
  }

  const selection =
    editor.editorWindow?.getSelection?.() ||
    editor.ownerWindow?.getSelection?.() ||
    window.getSelection?.();

  let node = selection?.anchorNode || null;

  if (node?.nodeType === 3) {
    node = node.parentElement;
  }

  return node;
};

const getClosestFromEditor = (editor, selector) => {
  const node = getSelectionNode(editor);

  if (!node) return null;

  if (node.matches?.(selector)) {
    return node;
  }

  return node.closest?.(selector) || null;
};

class RichTextErrorBoundary extends ReactComponent {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
      });
    }
  }

  render() {
    const { token } = this.props;

    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: token.padding,
            border: `1px solid ${token.colorErrorBorder}`,
            borderRadius: token.borderRadiusLG,
            background: token.colorErrorBg,
          }}
        >
          <Title level={5} style={{ marginTop: 0, color: token.colorError }}>
            Rich text editor failed to load
          </Title>

          <Text type="secondary">
            Check your Jodit package version and CSS import.
          </Text>

          {this.state.error?.message ? (
            <pre
              style={{
                marginTop: token.marginSM,
                whiteSpace: 'pre-wrap',
                fontSize: 12,
              }}
            >
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}

function WordTablePicker({ disabled, onInsert }) {
  const { token } = theme.useToken();

  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({
    rows: 3,
    cols: 3,
  });

  const rows = 10;
  const cols = 10;

  const content = (
    <div style={{ width: 256 }}>
      <Text
        strong
        style={{
          display: 'block',
          marginBottom: 8,
        }}
      >
        Insert table: {hover.rows} × {hover.cols}
      </Text>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 20px)`,
          gap: 4,
          marginBottom: 10,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, index) => {
          const row = Math.floor(index / cols) + 1;
          const col = (index % cols) + 1;
          const active = row <= hover.rows && col <= hover.cols;

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              onMouseEnter={() => {
                setHover({
                  rows: row,
                  cols: col,
                });
              }}
              onClick={() => {
                onInsert?.(row, col);
                setOpen(false);
              }}
              style={{
                width: 20,
                height: 20,
                padding: 0,
                cursor: 'pointer',
                border: `1px solid ${
                  active ? token.colorPrimary : token.colorBorder
                }`,
                background: active
                  ? token.colorPrimaryBg
                  : token.colorBgContainer,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>

      <Space.Compact style={{ width: '100%' }}>
        <InputNumber
          min={1}
          max={50}
          value={hover.rows}
          onChange={(value) => {
            setHover((prev) => ({
              ...prev,
              rows: Number(value) || 1,
            }));
          }}
          style={{ width: '50%' }}
          addonBefore="Rows"
        />

        <InputNumber
          min={1}
          max={20}
          value={hover.cols}
          onChange={(value) => {
            setHover((prev) => ({
              ...prev,
              cols: Number(value) || 1,
            }));
          }}
          style={{ width: '50%' }}
          addonBefore="Cols"
        />
      </Space.Compact>

      <Button
        block
        type="primary"
        size="small"
        style={{ marginTop: 8 }}
        onClick={() => {
          onInsert?.(hover.rows, hover.cols);
          setOpen(false);
        }}
      >
        Insert {hover.rows} × {hover.cols} Table
      </Button>
    </div>
  );

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      content={content}
      overlayStyle={{
        zIndex: 3000,
      }}
    >
      <Button size="small" icon={<TableOutlined />} disabled={disabled}>
        Table
      </Button>
    </Popover>
  );
}

function JoditRichTextInput({
  value = '',
  onChange,
  templateKeys = [],
  placeholder = 'Write your template here...',
  height = 620,
  disabled = false,
}) {
  const { token } = theme.useToken();

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const contentRef = useRef(value || '');
  const lastExternalValueRef = useRef(value || '');
  const mountedRef = useRef(false);

  const [editorKey, setEditorKey] = useState(0);
  const [initialContent, setInitialContent] = useState(value || '');

  const normalizedKeys = useMemo(
    () => normalizeTemplateKeys(templateKeys),
    [templateKeys]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const nextValue = value || '';

    if (nextValue !== lastExternalValueRef.current) {
      lastExternalValueRef.current = nextValue;
      contentRef.current = nextValue;
      setInitialContent(nextValue);
      setEditorKey((prev) => prev + 1);
    }
  }, [value]);

  const emitChange = useCallback(
    (nextValue) => {
      const safeValue = nextValue ?? '';

      contentRef.current = safeValue;
      lastExternalValueRef.current = safeValue;
      onChange?.(safeValue);
    },
    [onChange]
  );

  const getEditor = useCallback(() => {
    return editorInstanceRef.current || editorRef.current;
  }, []);

  const syncEditorValue = useCallback(() => {
    const editor = getEditor();

    if (!editor) {
      emitChange(contentRef.current || '');
      return;
    }

    const nextValue = editor.value ?? contentRef.current ?? '';

    emitChange(nextValue);
  }, [emitChange, getEditor]);

  const insertHtml = useCallback(
    (html) => {
      if (disabled) return;

      const editor = getEditor();

      if (!editor) {
        emitChange(`${contentRef.current || ''}${html}`);
        return;
      }

      editor.focus?.();

      if (editor.s?.insertHTML) {
        editor.s.insertHTML(html);
      } else if (editor.selection?.insertHTML) {
        editor.selection.insertHTML(html);
      } else {
        editor.value = `${editor.value || ''}${html}`;
      }

      window.setTimeout(() => {
        if (!mountedRef.current) return;
        syncEditorValue();
      }, 0);
    },
    [disabled, emitChange, getEditor, syncEditorValue]
  );

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

  const insertKey = ({ key }) => {
    const selected = keyMenuItems.find((item) => item.key === key);

    if (!selected?.value) return;

    insertHtml(selected.value);
  };

  const runTableAction = useCallback(
    (action) => {
      if (disabled) return;

      const editor = getEditor();

      if (!editor) {
        message.warning('Editor is not ready');
        return;
      }

      editor.focus?.();

      const cell = getClosestFromEditor(editor, 'td,th');
      const row = cell?.parentElement || null;
      const table = cell?.closest?.('table') || null;

      if (!cell || !row || !table) {
        message.warning('Click inside a table first');
        return;
      }

      const cellIndex = cell.cellIndex;

      if (action === 'row-above') {
        const newRow = row.cloneNode(true);

        Array.from(newRow.cells).forEach(clearCell);
        row.parentNode.insertBefore(newRow, row);
      }

      if (action === 'row-below') {
        const newRow = row.cloneNode(true);

        Array.from(newRow.cells).forEach(clearCell);
        row.parentNode.insertBefore(newRow, row.nextSibling);
      }

      if (action === 'col-left') {
        Array.from(table.rows).forEach((tableRow) => {
          const sourceCell =
            tableRow.cells[cellIndex] || tableRow.cells[tableRow.cells.length - 1];

          const newCell = tableRow.insertCell(Math.max(cellIndex, 0));

          copyCellStyle(sourceCell, newCell);
        });
      }

      if (action === 'col-right') {
        Array.from(table.rows).forEach((tableRow) => {
          const sourceCell =
            tableRow.cells[cellIndex] || tableRow.cells[tableRow.cells.length - 1];

          const newCell = tableRow.insertCell(Math.max(cellIndex + 1, 0));

          copyCellStyle(sourceCell, newCell);
        });
      }

      if (action === 'delete-row') {
        if (table.rows.length <= 1) {
          table.remove();
        } else {
          row.remove();
        }
      }

      if (action === 'delete-col') {
        const tableRows = Array.from(table.rows);

        tableRows.forEach((tableRow) => {
          if (tableRow.cells.length <= 1) {
            table.remove();
            return;
          }

          tableRow.deleteCell(cellIndex);
        });
      }

      if (action === 'delete-table') {
        table.remove();
      }

      window.setTimeout(() => {
        if (!mountedRef.current) return;
        syncEditorValue();
      }, 0);
    },
    [disabled, getEditor, syncEditorValue]
  );

  const config = useMemo(
    () => ({
      readonly: Boolean(disabled),
      disabled: Boolean(disabled),
      placeholder,
      height,
      minHeight: height,

      toolbar: true,
      toolbarButtonSize: 'middle',
      toolbarAdaptive: false,
      toolbarSticky: true,
      toolbarStickyOffset: 0,

      showCharsCounter: true,
      showWordsCounter: true,
      showXPathInStatusbar: false,

      spellcheck: true,
      iframe: false,

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
        'eraser',
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
        'link',
        'image',
        'video',
        'hr',
        '|',
        'copyformat',
        '|',
        'undo',
        'redo',
        '|',
        'selectall',
        'cut',
        'copy',
        'paste',
        '|',
        'preview',
        'print',
        'fullsize',
      ],

      buttonsMD: [
        'source',
        '|',
        'bold',
        'italic',
        'underline',
        '|',
        'ul',
        'ol',
        '|',
        'font',
        'fontsize',
        'brush',
        '|',
        'left',
        'center',
        'right',
        'justify',
        '|',
        'link',
        'image',
        '|',
        'undo',
        'redo',
        '|',
        'preview',
        'fullsize',
      ],

      buttonsSM: [
        'bold',
        'italic',
        'underline',
        '|',
        'ul',
        'ol',
        '|',
        'link',
        'image',
        '|',
        'undo',
        'redo',
        '|',
        'fullsize',
      ],

      uploader: {
        insertImageAsBase64URI: true,
        imagesExtensions: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'svg'],
      },

      image: {
        editSrc: true,
        useImageEditor: false,
        openOnDblClick: true,
      },

      link: {
        noFollowCheckbox: false,
        openInNewTabCheckbox: true,
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
          editorInstanceRef.current = editor;
        },
        change: (newValue) => {
          contentRef.current = newValue ?? '';
        },
      },
    }),
    [disabled, placeholder, height, token.colorText]
  );

  return (
    <RichTextErrorBoundary token={token} resetKey={editorKey}>
      <style>
        {`
          .jodit-popup,
          .jodit-dialog,
          .jodit-dialog__box,
          .jodit-context-menu {
            z-index: 3000 !important;
          }

          .jodit-container {
            border: 0 !important;
          }

          .jodit-workplace {
            min-height: ${height}px !important;
          }

          .jodit-wysiwyg table {
            border-collapse: collapse;
            width: 100%;
          }

          .jodit-wysiwyg table td,
          .jodit-wysiwyg table th {
            border: 1px solid #222;
            padding: 8px;
            min-width: 40px;
            vertical-align: top;
          }
        `}
      </style>

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

          <WordTablePicker
            disabled={disabled}
            onInsert={(rows, cols) => {
              insertHtml(buildTableHtml(rows, cols));
            }}
          />

          <Button
            size="small"
            icon={<ColumnHeightOutlined />}
            disabled={disabled}
            onClick={() => runTableAction('row-above')}
          >
            Row Above
          </Button>

          <Button
            size="small"
            icon={<ColumnHeightOutlined />}
            disabled={disabled}
            onClick={() => runTableAction('row-below')}
          >
            Row Below
          </Button>

          <Button
            size="small"
            icon={<ColumnWidthOutlined />}
            disabled={disabled}
            onClick={() => runTableAction('col-left')}
          >
            Col Left
          </Button>

          <Button
            size="small"
            icon={<ColumnWidthOutlined />}
            disabled={disabled}
            onClick={() => runTableAction('col-right')}
          >
            Col Right
          </Button>

          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled}
            onClick={() => runTableAction('delete-row')}
          >
            Delete Row
          </Button>

          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled}
            onClick={() => runTableAction('delete-col')}
          >
            Delete Col
          </Button>

          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled}
            onClick={() => runTableAction('delete-table')}
          >
            Delete Table
          </Button>

          <Button
            size="small"
            icon={<BorderOutlined />}
            disabled={disabled}
            onClick={() => {
              insertHtml(`
                <div style="border:1px solid #d9d9d9; padding:12px; border-radius:6px; margin:10px 0;">
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
                <div style="display:flex; justify-content:space-between; gap:16px; margin:10px 0;">
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
          key={editorKey}
          ref={editorRef}
          value={initialContent}
          config={config}
          onBlur={(newContent) => {
            emitChange(newContent);
          }}
          onChange={(newContent) => {
            contentRef.current = newContent ?? '';
            emitChange(newContent ?? '');
          }}
        />
      </div>
    </RichTextErrorBoundary>
  );
}

export default function SimpleSettingsCrud({
  endpoint,
  columns = [],
  fields = [],
  initialValues = {},
  rowKey = 'id',
  formMode = 'modal',
  drawerWidth = 1080,
  templateKeys = [],
  richTextProps = {},
  addButtonText = 'Add',
  editButtonText = 'Edit',
  modalTitle,
  drawerTitle,
  canAdd = true,
  canEdit = true,
  showActions = true,
}) {
  const { token } = theme.useToken();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form] = Form.useForm();

  const safeColumns = useMemo(
    () => columns.filter((column) => column && !column.hidden),
    [columns]
  );

  const safeFields = useMemo(
    () => fields.filter((field) => field && field.name),
    [fields]
  );

  const load = useCallback(async () => {
    if (!endpoint) return;

    setLoading(true);

    try {
      const { data } = await axios.get(listUrl(endpoint), {
        params: {
          page_size: 100,
        },
      });

      setRows(Array.isArray(data) ? data : data?.results || data?.data || []);
    } catch (error) {
      message.error(getErrorMessage(error, 'Failed to load records'));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = useCallback(
    (record) => {
      setEditing(record);

      form.resetFields();
      form.setFieldsValue({
        ...initialValues,
        ...record,
      });

      setOpen(true);
    },
    [form, initialValues]
  );

  const tableColumns = useMemo(
    () => [
      ...safeColumns.map((column) => ({
        ...column,
        render: (value, record) => renderValue(column, value, record),
      })),
      ...(showActions && canEdit ? [{
        title: '',
        key: 'actions',
        width: 110,
        fixed: 'right',
        render: (_, record) => (
          <Button size="small" onClick={() => openEdit(record)}>
            {editButtonText}
          </Button>
        ),
      }] : []),
    ],
    [safeColumns, openEdit, editButtonText, showActions, canEdit]
  );

  const buildPayload = (formValues) => {
    const source = {
      ...initialValues,
      ...formValues,
    };

    const payload = {};

    safeFields.forEach((field) => {
      if (field.noPayload) return;

      const name = field.name;

      if (
        field.hidden &&
        !Object.prototype.hasOwnProperty.call(initialValues, name)
      ) {
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(source, name)) {
        return;
      }

      payload[name] = source[name] === undefined ? null : source[name];
    });

    return cleanPayload(payload);
  };

  const save = async () => {
    setSaving(true);

    try {
      const formValues = await form.validateFields();
      const values = buildPayload(formValues);
      const editId = getRecordKey(editing, rowKey);

      if (editId) {
        await axios.patch(detailUrl(endpoint, editId), values);
        message.success('Updated');
      } else {
        await axios.post(listUrl(endpoint), values);
        message.success('Created');
      }

      setOpen(false);
      setEditing(null);
      form.resetFields();
      await load();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(getErrorMessage(error, 'Save failed'));
    } finally {
      setSaving(false);
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
    const disabled = field.disabled || saving;

    if (field.component) {
      const CustomComponent = field.component;

      return (
        <CustomComponent
          disabled={disabled}
          {...(field.componentProps || {})}
        />
      );
    }

    if (field.type === 'number') {
      return (
        <InputNumber
          min={field.min}
          max={field.max}
          precision={field.precision}
          style={{ width: '100%' }}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    }

    if (field.type === 'switch' || field.type === 'boolean') {
      return <Switch disabled={disabled} />;
    }

    if (field.type === 'textarea') {
      return (
        <Input.TextArea
          rows={field.rows || 4}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    }

    if (field.type === 'richtext') {
      return (
        <JoditRichTextInput
          templateKeys={field.templateKeys || templateKeys}
          placeholder={field.placeholder || richTextProps.placeholder}
          height={field.height || richTextProps.height || 620}
          disabled={disabled}
        />
      );
    }

    if (
      field.type === 'select' ||
      field.type === 'multi_select' ||
      field.type === 'multiselect'
    ) {
      if (field.allowCustom) {
        return (
          <AutoComplete
            options={field.options || []}
            allowClear={field.allowClear !== false}
            filterOption={(inputValue, option) =>
              String(option?.label || option?.value || '')
                .toLowerCase()
                .includes(String(inputValue || '').toLowerCase())
            }
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
      }

      return (
        <Select
          options={field.options || []}
          allowClear={field.allowClear !== false}
          mode={
            field.mode ||
            (field.type === 'multi_select' || field.type === 'multiselect'
              ? 'multiple'
              : undefined)
          }
          showSearch={field.showSearch !== false}
          optionFilterProp="label"
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    }

    if (field.type === 'password') {
      return (
        <Input.Password
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    }

    if (field.type === 'email') {
      return (
        <Input
          type="email"
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    }

    if (field.type === 'date') {
      return (
        <Input
          type="date"
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    }

    if (field.type === 'color') {
      return <Input type="color" disabled={disabled} />;
    }

    return <Input placeholder={field.placeholder} disabled={disabled} />;
  };

  const formNode = (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      {safeFields
        .filter((field) => !field.hidden)
        .map((field) => (
          <Form.Item
            key={getFieldNameKey(field.name)}
            name={field.name}
            label={field.label}
            valuePropName={
              field.type === 'switch' || field.type === 'boolean'
                ? 'checked'
                : 'value'
            }
            rules={field.rules || []}
            extra={field.extra}
          >
            {renderInput(field)}
          </Form.Item>
        ))}
    </Form>
  );

  const title = editing
    ? modalTitle || drawerTitle || 'Edit configuration'
    : modalTitle || drawerTitle || 'Add configuration';

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          padding: token.paddingSM,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Refresh
        </Button>

        {canAdd ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            disabled={saving}
          >
            {addButtonText}
          </Button>
        ) : null}
      </Space>

      <div style={{ padding: token.paddingSM }}>
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
      </div>

      {formMode === 'drawer' ? (
        <Drawer
          title={title}
          open={open}
          onClose={closeForm}
          width={drawerWidth}
          destroyOnHidden
          forceRender
          extra={
            <Space>
              <Button onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button type="primary" onClick={save} loading={saving}>
                Save
              </Button>
            </Space>
          }
        >
          {formNode}
        </Drawer>
      ) : (
        <Modal
          title={title}
          open={open}
          onCancel={closeForm}
          onOk={save}
          confirmLoading={saving}
          width={1080}
          destroyOnHidden
          forceRender
        >
          {formNode}
        </Modal>
      )}
    </Space>
  );
}
