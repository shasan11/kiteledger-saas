import { lazy, Suspense, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import {
  Card,
  Grid,
  Skeleton,
  Space,
  Tabs,
  Typography,
  theme,
} from 'antd';
import {
  ApartmentOutlined,
  AuditOutlined,
  BankOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  InboxOutlined,
  MailOutlined,
  NumberOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  TranslationOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

/**
 * These imports point to your existing Inertia page components.
 * If any of these components contain <AuthenticatedLayout>, then pass embedded
 * and make the component return only content when embedded=true.
 */

const CompanyProfile = lazy(() => import('./CompanyProfile'));
const Localization = lazy(() => import('./CompanyProfile'));

const Branches = lazy(() => import('../Master/Branches/Index'));
const FiscalYears = lazy(() => import('./FiscalYears'));
const Currencies = lazy(() => import('../Master/Currencies/Index'));
const Taxes = lazy(() => import('../Tax/TaxRates/Index'));

const ApprovalWorkflows = lazy(() => import('./ApprovalWorkflows'));
const EmailConfiguration = lazy(() => import('../Hrm/EmailConfigs/Index'));
const EmailTemplates = lazy(() => import('./EmailTemplates'));

const ConfigurationForm = lazy(() => import('./ConfigurationForm'));

const Users = lazy(() => import('../Hrm/Users/Index'));
const Roles = lazy(() => import('../Hrm/Roles/Index'));
const Permissions = lazy(() => import('../Hrm/Permissions/Index'));

const AlertTypes = lazy(() => import('./AlertTypes/Index'));
const ReportingTags = lazy(() => import('./ReportingTags/Index'));
const DocumentNumberings = lazy(() => import('./DocumentNumberings/Index'));
const PrintingTemplates = lazy(() => import('./PrintingTemplates/Index'));
const CustomTemplates = lazy(() => import('./CustomTemplates/Index'));
const ApplicationSettings = lazy(() => import('./ApplicationSettings/Index'));
const GeneralSettings = lazy(() => import('./GeneralSettings/Index'));
const MasterData = lazy(() => import('./MasterData/Index'));

const SETTINGS_TABS = [
  {
    key: 'general-group',
    label: 'General',
    disabled: true,
  },
  {
    key: 'company-profile',
    label: 'Company Profile',
    description: 'Company details and print identity.',
    icon: <BankOutlined />,
    component: CompanyProfile,
    props: {},
  },
  {
    key: 'localization',
    label: 'Localization',
    description: 'Timezone, country and date settings.',
    icon: <TranslationOutlined />,
    component: Localization,
    props: {},
  },
  {
    key: 'general-settings',
    label: 'General Settings',
    description: 'Common business rules.',
    icon: <SettingOutlined />,
    component: GeneralSettings,
    props: {},
  },
  {
    key: 'application-settings',
    label: 'Application Settings',
    description: 'System-wide key value settings.',
    icon: <SettingOutlined />,
    component: ApplicationSettings,
    props: {},
  },
  {
    key: 'master-data',
    label: 'Master Data',
    description: 'Common setup data.',
    icon: <InboxOutlined />,
    component: MasterData,
    props: {},
  },

  {
    key: 'organization-group',
    label: 'Organization',
    disabled: true,
  },
  {
    key: 'branches',
    label: 'Branches',
    description: 'Branch and location setup.',
    icon: <ApartmentOutlined />,
    component: Branches,
    props: {},
  },
  {
    key: 'users',
    label: 'Users',
    description: 'User accounts and staff access.',
    icon: <TeamOutlined />,
    component: Users,
    props: {},
  },
  {
    key: 'roles',
    label: 'Roles',
    description: 'Role based access control.',
    icon: <SafetyCertificateOutlined />,
    component: Roles,
    props: {},
  },
  {
    key: 'permissions',
    label: 'Permissions',
    description: 'Permission rules.',
    icon: <SafetyCertificateOutlined />,
    component: Permissions,
    props: {},
  },

  {
    key: 'finance-group',
    label: 'Finance & Accounting',
    disabled: true,
  },
  {
    key: 'fiscal-years',
    label: 'Fiscal Years',
    description: 'Accounting years and locks.',
    icon: <CalendarOutlined />,
    component: FiscalYears,
    props: {},
  },
  {
    key: 'currencies',
    label: 'Currencies',
    description: 'Base and transaction currencies.',
    icon: <DollarOutlined />,
    component: Currencies,
    props: {},
  },
  {
    key: 'taxes',
    label: 'Taxes',
    description: 'VAT, GST and withholding setup.',
    icon: <AuditOutlined />,
    component: Taxes,
    props: {},
  },
  {
    key: 'accounting-configuration',
    label: 'Accounting Configuration',
    description: 'Default accounting rules.',
    icon: <BankOutlined />,
    component: ConfigurationForm,
    props: { area: 'accounting' },
  },
  {
    key: 'document-numberings',
    label: 'Document Numbering',
    description: 'Prefixes and automatic numbering.',
    icon: <NumberOutlined />,
    component: DocumentNumberings,
    props: {},
  },

  {
    key: 'operations-group',
    label: 'Operations',
    disabled: true,
  },
  {
    key: 'sales-configuration',
    label: 'Sales Configuration',
    description: 'Sales defaults and invoice rules.',
    icon: <AuditOutlined />,
    component: ConfigurationForm,
    props: { area: 'sales' },
  },
  {
    key: 'purchase-configuration',
    label: 'Purchase Configuration',
    description: 'Purchase defaults and supplier rules.',
    icon: <AuditOutlined />,
    component: ConfigurationForm,
    props: { area: 'purchase' },
  },
  {
    key: 'inventory-configuration',
    label: 'Inventory Configuration',
    description: 'Warehouse and stock rules.',
    icon: <InboxOutlined />,
    component: ConfigurationForm,
    props: { area: 'inventory' },
  },
  {
    key: 'hrm-configuration',
    label: 'HRM Configuration',
    description: 'Attendance, payroll and HR defaults.',
    icon: <TeamOutlined />,
    component: ConfigurationForm,
    props: { area: 'hrm' },
  },
  {
    key: 'approval-workflows',
    label: 'Approval Workflows',
    description: 'Approval rules by module.',
    icon: <SafetyCertificateOutlined />,
    component: ApprovalWorkflows,
    props: {},
  },
  {
    key: 'alert-types',
    label: 'Alert Types',
    description: 'System alert types.',
    icon: <FileTextOutlined />,
    component: AlertTypes,
    props: {},
  },
  {
    key: 'reporting-tags',
    label: 'Reporting Tags',
    description: 'Tags used for reports.',
    icon: <TagsOutlined />,
    component: ReportingTags,
    props: {},
  },

  {
    key: 'templates-group',
    label: 'Templates & Notifications',
    disabled: true,
  },
  {
    key: 'email-configuration',
    label: 'Email Configuration',
    description: 'SMTP and sender setup.',
    icon: <MailOutlined />,
    component: EmailConfiguration,
    props: {},
  },
  {
    key: 'email-templates',
    label: 'Email Templates',
    description: 'Reusable email templates.',
    icon: <MailOutlined />,
    component: EmailTemplates,
    props: {},
  },
  {
    key: 'printing-templates',
    label: 'Printing Templates',
    description: 'Print document layouts.',
    icon: <MailOutlined />,
    component: PrintingTemplates,
    props: {},
  },
  {
    key: 'custom-templates',
    label: 'Custom Templates',
    description: 'Reusable rich text templates.',
    icon: <MailOutlined />,
    component: CustomTemplates,
    props: {},
  },
];

function getRealTabs() {
  return SETTINGS_TABS.filter((item) => !item.disabled);
}

function getInitialTab() {
  if (typeof window === 'undefined') return 'company-profile';

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');

  return getRealTabs().some((item) => item.key === tab)
    ? tab
    : 'company-profile';
}

function updateUrlTab(key) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  params.set('tab', key);

  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}?${params.toString()}`
  );
}

function TabLabel({ item, token }) {
  if (item.disabled) {
    return (
      <div
        style={{
          padding: '10px 2px 6px',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: token.colorTextTertiary,
          cursor: 'default',
        }}
      >
        {item.label}
      </div>
    );
  }

  return (
    <Space size={10} align="start" style={{ width: '100%' }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: token.borderRadiusLG,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: token.colorFillTertiary,
          color: token.colorTextSecondary,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {item.icon}
      </span>

      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            color: token.colorText,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 210,
          }}
        >
          {item.label}
        </span>

        <span
          style={{
            display: 'block',
            marginTop: 3,
            fontSize: 12,
            color: token.colorTextTertiary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 230,
          }}
        >
          {item.description}
        </span>
      </span>
    </Space>
  );
}

function ActiveComponent({ activeKey, auth }) {
  const activeTab = SETTINGS_TABS.find((item) => item.key === activeKey);

  if (!activeTab?.component) {
    return null;
  }

  const Component = activeTab.component;
  const props = activeTab.props || {};

  return (
    <Suspense
      fallback={
        <div style={{ padding: 20 }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      }
    >
      <Component auth={auth} embedded {...props} />
    </Suspense>
  );
}

export default function SettingsIndex({ auth }) {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [activeKey, setActiveKey] = useState(getInitialTab);

  const activeTab = useMemo(() => {
    return SETTINGS_TABS.find((item) => item.key === activeKey);
  }, [activeKey]);

  const tabItems = useMemo(() => {
    return SETTINGS_TABS.map((item) => ({
      key: item.key,
      disabled: item.disabled,
      label: <TabLabel item={item} token={token} />,
      children: item.disabled ? null : (
        <div
          style={{
            padding: isMobile ? 12 : 20,
            minHeight: 'calc(100vh - 138px)',
            background: token.colorBgLayout,
          }}
        >
          <Card
            style={{
              borderRadius: token.borderRadiusLG,
              overflow: 'hidden',
            }}
            styles={{
              body: {
                padding: 0,
              },
            }}
          >
            <ActiveComponent activeKey={item.key} auth={auth} />
          </Card>
        </div>
      ),
    }));
  }, [auth, isMobile, token]);

  const handleChange = (key) => {
    const tab = SETTINGS_TABS.find((item) => item.key === key);

    if (!tab || tab.disabled) return;

    setActiveKey(key);
    updateUrlTab(key);
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Settings" />

      <div
        style={{
          minHeight: 'calc(100vh - 64px)',
          background: token.colorBgLayout,
        }}
      >
        <div
          style={{
            height: 72,
            display: 'flex',
            alignItems: 'center',
            padding: '0 26px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Apps
            </Title>

            <Text type="secondary">
              {activeTab?.description || 'Manage application settings.'}
            </Text>
          </div>
        </div>

        <Tabs
          activeKey={activeKey}
          onChange={handleChange}
          tabPosition={isMobile ? 'top' : 'left'}
          items={tabItems}
          destroyInactiveTabPane
          style={{
            minHeight: 'calc(100vh - 136px)',
            background: token.colorBgContainer,
          }}
          tabBarStyle={{
            width: isMobile ? '100%' : 355,
            minWidth: isMobile ? undefined : 355,
            margin: 0,
            padding: isMobile ? '8px 10px' : '14px',
            background: token.colorBgContainer,
            borderRight: isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`,
            borderBottom: isMobile ? `1px solid ${token.colorBorderSecondary}` : 'none',
            maxHeight: isMobile ? undefined : 'calc(100vh - 136px)',
            overflowY: 'auto',
          }}
        />
      </div>
    </AuthenticatedLayout>
  );
}