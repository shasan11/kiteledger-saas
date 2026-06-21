import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  App,
  Avatar,
  Card,
  Col,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FormOutlined,
  StopOutlined,
  SyncOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_META = {
  PENDING: { color: 'gold', icon: <ClockCircleOutlined /> },
  APPROVED: { color: 'green', icon: <CheckCircleOutlined /> },
  REJECTED: { color: 'red', icon: <StopOutlined /> },
  CANCELLED: { color: 'volcano', icon: <WarningOutlined /> },
};

const humanize = (value) => {
  if (!value) return '-';

  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatDateTime = (value) => {
  if (!value) return '-';

  const date = dayjs(value);
  return date.isValid() ? date.format('DD MMM YYYY, HH:mm') : '-';
};

const toPickerDateTime = (value) => {
  if (!value) return null;

  const date = dayjs(value);
  return date.isValid() ? date.format(DATE_TIME_FORMAT) : value;
};

const toBackendDateTime = (value) => {
  if (!value) return null;

  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
};

const computeLeaveDuration = (from, to) => {
  if (!from || !to) return null;

  const start = dayjs(from);
  const end = dayjs(to);

  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return null;

  return end.startOf('day').diff(start.startOf('day'), 'day') + 1;
};

function StatusTag({ value }) {
  const meta = STATUS_META[value] || { color: 'default', icon: null };

  return (
    <Tag
      color={meta.color}
      style={{
        borderRadius: 999,
        paddingInline: 10,
      }}
    >
      <Space size={4}>
        {meta.icon}
        <span>{humanize(value)}</span>
      </Space>
    </Tag>
  );
}

function SummaryCard({ title, value, icon, suffix = null, tone = 'default' }) {
  const { token } = theme.useToken();

  const toneMap = {
    blue: { bg: token.colorPrimaryBg, text: token.colorPrimary },
    green: { bg: token.colorSuccessBg, text: token.colorSuccess },
    gold: { bg: token.colorWarningBg, text: token.colorWarning },
    red: { bg: token.colorErrorBg, text: token.colorError },
    purple: { bg: token.colorInfoBg, text: token.colorInfo },
    default: { bg: token.colorFillAlter, text: token.colorTextSecondary },
  };

  const activeTone = toneMap[tone] || toneMap.default;

  return (
    <Card
      bordered
      style={{
        height: '100%',
        borderRadius: token.borderRadiusLG,
        borderColor: token.colorBorderSecondary,
        background: token.colorBgContainer,
        boxShadow: 'none',
      }}
      styles={{ body: { padding: token.paddingMD } }}
    >
      <Space align="start" size={12}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: token.borderRadiusLG,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: activeTone.bg,
            color: activeTone.text,
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>

        <Statistic
          title={title}
          value={value}
          suffix={suffix}
          valueStyle={{
            fontSize: 22,
            fontWeight: 700,
            color: token.colorText,
            lineHeight: 1.2,
          }}
        />
      </Space>
    </Card>
  );
}

function EmployeeCell(_, record) {
  const { token } = theme.useToken();
  const user = record?.user;

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email
    : '-';

  const initials = user
    ? [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U'
    : 'U';

  return (
    <Space size={10}>
      <Avatar
        size={34}
        style={{
          background: token.colorPrimaryBg,
          color: token.colorPrimary,
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {initials}
      </Avatar>

      <div style={{ minWidth: 0 }}>
        <Text strong style={{ display: 'block' }}>
          {fullName}
        </Text>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {user?.employee_id || user?.username || user?.email || 'Employee'}
        </Text>
      </div>
    </Space>
  );
}

export default function LeaveApplications({ auth }) {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);

    try {
      const { data } = await axios.get(api('/api/hrm/leave-applications/'), {
        params: {
          page: 1,
          page_size: 200,
          ordering: '-created_at',
        },
      });

      const rows = data?.results || data?.data || data || [];

      const pending = rows.filter((row) => row?.status === 'PENDING').length;
      const approved = rows.filter((row) => row?.status === 'APPROVED').length;
      const rejected = rows.filter((row) => row?.status === 'REJECTED').length;
      const cancelled = rows.filter((row) => row?.status === 'CANCELLED').length;

      const futureRows = rows.filter((row) => {
        if (!row?.leave_from) return false;
        return dayjs(row.leave_from).isAfter(dayjs(), 'day');
      });

      const upcomingDays = futureRows.reduce((sum, row) => {
        return sum + Number(row?.leave_duration || 0);
      }, 0);

      setOverview({
        total: rows.length,
        pending,
        approved,
        rejected,
        cancelled,
        upcomingDays,
      });
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const quickAddPolicyConfig = useMemo(
    () => ({
      title: 'Leave Policy',
      apiUrl: api('/api/hrm/leave-policies/'),
      initialValues: {
        name: '',
        paid_leave_count: 0,
        unpaid_leave_count: 0,
        description: '',
        active: true,
      },
      fields: [
        {
          name: 'name',
          label: 'Policy Name',
          type: 'text',
          col: 24,
          required: true,
          placeholder: 'Annual Leave Policy',
        },
        {
          name: 'paid_leave_count',
          label: 'Paid Days',
          type: 'number',
          col: 12,
          min: 0,
        },
        {
          name: 'unpaid_leave_count',
          label: 'Unpaid Days',
          type: 'number',
          col: 12,
          min: 0,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          col: 24,
          rows: 3,
          placeholder: 'Optional HR note',
        },
        {
          name: 'active',
          label: 'Active',
          type: 'switch',
          col: 12,
        },
      ],
      validationSchema: Yup.object({
        name: Yup.string().required('Policy name is required').max(255),
        paid_leave_count: Yup.number().nullable().min(0),
        unpaid_leave_count: Yup.number().nullable().min(0),
        description: Yup.string().nullable().max(255),
      }),
      transformPayload: (values) => ({
        name: values.name?.trim(),
        paid_leave_count: Number(values.paid_leave_count || 0),
        unpaid_leave_count: Number(values.unpaid_leave_count || 0),
        description: values.description?.trim() || null,
        active: values.active !== false,
      }),
    }),
    [],
  );

  const quickAddTypeConfig = useMemo(
    () => ({
      title: 'Leave Type',
      apiUrl: api('/api/hrm/leave-types/'),
      initialValues: {
        name: '',
        code: '',
        max_days_per_year: null,
        requires_approval: true,
        is_paid: true,
        active: true,
      },
      fields: [
        {
          name: 'name',
          label: 'Type Name',
          type: 'text',
          col: 24,
          required: true,
          placeholder: 'Sick Leave',
        },
        {
          name: 'code',
          label: 'Code',
          type: 'text',
          col: 12,
          placeholder: 'SL',
        },
        {
          name: 'max_days_per_year',
          label: 'Max Days / Year',
          type: 'number',
          col: 12,
          min: 0,
        },
        {
          name: 'requires_approval',
          label: 'Requires Approval',
          type: 'switch',
          col: 12,
        },
        {
          name: 'is_paid',
          label: 'Paid Leave',
          type: 'switch',
          col: 12,
        },
        {
          name: 'active',
          label: 'Active',
          type: 'switch',
          col: 12,
        },
      ],
      validationSchema: Yup.object({
        name: Yup.string().required('Leave type is required').max(255),
        code: Yup.string().nullable().max(30),
        max_days_per_year: Yup.number().nullable().min(0),
      }),
      transformPayload: (values) => ({
        name: values.name?.trim(),
        code: values.code?.trim() || null,
        max_days_per_year:
          values.max_days_per_year === '' || values.max_days_per_year == null
            ? null
            : Number(values.max_days_per_year),
        requires_approval: Boolean(values.requires_approval),
        is_paid: Boolean(values.is_paid),
        active: values.active !== false,
      }),
    }),
    [],
  );

  const columns = useMemo(
    () => [
      {
        title: 'Employee',
        key: 'employee',
        width: 240,
        render: EmployeeCell,
      },
      {
        title: 'Policy',
        key: 'leave_policy',
        width: 170,
        render: (_, row) => row?.leave_policy?.name || row?.leavePolicy?.name || '-',
      },
      {
        title: 'Leave Type',
        key: 'leave_type',
        width: 170,
        render: (_, row) =>
          row?.leave_type_record?.name ||
          row?.leaveTypeRecord?.name ||
          row?.leave_type ||
          '-',
      },
      {
        title: 'From',
        dataIndex: 'leave_from',
        key: 'leave_from',
        sorter: true,
        width: 170,
        render: formatDateTime,
      },
      {
        title: 'To',
        dataIndex: 'leave_to',
        key: 'leave_to',
        sorter: true,
        width: 170,
        render: formatDateTime,
      },
      {
        title: 'Days',
        dataIndex: 'leave_duration',
        key: 'leave_duration',
        align: 'right',
        width: 90,
        render: (value) => <Text strong>{value ?? '-'}</Text>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (value) => <StatusTag value={value} />,
      },
      {
        title: 'Approved From',
        dataIndex: 'accept_leave_from',
        key: 'accept_leave_from',
        width: 170,
        render: formatDateTime,
      },
      {
        title: 'Approved To',
        dataIndex: 'accept_leave_to',
        key: 'accept_leave_to',
        width: 170,
        render: formatDateTime,
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        key: 'reason',
        width: 220,
        render: (value) => value || '-',
      },
      {
        title: 'Review Comment',
        dataIndex: 'review_comment',
        key: 'review_comment',
        width: 220,
        render: (value) => value || '-',
      },
    ],
    [],
  );

  const fields = useMemo(
    () => [
      {
        type: 'group',
        label: 'Leave Request',
        accordion: false,
        children: [
          {
            name: 'user_id',
            label: 'Employee',
            type: 'fkSelect',
            col: 12,
            required: true,
            fkUrl: api('/api/hrm/users/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'first_name',
            fkLabel: (row) =>
              row ? [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username : '',
          },
          {
            name: 'leave_policy_id',
            label: 'Leave Policy',
            type: 'fkSelect',
            col: 12,
            required: true,
            fkUrl: api('/api/hrm/leave-policies/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            fkLabel: (row) => row?.name || '',
            quickAdd: quickAddPolicyConfig,
          },
          {
            name: 'leave_type_id',
            label: 'Leave Type',
            type: 'fkSelect',
            col: 12,
            required: true,
            fkUrl: api('/api/hrm/leave-types/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            fkLabel: (row) => (row ? `${row.name}${row.code ? ` (${row.code})` : ''}` : ''),
            quickAdd: quickAddTypeConfig,
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            col: 12,
            options: STATUS_OPTIONS,
          },
          {
            name: 'leave_from',
            label: 'From Date & Time',
            type: 'datePicker',
            showTime: true,
            format: DATE_TIME_FORMAT,
            col: 8,
            required: true,
            allowClear: false,
          },
          {
            name: 'leave_to',
            label: 'To Date & Time',
            type: 'datePicker',
            showTime: true,
            format: DATE_TIME_FORMAT,
            col: 8,
            required: true,
            allowClear: false,
          },
          {
            name: 'leave_duration',
            label: 'Leave Duration',
            type: 'number',
            col: 8,
            min: 0,
            readOnly: true,
            formula: (values) => computeLeaveDuration(values?.leave_from, values?.leave_to),
          },
        ],
      },
      {
        type: 'group',
        label: 'Approval',
        accordion: false,
        condition: (values) => values?.status === 'APPROVED',
        children: [
          {
            name: 'accept_leave_from',
            label: 'Approved From',
            type: 'datePicker',
            showTime: true,
            format: DATE_TIME_FORMAT,
            col: 12,
            readOnly: true,
          },
          {
            name: 'accept_leave_to',
            label: 'Approved To',
            type: 'datePicker',
            showTime: true,
            format: DATE_TIME_FORMAT,
            col: 12,
            readOnly: true,
          },
        ],
      },
      {
        type: 'group',
        label: 'Notes',
        accordion: false,
        children: [
          {
            name: 'reason',
            label: 'Reason',
            type: 'textarea',
            col: 24,
            rows: 3,
            placeholder: 'Explain the reason for this leave request.',
          },
          {
            name: 'review_comment',
            label: 'Review Comment',
            type: 'textarea',
            col: 24,
            rows: 2,
            placeholder: 'Optional manager or HR review note.',
          },
          {
            name: 'attachment',
            label: 'Attachment Path',
            type: 'text',
            col: 24,
            placeholder: 'Optional attachment reference or uploaded file path',
          },
          {
            name: 'active',
            label: 'Active',
            type: 'switch',
            col: 12,
          },
        ],
      },
    ],
    [quickAddPolicyConfig, quickAddTypeConfig],
  );

  const filters = useMemo(
    () => [
      {
        name: 'user_id',
        label: 'Employee',
        type: 'fkSelect',
        fkUrl: api('/api/hrm/users'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'first_name',
        fkLabel: (row) =>
          row ? [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username : '',
      },
      {
        name: 'leave_policy_id',
        label: 'Leave Policy',
        type: 'fkSelect',
        fkUrl: api('/api/hrm/leave-policies'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        fkLabel: (row) => row?.name || '',
      },
      {
        name: 'leave_type_id',
        label: 'Leave Type',
        type: 'fkSelect',
        fkUrl: api('/api/hrm/leave-types'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        fkLabel: (row) => (row ? `${row.name}${row.code ? ` (${row.code})` : ''}` : ''),
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: STATUS_OPTIONS,
      },
    ],
    [],
  );

  const validationSchema = Yup.object({
    user_id: Yup.mixed().required('Employee is required'),
    leave_policy_id: Yup.mixed().required('Leave policy is required'),
    leave_type_id: Yup.mixed().required('Leave type is required'),
    leave_from: Yup.string().required('From date and time is required'),
    leave_to: Yup.string()
      .required('To date and time is required')
      .test('after-from', 'To date must be on or after from date', function (value) {
        if (!value || !this.parent?.leave_from) return true;

        return (
          dayjs(value).isSame(dayjs(this.parent.leave_from)) ||
          dayjs(value).isAfter(dayjs(this.parent.leave_from))
        );
      }),
    leave_duration: Yup.number().nullable().min(0),
    status: Yup.string().nullable().oneOf(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
    accept_leave_from: Yup.string().nullable(),
    accept_leave_to: Yup.string().nullable(),
    reason: Yup.string().nullable().max(255),
    review_comment: Yup.string().nullable().max(255),
    attachment: Yup.string().nullable().max(255),
  });

  const crudInitialValues = {
    user_id: null,
    leave_policy_id: null,
    leave_type_id: null,
    leave_type: '',
    leave_from: dayjs().format(DATE_TIME_FORMAT),
    leave_to: dayjs().format(DATE_TIME_FORMAT),
    leave_duration: 1,
    status: 'PENDING',
    accept_leave_from: null,
    accept_leave_to: null,
    reason: '',
    review_comment: '',
    attachment: '',
    active: true,
  };

  const transformRecord = (record) => ({
    ...record,
    leave_policy_id: record?.leave_policy_id || record?.leave_policy?.id || record?.leavePolicy?.id || null,
    leave_policy_id_detail: record?.leave_policy || record?.leavePolicy || null,
    leave_type_id: record?.leave_type_id || record?.leave_type_record?.id || record?.leaveTypeRecord?.id || null,
    leave_type_id_detail: record?.leave_type_record || record?.leaveTypeRecord || null,
    leave_from: toPickerDateTime(record?.leave_from),
    leave_to: toPickerDateTime(record?.leave_to),
    accept_leave_from: toPickerDateTime(record?.accept_leave_from),
    accept_leave_to: toPickerDateTime(record?.accept_leave_to),
  });

  const transformPayload = (values) => {
    const payload = { ...values };

    if (payload.user_id && typeof payload.user_id === 'object') {
      payload.user_id = payload.user_id.id ?? payload.user_id.value;
    }

    if (payload.leave_policy_id && typeof payload.leave_policy_id === 'object') {
      payload.leave_policy_id = payload.leave_policy_id.id ?? payload.leave_policy_id.value;
    }

    const selectedTypeValue = payload.leave_type_id;
    const selectedTypeDetail = payload.leave_type_id_detail;

    const selectedTypeName =
      selectedTypeDetail?.name ||
      selectedTypeValue?.name ||
      selectedTypeValue?.label ||
      null;

    if (payload.leave_type_id && typeof payload.leave_type_id === 'object') {
      payload.leave_type_id = payload.leave_type_id.id ?? payload.leave_type_id.value;
    }

    payload.leave_from = toBackendDateTime(payload.leave_from);
    payload.leave_to = toBackendDateTime(payload.leave_to);

    payload.leave_duration =
      payload.leave_duration === '' || payload.leave_duration == null
        ? computeLeaveDuration(values.leave_from, values.leave_to)
        : Number(payload.leave_duration);

    payload.leave_type = selectedTypeName || payload.leave_type?.trim() || 'Leave';

    if (payload.status === 'APPROVED') {
      payload.accept_leave_from = toBackendDateTime(values.leave_from);
      payload.accept_leave_to = toBackendDateTime(values.leave_to);

      if (auth?.user?.id) {
        payload.accept_leave_by = auth.user.id;
      }
    } else {
      payload.accept_leave_from = null;
      payload.accept_leave_to = null;
      payload.accept_leave_by = null;
    }

    payload.reason = payload.reason?.trim() || null;
    payload.review_comment = payload.review_comment?.trim() || null;
    payload.attachment = payload.attachment?.trim() || null;
    payload.active = Boolean(payload.active);

    delete payload.leave_policy_id_detail;
    delete payload.leave_type_id_detail;

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') payload[key] = null;
    });

    return payload;
  };

  const handleFormValuesChange = useCallback((values, { setFieldValue }) => {
    const duration = computeLeaveDuration(values?.leave_from, values?.leave_to);

    if (duration != null && Number(values?.leave_duration) !== Number(duration)) {
      setFieldValue('leave_duration', duration, false);
    }

    if (values?.status === 'APPROVED') {
      const approvedFrom = values?.leave_from || null;
      const approvedTo = values?.leave_to || null;

      if (values?.accept_leave_from !== approvedFrom) {
        setFieldValue('accept_leave_from', approvedFrom, false);
      }

      if (values?.accept_leave_to !== approvedTo) {
        setFieldValue('accept_leave_to', approvedTo, false);
      }

      return;
    }

    if (values?.accept_leave_from) {
      setFieldValue('accept_leave_from', null, false);
    }

    if (values?.accept_leave_to) {
      setFieldValue('accept_leave_to', null, false);
    }
  }, []);

  const bulkStatusPayload = useCallback(
    (record, status) => {
      const approved = status === 'APPROVED';

      return {
        status,
        accept_leave_from: approved ? toBackendDateTime(record?.leave_from) : null,
        accept_leave_to: approved ? toBackendDateTime(record?.leave_to) : null,
        accept_leave_by: approved && auth?.user?.id ? auth.user.id : null,
      };
    },
    [auth?.user?.id],
  );

  const applyBulkStatus = useCallback(
    async (ctx, status) => {
      const records = ctx?.recordsToUpdate || [];

      if (!records.length) {
        message.warning('Select at least one leave application.');
        return;
      }

      const results = await Promise.allSettled(
        records.map((record) =>
          axios.patch(
            api(`/api/hrm/leave-applications/${record.id}/`),
            bulkStatusPayload(record, status),
            {
              headers: {
                'Content-Type': 'application/json',
              },
            },
          ),
        ),
      );

      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        message.success(
          `${successCount} leave application${successCount === 1 ? '' : 's'} marked ${humanize(status)}.`,
        );
      }

      if (failedCount > 0) {
        message.error(`${failedCount} leave application${failedCount === 1 ? '' : 's'} failed.`);
      }

      await ctx?.refreshList?.();
      ctx?.clearSelection?.();
      await loadOverview();
    },
    [bulkStatusPayload, loadOverview, message],
  );

  const confirmBulkStatus = useCallback(
    (ctx, status) => {
      modal.confirm({
        title: `Change selected requests to ${humanize(status)}?`,
        content:
          status === 'APPROVED'
            ? 'Approved From and Approved To will automatically use the request From and To date/time.'
            : 'Approved From and Approved To will be cleared for this status.',
        okText: `Mark ${humanize(status)}`,
        okButtonProps: {
          danger: status === 'REJECTED' || status === 'CANCELLED',
        },
        onOk: () => applyBulkStatus(ctx, status),
      });
    },
    [applyBulkStatus, modal],
  );

  const bulkStatusActions = useMemo(
    () => [
      {
        label: 'Mark Pending',
        icon: <ClockCircleOutlined />,
        onClick: (ctx) => confirmBulkStatus(ctx, 'PENDING'),
      },
      {
        label: 'Approve',
        icon: <CheckCircleOutlined />,
        type: 'primary',
        onClick: (ctx) => confirmBulkStatus(ctx, 'APPROVED'),
      },
      {
        label: 'Reject',
        icon: <CloseCircleOutlined />,
        danger: true,
        onClick: (ctx) => confirmBulkStatus(ctx, 'REJECTED'),
      },
      {
        label: 'Cancel',
        icon: <StopOutlined />,
        danger: true,
        onClick: (ctx) => confirmBulkStatus(ctx, 'CANCELLED'),
      },
    ],
    [confirmBulkStatus],
  );

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Leave Applications" />

      <div
        style={{
          padding: token.paddingMD,
          minHeight: 'calc(100vh - 64px)',
          background: token.colorBgLayout,
        }}
      >
        <Space direction="vertical" size={token.marginMD} style={{ display: 'flex' }}>
          {overviewLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} md={8} xl={4}>
                <SummaryCard
                  title="Total Requests"
                  value={overview?.total || 0}
                  tone="blue"
                  icon={<TeamOutlined />}
                />
              </Col>

              <Col xs={24} sm={12} md={8} xl={4}>
                <SummaryCard
                  title="Pending"
                  value={overview?.pending || 0}
                  tone="gold"
                  icon={<ClockCircleOutlined />}
                />
              </Col>

              <Col xs={24} sm={12} md={8} xl={4}>
                <SummaryCard
                  title="Approved"
                  value={overview?.approved || 0}
                  tone="green"
                  icon={<CheckCircleOutlined />}
                />
              </Col>

              <Col xs={24} sm={12} md={8} xl={4}>
                <SummaryCard
                  title="Rejected"
                  value={overview?.rejected || 0}
                  tone="red"
                  icon={<StopOutlined />}
                />
              </Col>

              <Col xs={24} sm={12} md={8} xl={4}>
                <SummaryCard
                  title="Upcoming Days"
                  value={overview?.upcomingDays || 0}
                  suffix="days"
                  tone="purple"
                  icon={<CalendarOutlined />}
                />
              </Col>

              <Col xs={24} sm={12} md={8} xl={4}>
                <SummaryCard
                  title="Status"
                  value="Live"
                  tone="default"
                  icon={<SyncOutlined />}
                />
              </Col>
            </Row>
          )}

          <ReusableCrud
            title="Leave Applications"
            icon={<FormOutlined />}
            apiUrl={api('/api/hrm/leave-applications/')}
            columns={columns}
            fields={fields}
            filters={filters}
            validationSchema={validationSchema}
            crudInitialValues={crudInitialValues}
            transformRecord={transformRecord}
            transformPayload={transformPayload}
            onFormValuesChange={handleFormValuesChange}
            onAddSuccess={loadOverview}
            onEditSuccess={loadOverview}
            form_ui="drawer"
            drawerWidth={900}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            sortMode="ordering"
            orderingParam="ordering"
            defaultSortField="created_at"
            defaultSortOrder="descend"
            enableServerPagination={true}
            showSearch={true}
            canAdd={true}
            canEdit={true}
            canDelete={true}
            hasActions={true}
            hasActionColumns={true}
            activeParam="active"
            enableInactiveDrawer={true}
            bulkactions={bulkStatusActions}
            anchorFilters={[
              { key: 'pending', label: 'Pending', params: { status: 'PENDING' } },
              { key: 'approved', label: 'Approved', params: { status: 'APPROVED' } },
              { key: 'rejected', label: 'Rejected', params: { status: 'REJECTED' } },
              { key: 'cancelled', label: 'Cancelled', params: { status: 'CANCELLED' } },
              { key: 'all', label: 'All Requests', params: {} },
            ]}
            defaultAnchorKey="pending"
            anchorSyncWithHash
          />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}