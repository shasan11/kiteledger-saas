import {
  Component as ReactComponent,
  lazy,
  Suspense,
  useMemo,
  useState,
} from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import {
  Card,
  Grid,
  Skeleton,
  Space,
  Typography,
  theme,
} from 'antd';
import {
  ApartmentOutlined,
  AuditOutlined,
  AppstoreOutlined,
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
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const CompanyProfile = lazy(() => import('./CompanyProfile'));

const Branches = lazy(() => import('../Master/Branches/Index'));
const FiscalYears = lazy(() => import('./FiscalYears'));
const Currencies = lazy(() => import('../Master/Currencies/Index'));
const Taxes = lazy(() => import('../Tax/TaxRates/Index'));

const ApprovalWorkflows = lazy(() => import('./ApprovalWorkflows'));
const EmailConfiguration = lazy(() => import('../Hrm/EmailConfigs/Index'));
const EmailTemplates = lazy(() => import('./EmailTemplates'));

const ConfigurationForm = lazy(() => import('./ConfigurationForm'));
const HrmSetup = lazy(() => import('./HrmSetup/Index'));

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

const DEFAULT_TAB_KEY = 'company-profile';

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
    key: 'general-settings',
    label: 'General Settings',
    description: 'Global application preferences.',
    icon: <SettingOutlined />,
    component: GeneralSettings,
    props: {},
  },
  {
    key: 'application-settings',
    label: 'Application Settings',
    description: 'Company logo, branding and application defaults.',
    icon: <AppstoreOutlined />,
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
    description: 'Permission rules and access actions.',
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
    description: 'Accounting years and period locks.',
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
    label: 'Accounting Config',
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
    label: 'Sales Config',
    description: 'Sales defaults and invoice rules.',
    icon: <AuditOutlined />,
    component: ConfigurationForm,
    props: { area: 'sales' },
  },
  {
    key: 'purchase-configuration',
    label: 'Purchase Config',
    description: 'Purchase defaults and supplier rules.',
    icon: <AuditOutlined />,
    component: ConfigurationForm,
    props: { area: 'purchase' },
  },
  {
    key: 'inventory-configuration',
    label: 'Inventory Config',
    description: 'Warehouse and stock rules.',
    icon: <InboxOutlined />,
    component: ConfigurationForm,
    props: { area: 'inventory' },
  },
  {
    key: 'hrm-configuration',
    label: 'HRM Defaults',
    description: 'Attendance, payroll and HR defaults.',
    icon: <TeamOutlined />,
    component: ConfigurationForm,
    props: { area: 'hrm' },
  },
  {
    key: 'hrm-setup',
    label: 'HRM Setup',
    description: 'Departments, leave, holidays, awards and other HRM setup data.',
    icon: <AppstoreOutlined />,
    component: HrmSetup,
    props: {},
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
    label: 'Email Config',
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
    icon: <FileTextOutlined />,
    component: PrintingTemplates,
    props: {},
  },
  {
    key: 'custom-templates',
    label: 'Custom Templates',
    description: 'Reusable rich text templates.',
    icon: <FileTextOutlined />,
    component: CustomTemplates,
    props: {},
  },
].filter(Boolean);

function getRealTabs() {
  return SETTINGS_TABS.filter((item) => item && !item.disabled && item.component);
}

function isValidTabKey(key) {
  return getRealTabs().some((item) => item.key === key);
}

