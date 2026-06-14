import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Collapse, DatePicker, Empty, Input, InputNumber, Row, Select, Spin, Switch, Tag, Typography } from 'antd';
import { TagsOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getJson } from '@/Components/Transactions/txnApi.js';

const { Text } = Typography;

const listFrom = (data) => (Array.isArray(data) ? data : data?.results || data?.data || []);
const linesOf = (tag) => tag?.lines || tag?.reporting_tag_lines || [];

/**
 * Build the controlled value map ({ [reporting_tag_id]: value }) from a saved
 * record's serialized `reporting_tags` array (as returned by the API).
 */
export const reportingTagsToMap = (record) => {
  const rows = record?.reporting_tags || [];
  const map = {};
  rows.forEach((row) => {
    if (!row?.reporting_tag_id) return;
    map[row.reporting_tag_id] = row.value ?? null;
  });
  return map;
};

/**
 * Convert the controlled value map into the API payload array. Empty values are
 * omitted so they are removed on the backend.
 */
export const mapToReportingTagsPayload = (map = {}) =>
  Object.entries(map || {})
    .filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    })
    .map(([reporting_tag_id, value]) => ({ reporting_tag_id, value }));

function ReportingTagField({ tag, value, onChange }) {
  const options = useMemo(
    () => linesOf(tag).map((line) => ({ label: line.name, value: line.id })),
    [tag]
  );

  switch (tag.type) {
    case 'number':
      return <InputNumber style={{ width: '100%' }} value={value ?? undefined} onChange={onChange} placeholder={tag.name} />;
    case 'date':
      return (
        <DatePicker
          style={{ width: '100%' }}
          format="DD-MM-YYYY"
          value={value ? dayjs(value) : null}
          onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : null)}
        />
      );
    case 'boolean':
      return <Switch checked={!!value} onChange={onChange} />;
    case 'select':
      return (
        <Select
          style={{ width: '100%' }}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={`Select ${tag.name}`}
          options={options}
          value={value ?? undefined}
          onChange={(v) => onChange(v ?? null)}
        />
      );
    case 'multi_select':
      return (
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={`Select ${tag.name}`}
          options={options}
          value={Array.isArray(value) ? value : []}
          onChange={(v) => onChange(v || [])}
        />
      );
    case 'text':
    default:
      return <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={tag.name} />;
  }
}

/**
 * Document-level reporting tags panel. Controlled component:
 *   value    -> { [reporting_tag_id]: value }
 *   onChange -> (nextMap) => void
 *
 * Loads active reporting tags once and renders the right input per tag type.
 * Collapsible so it never dominates the form.
 */
export default function ReportingTagsPanel({ value = {}, onChange, title = 'Reporting Tags', defaultOpen = false, style }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getJson('/api/reporting-tags', { params: { page_size: 200, active: true } })
      .then(({ data }) => {
        if (!active) return;
        const rows = listFrom(data)
          .filter((t) => t.active !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name)));
        setTags(rows);
      })
      .catch(() => active && setTags([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const setTagValue = (tagId, next) => {
    onChange?.({ ...(value || {}), [tagId]: next });
  };

  // Hide entirely when there are no tags configured (after loading).
  if (!loading && tags.length === 0) return null;

  const selectedCount = Object.values(value || {}).filter((v) => (Array.isArray(v) ? v.length : v !== null && v !== undefined && v !== '')).length;

  const body = loading ? (
    <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div>
  ) : tags.length === 0 ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No reporting tags" />
  ) : (
    <Row gutter={[16, 8]}>
      {tags.map((tag) => (
        <Col xs={24} sm={12} md={8} key={tag.id}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tag.color ? <Tag color={tag.color} style={{ marginRight: 6 }}>&nbsp;</Tag> : null}
              {tag.name}
            </Text>
          </div>
          <ReportingTagField tag={tag} value={(value || {})[tag.id]} onChange={(v) => setTagValue(tag.id, v)} />
        </Col>
      ))}
    </Row>
  );

  return (
    <Collapse
      style={style}
      defaultActiveKey={defaultOpen ? ['reporting-tags'] : undefined}
      items={[{
        key: 'reporting-tags',
        label: (
          <span><TagsOutlined /> {title}{selectedCount ? <Tag style={{ marginLeft: 8 }} color="blue">{selectedCount}</Tag> : null}</span>
        ),
        children: <Card size="small" variant="borderless" styles={{ body: { padding: 0 } }}>{body}</Card>,
      }]}
    />
  );
}
