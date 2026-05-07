import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  AuditOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  GiftOutlined,
  HistoryOutlined,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY'];
const LEAVE_STATUSES      = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const PAYSLIP_STATUSES    = ['UNPAID', 'PAID', 'PARTIAL'];
const CHECKLIST_STATUSES  = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'];
const CHECKLIST_TYPES     = ['ONBOARDING', 'OFFBOARDING'];

const STATUS_COLORS = {
  PRESENT: 'green',  ABSENT: 'red',    LATE: 'orange',   HALF_DAY: 'gold',
  ON_LEAVE: 'blue',  HOLIDAY: 'cyan',  PENDING: 'gold',  APPROVED: 'green',
  REJECTED: 'red',   CANCELLED: 'default', UNPAID: 'orange', PAID: 'green',
  PARTIAL: 'blue',   IN_PROGRESS: 'blue', COMPLETED: 'green', SKIPPED: 'default',
};

const toArray  = (v) => (Array.isArray(v) ? v : []);
const humanize = (v) => (v ? String(v).replace(/_/g, ' ') : '-');
const fmtDate  = (v) => (v ? dayjs(v).format('DD MMM YYYY') : '-');
const fmtTime  = (v) => (v ? dayjs(v).format('HH:mm') : '-');
const fmtMoney = (v) => (v != null ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-');
const dateVal  = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : null);
const coll     = (p) => p?.results || p?.data || (Array.isArray(p) ? p : []);
const userName = (u) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email : '-';

function StatusTag({ value }) {
  return <Tag color={STATUS_COLORS[value] || 'default'}>{humanize(value)}</Tag>;
}

function Meta({ label, value }) {
  return (
    <div className="emp-show__meta">
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <div>{value ?? '-'}</div>
    </div>
  );
}

function Metric({ label, value, icon, color = '#1677ff' }) {
  return (
    <Card className="emp-show__metric" bordered={false}>
      <Space align="start">
        <span className="emp-show__metric-icon" style={{ background: `${color}18`, color }}>{icon}</span>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
          <strong>{value}</strong>
        </div>
      </Space>
    </Card>
  );
}

function SectionCard({ title, extra, children }) {
  return (
    <Card className="emp-show__card" title={title} extra={extra} bordered={false}>
      {children}
    </Card>
  );
}

function ActionMenu({ onEdit, onDelete }) {
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          { key: 'edit', label: 'Edit', onClick: onEdit },
          { key: 'delete', danger: true, label: 'Delete', onClick: onDelete },
        ],
      }}
    >
      <Button type="text" icon={<MoreOutlined />} size="small" />
    </Dropdown>
  );
}

// ── Child configuration ──────────────────────────────────────────────────────
const childMeta = {
  attendance:      { title: 'Attendance',          endpoint: '/api/hrm/attendances' },
  leaveApp:        { title: 'Leave Application',   endpoint: '/api/hrm/leave-applications' },
  payslip:         { title: 'Payslip',             endpoint: '/api/hrm/payslips' },
  salaryHistory:   { title: 'Salary History',      endpoint: '/api/hrm/salary-histories' },
  designHistory:   { title: 'Designation History', endpoint: '/api/hrm/designation-histories' },
  education:       { title: 'Education',           endpoint: '/api/hrm/educations' },
  awardHistory:    { title: 'Award',               endpoint: '/api/hrm/award-histories' },
  document:        { title: 'Document',            endpoint: '/api/hrm/employee-documents' },
  onboarding:      { title: 'Checklist Item',      endpoint: '/api/hrm/onboarding-checklists' },
};

