import { Button, Drawer, Space, Typography, theme } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { sanitizeTemplateHtml } from '@/Pages/App/Settings/TemplatePlaceholders.jsx';

const { Text, Title } = Typography;

export default function TemplatePreviewDrawer({ open, onClose, title, subject, html, css = '', type = 'email' }) {
  const { token } = theme.useToken();
  const source = `<style>${css || ''}</style>${sanitizeTemplateHtml(html || '')}`;

  return (
    <Drawer
      title={type === 'print' ? 'Print Preview' : 'Email Preview'}
      open={open}
      onClose={onClose}
      width={820}
      extra={type === 'print' ? <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button> : null}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>{title}</Title>
          {subject ? <Text type="secondary">{subject}</Text> : null}
        </div>
        <div
          style={{
            background: '#fff',
            color: '#111827',
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            padding: type === 'print' ? 24 : 16,
            minHeight: 420,
          }}
        >
          <iframe
            title="Template preview"
            sandbox=""
            srcDoc={source}
            style={{ width: '100%', minHeight: 520, border: 0, background: '#fff' }}
          />
        </div>
      </Space>
    </Drawer>
  );
}
