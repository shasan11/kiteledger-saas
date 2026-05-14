import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import dayjs from 'dayjs';
import axios from 'axios';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  SaveOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
];

const NO_TIME_STATUSES = ['ABSENT', 'HOLIDAY', 'ON_LEAVE'];

export default function Attendance({ auth }) {
  const { message } = App.useApp();
  const [date, setDate] = useState(dayjs());
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const [empRes, attRes] = await Promise.all([
        axios.get(api('/api/hrm/users/'), { params: { page_size: 500 } }),
        axios.get(api('/api/hrm/attendances/'), {
          params: { in_time_from: dateStr, in_time_to: dateStr, page_size: 500 },
        }),
      ]);

      setEmployees(empRes.data?.results || []);

      const attRows = attRes.data?.results || attRes.data?.data || [];
      const attMap = {};
      attRows.forEach((att) => { attMap[att.user_id] = att; });
      setAttendanceMap(attMap);

      const initEdits = {};
      attRows.forEach((att) => {
        const status = att.in_time_status || '';
        const noTime = NO_TIME_STATUSES.includes(status);
        initEdits[att.user_id] = {
          in_time: !noTime && att.in_time ? dayjs(att.in_time).format('HH:mm') : '',
          out_time: !noTime && att.out_time ? dayjs(att.out_time).format('HH:mm') : '',
          status,
          attendance_id: att.id,
          dirty: false,
        };
      });
      setEdits(initEdits);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateEdit = (userId, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [field]: value, dirty: true },
    }));
  };

  const bulkMark = (status) => {
    const keys = selectedKeys.length > 0 ? selectedKeys : employees.map((e) => e.id);
    const noTime = NO_TIME_STATUSES.includes(status);
    setEdits((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        const existing = prev[key] || {};
        next[key] = {
          ...existing,
          status,
          in_time: noTime ? '' : (existing.in_time || '09:00'),
          out_time: noTime ? '' : (existing.out_time || '18:00'),
          attendance_id: attendanceMap[key]?.id,
          dirty: true,
        };
      });
      return next;
    });
  };

  const saveAll = async () => {
    if (date.isAfter(dayjs(), 'day')) {
      message.warning('Future attendance cannot be saved.');
      return;
    }

    const dateStr = date.format('YYYY-MM-DD');
    const dirty = Object.entries(edits).filter(([, e]) => e.dirty && e.status);
    if (!dirty.length) { message.info('No changes to save.'); return; }

    setSaving(true);
    let saved = 0;
    let failed = 0;

    await Promise.all(
      dirty.map(async ([userId, edit]) => {
        try {
          const noTime = NO_TIME_STATUSES.includes(edit.status);
          const payload = {
            user_id: Number(userId),
            in_time: noTime ? `${dateStr}T00:00:00` : (edit.in_time ? `${dateStr}T${edit.in_time}:00` : null),
            out_time: noTime ? null : (edit.out_time ? `${dateStr}T${edit.out_time}:00` : null),
            in_time_status: edit.status || null,
            out_time_status: edit.status || null,
            active: true,
          };
          if (edit.attendance_id) {
            await axios.patch(api(`/api/hrm/attendances/${edit.attendance_id}/`), payload);
          } else {
            await axios.post(api('/api/hrm/attendances/'), payload);
          }
          saved++;
        } catch {
          failed++;
        }
      }),
    );

    setSaving(false);
    if (failed > 0) {
      message.warning(`${saved} saved, ${failed} failed.`);
    } else {
      message.success(`${saved} attendance record${saved !== 1 ? 's' : ''} saved.`);
    }
    await loadData();
  };

  const stats = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, ON_LEAVE: 0 };
    Object.values(edits).forEach((e) => {
      if (e.status && counts[e.status] !== undefined) counts[e.status]++;
    });
    const marked = Object.values(edits).filter((e) => e.status).length;
    return { ...counts, unmarked: employees.length - marked };
  }, [edits, employees]);

  const dirtyCount = useMemo(
    () => Object.values(edits).filter((e) => e.dirty && e.status).length,
    [edits],
  );

  const reportRows = useMemo(
    () => employees.map((emp) => {
      const edit = edits[emp.id] || {};
      const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.username || emp.email || '-';
      const inTime = edit.in_time || (attendanceMap[emp.id]?.in_time ? dayjs(attendanceMap[emp.id].in_time).format('HH:mm') : '');
      const outTime = edit.out_time || (attendanceMap[emp.id]?.out_time ? dayjs(attendanceMap[emp.id].out_time).format('HH:mm') : '');
      const start = inTime ? dayjs(`${date.format('YYYY-MM-DD')} ${inTime}`) : null;
      const end = outTime ? dayjs(`${date.format('YYYY-MM-DD')} ${outTime}`) : null;
      const hours = start?.isValid() && end?.isValid() && end.isAfter(start)
        ? (end.diff(start, 'minute') / 60).toFixed(2)
        : '-';

      return {
        id: emp.id,
        employee: name,
        code: emp.employee_id || emp.username || '-',
        status: edit.status || 'UNMARKED',
        in_time: inTime || '-',
        out_time: outTime || '-',
        hours,
      };
    }),
    [attendanceMap, date, edits, employees],
  );

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      width: 220,
      render: (_, emp) => {
        const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.username || emp.email;
        const initials = [emp.first_name?.[0], emp.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U';
        return (
          <Space size={10}>
            <Avatar size={32} style={{ background: '#1677ff', fontSize: 12, fontWeight: 700 }}>
              {initials}
            </Avatar>
            <div>
              <Text strong style={{ display: 'block', lineHeight: 1.3 }}>{name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{emp.employee_id || emp.username}</Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 155,
      render: (_, emp) => (
        <Select
          value={edits[emp.id]?.status || null}
          onChange={(val) => updateEdit(emp.id, 'status', val)}
          options={STATUS_OPTIONS}
          placeholder="—"
          style={{ width: '100%' }}
          allowClear
          size="small"
        />
      ),
    },
    {
      title: 'In Time',
      key: 'in_time',
      width: 120,
      render: (_, emp) => (
        <Input
          type="time"
          size="small"
          value={edits[emp.id]?.in_time || ''}
          onChange={(e) => updateEdit(emp.id, 'in_time', e.target.value)}
          disabled={NO_TIME_STATUSES.includes(edits[emp.id]?.status)}
        />
      ),
    },
    {
      title: 'Out Time',
      key: 'out_time',
      width: 120,
      render: (_, emp) => (
        <Input
          type="time"
          size="small"
          value={edits[emp.id]?.out_time || ''}
          onChange={(e) => updateEdit(emp.id, 'out_time', e.target.value)}
          disabled={NO_TIME_STATUSES.includes(edits[emp.id]?.status)}
        />
      ),
    },
    {
      title: 'Record',
      key: 'record',
      width: 90,
      align: 'center',
      render: (_, emp) => {
        const edit = edits[emp.id];
        if (edit?.dirty) return <Tag color="orange">Unsaved</Tag>;
        if (attendanceMap[emp.id]) return <Tag color="green">Saved</Tag>;
        return <Tag>—</Tag>;
      },
    },
  ];

  const statItems = [
    { label: 'Total', value: employees.length, color: '#1677ff', icon: <TeamOutlined /> },
    { label: 'Present', value: stats.PRESENT, color: '#52c41a', icon: <CheckCircleOutlined /> },
    { label: 'Late', value: stats.LATE, color: '#faad14', icon: <ClockCircleOutlined /> },
    { label: 'Absent', value: stats.ABSENT, color: '#ff4d4f', icon: <StopOutlined /> },
    { label: 'On Leave', value: stats.ON_LEAVE, color: '#1890ff', icon: <TeamOutlined /> },
    { label: 'Unmarked', value: stats.unmarked, color: '#8c8c8c', icon: <FieldTimeOutlined /> },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Attendance" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={12} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 12 }} styles={{ body: { padding: '12px 16px' } }}>
            <Row gutter={[12, 8]} align="middle" wrap>
              <Col>
                <Title level={4} style={{ margin: 0 }}>Day Register</Title>
              </Col>
              <Col>
                <DatePicker
                  value={date}
                  onChange={(d) => {
                    if (!d) return;
                    if (d.isAfter(dayjs(), 'day')) {
                      message.warning('Future attendance is not allowed.');
                      return;
                    }
                    setDate(d);
                  }}
                  disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
                  allowClear={false}
                  style={{ width: 160 }}
                />
              </Col>
              <Col flex="auto" />
              <Col>
                <Space wrap size={6}>
                  <Button
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => bulkMark('PRESENT')}
                  >
                    {selectedKeys.length > 0 ? `Mark ${selectedKeys.length} Present` : 'All Present'}
                  </Button>
                  <Button
                    size="small"
                    icon={<ClockCircleOutlined />}
                    onClick={() => bulkMark('LATE')}
                  >
                    {selectedKeys.length > 0 ? `Mark ${selectedKeys.length} Late` : 'All Late'}
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<StopOutlined />}
                    onClick={() => bulkMark('ABSENT')}
                  >
                    {selectedKeys.length > 0 ? `Mark ${selectedKeys.length} Absent` : 'All Absent'}
                  </Button>
                  <Button size="small" icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                    Refresh
                  </Button>
                  <Button size="small" icon={<FileTextOutlined />} onClick={() => setReportOpen(true)}>
                    Daily Report
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={saveAll}
                    loading={saving}
                    disabled={!dirtyCount}
                  >
                    Save{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Row gutter={[10, 10]}>
            {statItems.map(({ label, value, color, icon }) => (
              <Col xs={12} sm={8} md={4} key={label}>
                <Card bordered={false} style={{ borderRadius: 10 }} styles={{ body: { padding: '10px 14px' } }}>
                  <Space size={10} align="center">
                    <span style={{ color, fontSize: 18 }}>{icon}</span>
                    <Statistic
                      title={label}
                      value={value}
                      valueStyle={{ fontSize: 18, fontWeight: 700 }}
                    />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          <Card bordered={false} style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={employees}
              columns={columns}
              size="small"
              rowSelection={{
                selectedRowKeys: selectedKeys,
                onChange: setSelectedKeys,
              }}
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showTotal: (t) => `${t} employees`,
              }}
              scroll={{ x: 620 }}
              locale={{ emptyText: 'No employees found.' }}
            />
          </Card>

          <Drawer
            title={`Daily Attendance Report - ${date.format('DD MMM YYYY')}`}
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            width={860}
          >
            <Space direction="vertical" size={12} style={{ display: 'flex' }}>
              <Row gutter={[10, 10]}>
                {statItems.map(({ label, value, color, icon }) => (
                  <Col xs={12} md={8} key={label}>
                    <Card bordered={false} style={{ borderRadius: 10 }} styles={{ body: { padding: 12 } }}>
                      <Space size={10}>
                        <span style={{ color, fontSize: 17 }}>{icon}</span>
                        <Statistic title={label} value={value} valueStyle={{ fontSize: 18, fontWeight: 700 }} />
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Table
                rowKey="id"
                size="small"
                dataSource={reportRows}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                columns={[
                  {
                    title: 'Employee',
                    dataIndex: 'employee',
                    render: (value, row) => (
                      <div>
                        <Text strong>{value}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{row.code}</Text>
                      </div>
                    ),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    width: 130,
                    render: (value) => <Tag color={value === 'UNMARKED' ? 'default' : 'blue'}>{value.replace('_', ' ')}</Tag>,
                  },
                  { title: 'In', dataIndex: 'in_time', width: 90 },
                  { title: 'Out', dataIndex: 'out_time', width: 90 },
                  { title: 'Hours', dataIndex: 'hours', width: 90, align: 'right' },
                ]}
              />
            </Space>
          </Drawer>
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
