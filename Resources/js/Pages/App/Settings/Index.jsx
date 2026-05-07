import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import { Button, Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import {
  ApartmentOutlined, AuditOutlined, BankOutlined, CalendarOutlined, DollarOutlined, InboxOutlined,
  MailOutlined, NumberOutlined, SafetyCertificateOutlined, SettingOutlined,
  TeamOutlined, TranslationOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { api } from './settingsApi';

const { Text, Title } = Typography;

const go = (path) => router.visit(path);

function SettingCard({ icon, title, description, status, path }) {
  return (
    <Card size="small" style={{ height: '100%', borderRadius: 8 }}>
      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space align="start">
          <span style={{ fontSize: 18, color: '#1677ff' }}>{icon}</span>
          <div>
            <Text strong>{title}</Text>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{description}</div>
            <div style={{ marginTop: 10 }}>{status}</div>
          </div>
        </Space>
        <Button size="small" onClick={() => go(path)}>Configure</Button>
      </Space>
    </Card>
  );
}

export default function SettingsIndex({ auth }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    axios.get(api('/api/settings/dashboard')).then(({ data }) => setSummary(data));
  }, []);

  const counts = summary?.counts || {};
  const sections = useMemo(() => [
    {
      title: 'General',
      items: [
        ['Company Profile', 'Legal identity, contacts, defaults and print identity.', <BankOutlined />, summary?.company?.company_name || 'Not configured', '/settings/company-profile'],
        ['Localization', 'Timezone, date, time, country and regional preferences.', <TranslationOutlined />, summary?.company?.timezone || 'Asia/Katmandu', '/settings/localization'],
        ['Application Preferences', 'Operational app-level key/value preferences.', <SettingOutlined />, `${counts.application_settings || 0} settings`, '/settings/application-settings'],
      ],
    },
    {
      title: 'Organization',
      items: [
        ['Branches', 'Head office and branch operating locations.', <ApartmentOutlined />, `${counts.branches || 0} branches`, '/settings/branches'],
        ['Users', 'Employees and user accounts linked to HRM.', <TeamOutlined />, 'HRM users', '/settings/users'],
        ['Roles & Permissions', 'Access roles, permissions and settings grants.', <SafetyCertificateOutlined />, `${counts.roles || 0} roles`, '/settings/roles'],
      ],
    },
    {
      title: 'Finance & Accounting',
      items: [
        ['Fiscal Years', 'Accounting periods, current year and locks.', <CalendarOutlined />, summary?.current_fiscal_year?.name || 'No current year', '/settings/fiscal-years'],
        ['Currencies', 'Base and transaction currencies.', <DollarOutlined />, summary?.base_currency?.code || 'No base currency', '/settings/currencies'],
        ['Taxes', 'VAT/GST/withholding rates used by sales and purchase lines.', <AuditOutlined />, `${counts.tax_rates || 0} rates`, '/settings/taxes'],
        ['Accounting Configuration', 'Default accounts for posting, taxes, payroll and inventory.', <BankOutlined />, summary?.configs?.accounting ? <Tag color="green">Ready</Tag> : <Tag>Pending</Tag>, '/settings/accounting-configuration'],
        ['Document Numbering', 'Prefixes and next numbers used by transaction controllers.', <NumberOutlined />, `${counts.document_numberings || 0} series`, '/settings/document-numberings'],
        ['Approval Workflows', 'Approval requirements by module and document type.', <SafetyCertificateOutlined />, `${counts.approval_workflows || 0} workflows`, '/settings/approval-workflows'],
      ],
    },
    {
      title: 'Operations',
      items: [
        ['Sales Configuration', 'Invoice due days, quotation validity and receivable controls.', <AuditOutlined />, summary?.configs?.sales ? <Tag color="green">Ready</Tag> : <Tag>Pending</Tag>, '/settings/sales-configuration'],
        ['Purchase Configuration', 'Bill terms, approvals and payable controls.', <AuditOutlined />, summary?.configs?.purchase ? <Tag color="green">Ready</Tag> : <Tag>Pending</Tag>, '/settings/purchase-configuration'],
        ['HRM Configuration', 'Attendance, leave, payroll and employment defaults.', <TeamOutlined />, summary?.configs?.hrm ? <Tag color="green">Ready</Tag> : <Tag>Pending</Tag>, '/settings/hrm-configuration'],
        ['Inventory Configuration', 'Warehouse, stock valuation and product code defaults.', <InboxOutlined />, summary?.configs?.inventory ? <Tag color="green">Ready</Tag> : <Tag>Pending</Tag>, '/settings/inventory-configuration'],
      ],
    },
    {
      title: 'Notifications',
      items: [
        ['Email Configuration', 'SMTP servers and sender identity.', <MailOutlined />, `${counts.email_configs || 0} configs`, '/settings/email-configuration'],
        ['Email Templates', 'Reusable notification text and merge variables.', <MailOutlined />, `${counts.email_templates || 0} templates`, '/settings/email-templates'],
        ['Printing Templates', 'HTML/CSS templates for invoices, vouchers, HRM and inventory records.', <MailOutlined />, 'Print layouts', '/settings/printing-templates'],
        ['Custom Templates', 'Reusable rich text snippets with template keys.', <MailOutlined />, 'Rich text snippets', '/settings/custom-templates'],
      ],
    },
  ], [summary]);

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Settings" />
      <div style={{ padding: 18 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>Settings</Title>
              <Text type="secondary">Application configuration, operational defaults and module controls.</Text>
            </div>
            <Statistic title="Base Currency" value={summary?.base_currency?.code || '-'} />
          </Space>
          {sections.map((section) => (
            <div key={section.title}>
              <Title level={5}>{section.title}</Title>
              <Row gutter={[12, 12]}>
                {section.items.map(([title, description, icon, status, path]) => (
                  <Col key={title} xs={24} md={12} xl={8}>
                    <SettingCard icon={icon} title={title} description={description} status={typeof status === 'string' ? <Tag>{status}</Tag> : status} path={path} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
