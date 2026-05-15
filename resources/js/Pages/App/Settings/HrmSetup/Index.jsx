import { lazy, Suspense, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  FlagOutlined,
  IdcardOutlined,
  ReadOutlined,
  SolutionOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Grid, Row, Skeleton, Space, Tabs, Typography, theme } from 'antd';

const { Paragraph, Text, Title } = Typography;
const { useBreakpoint } = Grid;

const Departments = lazy(() => import('../../Hrm/Departments/Index'));
const Designations = lazy(() => import('../../Hrm/Designations/Index'));
const EmploymentStatuses = lazy(() => import('../../Hrm/EmploymentStatuses/Index'));
const LeavePolicies = lazy(() => import('../../Hrm/LeavePolicies/Index'));
const LeaveTypes = lazy(() => import('../../Hrm/LeaveTypes/Index'));
const WeeklyHolidays = lazy(() => import('../../Hrm/WeeklyHolidays/Index'));
const PublicHolidays = lazy(() => import('../../Hrm/PublicHolidays/Index'));
const Shifts = lazy(() => import('../../Hrm/Shifts/Index'));
const Educations = lazy(() => import('../../Hrm/Educations/Index'));
const Awards = lazy(() => import('../../Hrm/Awards/Index'));
const Priorities = lazy(() => import('../../Hrm/Priorities/Index'));

const SECTION_GROUPS = [
  {
    key: 'people',
    label: 'People Structure',
    description: 'Role, department, and employment setup used across employees and profiles.',
    items: [
      {
        key: 'departments',
        label: 'Departments',
        icon: <TeamOutlined />,
        description: 'Department list and ownership structure.',
        component: Departments,
      },
      {
        key: 'designations',
        label: 'Designations',
        icon: <SolutionOutlined />,
        description: 'Job titles linked to departments.',
        component: Designations,
      },
      {
        key: 'employment-statuses',
        label: 'Employment Status',
        icon: <IdcardOutlined />,
        description: 'Status labels such as probation, active, or exited.',
        component: EmploymentStatuses,
      },
    ],
  },
  {
    key: 'leave',
    label: 'Leave & Calendar',
    description: 'Policies and calendars that drive attendance, leave, and payroll defaults.',
    items: [
      {
        key: 'leave-policies',
        label: 'Leave Policies',
        icon: <FileProtectOutlined />,
        description: 'Entitlements, carry-forward rules, and policy caps.',
        component: LeavePolicies,
      },
      {
        key: 'leave-types',
        label: 'Leave Types',
        icon: <AppstoreOutlined />,
        description: 'Annual, sick, maternity, and other leave categories.',
        component: LeaveTypes,
      },
      {
        key: 'weekly-holidays',
        label: 'Weekly Holidays',
        icon: <CalendarOutlined />,
        description: 'Recurring weekly off-day definitions.',
        component: WeeklyHolidays,
      },
      {
        key: 'public-holidays',
        label: 'Public Holidays',
        icon: <CalendarOutlined />,
        description: 'Date-based holiday calendar entries.',
        component: PublicHolidays,
      },
      {
        key: 'shifts',
        label: 'Shifts',
        icon: <ClockCircleOutlined />,
        description: 'Work schedules, timings, and standard hours.',
        component: Shifts,
      },
    ],
  },
  {
    key: 'records',
    label: 'Records & Recognition',
    description: 'Supporting master lists the HR team maintains in day-to-day administration.',
    items: [
      {
        key: 'educations',
        label: 'Education',
        icon: <ReadOutlined />,
        description: 'Education records and qualification references.',
        component: Educations,
      },
      {
        key: 'awards',
        label: 'Awards',
        icon: <TrophyOutlined />,
        description: 'Awards and recognition records.',
        component: Awards,
      },
      {
        key: 'priorities',
        label: 'Priorities',
        icon: <FlagOutlined />,
        description: 'Priority levels used across HRM project workflows.',
        component: Priorities,
      },
    ],
  },
];

const ALL_SECTIONS = SECTION_GROUPS.flatMap((group) => group.items);
const DEFAULT_SECTION = ALL_SECTIONS[0]?.key || 'departments';

function LoadingSection({ token }) {
  return (
    <div style={{ padding: token.paddingLG }}>
      <Skeleton active paragraph={{ rows: 10 }} />
    </div>
  );
}

