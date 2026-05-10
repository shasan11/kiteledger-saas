import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Avatar, Tag, Tooltip, Space } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import AccessControlTabs from '../AccessControlTabs';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const STATUS_COLORS = { Active: 'green', Probation: 'orange', Resigned: 'volcano', Terminated: 'red' };

const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';
const fmtMoney = (v) => v != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v) : '-';

export default function Users(props) {
  const columns = [
    {
      title: 'Employee', key: 'employee', width: 220, sorter: false,
      render: (_, r) => {
        const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username;
        const initials = [r.first_name?.[0], r.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {r.image
              ? <Avatar src={`${BACKEND}${r.image}`} size={34} />
              : <Avatar size={34} style={{ background: '#1677ff', fontWeight: 700, fontSize: 13 }}>{initials}</Avatar>}
            <div>
              <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{fullName}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{r.username}</div>
            </div>
          </div>
        );
      },
    },
    { title: 'Emp ID', dataIndex: 'employee_id', key: 'employee_id', sorter: true, width: 100, render: (v) => v ? <code style={{ fontSize: 11 }}>{v}</code> : '-' },
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: true, render: (v) => v || '-' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v) => v || '-' },
    { title: 'Department', key: 'department', render: (_, r) => r?.department?.name || r?.department_id_detail?.label || '-' },
    { title: 'Role', key: 'role', render: (_, r) => {
      const roleName = r?.roles?.[0]?.name || r?.role?.name || r?.role_id_detail?.label;
      return roleName ? <Tag>{roleName}</Tag> : '-';
    } },
    {
      title: 'Status', key: 'status',
      render: (_, r) => {
        const s = r?.employment_status?.name || r?.employment_status_id_detail?.label || '';
        const color = r?.employment_status?.colour_value || STATUS_COLORS[s] || 'default';
        return s ? <Tag color={color}>{s}</Tag> : '-';
      },
    },
    { title: 'Shift', key: 'shift', render: (_, r) => r?.shift?.name || '-' },
    { title: 'Join Date', dataIndex: 'join_date', key: 'join_date', sorter: true, width: 105, render: fmtDate },
    { title: 'Active', dataIndex: 'active', key: 'active', sorter: true, width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];

  const fields = [
    // Tab: Personal Info
    { name: '__tab_personal', label: 'Personal Info', type: 'tab_start' },
    { name: 'image', label: 'Profile Photo', type: 'upload', col: 24, accept: 'image/*' },
    { name: 'first_name', label: 'First Name', type: 'text', required: true, col: 12 },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true, col: 12 },
    { name: 'email', label: 'Email', type: 'email', required: true, col: 12 },
    { name: 'phone', label: 'Phone', type: 'text', col: 12 },
    { name: 'blood_group', label: 'Blood Group', type: 'select', col: 8,
      options: ['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(v => ({ label: v, value: v })) },
    { name: 'street', label: 'Street Address', type: 'text', col: 16 },
    { name: 'city', label: 'City', type: 'text', col: 8 },
    { name: 'state', label: 'State', type: 'text', col: 8 },
    { name: 'zip_code', label: 'ZIP Code', type: 'text', col: 8 },
    { name: 'country', label: 'Country', type: 'text', col: 8 },
    // Tab: Login Info
    { name: '__tab_login', label: 'Login Info', type: 'tab_start' },
    { name: 'username', label: 'Username', type: 'text', required: true, col: 12 },
    { name: 'password', label: 'Password', type: 'password', col: 12, placeholder: 'Leave blank to keep current' },
    {
      name: 'role_id', label: 'Role', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/roles'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
    // Tab: Employment Info
    { name: '__tab_employment', label: 'Employment', type: 'tab_start' },
    { name: 'employee_id', label: 'Employee ID', type: 'text', col: 12 },
    { name: 'join_date', label: 'Join Date', type: 'date', col: 12 },
    { name: 'leave_date', label: 'Leave Date', type: 'date', col: 12 },
    {
      name: 'employment_status_id', label: 'Employment Status', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/employment-statuses'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
    {
      name: 'department_id', label: 'Department', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/departments'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
    {
      name: 'shift_id', label: 'Shift', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/shifts'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
    {
      name: 'leave_policy_id', label: 'Leave Policy', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/leave-policies'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
    {
      name: 'weekly_holiday_id', label: 'Weekly Holiday', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/weekly-holidays'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
  ];

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required('First name is required').max(80),
    last_name: Yup.string().required('Last name is required').max(80),
    username: Yup.string().required('Username is required').max(80),
    email: Yup.string().required('Email is required').email().max(120),
    password: Yup.string().nullable().min(6).max(255),
    phone: Yup.string().nullable().max(40),
    employee_id: Yup.string().nullable().max(60),
    join_date: Yup.string().nullable(),
    leave_date: Yup.string().nullable(),
    blood_group: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });

  const initialValues = {
    first_name: '', last_name: '', username: '', email: '', password: '', phone: '',
    blood_group: '', street: '', city: '', state: '', zip_code: '', country: '',
    employee_id: '', join_date: '', leave_date: '',
    employment_status_id: null, department_id: null, role_id: null,
    shift_id: null, leave_policy_id: null, weekly_holiday_id: null,
    image: null, active: true,
  };

  const transformRecord = (record) => ({
    ...record,
    role_id: record.role_id || record.roles?.[0]?.id || null,
  });

  const transformPayload = (v) => {
    const p = { ...v };
    ['first_name','last_name','username','email','phone','employee_id'].forEach(k => { if (p[k]) p[k] = p[k].trim(); });
    if (!p.password) delete p.password;
    p.active = Boolean(p.active);
    Object.keys(p).forEach(k => p[k] === '' && (p[k] = null));
    return p;
  };

  const filters = [
    {
      name: 'employment_status_id', label: 'Status', type: 'fkSelect',
      fkUrl: api('/api/hrm/employment-statuses'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
    {
      name: 'department_id', label: 'Department', type: 'fkSelect',
      fkUrl: api('/api/hrm/departments'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
    {
      name: 'role_id', label: 'Role', type: 'fkSelect',
      fkUrl: api('/api/hrm/roles'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '',
    },
  ];

  return (
    <>
      <Head title="Users" />
      <ReusableCrud
        icon={<TeamOutlined />}
        title="Employee"
        apiUrl={api('/api/hrm/users')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={initialValues}
        transformRecord={transformRecord}
        transformPayload={transformPayload}
        filters={filters}
        form_ui="drawer"
        drawerWidth={820}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination
        enableInactiveDrawer
        showSearch
        canAdd canEdit canDelete hasActions hasActionColumns
        showViewColumn
        viewPathBuilder={(record) => route('hrm.users.show', record.id)}
      />
    </>
  );
}