export default function EmployeeShow({ auth, id }) {
  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  // child data
  const [attendances,    setAttendances]    = useState([]);
  const [leaveApps,      setLeaveApps]      = useState([]);
  const [payslips,       setPayslips]       = useState([]);
  const [salaryHists,    setSalaryHists]    = useState([]);
  const [designHists,    setDesignHists]    = useState([]);
  const [educations,     setEducations]     = useState([]);
  const [awardHists,     setAwardHists]     = useState([]);
  const [documents,      setDocuments]      = useState([]);
  const [checklists,     setChecklists]     = useState([]);

  // lookups
  const [leavePolicies,  setLeavePolicies]  = useState([]);
  const [designations,   setDesignations]   = useState([]);
  const [awards,         setAwards]         = useState([]);
  const [departments,    setDepartments]    = useState([]);
  const [empStatuses,    setEmpStatuses]    = useState([]);
  const [shifts,         setShifts]         = useState([]);
  const [roles,          setRoles]          = useState([]);
  const [weeklyHols,     setWeeklyHols]     = useState([]);
  const [leavePoliciesL, setLeavePoliciesL] = useState([]);

  // editor state
  const [userOpen,     setUserOpen]     = useState(false);
  const [childOpen,    setChildOpen]    = useState(false);
  const [childType,    setChildType]    = useState(null);
  const [editingChild, setEditingChild] = useState(null);

  const [userForm]  = Form.useForm();
  const [childForm] = Form.useForm();

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadUser = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api(`/api/hrm/users/${id}`));
      setUser(data);
    } catch {
      message.error('Unable to load employee.');
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async (userId) => {
    const q = { params: { user_id: userId, page_size: 200 } };
    const [att, leave, pay, salH, desH, edu, awH, doc, chk] = await Promise.allSettled([
      axios.get(api('/api/hrm/attendances'),           { params: { user_id: userId, page_size: 50,  ordering: '-in_time' } }),
      axios.get(api('/api/hrm/leave-applications'),    { params: { user_id: userId, page_size: 50,  ordering: '-created_at' } }),
      axios.get(api('/api/hrm/payslips'),              { params: { user_id: userId, page_size: 50,  ordering: '-salary_year,-salary_month' } }),
      axios.get(api('/api/hrm/salary-histories'),      q),
      axios.get(api('/api/hrm/designation-histories'), q),
      axios.get(api('/api/hrm/educations'),            q),
      axios.get(api('/api/hrm/award-histories'),       q),
      axios.get(api('/api/hrm/employee-documents'),    q),
      axios.get(api('/api/hrm/onboarding-checklists'), q),
    ]);
    if (att.status     === 'fulfilled') setAttendances(coll(att.value.data));
    if (leave.status   === 'fulfilled') setLeaveApps(coll(leave.value.data));
    if (pay.status     === 'fulfilled') setPayslips(coll(pay.value.data));
    if (salH.status    === 'fulfilled') setSalaryHists(coll(salH.value.data));
    if (desH.status    === 'fulfilled') setDesignHists(coll(desH.value.data));
    if (edu.status     === 'fulfilled') setEducations(coll(edu.value.data));
    if (awH.status     === 'fulfilled') setAwardHists(coll(awH.value.data));
    if (doc.status     === 'fulfilled') setDocuments(coll(doc.value.data));
    if (chk.status     === 'fulfilled') setChecklists(coll(chk.value.data));
  };

  const loadLookups = async () => {
    const size = { params: { page_size: 200 } };
    const [lp, des, aw, dep, es, sh, ro, wh] = await Promise.allSettled([
      axios.get(api('/api/hrm/leave-policies'),       size),
      axios.get(api('/api/hrm/designations'),         size),
      axios.get(api('/api/hrm/awards'),               size),
      axios.get(api('/api/hrm/departments'),          size),
      axios.get(api('/api/hrm/employment-statuses'),  size),
      axios.get(api('/api/hrm/shifts'),               size),
      axios.get(api('/api/hrm/roles'),                size),
      axios.get(api('/api/hrm/weekly-holidays'),      size),
    ]);
    if (lp.status  === 'fulfilled') { setLeavePolicies(coll(lp.value.data)); setLeavePoliciesL(coll(lp.value.data)); }
    if (des.status === 'fulfilled') setDesignations(coll(des.value.data));
    if (aw.status  === 'fulfilled') setAwards(coll(aw.value.data));
    if (dep.status === 'fulfilled') setDepartments(coll(dep.value.data));
    if (es.status  === 'fulfilled') setEmpStatuses(coll(es.value.data));
    if (sh.status  === 'fulfilled') setShifts(coll(sh.value.data));
    if (ro.status  === 'fulfilled') setRoles(coll(ro.value.data));
    if (wh.status  === 'fulfilled') setWeeklyHols(coll(wh.value.data));
  };

  useEffect(() => {
    loadUser();
    loadLookups().catch(() => null);
  }, [id]);

  useEffect(() => {
    if (user?.id) loadChildren(user.id).catch(() => null);
  }, [user?.id]);

  // ── Options ────────────────────────────────────────────────────────────────
  const opts = (arr, labelKey = 'name') =>
    arr.map((r) => ({ label: r[labelKey] || r.name, value: r.id }));

  // ── Employee editor ────────────────────────────────────────────────────────
  const openUserEditor = () => {
    userForm.setFieldsValue({
      first_name:           user.first_name,
      last_name:            user.last_name,
      email:                user.email,
      phone:                user.phone,
      employee_id:          user.employee_id,
      blood_group:          user.blood_group,
      join_date:            dateVal(user.join_date),
      leave_date:           dateVal(user.leave_date),
      employment_status_id: user.employment_status_id,
      department_id:        user.department_id,
      role_id:              user.role_id,
      shift_id:             user.shift_id,
      leave_policy_id:      user.leave_policy_id,
      weekly_holiday_id:    user.weekly_holiday_id,
      street:               user.street,
      city:                 user.city,
      state:                user.state,
      zip_code:             user.zip_code,
      country:              user.country,
      active:               user.active !== false,
    });
    setUserOpen(true);
  };

  const saveUser = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, active: values.active !== false };
      Object.keys(payload).forEach((k) => payload[k] === '' && (payload[k] = null));
      await axios.patch(api(`/api/hrm/users/${user.id}`), payload);
      message.success('Employee updated.');
      setUserOpen(false);
      loadUser();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  // ── Child CRUD ─────────────────────────────────────────────────────────────
  const defaultsFor = (type) => ({
    attendance:    { user_id: user.id, active: true },
    leaveApp:      { user_id: user.id, status: 'PENDING', active: true },
    payslip:       { user_id: user.id, payment_status: 'UNPAID', salary_month: dayjs().month() + 1, salary_year: dayjs().year(), active: true },
    salaryHistory: { user_id: user.id, active: true },
    designHistory: { user_id: user.id, active: true },
    education:     { user_id: user.id, active: true },
    awardHistory:  { user_id: user.id, active: true },
    document:      { user_id: user.id, active: true },
    onboarding:    { user_id: user.id, type: 'ONBOARDING', status: 'PENDING', active: true },
  }[type] || {});

  const normalizeChild = (type, row = {}) => ({
    ...row,
    active:     row.active !== false,
    start_date: dateVal(row.start_date),
    end_date:   dateVal(row.end_date),
    awarded_date: dateVal(row.awarded_date),
    due_date:   dateVal(row.due_date),
    issue_date: dateVal(row.issue_date),
    expiry_date: dateVal(row.expiry_date),
    study_start_date: dateVal(row.study_start_date),
    study_end_date:   dateVal(row.study_end_date),
  });

  const openChildEditor = (type, row = null) => {
    setChildType(type);
    setEditingChild(row);
    childForm.resetFields();
    childForm.setFieldsValue(row ? normalizeChild(type, row) : defaultsFor(type));
    setChildOpen(true);
  };

  const saveChild = async (values) => {
    const meta = childMeta[childType];
    if (!meta) return;
    setSaving(true);
    try {
      const payload = { ...values, active: values.active !== false };
      const url    = editingChild ? `${meta.endpoint}/${editingChild.id}` : meta.endpoint;
      const method = editingChild ? 'patch' : 'post';
      await axios[method](api(url), payload);
      message.success(`${meta.title} saved.`);
      setChildOpen(false);
      loadChildren(user.id);
    } catch (err) {
      message.error(err?.response?.data?.message || `Unable to save ${meta.title}.`);
    } finally {
      setSaving(false);
    }
  };

  const deleteChild = (type, row) => {
    const meta = childMeta[type];
    Modal.confirm({
      title: `Delete ${meta.title}?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await axios.delete(api(`${meta.endpoint}/${row.id}`));
        message.success(`${meta.title} deleted.`);
        loadChildren(user.id);
      },
    });
  };

  const approveLeave = async (row) => {
    setSaving(true);
    try {
      await axios.patch(api(`/api/hrm/leave-applications/${row.id}`), { status: 'APPROVED' });
      message.success('Leave approved.');
      loadChildren(user.id);
    } catch {
      message.error('Unable to approve leave.');
    } finally {
      setSaving(false);
    }
  };

  const rejectLeave = async (row) => {
    setSaving(true);
    try {
      await axios.patch(api(`/api/hrm/leave-applications/${row.id}`), { status: 'REJECTED' });
      message.success('Leave rejected.');
      loadChildren(user.id);
    } catch {
      message.error('Unable to reject leave.');
    } finally {
      setSaving(false);
    }
  };

  // ── Child form fields ──────────────────────────────────────────────────────
  const renderChildFields = () => {
    if (childType === 'attendance') return (
      <>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="in_time" label="In Time" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item></Col>
          <Col span={12}><Form.Item name="out_time" label="Out Time"><Input type="datetime-local" /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><Form.Item name="in_time_status" label="In Status"><Select options={ATTENDANCE_STATUSES.map(v => ({ label: humanize(v), value: v }))} allowClear /></Form.Item></Col>
          <Col span={8}><Form.Item name="out_time_status" label="Out Status"><Select options={ATTENDANCE_STATUSES.map(v => ({ label: humanize(v), value: v }))} allowClear /></Form.Item></Col>
          <Col span={8}><Form.Item name="total_hour" label="Total Hours"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Form.Item name="comment" label="Comment"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'leaveApp') return (
      <>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="leave_from" label="From Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          <Col span={12}><Form.Item name="leave_to" label="To Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="leave_type" label="Leave Policy">
              <Select options={opts(leavePolicies)} showSearch optionFilterProp="label" allowClear />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="Status">
              <Select options={LEAVE_STATUSES.map(v => ({ label: humanize(v), value: v }))} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="leave_duration" label="Duration (days)"><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="reason" label="Reason"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'payslip') return (
      <>
        <Row gutter={12}>
          <Col span={8}><Form.Item name="salary_month" label="Month" rules={[{ required: true }]}><InputNumber min={1} max={12} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="salary_year" label="Year" rules={[{ required: true }]}><InputNumber min={2000} max={2100} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="payment_status" label="Status"><Select options={PAYSLIP_STATUSES.map(v => ({ label: v, value: v }))} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><Form.Item name="salary" label="Basic Salary" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="bonus" label="Bonus"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="deduction" label="Deduction"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><Form.Item name="salary_payable" label="Salary Payable"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="total_payable" label="Total Payable"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="work_day" label="Work Days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Form.Item name="bonus_comment" label="Bonus Notes"><Input /></Form.Item>
        <Form.Item name="deduction_comment" label="Deduction Notes"><Input /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'salaryHistory') return (
      <>
        <Form.Item name="salary" label="Salary" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          <Col span={12}><Form.Item name="end_date" label="End Date"><Input type="date" /></Form.Item></Col>
        </Row>
        <Form.Item name="comment" label="Comment"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'designHistory') return (
      <>
        <Form.Item name="designation_id" label="Designation" rules={[{ required: true }]}>
          <Select options={opts(designations)} showSearch optionFilterProp="label" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          <Col span={12}><Form.Item name="end_date" label="End Date"><Input type="date" /></Form.Item></Col>
        </Row>
        <Form.Item name="comment" label="Comment"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'education') return (
      <>
        <Form.Item name="degree" label="Degree / Qualification" rules={[{ required: true }]}><Input /></Form.Item>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="institution" label="Institution" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="field_of_study" label="Field of Study"><Input /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><Form.Item name="result" label="Result / Grade"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="study_start_date" label="Start Date"><Input type="date" /></Form.Item></Col>
          <Col span={8}><Form.Item name="study_end_date" label="End Date"><Input type="date" /></Form.Item></Col>
        </Row>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'awardHistory') return (
      <>
        <Form.Item name="award_id" label="Award" rules={[{ required: true }]}>
          <Select options={opts(awards)} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="awarded_date" label="Award Date" rules={[{ required: true }]}><Input type="date" /></Form.Item>
        <Form.Item name="comment" label="Comment"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'document') return (
      <>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="document_type" label="Document Type"><Input placeholder="e.g. Passport, ID, Certificate" /></Form.Item></Col>
          <Col span={12}><Form.Item name="file_path" label="File URL / Path"><Input /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="issue_date" label="Issue Date"><Input type="date" /></Form.Item></Col>
          <Col span={12}><Form.Item name="expiry_date" label="Expiry Date"><Input type="date" /></Form.Item></Col>
        </Row>
        <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );

    if (childType === 'onboarding') return (
      <>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={CHECKLIST_TYPES.map(v => ({ label: v, value: v }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="Status">
              <Select options={CHECKLIST_STATUSES.map(v => ({ label: humanize(v), value: v }))} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="due_date" label="Due Date"><Input type="date" /></Form.Item></Col>
          <Col span={12}><Form.Item name="completed_at" label="Completed At"><Input type="date" /></Form.Item></Col>
        </Row>
        <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </>
    );
    return null;
  };

  // ── Table column sets ──────────────────────────────────────────────────────
  const cols = useMemo(() => {
    const addEdit = (type) => ({ title: '', width: 48, render: (_, row) => <ActionMenu onEdit={() => openChildEditor(type, row)} onDelete={() => deleteChild(type, row)} /> });
    return {
      attendance: [
        { title: 'Date', dataIndex: 'in_time', width: 110, render: (v) => fmtDate(v) },
        { title: 'In', dataIndex: 'in_time', width: 70, render: fmtTime },
        { title: 'Out', dataIndex: 'out_time', width: 70, render: fmtTime },
        { title: 'Hours', dataIndex: 'total_hour', width: 70, render: (v) => v ?? '-' },
        { title: 'Status', dataIndex: 'in_time_status', render: (v) => v ? <StatusTag value={v} /> : '-' },
        addEdit('attendance'),
      ],
      leaveApp: [
        { title: 'From', dataIndex: 'leave_from', width: 110, render: fmtDate },
        { title: 'To',   dataIndex: 'leave_to',   width: 110, render: fmtDate },
        { title: 'Days', dataIndex: 'leave_duration', width: 70, render: (v) => v ?? '-' },
        { title: 'Type', dataIndex: 'leave_type', render: (v) => v || '-' },
        { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag value={v} /> },
        {
          title: '', width: 130,
          render: (_, row) => (
            <Space size={4}>
              {row.status === 'PENDING' && (
                <>
                  <Button size="small" type="primary" onClick={() => approveLeave(row)}>Approve</Button>
                  <Button size="small" danger onClick={() => rejectLeave(row)}>Reject</Button>
                </>
              )}
              <ActionMenu onEdit={() => openChildEditor('leaveApp', row)} onDelete={() => deleteChild('leaveApp', row)} />
            </Space>
          ),
        },
      ],
      payslip: [
        { title: 'Period', render: (_, r) => `${String(r.salary_month).padStart(2,'0')}/${r.salary_year}`, width: 90 },
        { title: 'Basic', dataIndex: 'salary', render: fmtMoney, width: 110 },
        { title: 'Bonus', dataIndex: 'bonus', render: fmtMoney, width: 90 },
        { title: 'Deduction', dataIndex: 'deduction', render: fmtMoney, width: 90 },
        { title: 'Total Payable', dataIndex: 'total_payable', render: fmtMoney, width: 120 },
        { title: 'Status', dataIndex: 'payment_status', render: (v) => <StatusTag value={v} /> },
        addEdit('payslip'),
      ],
      salaryHistory: [
        { title: 'Salary', dataIndex: 'salary', render: (v) => <strong>{fmtMoney(v)}</strong> },
        { title: 'From', dataIndex: 'start_date', render: fmtDate },
        { title: 'To',   dataIndex: 'end_date',   render: (v) => v ? fmtDate(v) : <Tag color="green">Current</Tag> },
        { title: 'Comment', dataIndex: 'comment', render: (v) => v || '-' },
        addEdit('salaryHistory'),
      ],
      designHistory: [
        { title: 'Designation', render: (_, r) => r?.designation?.name || r.designation_id || '-' },
        { title: 'From', dataIndex: 'start_date', render: fmtDate },
        { title: 'To',   dataIndex: 'end_date',   render: (v) => v ? fmtDate(v) : <Tag color="green">Current</Tag> },
        { title: 'Comment', dataIndex: 'comment', render: (v) => v || '-' },
        addEdit('designHistory'),
      ],
      education: [
        { title: 'Degree', dataIndex: 'degree', render: (v) => <strong>{v}</strong> },
        { title: 'Institution', dataIndex: 'institution' },
        { title: 'Field', dataIndex: 'field_of_study', render: (v) => v || '-' },
        { title: 'Result', dataIndex: 'result', render: (v) => v || '-' },
        { title: 'Year', dataIndex: 'study_end_date', render: (v) => v ? dayjs(v).format('YYYY') : '-' },
        addEdit('education'),
      ],
      awardHistory: [
        { title: 'Award', render: (_, r) => r?.award?.name || '-', render: (_, r) => <Tag color="gold">{r?.award?.name || '-'}</Tag> },
        { title: 'Date', dataIndex: 'awarded_date', render: fmtDate },
        { title: 'Comment', dataIndex: 'comment', render: (v) => v || '-' },
        addEdit('awardHistory'),
      ],
      document: [
        { title: 'Title', dataIndex: 'title', render: (v) => <strong>{v}</strong> },
        { title: 'Type', dataIndex: 'document_type', render: (v) => v ? <Tag>{v}</Tag> : '-' },
        { title: 'Issued', dataIndex: 'issue_date', render: fmtDate },
        {
          title: 'Expires', dataIndex: 'expiry_date', render: (v) => {
            if (!v) return '-';
            const d = dayjs(v);
            const expired = d.isBefore(dayjs());
            const soon = !expired && d.diff(dayjs(), 'day') <= 30;
            return (
              <Tag color={expired ? 'red' : soon ? 'orange' : 'default'} icon={expired || soon ? <WarningOutlined /> : null}>
                {fmtDate(v)}
              </Tag>
            );
          },
        },
        { title: 'File', dataIndex: 'file_path', render: (v) => v ? <a href={v} target="_blank" rel="noreferrer">View</a> : '-' },
        addEdit('document'),
      ],
      onboarding: [
        { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={v === 'ONBOARDING' ? 'blue' : 'volcano'}>{v}</Tag>, width: 110 },
        { title: 'Task', dataIndex: 'title', render: (v) => <strong>{v}</strong> },
        { title: 'Due', dataIndex: 'due_date', render: fmtDate, width: 110 },
        { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag value={v} /> },
        addEdit('onboarding'),
      ],
    };
  }, [designations, awards, leavePolicies, user]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const pendingLeaves    = leaveApps.filter((l) => l.status === 'PENDING').length;
  const expiredDocs      = documents.filter((d) => d.expiry_date && dayjs(d.expiry_date).isBefore(dayjs())).length;
  const onboardingPct    = checklists.length
    ? Math.round((checklists.filter((c) => c.status === 'COMPLETED').length / checklists.length) * 100)
    : 0;
  const currentSalary    = salaryHists.find((s) => !s.end_date)?.salary ?? user?.salary ?? 0;
  const currentDesig     = designHists.find((d) => !d.end_date)?.designation?.name ?? user?.designation?.name ?? '-';
  const empStatus        = user?.employment_status?.name ?? '-';

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username : 'Employee';
  const initials = user ? [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'E' : 'E';

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={fullName} />
      <style>{`
        .emp-show { min-height: calc(100vh - 64px); background: #edf2f8; }
        .emp-show__bar { height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; background: #fff; border-bottom: 1px solid #d9e1ec; }
        .emp-show__crumb { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .emp-show__body { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 10px; }
        .emp-show__rail { background: #fff; border-right: 1px solid #d9e1ec; min-height: calc(100vh - 114px); padding: 18px 20px; overflow-y: auto; }
        .emp-show__profile { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #e3e9f2; }
        .emp-show__meta-list { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; }
        .emp-show__meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .emp-show__main { padding: 10px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .emp-show__card.ant-card { border-radius: 6px; box-shadow: none; }
        .emp-show__metric.ant-card { border-radius: 6px; box-shadow: none; }
        .emp-show__metric .ant-card-body { min-height: 88px; display: flex; align-items: center; }
        .emp-show__metric strong { display: block; font-size: 20px; font-weight: 650; color: #10233f; }
        .emp-show__metric-icon { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; }
        .emp-show .ant-table-thead > tr > th { background: #e9eff7; font-weight: 700; }
        @media (max-width: 992px) { .emp-show__body { grid-template-columns: 1fr; } .emp-show__rail { min-height: auto; border-right: 0; border-bottom: 1px solid #d9e1ec; } }
      `}</style>

      <div className="emp-show">
        {/* Top bar */}
        <div className="emp-show__bar">
          <div className="emp-show__crumb">
            <Link href={route('hrm.users.index')}>
              <Button type="text" icon={<ArrowLeftOutlined />}>Back to Employees</Button>
            </Link>
            <Text ellipsis style={{ maxWidth: 380 }}>{loading ? 'Loading…' : fullName}</Text>
          </div>
          <Button type="primary" icon={<EditOutlined />} disabled={!user} onClick={openUserEditor}>
            Edit Employee
          </Button>
        </div>

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton active paragraph={{ rows: 10 }} /></div>
        ) : !user ? (
          <Empty style={{ paddingTop: 80 }} description="Employee not found" />
        ) : (
          <div className="emp-show__body">
            {/* ── Left rail ── */}
            <aside className="emp-show__rail">
              <div className="emp-show__profile">
                {user.image
                  ? <Avatar src={`${BACKEND}${user.image}`} size={48} />
                  : <Avatar size={48} style={{ background: '#1677ff', fontWeight: 700, fontSize: 18 }}>{initials}</Avatar>}
                <div>
                  <Title level={4} style={{ margin: 0 }}>{fullName}</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>{currentDesig}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={user.active ? 'green' : 'red'}>{user.active ? 'Active' : 'Inactive'}</Tag>
                    <Tag>{empStatus}</Tag>
                  </div>
                </div>
              </div>

              <div className="emp-show__meta-list">
                {user.employee_id && <Meta label="Employee ID" value={<code>{user.employee_id}</code>} />}
                {user.email  && <Meta label="Email"  value={<Space><MailOutlined style={{ color: '#888' }} />{user.email}</Space>} />}
                {user.phone  && <Meta label="Phone"  value={<Space><PhoneOutlined style={{ color: '#888' }} />{user.phone}</Space>} />}
                <Meta label="Department" value={user.department?.name || '-'} />
                <Meta label="Shift"      value={user.shift?.name || '-'} />
                <Meta label="Role"       value={user.role?.name ? <Tag>{user.role.name}</Tag> : '-'} />
                <Meta label="Blood Group" value={user.blood_group || '-'} />
                <Meta label="Join Date"   value={fmtDate(user.join_date)} />
                {user.leave_date && <Meta label="Leave Date" value={fmtDate(user.leave_date)} />}
                <Meta label="Leave Policy"   value={user.leavePolicy?.name || user.leave_policy?.name || '-'} />
                <Meta label="Current Salary" value={currentSalary ? <strong>{fmtMoney(currentSalary)}</strong> : '-'} />
                {(user.street || user.city || user.country) && (
                  <Meta label="Address" value={[user.street, user.city, user.state, user.country].filter(Boolean).join(', ')} />
                )}
              </div>
            </aside>

            {/* ── Main content ── */}
            <main className="emp-show__main">
              {!user.active && (
                <Alert showIcon type="warning" message="This employee is inactive." />
              )}

              {/* Metric cards */}
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} lg={6}><Metric label="Leave Applications" value={leaveApps.length} icon={<CalendarOutlined />} color="#fa8c16" /></Col>
                <Col xs={24} sm={12} lg={6}><Metric label="Pending Leaves"     value={pendingLeaves}    icon={<AuditOutlined />}    color="#faad14" /></Col>
                <Col xs={24} sm={12} lg={6}><Metric label="Payslips"           value={payslips.length} icon={<FileTextOutlined />} color="#1677ff" /></Col>
                <Col xs={24} sm={12} lg={6}><Metric label="Awards"             value={awardHists.length} icon={<TrophyOutlined />} color="#52c41a" /></Col>
              </Row>

              {/* Personal & Employment details */}
              <SectionCard title="Employee Details">
                <Descriptions size="small" bordered column={{ xs: 1, md: 2 }}>
                  <Descriptions.Item label="Full Name">{fullName}</Descriptions.Item>
                  <Descriptions.Item label="Employee ID"><code>{user.employee_id || '-'}</code></Descriptions.Item>
                  <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                  <Descriptions.Item label="Phone">{user.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Department">{user.department?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Designation">{currentDesig}</Descriptions.Item>
                  <Descriptions.Item label="Employment Status"><Tag>{empStatus}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Shift">{user.shift?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Leave Policy">{user.leavePolicy?.name || user.leave_policy?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Role">{user.role?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Join Date">{fmtDate(user.join_date)}</Descriptions.Item>
                  <Descriptions.Item label="Blood Group">{user.blood_group || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Address" span={2}>{[user.street, user.city, user.state, user.zip_code, user.country].filter(Boolean).join(', ') || '-'}</Descriptions.Item>
                </Descriptions>
              </SectionCard>

              {/* Attendance */}
              <SectionCard
                title={<Space><CalendarOutlined />Attendance Records<Badge count={attendances.length} showZero style={{ backgroundColor: '#1677ff' }} /></Space>}
                extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('attendance')}>Add</Button>}
              >
                <Table size="small" rowKey="id" pagination={{ pageSize: 8 }} dataSource={attendances} columns={cols.attendance} />
              </SectionCard>

              {/* Leave Applications */}
              <SectionCard
                title={<Space><AuditOutlined />Leave Applications<Badge count={pendingLeaves} style={{ backgroundColor: pendingLeaves > 0 ? '#faad14' : '#1677ff' }} /></Space>}
                extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('leaveApp')}>Add</Button>}
              >
                <Table size="small" rowKey="id" pagination={{ pageSize: 6 }} dataSource={leaveApps} columns={cols.leaveApp} />
              </SectionCard>

              {/* Payslips */}
              <SectionCard
                title={<Space><FileTextOutlined />Payslips</Space>}
                extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('payslip')}>Add</Button>}
              >
                <Table size="small" rowKey="id" pagination={{ pageSize: 6 }} dataSource={payslips} columns={cols.payslip} />
              </SectionCard>

              {/* Salary + Designation histories */}
              <Row gutter={[12, 12]}>
                <Col xs={24} xl={12}>
                  <SectionCard
                    title={<Space><HistoryOutlined />Salary History</Space>}
                    extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('salaryHistory')}>Add</Button>}
                  >
                    <Table size="small" rowKey="id" pagination={false} dataSource={salaryHists} columns={cols.salaryHistory} />
                  </SectionCard>
                </Col>
                <Col xs={24} xl={12}>
                  <SectionCard
                    title={<Space><TeamOutlined />Designation History</Space>}
                    extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('designHistory')}>Add</Button>}
                  >
                    <Table size="small" rowKey="id" pagination={false} dataSource={designHists} columns={cols.designHistory} />
                  </SectionCard>
                </Col>
              </Row>

              {/* Education + Awards */}
              <Row gutter={[12, 12]}>
                <Col xs={24} xl={12}>
                  <SectionCard
                    title={<Space><BookOutlined />Education</Space>}
                    extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('education')}>Add</Button>}
                  >
                    <Table size="small" rowKey="id" pagination={false} dataSource={educations} columns={cols.education} />
                  </SectionCard>
                </Col>
                <Col xs={24} xl={12}>
                  <SectionCard
                    title={<Space><TrophyOutlined />Awards</Space>}
                    extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('awardHistory')}>Add</Button>}
                  >
                    <Table size="small" rowKey="id" pagination={false} dataSource={awardHists} columns={cols.awardHistory} />
                  </SectionCard>
                </Col>
              </Row>

              {/* Documents */}
              <SectionCard
                title={
                  <Space>
                    <SafetyCertificateOutlined />Documents
                    {expiredDocs > 0 && <Tooltip title={`${expiredDocs} expired`}><Tag color="red"><WarningOutlined /> {expiredDocs} Expired</Tag></Tooltip>}
                  </Space>
                }
                extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('document')}>Add</Button>}
              >
                <Table size="small" rowKey="id" pagination={false} dataSource={documents} columns={cols.document} />
              </SectionCard>

              {/* Onboarding / Offboarding */}
              <SectionCard
                title={
                  <Space>
                    <CheckCircleOutlined />Onboarding & Offboarding
                    {checklists.length > 0 && <Tag color="blue">{onboardingPct}% Complete</Tag>}
                  </Space>
                }
                extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('onboarding')}>Add</Button>}
              >
                <Table size="small" rowKey="id" pagination={false} dataSource={checklists} columns={cols.onboarding} />
              </SectionCard>
            </main>
          </div>
        )}
      </div>

      {/* Edit Employee Modal */}
      <Modal
        title="Edit Employee"
        open={userOpen}
        onCancel={() => setUserOpen(false)}
        onOk={() => userForm.submit()}
        confirmLoading={saving}
        width={820}
      >
        <Form form={userForm} layout="vertical" onFinish={saveUser}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="last_name"  label="Last Name"  rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="employee_id" label="Employee ID"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="blood_group"  label="Blood Group">
              <Select options={['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(v => ({ label: v, value: v }))} allowClear />
            </Form.Item></Col>
            <Col span={8}><Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="join_date"  label="Join Date"><Input type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="leave_date" label="Leave Date"><Input type="date" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="employment_status_id" label="Employment Status">
                <Select options={opts(empStatuses)} showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department_id" label="Department">
                <Select options={opts(departments)} showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="shift_id" label="Shift">
                <Select options={opts(shifts)} showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role_id" label="Role">
                <Select options={opts(roles)} showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="leave_policy_id" label="Leave Policy">
                <Select options={opts(leavePoliciesL)} showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weekly_holiday_id" label="Weekly Holiday">
                <Select options={opts(weeklyHols)} showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={16}><Form.Item name="street"  label="Street"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="city"    label="City"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="state"    label="State"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="zip_code" label="ZIP"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="country"  label="Country"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Child editor modal */}
      <Modal
        title={`${editingChild ? 'Edit' : 'Add'} ${childMeta[childType]?.title || ''}`}
        open={childOpen}
        onCancel={() => setChildOpen(false)}
        onOk={() => childForm.submit()}
        confirmLoading={saving}
        width={700}
      >
        <Form form={childForm} layout="vertical" onFinish={saveChild}>
          {renderChildFields()}
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
