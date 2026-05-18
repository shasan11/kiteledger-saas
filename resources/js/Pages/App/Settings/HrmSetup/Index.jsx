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

export default function HrmSetupIndex({ auth }) {
  const { token } = theme.useToken();
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);

  return (
    <div style={{ padding: 12 }}>
      <Card size="small" style={{ borderColor: token.colorBorderSecondary }} styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeSection}
          onChange={setActiveSection}
          destroyInactiveTabPane
          size="small"
          tabBarStyle={{ padding: '0 12px', margin: 0, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
          items={ALL_SECTIONS.map((item) => ({
            key: item.key,
            label: <Space size={6}>{item.icon}<span>{item.label}</span></Space>,
            children: item.component ? (
              <div style={{ padding: 12 }}>
                <Suspense fallback={<LoadingSection token={token} />}>
                  <item.component auth={auth} embedded />
                </Suspense>
              </div>
            ) : null,
          }))}
        />
      </Card>
    </div>
  );
}
