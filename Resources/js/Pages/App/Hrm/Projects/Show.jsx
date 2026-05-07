import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
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
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FlagOutlined,
  MoreOutlined,
  PlusOutlined,
  ProjectOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserAddOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const PROJECT_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'];
const MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const STATUS_COLORS = {
  PENDING: 'default',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
  ON_HOLD: 'orange',
};

const childMeta = {
  milestone: { title: 'Milestone', endpoint: '/api/hrm/milestones' },
  taskStatus: { title: 'Task Status', endpoint: '/api/hrm/task-statuses' },
  task: { title: 'Task', endpoint: '/api/hrm/tasks' },
  team: { title: 'Project Team', endpoint: '/api/hrm/project-teams' },
  teamMember: { title: 'Team Member', endpoint: '/api/hrm/project-team-members' },
  assignee: { title: 'Task Assignee', endpoint: '/api/hrm/assigned-tasks' },
};

const toArray = (value) => Array.isArray(value) ? value : [];
const humanize = (value) => value ? String(value).replace(/_/g, ' ') : '-';
const formatDate = (value) => value ? dayjs(value).format('DD-MM-YYYY') : '-';
const dateValue = (value) => value ? dayjs(value).format('YYYY-MM-DD') : null;
const userLabel = (user) => user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.username || user.email : '-';
const relationLabel = (record, fallback = '-') => record?.name || record?.project_team_name || record?.label || fallback;
const collection = (payload) => payload?.results || payload?.data || (Array.isArray(payload) ? payload : []);

function StatusTag({ value }) {
  return <Tag color={STATUS_COLORS[value] || 'default'}>{humanize(value)}</Tag>;
}

function Meta({ label, value }) {
  return (
    <div className="project-show__meta">
      <Text type="secondary">{label}</Text>
      <div>{value ?? '-'}</div>
    </div>
  );
}

function Metric({ label, value, icon }) {
  return (
    <Card className="project-show__metric" bordered={false}>
      <Space align="start">
        <span className="project-show__metric-icon">{icon}</span>
        <div>
          <Text type="secondary">{label}</Text>
          <strong>{value}</strong>
        </div>
      </Space>
    </Card>
  );
}

function DetailsCard({ title, extra, children }) {
  return (
    <Card className="project-show__card" title={title} extra={extra} bordered={false}>
      {children}
    </Card>
  );
}

function ActionMenu({ onEdit, onDelete }) {
  return (
    <Dropdown
      trigger={['click']}
      menu={{ items: [{ key: 'edit', label: 'Edit', onClick: onEdit }, { key: 'delete', danger: true, label: 'Delete', onClick: onDelete }] }}
    >
      <Button type="text" icon={<MoreOutlined />} />
    </Dropdown>
  );
}