function getInitialTab() {
  if (typeof window === 'undefined') return DEFAULT_TAB_KEY;

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');

  return isValidTabKey(tab) ? tab : DEFAULT_TAB_KEY;
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

function LoadingState({ token }) {
  return (
    <div
      style={{
        padding: token.padding,
        background: token.colorBgContainer,
      }}
    >
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
}

class TabErrorBoundary extends ReactComponent {
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
    if (prevProps.activeKey !== this.props.activeKey && this.state.hasError) {
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
            padding: token.paddingLG,
            background: token.colorBgContainer,
          }}
        >
          <Title level={5} style={{ marginTop: 0, color: token.colorError }}>
            This settings tab failed to load.
          </Title>

          <Text type="secondary">
            Check whether the imported component path exists and whether that
            component has a valid default export.
          </Text>

          {this.state.error?.message ? (
            <pre
              style={{
                marginTop: token.margin,
                padding: token.padding,
                borderRadius: token.borderRadius,
                background: token.colorFillQuaternary,
                border: `1px solid ${token.colorBorderSecondary}`,
                whiteSpace: 'pre-wrap',
                color: token.colorTextSecondary,
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

function ActiveComponent({ activeKey, auth, token }) {
  const activeTab = SETTINGS_TABS.find(
    (item) => item && item.key === activeKey && !item.disabled
  );

  if (!activeTab?.component) {
    return (
      <div
        style={{
          padding: token.paddingLG,
          background: token.colorBgContainer,
        }}
      >
        <Text type="secondary">No settings component found.</Text>
      </div>
    );
  }

  const Component = activeTab.component;
  const props = activeTab.props || {};

  return (
    <TabErrorBoundary activeKey={activeKey} token={token}>
      <Suspense fallback={<LoadingState token={token} />}>
        <Component auth={auth} embedded {...props} />
      </Suspense>
    </TabErrorBoundary>
  );
}

function SiderItem({ item, active, token, onClick }) {
  if (!item) return null;

  if (item.disabled) {
    return (
      <div
        style={{
          padding: '8px 6px 4px',
          marginTop: 4,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.55,
          textTransform: 'uppercase',
          color: token.colorTextQuaternary,
          lineHeight: '12px',
          userSelect: 'none',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(item.key)}
      title={item.description}
      style={{
        width: '100%',
        height: 32,
        border: 0,
        outline: 0,
        cursor: 'pointer',
        padding: '3px 6px',
        borderRadius: token.borderRadiusSM,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: active ? token.colorPrimaryBg : 'transparent',
        color: active ? token.colorText : token.colorTextSecondary,
        transition: 'all 0.16s ease',
        textAlign: 'left',
        flexShrink: 0,
      }}
      onMouseEnter={(event) => {
        if (!active) {
          event.currentTarget.style.background = token.colorFillTertiary;
        }
      }}
      onMouseLeave={(event) => {
        if (!active) {
          event.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: token.borderRadiusSM,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? token.colorPrimaryBg : token.colorFillQuaternary,
          color: active ? token.colorPrimary : token.colorTextSecondary,
          border: `1px solid ${
            active ? token.colorPrimaryBorder : token.colorBorderSecondary
          }`,
          flexShrink: 0,
          fontSize: 12,
        }}
      >
        {item.icon}
      </span>

      <span
        style={{
          display: 'block',
          minWidth: 0,
          fontSize: 13,
          fontWeight: active ? 700 : 600,
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

export default function SettingsIndex({ auth }) {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [activeKey, setActiveKey] = useState(getInitialTab);

  const activeTab = useMemo(() => {
    return SETTINGS_TABS.find((item) => item && item.key === activeKey);
  }, [activeKey]);

  const handleChange = (key) => {
    const tab = SETTINGS_TABS.find((item) => item && item.key === key);

    if (!tab || tab.disabled || !tab.component) return;

    setActiveKey(key);
    updateUrlTab(key);
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Configuration" />

      <style>
        {`
          .settings-sider-scroll {
            scrollbar-width: none;
            scrollbar-color: transparent transparent;
          }

          .settings-sider-scroll:hover {
            scrollbar-width: thin;
            scrollbar-color: ${token.colorBorderSecondary} transparent;
          }

          .settings-sider-scroll::-webkit-scrollbar {
            width: 0;
            height: 0;
          }

          .settings-sider-scroll:hover::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }

          .settings-sider-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .settings-sider-scroll::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 999px;
          }

          .settings-sider-scroll:hover::-webkit-scrollbar-thumb {
            background: ${token.colorBorderSecondary};
            border-radius: 999px;
          }

          .settings-sider-scroll:hover::-webkit-scrollbar-thumb:hover {
            background: ${token.colorBorder};
          }

          .settings-content-scroll::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }

          .settings-content-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .settings-content-scroll::-webkit-scrollbar-thumb {
            background: ${token.colorBorderSecondary};
            border-radius: 999px;
          }

          .settings-content-scroll::-webkit-scrollbar-thumb:hover {
            background: ${token.colorBorder};
          }
        `}
      </style>

      <div
        style={{
          height: 'calc(100vh - 64px)',
          minHeight: 'calc(100vh - 64px)',
          background: token.colorBgLayout,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: '0 0 auto',
            padding: isMobile ? '10px 14px' : '10px 18px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div
            style={{
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: token.marginSM,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Space size={8} align="center">
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: token.borderRadius,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    border: `1px solid ${token.colorPrimaryBorder}`,
                    fontSize: 14,
                  }}
                >
                  <SettingOutlined />
                </span>

                <div style={{ minWidth: 0 }}>
                  <Title
                    level={4}
                    style={{
                      margin: 0,
                      color: token.colorText,
                      fontSize: 17,
                      lineHeight: '22px',
                      fontWeight: 750,
                    }}
                  >
                    Configuration
                  </Title>

                  {activeTab?.description ? (
                    <Text
                      type="secondary"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        lineHeight: '16px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: isMobile ? 220 : 520,
                      }}
                    >
                      {activeTab.description}
                    </Text>
                  ) : null}
                </div>
              </Space>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            overflow: 'hidden',
          }}
        >
          <aside
            className="settings-sider-scroll"
            style={{
              width: isMobile ? '100%' : 230,
              minWidth: isMobile ? '100%' : 202,
              height: isMobile ? 'auto' : '100%',
              maxHeight: isMobile ? 82 : '100%',
              overflowY: isMobile ? 'hidden' : 'auto',
              overflowX: isMobile ? 'auto' : 'hidden',
              padding: isMobile ? '5px 6px' : 6,
              background: token.colorBgContainer,
              borderRight: isMobile
                ? 'none'
                : `1px solid ${token.colorBorderSecondary}`,
              borderBottom: isMobile
                ? `1px solid ${token.colorBorderSecondary}`
                : 'none',
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              gap: 9,
              flexShrink: 0,
            }}
          >
            {SETTINGS_TABS.map((item) => (
              <div
                key={item.key}
                style={{
                  width: isMobile ? 190 : '100%',
                  minWidth: isMobile ? 190 : undefined,
                  flexShrink: 0,
                }}
              >
                <SiderItem
                  item={item}
                  active={item.key === activeKey}
                  token={token}
                  onClick={handleChange}
                />
              </div>
            ))}
          </aside>

          <main
            className="settings-content-scroll"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: 'auto',
              padding: isMobile ? 10 : 12,
              background: token.colorBgLayout,
            }}
          >
            <Card
              bordered
              style={{
                minHeight: '100%',
                borderRadius: token.borderRadiusLG,
                overflow: 'hidden',
                borderColor: token.colorBorderSecondary,
                background: token.colorBgContainer,
                boxShadow: token.boxShadowTertiary,
              }}
              styles={{
                body: {
                  padding: 0,
                },
              }}
            >
              <ActiveComponent
                activeKey={activeKey}
                auth={auth}
                token={token}
              />
            </Card>
          </main>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}