function OverviewCard({ item, token, active, onSelect }) {
  return (
    <Card
      hoverable
      size="small"
      onClick={() => onSelect(item.key)}
      style={{
        height: '100%',
        borderRadius: token.borderRadiusLG,
        borderColor: active ? token.colorPrimaryBorder : token.colorBorderSecondary,
        background: active ? token.colorPrimaryBg : token.colorBgContainer,
        boxShadow: active ? token.boxShadowSecondary : 'none',
      }}
      styles={{
        body: {
          padding: 14,
        },
      }}
    >
      <Space direction="vertical" size={8} style={{ display: 'flex' }}>
        <Space size={10} align="start">
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: token.borderRadius,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: active ? token.colorPrimary : token.colorFillQuaternary,
              color: active ? token.colorTextLightSolid : token.colorPrimary,
              border: `1px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
              flexShrink: 0,
              fontSize: 16,
            }}
          >
            {item.icon}
          </span>

          <div style={{ minWidth: 0 }}>
            <Text
              strong
              style={{
                display: 'block',
                color: token.colorText,
                fontSize: 13,
              }}
            >
              {item.label}
            </Text>
            <Paragraph
              style={{
                margin: '4px 0 0',
                color: token.colorTextSecondary,
                fontSize: 12,
                lineHeight: 1.45,
              }}
              ellipsis={{ rows: 2 }}
            >
              {item.description}
            </Paragraph>
          </div>
        </Space>

        <Button
          type={active ? 'primary' : 'default'}
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item.key);
          }}
          style={{ alignSelf: 'flex-start' }}
        >
          {active ? 'Open' : 'Manage'}
        </Button>
      </Space>
    </Card>
  );
}

export default function HrmSetupIndex({ auth }) {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);

  const activeItem = useMemo(
    () => ALL_SECTIONS.find((item) => item.key === activeSection) || ALL_SECTIONS[0],
    [activeSection],
  );

  return (
    <div
      style={{
        padding: screens.md ? 16 : 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Card
        size="small"
        style={{
          borderRadius: token.borderRadiusLG,
          borderColor: token.colorBorderSecondary,
          background: token.colorBgContainer,
        }}
        styles={{
          body: {
            padding: screens.md ? 18 : 14,
          },
        }}
      >
        <Space direction="vertical" size={4} style={{ display: 'flex' }}>
          <Title level={5} style={{ margin: 0 }}>
            HRM Setup
          </Title>
          <Paragraph
            style={{
              margin: 0,
              color: token.colorTextSecondary,
            }}
          >
            Maintain HRM setup data here instead of jumping between separate master pages. Each section supports list, add, edit, and delete in the same workspace.
          </Paragraph>
        </Space>
      </Card>

      {SECTION_GROUPS.map((group) => (
        <Card
          key={group.key}
          size="small"
          title={group.label}
          style={{
            borderRadius: token.borderRadiusLG,
            borderColor: token.colorBorderSecondary,
          }}
          extra={
            <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
              {group.description}
            </Text>
          }
        >
          <Row gutter={[12, 12]}>
            {group.items.map((item) => (
              <Col key={item.key} xs={24} sm={12} xl={8}>
                <OverviewCard
                  item={item}
                  token={token}
                  active={item.key === activeSection}
                  onSelect={setActiveSection}
                />
              </Col>
            ))}
          </Row>
        </Card>
      ))}

      <Card
        size="small"
        style={{
          borderRadius: token.borderRadiusLG,
          borderColor: token.colorBorderSecondary,
          overflow: 'hidden',
        }}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <Tabs
          activeKey={activeSection}
          onChange={setActiveSection}
          destroyInactiveTabPane
          size="small"
          tabBarStyle={{
            padding: '0 12px',
            margin: 0,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
          items={ALL_SECTIONS.map((item) => ({
            key: item.key,
            label: (
              <Space size={6}>
                {item.icon}
                <span>{item.label}</span>
              </Space>
            ),
            children: item.component ? (
              <Suspense fallback={<LoadingSection token={token} />}>
                <item.component auth={auth} embedded />
              </Suspense>
            ) : null,
          }))}
        />
      </Card>
    </div>
  );
}