export default function ProjectShow({ auth, id }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [childType, setChildType] = useState(null);
  const [editingChild, setEditingChild] = useState(null);
  const [saving, setSaving] = useState(false);
  const [projectForm] = Form.useForm();
  const [childForm] = Form.useForm();

  const milestones = toArray(project?.milestones);
  const taskStatuses = toArray(project?.task_statuses || project?.taskStatuses);
  const tasks = toArray(project?.tasks);
  const teams = toArray(project?.project_teams || project?.projectTeams);
  const teamMembers = teams.flatMap((team) => toArray(team.project_team_members || team.projectTeamMembers).map((member) => ({ ...member, team })));
  const assignees = tasks.flatMap((task) => toArray(task.assigned_tasks || task.assignedTasks).map((assignee) => ({ ...assignee, task })));
  const completedTasks = tasks.filter((task) => task?.task_status?.name === 'COMPLETED' || task?.taskStatus?.name === 'COMPLETED').length;

  const optionUsers = users.map((user) => ({ label: userLabel(user), value: user.id }));
  const optionPriorities = priorities.map((priority) => ({ label: priority.name, value: priority.id }));
  const optionMilestones = milestones.map((milestone) => ({ label: milestone.name, value: milestone.id }));
  const optionTaskStatuses = taskStatuses.map((status) => ({ label: status.name, value: status.id }));
  const optionTeams = teams.map((team) => ({ label: team.project_team_name, value: team.id }));
  const optionTasks = tasks.map((task) => ({ label: task.name, value: task.id }));

  const loadProject = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api(`/api/hrm/projects/${id}`));
      setProject(data);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Unable to load project.');
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    const [userResponse, priorityResponse] = await Promise.all([
      axios.get(api('/api/hrm/users'), { params: { page_size: 100 } }),
      axios.get(api('/api/hrm/priorities'), { params: { page_size: 100 } }),
    ]);
    setUsers(collection(userResponse.data));
    setPriorities(collection(priorityResponse.data));
  };

  useEffect(() => {
    loadProject();
    loadLookups().catch(() => null);
  }, [id]);

  const openProjectEditor = () => {
    projectForm.setFieldsValue({
      name: project?.name,
      project_manager_id: project?.project_manager_id,
      status: project?.status || 'PENDING',
      start_date: dateValue(project?.start_date),
      end_date: dateValue(project?.end_date),
      description: project?.description,
      active: project?.active !== false,
    });
    setProjectOpen(true);
  };

  const saveProject = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, active: values.active !== false };
      await axios.patch(api(`/api/hrm/projects/${project.id}`), payload);
      message.success('Project updated.');
      setProjectOpen(false);
      loadProject();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  const updateProjectStatus = async (values, successText) => {
    setSaving(true);
    try {
      await axios.patch(api(`/api/hrm/projects/${project.id}`), values);
      message.success(successText);
      loadProject();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Unable to update project.');
    } finally {
      setSaving(false);
    }
  };

  const defaultsFor = (type) => {
    const firstMilestone = milestones[0]?.id;
    const firstStatus = taskStatuses[0]?.id;
    const firstPriority = priorities[0]?.id;
    const firstTeam = teams[0]?.id;
    const firstTask = tasks[0]?.id;
    return {
      milestone: { project_id: project.id, status: 'PENDING', active: true },
      taskStatus: { project_id: project.id, color: '#1677ff', active: true },
      task: { project_id: project.id, milestone_id: firstMilestone, task_status_id: firstStatus, priority_id: firstPriority, completion_time: 0, active: true },
      team: { project_id: project.id, active: true },
      teamMember: { project_team_id: firstTeam, active: true },
      assignee: { task_id: firstTask, active: true },
    }[type] || {};
  };

  const normalizeChildValues = (type, row = {}) => ({
    ...row,
    start_date: dateValue(row.start_date),
    end_date: dateValue(row.end_date),
    active: row.active !== false,
    project_team_id: row.project_team_id || row.team?.id,
    task_id: row.task_id || row.task?.id,
  });

  const openChildEditor = (type, row = null) => {
    setChildType(type);
    setEditingChild(row);
    childForm.setFieldsValue(row ? normalizeChildValues(type, row) : defaultsFor(type));
    setChildOpen(true);
  };

  const saveChild = async (values) => {
    const meta = childMeta[childType];
    if (!meta) return;
    setSaving(true);
    try {
      const payload = { ...values, active: values.active !== false };
      if (['milestone', 'taskStatus', 'task', 'team'].includes(childType)) payload.project_id = project.id;
      const url = editingChild ? `${meta.endpoint}/${editingChild.id}` : meta.endpoint;
      const method = editingChild ? 'patch' : 'post';
      await axios[method](api(url), payload);
      message.success(`${meta.title} saved.`);
      setChildOpen(false);
      loadProject();
    } catch (error) {
      message.error(error?.response?.data?.message || `Unable to save ${meta.title.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const deleteChild = (type, row) => {
    const meta = childMeta[type];
    Modal.confirm({
      title: `Delete ${meta.title}?`,
      content: 'This removes the record from the project.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await axios.delete(api(`${meta.endpoint}/${row.id}`));
        message.success(`${meta.title} deleted.`);
        loadProject();
      },
    });
  };

  const renderChildFields = () => {
    if (childType === 'milestone') {
      return (
        <>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="end_date" label="End Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="status" label="Status"><Select options={MILESTONE_STATUSES.map((value) => ({ label: humanize(value), value }))} /></Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      );
    }
    if (childType === 'taskStatus') {
      return (
        <>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="Color"><Input type="color" /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      );
    }
    if (childType === 'task') {
      return (
        <>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="milestone_id" label="Milestone" rules={[{ required: true }]}><Select options={optionMilestones} showSearch optionFilterProp="label" /></Form.Item></Col>
            <Col span={8}><Form.Item name="priority_id" label="Priority" rules={[{ required: true }]}><Select options={optionPriorities} showSearch optionFilterProp="label" /></Form.Item></Col>
            <Col span={8}><Form.Item name="task_status_id" label="Status" rules={[{ required: true }]}><Select options={optionTaskStatuses} showSearch optionFilterProp="label" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col span={8}><Form.Item name="end_date" label="End Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col span={8}><Form.Item name="completion_time" label="Completion Time" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      );
    }
    if (childType === 'team') {
      return (
        <>
          <Form.Item name="project_team_name" label="Team Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      );
    }
    if (childType === 'teamMember') {
      return (
        <>
          <Form.Item name="project_team_id" label="Team" rules={[{ required: true }]}><Select options={optionTeams} showSearch optionFilterProp="label" /></Form.Item>
          <Form.Item name="user_id" label="Employee" rules={[{ required: true }]}><Select options={optionUsers} showSearch optionFilterProp="label" /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      );
    }
    if (childType === 'assignee') {
      return (
        <>
          <Form.Item name="task_id" label="Task" rules={[{ required: true }]}><Select options={optionTasks} showSearch optionFilterProp="label" /></Form.Item>
          <Form.Item name="user_id" label="Employee" rules={[{ required: true }]}><Select options={optionUsers} showSearch optionFilterProp="label" /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      );
    }
    return null;
  };

  const columns = useMemo(() => ({
    milestones: [
      { title: 'Name', dataIndex: 'name', render: (value) => <strong>{value}</strong> },
      { title: 'Start', dataIndex: 'start_date', width: 110, render: formatDate },
      { title: 'End', dataIndex: 'end_date', width: 110, render: formatDate },
      { title: 'Status', dataIndex: 'status', width: 130, render: (value) => <StatusTag value={value} /> },
      { title: '', width: 56, render: (_, row) => <ActionMenu onEdit={() => openChildEditor('milestone', row)} onDelete={() => deleteChild('milestone', row)} /> },
    ],
    statuses: [
      { title: 'Name', dataIndex: 'name', render: (value, row) => <Tag color={row.color || 'blue'}>{value}</Tag> },
      { title: 'Color', dataIndex: 'color', width: 110, render: (value) => value || '-' },
      { title: 'Active', dataIndex: 'active', width: 90, render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Tag> },
      { title: '', width: 56, render: (_, row) => <ActionMenu onEdit={() => openChildEditor('taskStatus', row)} onDelete={() => deleteChild('taskStatus', row)} /> },
    ],
    tasks: [
      { title: 'Task', dataIndex: 'name', render: (value) => <strong>{value}</strong> },
      { title: 'Milestone', render: (_, row) => relationLabel(row.milestone) },
      { title: 'Priority', render: (_, row) => row.priority?.name ? <Tag color={row.priority.color || 'default'}>{row.priority.name}</Tag> : '-' },
      { title: 'Status', render: (_, row) => row.task_status?.name || row.taskStatus?.name ? <Tag color={row.task_status?.color || row.taskStatus?.color || 'blue'}>{row.task_status?.name || row.taskStatus?.name}</Tag> : '-' },
      { title: 'Due', dataIndex: 'end_date', width: 110, render: formatDate },
      { title: '', width: 56, render: (_, row) => <ActionMenu onEdit={() => openChildEditor('task', row)} onDelete={() => deleteChild('task', row)} /> },
    ],
    teams: [
      { title: 'Team', dataIndex: 'project_team_name', render: (value) => <strong>{value}</strong> },
      { title: 'Members', width: 110, render: (_, row) => toArray(row.project_team_members || row.projectTeamMembers).length },
      { title: 'Active', dataIndex: 'active', width: 90, render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Tag> },
      { title: '', width: 56, render: (_, row) => <ActionMenu onEdit={() => openChildEditor('team', row)} onDelete={() => deleteChild('team', row)} /> },
    ],
    teamMembers: [
      { title: 'Member', render: (_, row) => <strong>{userLabel(row.user)}</strong> },
      { title: 'Team', render: (_, row) => row.team?.project_team_name || '-' },
      { title: 'Active', dataIndex: 'active', width: 90, render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Tag> },
      { title: '', width: 56, render: (_, row) => <ActionMenu onEdit={() => openChildEditor('teamMember', row)} onDelete={() => deleteChild('teamMember', row)} /> },
    ],
    assignees: [
      { title: 'Task', render: (_, row) => row.task?.name || '-' },
      { title: 'Assignee', render: (_, row) => <strong>{userLabel(row.user)}</strong> },
      { title: 'Active', dataIndex: 'active', width: 90, render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Tag> },
      { title: '', width: 56, render: (_, row) => <ActionMenu onEdit={() => openChildEditor('assignee', row)} onDelete={() => deleteChild('assignee', row)} /> },
    ],
  }), [milestones, taskStatuses, tasks, teams, users, priorities]);

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={project?.name || 'Project'} />
      <style>{`
        .project-show { min-height: calc(100vh - 64px); background: #edf2f8; }
        .project-show__bar { height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; background: #fff; border-bottom: 1px solid #d9e1ec; }
        .project-show__crumb { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .project-show__body { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 10px; }
        .project-show__rail { background: #fff; border-right: 1px solid #d9e1ec; min-height: calc(100vh - 114px); padding: 18px 20px; }
        .project-show__entity { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #e3e9f2; }
        .project-show__icon { width: 42px; height: 42px; border: 1px solid #1677ff33; border-radius: 8px; display: grid; place-items: center; font-size: 20px; flex: none; color: #1677ff; background: #1677ff0f; }
        .project-show__meta-list { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; }
        .project-show__meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .project-show__main { padding: 10px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .project-show__card.ant-card, .project-show__metric.ant-card { border-radius: 6px; box-shadow: none; }
        .project-show__metric .ant-card-body { min-height: 96px; display: flex; align-items: center; }
        .project-show__metric strong { display: block; font-size: 20px; font-weight: 650; color: #10233f; }
        .project-show__metric-icon { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; color: #1677ff; background: #e6f4ff; }
        .project-show .ant-table-thead > tr > th { background: #e9eff7; font-weight: 700; }
        @media (max-width: 992px) { .project-show__body { grid-template-columns: 1fr; } .project-show__rail { min-height: auto; border-right: 0; border-bottom: 1px solid #d9e1ec; } }
      `}</style>

      <div className="project-show">
        <div className="project-show__bar">
          <div className="project-show__crumb">
            <Link href={route('hrm.projects.index')}><Button type="text" icon={<ArrowLeftOutlined />}>Back to projects</Button></Link>
            <Text ellipsis style={{ maxWidth: 420 }}>{loading ? 'Project' : project?.name}</Text>
          </div>
          <Button type="primary" icon={<EditOutlined />} disabled={!project} onClick={openProjectEditor}>Edit Project</Button>
        </div>

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : !project ? (
          <Empty style={{ paddingTop: 80 }} description="Project not found" />
        ) : (
          <div className="project-show__body">
            <aside className="project-show__rail">
              <div className="project-show__entity">
                <div className="project-show__icon"><ProjectOutlined /></div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>{project.name}</Title>
                  <Text type="secondary">Project workspace</Text>
                </div>
              </div>
              <div className="project-show__meta-list">
                <Meta label="Status" value={<StatusTag value={project.status} />} />
                <Meta label="Project Manager" value={userLabel(project.project_manager || project.projectManager)} />
                <Meta label="Duration" value={`${formatDate(project.start_date)} to ${formatDate(project.end_date)}`} />
                <Meta label="Active" value={<Tag color={project.active ? 'green' : 'red'}>{project.active ? 'Yes' : 'No'}</Tag>} />
                <Meta label="Created" value={formatDate(project.created_at)} />
              </div>
            </aside>

            <main className="project-show__main">
              {project.active === false ? <Alert showIcon type="warning" message="This project is inactive." action={<Button type="primary" onClick={() => updateProjectStatus({ active: true }, 'Project activated.')}>Make Active</Button>} /> : null}
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} lg={6}><Metric label="Milestones" value={milestones.length} icon={<FlagOutlined />} /></Col>
                <Col xs={24} sm={12} lg={6}><Metric label="Tasks" value={tasks.length} icon={<CheckCircleOutlined />} /></Col>
                <Col xs={24} sm={12} lg={6}><Metric label="Completed Tasks" value={completedTasks} icon={<UnorderedListOutlined />} /></Col>
                <Col xs={24} sm={12} lg={6}><Metric label="Team Members" value={teamMembers.length} icon={<TeamOutlined />} /></Col>
              </Row>

              <DetailsCard title="Project Details">
                <Descriptions size="small" bordered column={{ xs: 1, md: 2 }}>
                  <Descriptions.Item label="Name">{project.name}</Descriptions.Item>
                  <Descriptions.Item label="Manager">{userLabel(project.project_manager || project.projectManager)}</Descriptions.Item>
                  <Descriptions.Item label="Start Date">{formatDate(project.start_date)}</Descriptions.Item>
                  <Descriptions.Item label="End Date">{formatDate(project.end_date)}</Descriptions.Item>
                  <Descriptions.Item label="Status"><StatusTag value={project.status} /></Descriptions.Item>
                  <Descriptions.Item label="Active"><Tag color={project.active ? 'green' : 'red'}>{project.active ? 'Yes' : 'No'}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Description" span={2}>{project.description || '-'}</Descriptions.Item>
                </Descriptions>
              </DetailsCard>

              <DetailsCard title="Milestones" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('milestone')}>Add</Button>}>
                <Table size="small" rowKey="id" pagination={false} dataSource={milestones} columns={columns.milestones} />
              </DetailsCard>

              <DetailsCard title="Tasks" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('task')}>Add</Button>}>
                <Table size="small" rowKey="id" pagination={{ pageSize: 8 }} dataSource={tasks} columns={columns.tasks} />
              </DetailsCard>

              <Row gutter={[12, 12]}>
                <Col xs={24} xl={12}>
                  <DetailsCard title="Task Statuses" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('taskStatus')}>Add</Button>}>
                    <Table size="small" rowKey="id" pagination={false} dataSource={taskStatuses} columns={columns.statuses} />
                  </DetailsCard>
                </Col>
                <Col xs={24} xl={12}>
                  <DetailsCard title="Project Teams" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('team')}>Add</Button>}>
                    <Table size="small" rowKey="id" pagination={false} dataSource={teams} columns={columns.teams} />
                  </DetailsCard>
                </Col>
              </Row>

              <Row gutter={[12, 12]}>
                <Col xs={24} xl={12}>
                  <DetailsCard title="Team Members" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('teamMember')}>Add</Button>}>
                    <Table size="small" rowKey="id" pagination={{ pageSize: 6 }} dataSource={teamMembers} columns={columns.teamMembers} />
                  </DetailsCard>
                </Col>
                <Col xs={24} xl={12}>
                  <DetailsCard title="Task Assignees" extra={<Button size="small" type="primary" icon={<UserAddOutlined />} onClick={() => openChildEditor('assignee')}>Add</Button>}>
                    <Table size="small" rowKey="id" pagination={{ pageSize: 6 }} dataSource={assignees} columns={columns.assignees} />
                  </DetailsCard>
                </Col>
              </Row>
            </main>
          </div>
        )}
      </div>

      <Modal title="Edit Project" open={projectOpen} onCancel={() => setProjectOpen(false)} onOk={() => projectForm.submit()} confirmLoading={saving} width={760}>
        <Form form={projectForm} layout="vertical" onFinish={saveProject}>
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="project_manager_id" label="Project Manager" rules={[{ required: true }]}><Select options={optionUsers} showSearch optionFilterProp="label" /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="Status"><Select options={PROJECT_STATUSES.map((value) => ({ label: humanize(value), value }))} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="end_date" label="End Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${editingChild ? 'Edit' : 'Add'} ${childMeta[childType]?.title || ''}`}
        open={childOpen}
        onCancel={() => setChildOpen(false)}
        onOk={() => childForm.submit()}
        confirmLoading={saving}
        width={780}
      >
        <Form form={childForm} layout="vertical" onFinish={saveChild}>
          {renderChildFields()}
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
