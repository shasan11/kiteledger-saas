import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  theme,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';

const EMPTY_ARRAY = [];

const COUNTRY_CODE_OPTIONS = [
  { value: '+977', label: '+977' },
  { value: '+91', label: '+91' },
  { value: '+1', label: '+1' },
  { value: '+44', label: '+44' },
  { value: '+61', label: '+61' },
  { value: '+971', label: '+971' },
  { value: '+974', label: '+974' },
  { value: '+966', label: '+966' },
];

const splitPhone = (raw, defaultCode = '+977') => {
  const text = String(raw || '').trim();
  const match = text.match(/^(\+\d{1,4})\s*(.*)$/);
  return { code: match?.[1] || defaultCode, number: match ? match[2] || '' : text };
};

const buildPhone = (code, number) => {
  const clean = String(number || '').trim();
  return clean ? `${code || '+977'} ${clean}` : '';
};

const normalizeRows = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return EMPTY_ARRAY;
};

export const defaultLabelBuilder = (row) => {
  if (!row) return '';
  if (row.code && row.name) return `${row.name} (${row.code})`;
  return (
    row.name ||
    row.title ||
    row.display_name ||
    row.email ||
    row.code ||
    String(row.id || '')
  );
};

/**
 * CompactSelect is a controlled composite component that Form.Item can properly
 * inject value/onChange into. When Form.Item wraps Space.Compact directly, the
 * Select inside never receives value/onChange because Space.Compact does not
 * forward them. By creating this intermediate controlled component, Form.Item
 * injects value/onChange here and we pass them explicitly to Select.
 */
function CompactSelect({
  value,
  onChange,
  onValueChange,
  disabled,
  loading,
  placeholder,
  options,
  onFocus,
  onSearch,
  onPlusClick,
}) {
  const handleChange = useCallback(
    (val) => {
      onChange?.(val);
      onValueChange?.(val);
    },
    [onChange, onValueChange],
  );

  return (
    <Space.Compact block>
      <Select
        showSearch
        allowClear
        value={value}
        onChange={handleChange}
        disabled={disabled}
        loading={loading}
        placeholder={placeholder || 'Search and select'}
        filterOption={false}
        options={options}
        onFocus={onFocus}
        onSearch={onSearch}
        style={{ width: '100%' }}
      />
      <Button
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={onPlusClick}
        title="Quick add"
      />
    </Space.Compact>
  );
}

function QuickAddFormField({ field, value, onChange }) {
  if (field.type === 'phone') {
    const defaultCode = field.defaultCountryCode || '+977';
    const parts = splitPhone(value, defaultCode);
    return (
      <Space.Compact style={{ width: '100%' }}>
        <Select
          value={parts.code}
          style={{ width: 92 }}
          options={field.countryCodeOptions || COUNTRY_CODE_OPTIONS}
          onChange={(code) => onChange?.(buildPhone(code, parts.number))}
        />
        <Input
          value={parts.number}
          placeholder={field.placeholder || `${defaultCode} 9800000000`}
          onChange={(e) => onChange?.(buildPhone(parts.code, e.target.value))}
        />
      </Space.Compact>
    );
  }
  if (field.type === 'number') {
    return (
      <InputNumber
        min={field.min}
        max={field.max}
        precision={field.precision}
        placeholder={field.placeholder}
        style={{ width: '100%' }}
      />
    );
  }
  if (field.type === 'switch') return <Switch />;
  if (field.type === 'textarea') {
    return <Input.TextArea rows={field.rows || 3} placeholder={field.placeholder} />;
  }
  if (field.type === 'select') {
    return (
      <Select
        allowClear={field.allowClear !== false}
        placeholder={field.placeholder}
        options={field.options || EMPTY_ARRAY}
      />
    );
  }
  return <Input placeholder={field.placeholder} />;
}

/**
 * QuickAddRemoteSelect — remote-search select with inline quick-add modal.
 *
 * Form.Item + CompactSelect pattern ensures value/onChange are properly
 * wired so regular dropdown selection updates the form store correctly.
 *
 * Props:
 *  name             — Form.Item field name
 *  label            — displayed label
 *  icon             — optional label icon
 *  required         — adds required validation rule
 *  disabled         — disables both select and quick-add button
 *  placeholder      — select placeholder text
 *  apiUrl           — GET endpoint to load options
 *  params           — extra query params (memoize this at the call site!)
 *  valueKey         — record key used as option value (default 'id')
 *  labelBuilder     — fn(row) => string for option label
 *  quickAddTitle    — title shown in quick-add modal header
 *  quickAddIcon     — icon in quick-add modal header
 *  quickAddFields   — array of field descriptors for the quick-add form
 *  quickAddInitialValues — initial values for the quick-add form
 *  createPayload    — fn(formValues) => payload sent to createUrl
 *  createUrl        — POST endpoint to create the new record (defaults to apiUrl)
 *  afterCreate      — fn(saved, form) called after successful creation
 *  onSelectChange   — fn(value) called when user selects from dropdown
 */
