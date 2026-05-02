import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function Shifts(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Start Time', dataIndex: 'start_time', key: 'start_time', sorter: true, width: 100, render: (v) => v || '-' },
    { title: 'End Time', dataIndex: 'end_time', key: 'end_time', sorter: true, width: 100, render: (v) => v || '-' },
    { title: 'Work Hours', dataIndex: 'work_hour', key: 'work_hour', sorter: true, width: 110, render: (v) => v != null ? <Tag color="blue">{v}h</Tag> : '-' },
    { title: 'Branch', key: 'branch', render: (_, r) => r?.branch?.name || '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];
  const fields = [
    { name: 'name', label: 'Shift Name', type: 'text', required: true, col: 24 },
    { name: 'start_time', label: 'Start Time', type: 'time', required: true, col: 8 },
    { name: 'end_time', label: 'End Time', type: 'time', required: true, col: 8 },
    { name: 'work_hour', label: 'Work Hours', type: 'number', col: 8, min: 0, max: 24 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Shift name is required').max(120),
    start_time: Yup.string().required('Start time is required'),
    end_time: Yup.string().required('End time is required'),
    work_hour: Yup.number().nullable().min(0).max(24),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', start_time: '', end_time: '', work_hour: 8, active: true };
  const transformPayload = (v) => { const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null)); return p; };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Shifts</h2>}>
      <Head title="Shifts" />
      <ReusableCrud icon={<ClockCircleOutlined />} title="Shift" apiUrl={api('/api/hrm/shifts')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="modal" modalWidth={680}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
