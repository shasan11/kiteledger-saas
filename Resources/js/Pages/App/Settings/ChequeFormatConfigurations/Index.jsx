import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Divider, Empty, InputNumber, Row, Segmented,
  Select, Space, Spin, Switch, Tag, Typography, Upload, message, theme,
} from 'antd';
import {
  FileTextOutlined, PrinterOutlined, ReloadOutlined, SaveOutlined, UploadOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const SCALE = 3; // px per mm on the visual canvas
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const FIELD_META = {
  date: { label: 'Date', sample: '14-06-2026' },
  payee_name: { label: 'Payee Name', sample: 'John Doe Traders' },
  amount_words: { label: 'Amount in Words', sample: 'One Thousand Two Hundred Fifty Only' },
  amount_number: { label: 'Amount in Numbers', sample: '1,250.00' },
  signature: { label: 'Signature', sample: 'Authorized Signature' },
};
const FIELD_KEYS = Object.keys(FIELD_META);

const DEFAULT_FIELD = { x: 20, y: 20, font_size: 11, font_weight: 'normal', align: 'left', visible: true };

const normalizeFields = (layout) => {
  const incoming = layout?.fields || {};
  const fields = {};
  FIELD_KEYS.forEach((key) => {
    fields[key] = { ...DEFAULT_FIELD, ...(incoming[key] || {}) };
  });
  return fields;
};

const getApiError = (error, fallback) =>
  error?.response?.data?.message ||
  Object.values(error?.response?.data || {})?.[0]?.[0] ||
  fallback;

export default function ChequeFormatConfigurations() {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [format, setFormat] = useState(null);
  const [fields, setFields] = useState(normalizeFields(null));
  const [selected, setSelected] = useState('payee_name');

  const width = Number(format?.width) || 210;
  const height = Number(format?.height) || 90;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/cheque-format-configurations/default'));
      setFormat(data);
      setFields(normalizeFields(data.layout_json));
    } catch (error) {
      message.error(getApiError(error, 'Failed to load cheque format.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setFormatField = (key, value) => setFormat((prev) => ({ ...prev, [key]: value }));

  const updateField = (key, patch) =>
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const startDrag = (event, key) => {
    event.preventDefault();
    setSelected(key);
    const startX = event.clientX;
    const startY = event.clientY;
    const orig = fields[key];
    const w = width;
    const h = height;

    const move = (ev) => {
      const nx = clamp(Math.round(orig.x + (ev.clientX - startX) / SCALE), 0, w);
      const ny = clamp(Math.round(orig.y + (ev.clientY - startY) / SCALE), 0, h);
      updateField(key, { x: nx, y: ny });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const onSignatureUpload = (file) => {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) { message.error('Please upload an image file.'); return Upload.LIST_IGNORE; }
    if (file.size > 1024 * 1024) { message.error('Signature must be under 1 MB.'); return Upload.LIST_IGNORE; }

    const reader = new FileReader();
    reader.onload = () => setFormatField('signature_image', reader.result);
    reader.readAsDataURL(file);
    return Upload.LIST_IGNORE; // prevent auto-upload; we keep the base64 in state
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        country: format.country || 'Global',
        format_name: format.format_name || 'Default Cheque Format',
        paper_size: format.paper_size || 'Custom',
        width,
        height,
        layout_json: { fields },
        signature_image: format.signature_image || null,
        signature_width: format.signature_width || null,
        signature_height: format.signature_height || null,
        active: true,
      };
      const { data } = await axios.patch(api(`/api/cheque-format-configurations/${format.id}`), payload);
      setFormat(data);
      setFields(normalizeFields(data.layout_json));
      message.success('Cheque format saved.');
    } catch (error) {
      message.error(getApiError(error, 'Failed to save cheque format.'));
    } finally {
      setSaving(false);
    }
  };

  const sel = fields[selected] || DEFAULT_FIELD;

  const canvas = useMemo(() => (
    <div
      style={{
        position: 'relative',
        width: width * SCALE,
        height: height * SCALE,
        background: '#fff',
        border: `1px solid ${token.colorBorder}`,
        boxShadow: '0 1px 8px rgba(0,0,0,.12)',
        backgroundImage: `linear-gradient(${token.colorFillQuaternary} 1px, transparent 1px), linear-gradient(90deg, ${token.colorFillQuaternary} 1px, transparent 1px)`,
        backgroundSize: `${SCALE * 10}px ${SCALE * 10}px`,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {FIELD_KEYS.filter((key) => fields[key].visible !== false).map((key) => {
        const f = fields[key];
        const isSel = selected === key;
        const isSig = key === 'signature';
        return (
          <div
            key={key}
            onMouseDown={(e) => startDrag(e, key)}
            onClick={() => setSelected(key)}
            title={FIELD_META[key].label}
            style={{
              position: 'absolute',
              left: f.x * SCALE,
              top: f.y * SCALE,
              cursor: 'move',
              padding: '1px 3px',
              fontSize: (f.font_size || 11) * (SCALE / 3.4),
              fontWeight: f.font_weight === 'bold' ? 700 : 400,
              textAlign: f.align,
              whiteSpace: 'nowrap',
              border: `1px ${isSel ? 'solid' : 'dashed'} ${isSel ? token.colorPrimary : token.colorBorderSecondary}`,
              background: isSel ? token.colorPrimaryBg : 'rgba(255,255,255,.6)',
              borderRadius: 2,
              color: token.colorText,
            }}
          >
            {isSig && format?.signature_image ? (
              <img
                src={format.signature_image}
                alt="Signature"
                style={{ width: (format.signature_width || 40) * SCALE, height: (format.signature_height || 18) * SCALE, objectFit: 'contain', display: 'block' }}
              />
            ) : (
              FIELD_META[key].sample
            )}
          </div>
        );
      })}
    </div>
  ), [fields, selected, width, height, format?.signature_image, format?.signature_width, format?.signature_height, token]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  if (!format) {
    return <div style={{ padding: 24 }}><Empty description="No cheque format found." /></div>;
  }

  return (
    <div style={{ padding: token.padding }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <FileTextOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>Cheque Format Editor</Title>
              <Text type="secondary">Drag fields onto the cheque and adjust their position, size and alignment.</Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Reset</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save Format</Button>
          </Space>
        </Col>
      </Row>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="One default cheque format is maintained here."
        description="Positions are stored as structured layout JSON (in millimetres). Use this layout to print issued cheques from the Cheque Register."
      />

      <Row gutter={16}>
        <Col xs={24} lg={15}>
          <Card size="small" title="Cheque Preview" extra={<Tag>{width} × {height} mm</Tag>}>
            <div style={{ overflow: 'auto', padding: 8 }}>{canvas}</div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card size="small" title="Paper" style={{ marginBottom: 12 }}>
            <Row gutter={12}>
              <Col span={24} style={{ marginBottom: 8 }}>
                <Text type="secondary">Paper Size</Text>
                <Select
                  style={{ width: '100%' }}
                  value={format.paper_size || 'Custom'}
                  onChange={(v) => setFormatField('paper_size', v)}
                  options={['A4', 'Letter', 'Legal', 'Custom'].map((v) => ({ value: v, label: v }))}
                />
              </Col>
              <Col span={12}>
                <Text type="secondary">Width (mm)</Text>
                <InputNumber min={50} max={400} style={{ width: '100%' }} value={width} onChange={(v) => setFormatField('width', v)} />
              </Col>
              <Col span={12}>
                <Text type="secondary">Height (mm)</Text>
                <InputNumber min={40} max={300} style={{ width: '100%' }} value={height} onChange={(v) => setFormatField('height', v)} />
              </Col>
            </Row>
          </Card>

          <Card size="small" title="Fields" style={{ marginBottom: 12 }}>
            <Select
              style={{ width: '100%', marginBottom: 12 }}
              value={selected}
              onChange={setSelected}
              options={FIELD_KEYS.map((key) => ({ value: key, label: FIELD_META[key].label }))}
            />

            <Row gutter={12} align="middle">
              <Col span={12} style={{ marginBottom: 8 }}>
                <Text type="secondary">Show field</Text><br />
                <Switch checked={sel.visible !== false} onChange={(v) => updateField(selected, { visible: v })} />
              </Col>
              <Col span={12} style={{ marginBottom: 8 }}>
                <Text type="secondary">Alignment</Text>
                <Segmented
                  block
                  size="small"
                  value={sel.align || 'left'}
                  onChange={(v) => updateField(selected, { align: v })}
                  options={[{ value: 'left', label: 'L' }, { value: 'center', label: 'C' }, { value: 'right', label: 'R' }]}
                />
              </Col>
              <Col span={12}>
                <Text type="secondary">X (mm)</Text>
                <InputNumber min={0} max={width} style={{ width: '100%' }} value={sel.x} onChange={(v) => updateField(selected, { x: v ?? 0 })} />
              </Col>
              <Col span={12}>
                <Text type="secondary">Y (mm)</Text>
                <InputNumber min={0} max={height} style={{ width: '100%' }} value={sel.y} onChange={(v) => updateField(selected, { y: v ?? 0 })} />
              </Col>
              {selected !== 'signature' && (
                <>
                  <Col span={12} style={{ marginTop: 8 }}>
                    <Text type="secondary">Font size (pt)</Text>
                    <InputNumber min={6} max={48} style={{ width: '100%' }} value={sel.font_size} onChange={(v) => updateField(selected, { font_size: v ?? 11 })} />
                  </Col>
                  <Col span={12} style={{ marginTop: 8 }}>
                    <Text type="secondary">Font weight</Text>
                    <Segmented
                      block
                      size="small"
                      value={sel.font_weight || 'normal'}
                      onChange={(v) => updateField(selected, { font_weight: v })}
                      options={[{ value: 'normal', label: 'Normal' }, { value: 'bold', label: 'Bold' }]}
                    />
                  </Col>
                </>
              )}
            </Row>
          </Card>

          <Card size="small" title={<Space><PrinterOutlined /> Signature</Space>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {format.signature_image ? (
                <img src={format.signature_image} alt="Signature" style={{ maxWidth: '100%', maxHeight: 80, border: `1px solid ${token.colorBorderSecondary}`, padding: 4, background: '#fff' }} />
              ) : (
                <Text type="secondary">No signature uploaded.</Text>
              )}
              <Space>
                <Upload accept="image/*" showUploadList={false} beforeUpload={onSignatureUpload}>
                  <Button size="small" icon={<UploadOutlined />}>Upload signature</Button>
                </Upload>
                {format.signature_image && (
                  <Button size="small" danger onClick={() => setFormatField('signature_image', null)}>Remove</Button>
                )}
              </Space>
              <Row gutter={12}>
                <Col span={12}>
                  <Text type="secondary">Width (mm)</Text>
                  <InputNumber min={10} max={120} style={{ width: '100%' }} value={format.signature_width || 40} onChange={(v) => setFormatField('signature_width', v)} />
                </Col>
                <Col span={12}>
                  <Text type="secondary">Height (mm)</Text>
                  <InputNumber min={5} max={80} style={{ width: '100%' }} value={format.signature_height || 18} onChange={(v) => setFormatField('signature_height', v)} />
                </Col>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                The signature image prints at the Signature field position. Drag the Signature box on the preview to reposition it.
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