export default function QuickAddRemoteSelect({
  name,
  label,
  icon = null,
  required = false,
  disabled = false,
  placeholder,
  apiUrl,
  params = {},
  activeOnly = true,
  valueKey = 'id',
  labelBuilder = defaultLabelBuilder,
  quickAddTitle,
  quickAddIcon = null,
  quickAddFields = EMPTY_ARRAY,
  quickAddInitialValues = {},
  createPayload,
  createUrl,
  afterCreate,
  onSelectChange,
}) {
  const { token } = theme.useToken();
  const { message: messageApi } = App.useApp();
  const form = Form.useFormInstance();
  const [quickForm] = Form.useForm();
  const selectedValue = Form.useWatch(name, form);

  const [options, setOptions] = useState(EMPTY_ARRAY);
  const [loading, setLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);

  const searchTimerRef = useRef(null);

  // Stringify params so loadOptions only recreates when content changes,
  // not on every render (params is usually an inline object literal).
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);

  const loadOptions = useCallback(
    async (search = '') => {
      if (!apiUrl) return;
      setLoading(true);
      try {
        const response = await axios.get(apiUrl, {
          params: { page: 1, page_size: 30, search, ...(activeOnly ? { active: true } : {}), ...(params || {}) },
        });
        const rows = normalizeRows(response.data);
        setOptions(
          rows
            .filter((row) => (row?.[valueKey] ?? row?.id) != null)
            .map((row) => ({
              value: row?.[valueKey] ?? row?.id,
              label: labelBuilder(row),
              raw: row,
            })),
        );
      } catch {
        setOptions(EMPTY_ARRAY);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiUrl, paramsKey, valueKey, labelBuilder, activeOnly],
  );

  useEffect(() => {
    void loadOptions('');
  }, [loadOptions]);

  useEffect(() => {
    if (selectedValue == null || selectedValue === '' || !apiUrl) return;
    const found = options.some((option) => String(option.value) === String(selectedValue));
    if (found) return;

    let cancelled = false;
    (async () => {
      try {
        const base = String(apiUrl).replace(/\/+$/, '');
        const response = await axios.get(`${base}/${encodeURIComponent(selectedValue)}/`);
        if (cancelled) return;

        const row = response.data;
        const rowValue = row?.[valueKey] ?? row?.id;
        if (rowValue == null) return;

        const option = {
          value: rowValue,
          label: labelBuilder(row),
          raw: row,
        };

        setOptions((prev) =>
          prev.some((item) => String(item.value) === String(rowValue))
            ? prev
            : [option, ...prev],
        );
      } catch {
        // Keep the raw value selected if detail hydration is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, labelBuilder, options, selectedValue, valueKey]);

  const handleSearch = useCallback(
    (value) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        void loadOptions(value || '');
      }, 350);
    },
    [loadOptions],
  );

  const openQuickAdd = () => {
    quickForm.resetFields();
    quickForm.setFieldsValue(quickAddInitialValues || {});
    setQuickOpen(true);
  };

  const submitQuickAdd = async () => {
    const values = await quickForm.validateFields();
    setQuickSaving(true);
    try {
      const payload =
        typeof createPayload === 'function'
          ? createPayload(values)
          : { ...values, active: values.active !== false };

      const response = await axios.post(createUrl || apiUrl, payload);
      const saved = response.data;
      const savedId = saved?.[valueKey] ?? saved?.id;

      if (!savedId) {
        messageApi.error(`${quickAddTitle || label} was created but no ID was returned.`);
        return;
      }

      const newOption = {
        value: savedId,
        label: labelBuilder(saved),
        raw: saved,
      };

      setOptions((prev) => {
        const exists = prev.some((item) => String(item.value) === String(savedId));
        return exists ? prev : [newOption, ...prev];
      });

      form.setFieldValue(name, savedId);

      if (typeof afterCreate === 'function') {
        afterCreate(saved, form);
      }

      setQuickOpen(false);
      quickForm.resetFields();
      messageApi.success(`${quickAddTitle || label} added.`);
    } catch (error) {
      const errData = error?.response?.data || {};
      const msg =
        errData.message ||
        Object.values(errData.errors || {})[0]?.[0] ||
        `Failed to add ${String(quickAddTitle || label).toLowerCase()}.`;
      messageApi.error(msg);
    } finally {
      setQuickSaving(false);
    }
  };

  const labelNode = icon ? (
    <Space size={6}>
      {icon}
      <span>{label}</span>
    </Space>
  ) : (
    label
  );

  return (
    <>
      <Form.Item
        name={name}
        label={labelNode}
        rules={required ? [{ required: true, message: `${label} is required` }] : []}
      >
        <CompactSelect
          disabled={disabled}
          loading={loading}
          placeholder={placeholder}
          options={options}
          onFocus={() => {
            if (!options.length) void loadOptions('');
          }}
          onSearch={handleSearch}
          onPlusClick={openQuickAdd}
          onValueChange={onSelectChange}
        />
      </Form.Item>

      <Modal
        title={
          <Space>
            {quickAddIcon}
            <span>Quick Add {quickAddTitle || label}</span>
          </Space>
        }
        open={quickOpen}
        onCancel={() => setQuickOpen(false)}
        onOk={submitQuickAdd}
        confirmLoading={quickSaving}
        destroyOnClose
        okText="Save"
        width={620}
      >
        <Form
          form={quickForm}
          layout="vertical"
          initialValues={quickAddInitialValues}
          style={{ marginTop: token.marginMD }}
        >
          <Row gutter={[12, 0]}>
            {quickAddFields.map((field) => (
              <Col xs={24} md={field.col || 24} key={field.name}>
                <Form.Item
                  name={field.name}
                  label={field.label}
                  valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                  rules={field.rules || EMPTY_ARRAY}
                >
                  <QuickAddFormField field={field} />
                </Form.Item>
              </Col>
            ))}
          </Row>

        </Form>
      </Modal>
    </>
  );
}
