import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  FlagOutlined,
  HolderOutlined,
  MoreOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Paragraph, Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const UNASSIGNED_STATUS_ID = 'unassigned';

const PROJECT_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'];
const MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS = {
  PENDING: 'default',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
  ON_HOLD: 'orange',
};

const COMPLETED_STATUS_NAMES = ['COMPLETED', 'DONE', 'FINISHED', 'CLOSED', 'RESOLVED'];
const IN_PROGRESS_STATUS_NAMES = ['IN_PROGRESS', 'IN PROGRESS', 'DOING', 'STARTED', 'ACTIVE'];

const childMeta = {
  milestone: { title: 'Milestone', endpoint: '/api/hrm/milestones' },
  taskStatus: { title: 'Task Status', endpoint: '/api/hrm/task-statuses' },
  task: { title: 'Task', endpoint: '/api/hrm/tasks' },
  team: { title: 'Project Team', endpoint: '/api/hrm/project-teams' },
  teamMember: { title: 'Team Member', endpoint: '/api/hrm/project-team-members' },
  assignee: { title: 'Task Assignee', endpoint: '/api/hrm/assigned-tasks' },
};

const toArray = (value) => (Array.isArray(value) ? value : []);
const humanize = (value) => (value ? String(value).replace(/_/g, ' ') : '-');
const normalizeText = (value) => String(value || '').replace(/[_-]/g, ' ').trim().toUpperCase();
const formatDate = (value) => (value ? dayjs(value).format('DD-MM-YYYY') : '-');
const dateValue = (value) => (value ? dayjs(value).format('YYYY-MM-DD') : null);
const collection = (payload) => payload?.results || payload?.data || (Array.isArray(payload) ? payload : []);
const relationLabel = (record, fallback = '-') => record?.name || record?.project_team_name || record?.label || fallback;

const normalizeDropStatusId = (value) => (
  value === null || value === undefined || value === ''
    ? UNASSIGNED_STATUS_ID
    : String(value)
);

const kanbanCollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  return rectIntersection(args);
};

function getTaskStatus(task) {
  return task?.task_status || task?.taskStatus || null;
}

const statusIdOf = (task) => task?.task_status_id ?? task?.taskStatusId ?? getTaskStatus(task)?.id ?? null;
const milestoneIdOf = (task) => task?.milestone_id ?? task?.milestoneId ?? task?.milestone?.id ?? null;
const priorityIdOf = (task) => task?.priority_id ?? task?.priorityId ?? task?.priority?.id ?? null;

const statusSortValue = (status) => {
  const explicitOrder = status?.sort_order ?? status?.sortOrder ?? status?.order;

  if (explicitOrder !== null && explicitOrder !== undefined && explicitOrder !== '') {
    return Number(explicitOrder);
  }

  const name = String(status?.name || '');
  const stepMatch = name.match(/\bstep\s*(\d+)\b/i);

  if (stepMatch) return Number(stepMatch[1]);

const leadingNumber = name.match(/^\s*(\d+)\b/);
  if (leadingNumber) return Number(leadingNumber[1]);

  return Number.MAX_SAFE_INTEGER;
};

const sortTaskStatuses = (statuses) => [...statuses].sort((a, b) => {
  const aSort = statusSortValue(a);
  const bSort = statusSortValue(b);

  if (aSort !== bSort) return aSort - bSort;

  return String(a?.name || '').localeCompare(String(b?.name || ''));
});

const statusOrderOf = (status, fallback = 0) => {
  const value = status?.sort_order ?? status?.sortOrder ?? status?.order;

  return value !== null && value !== undefined && value !== '' ? Number(value) : fallback;
};

function getTaskAssignees(task) {
  return toArray(task?.assigned_tasks || task?.assignedTasks);
}

function getUserLabel(user) {
  return user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.username || user.email || `User #${user.id}`
    : '-';
}

function getInitials(user) {
  const label = getUserLabel(user);

  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function isCompletedTask(task) {
  return COMPLETED_STATUS_NAMES.includes(normalizeText(getTaskStatus(task)?.name));
}

function isInProgressTask(task) {
  return IN_PROGRESS_STATUS_NAMES.includes(normalizeText(getTaskStatus(task)?.name));
}

function isOverdueTask(task) {
  return Boolean(task?.end_date && dayjs(task.end_date).isBefore(dayjs(), 'day') && !isCompletedTask(task));
}

function StatusTag({ value }) {
  return <Tag color={STATUS_COLORS[value] || 'default'}>{humanize(value)}</Tag>;
}

function ActiveTag({ value }) {
  return <Tag color={value !== false ? 'green' : 'red'}>{value !== false ? 'Active' : 'Inactive'}</Tag>;
}

function WorkCard({ label, value, icon, children }) {
  return (
    <Card className="project-show__metric" bordered={false}>
      <Flex align="center" justify="space-between" gap={12}>
        <Space align="start">
          <span className="project-show__metric-icon">{icon}</span>
          <div>
            <Text type="secondary">{label}</Text>
            <strong>{value}</strong>
          </div>
        </Space>
        {children}
      </Flex>
    </Card>
  );
}

function ActionMenu({ onEdit, onDelete }) {
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: onEdit },
          { key: 'delete', danger: true, label: 'Delete', icon: <DeleteOutlined />, onClick: onDelete },
        ],
      }}
    >
      <Button type="text" icon={<MoreOutlined />} />
    </Dropdown>
  );
}

function KanbanColumn({ column, tasks, children, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      statusId: column.statusId,
      columnId: column.id,
    },
  });

  return (
    <section
      className={`project-show__kanban-column${isOver ? ' is-over' : ''}`}
      ref={setNodeRef}
    >
      <div className="project-show__kanban-column-head" style={{ '--status-accent': column.color }}>
        <Space size={8}>
          <span className="project-show__status-dot" />
          <Text strong>{column.name}</Text>
          <Badge count={tasks.length} color={column.color} />
        </Space>

        <Tooltip title={`Add task to ${column.name}`}>
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={() => onAddTask(column.id)}
          />
        </Tooltip>
      </div>

      <SortableContext
        items={tasks.map((task) => `task-${task.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="project-show__kanban-list">
          {tasks.length ? children : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks" />
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskCard({ task, onOpen }) {
  const status = getTaskStatus(task);
  const assignees = getTaskAssignees(task);
  const overdue = isOverdueTask(task);
  const priority = task?.priority;
  const accent = status?.color || priority?.color;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: {
      type: 'task',
      taskId: task.id,
      statusId: normalizeDropStatusId(statusIdOf(task)),
    },
  });

  return (
    <Card
      ref={setNodeRef}
      className={`project-show__task-card${isDragging ? ' is-dragging' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        '--task-accent': accent,
      }}
      size="small"
      bordered
      onClick={onOpen}
    >
      <Flex align="start" justify="space-between" gap={8}>
        <Space size={6} align="start">
          <Button
            type="text"
            size="small"
            className="project-show__task-drag-handle"
            icon={<HolderOutlined />}
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
          />

          <Text strong className="project-show__task-title">
            {task.name}
          </Text>
        </Space>

        <ActiveTag value={task.active} />
      </Flex>

      <Space wrap size={[4, 4]} className="project-show__task-tags">
        {priority?.name ? <Tag color={priority.color || 'default'}>{priority.name}</Tag> : <Tag>Priority</Tag>}
        {task?.milestone?.name ? <Tag icon={<FlagOutlined />}>{task.milestone.name}</Tag> : null}
        {overdue ? <Tag color="red" icon={<ExclamationCircleOutlined />}>Overdue</Tag> : null}
      </Space>

      {task.description ? (
        <Paragraph type="secondary" ellipsis={{ rows: 2 }} className="project-show__task-description">
          {task.description}
        </Paragraph>
      ) : null}

      <Flex align="center" justify="space-between" gap={8}>
        <Space size={6}>
          <CalendarOutlined />
          <Text type={overdue ? 'danger' : 'secondary'}>{formatDate(task.end_date)}</Text>
        </Space>

        <Avatar.Group max={{ count: 3 }}>
          {assignees.map((assignee) => (
            <Tooltip key={assignee.id} title={getUserLabel(assignee.user)}>
              <Avatar size="small">{getInitials(assignee.user)}</Avatar>
            </Tooltip>
          ))}
        </Avatar.Group>
      </Flex>

      {task.completion_time !== null && task.completion_time !== undefined ? (
        <Text type="secondary" className="project-show__task-time">
          <FieldTimeOutlined /> Completion time: {task.completion_time}
        </Text>
      ) : null}
    </Card>
  );
}

export default function ProjectShow({ auth, id }) {
  const { token } = theme.useToken();

  const [project, setProject] = useState(null);
  const [localTasks, setLocalTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [childType, setChildType] = useState(null);
  const [editingChild, setEditingChild] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState();
  const [assigneeFilter, setAssigneeFilter] = useState();
  const [selectedTask, setSelectedTask] = useState(null);

  const [projectForm] = Form.useForm();
  const [childForm] = Form.useForm();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const milestones = toArray(project?.milestones);

  const taskStatuses = useMemo(
    () => sortTaskStatuses(toArray(project?.task_statuses || project?.taskStatuses)),
    [project]
  );

  const tasks = localTasks;

  const teams = toArray(project?.project_teams || project?.projectTeams);

  const teamMembers = teams.flatMap((team) => (
    toArray(team.project_team_members || team.projectTeamMembers).map((member) => ({
      ...member,
      team,
    }))
  ));

  const assignees = tasks.flatMap((task) => (
    getTaskAssignees(task).map((assignee) => ({
      ...assignee,
      task,
    }))
  ));

  const completedTasks = tasks.filter(isCompletedTask);
  const inProgressTasks = tasks.filter(isInProgressTask);
  const overdueTasks = tasks.filter(isOverdueTask);
  const progressPercent = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const optionUsers = users.map((user) => ({ label: getUserLabel(user), value: user.id }));
  const optionPriorities = priorities.map((priority) => ({ label: priority.name, value: priority.id }));
  const optionMilestones = milestones.map((milestone) => ({ label: milestone.name, value: milestone.id }));
  const optionTaskStatuses = taskStatuses.map((status) => ({ label: status.name, value: status.id }));
  const optionTeams = teams.map((team) => ({ label: team.project_team_name, value: team.id }));
  const optionTasks = tasks.map((task) => ({ label: task.name, value: task.id }));

  const assigneeOptions = useMemo(() => {
    const byId = new Map();

    assignees.forEach((assignee) => {
      const userId = assignee.user_id || assignee.user?.id;

      if (userId) {
        byId.set(userId, {
          label: getUserLabel(assignee.user),
          value: userId,
        });
      }
    });

    return Array.from(byId.values());
  }, [assignees]);

  const loadProject = async () => {
    setLoading(true);

    try {
      const { data } = await axios.get(api(`/api/hrm/projects/${id}`));

      setProject(data);
      setLocalTasks(toArray(data?.tasks));
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

  const columnsForBoard = useMemo(() => {
    const statusColumns = taskStatuses.map((status) => ({
      id: String(status.id),
      statusId: status.id,
      name: status.name,
      color: status.color || token.colorPrimary,
    }));

    const hasUnassigned = tasks.some((task) => !statusIdOf(task));

    return hasUnassigned
      ? [
          ...statusColumns,
          {
            id: UNASSIGNED_STATUS_ID,
            statusId: null,
            name: 'Unassigned',
            color: token.colorTextTertiary,
          },
        ]
      : statusColumns;
  }, [taskStatuses, tasks, token.colorPrimary, token.colorTextTertiary]);

  const filteredTasks = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return tasks.filter((task) => {
      const assigneeIds = getTaskAssignees(task).map((item) => item.user_id || item.user?.id);
      const matchesMilestone = selectedMilestone === 'all' || String(milestoneIdOf(task)) === String(selectedMilestone);
      const matchesSearch = !query || [task.name, task.description].filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesPriority = !priorityFilter || String(priorityIdOf(task)) === String(priorityFilter);
      const matchesAssignee = !assigneeFilter || assigneeIds.map(String).includes(String(assigneeFilter));

      return matchesMilestone && matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, selectedMilestone, searchText, priorityFilter, assigneeFilter]);

  const tasksByColumn = useMemo(() => {
    const grouped = new Map(columnsForBoard.map((column) => [column.id, []]));

    filteredTasks.forEach((task) => {
      const key = statusIdOf(task) ? String(statusIdOf(task)) : UNASSIGNED_STATUS_ID;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key).push(task);
    });

    return grouped;
  }, [columnsForBoard, filteredTasks]);

  const selectedTaskFresh = useMemo(() => {
    if (!selectedTask?.id) return selectedTask;

    return tasks.find((task) => task.id === selectedTask.id) || selectedTask;
  }, [selectedTask, tasks]);

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

  const updateProjectTaskStatuses = (updater) => {
    setProject((current) => {
      if (!current) return current;

      const currentStatuses = toArray(current.task_statuses || current.taskStatuses);
      const nextStatuses = updater(currentStatuses);

      return {
        ...current,
        task_statuses: nextStatuses,
        taskStatuses: nextStatuses,
      };
    });
  };

  const saveProject = async (values) => {
    setSaving(true);

    try {
      await axios.patch(api(`/api/hrm/projects/${project.id}`), {
        ...values,
        active: values.active !== false,
      });

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

  const defaultsFor = (type, overrides = {}) => {
    const firstMilestone = milestones[0]?.id;
    const firstStatus = taskStatuses[0]?.id;
    const firstPriority = priorities[0]?.id;
    const firstTeam = teams[0]?.id;
    const firstTask = tasks[0]?.id;

    const nextStatusOrder = taskStatuses.length
      ? Math.max(...taskStatuses.map((status, index) => statusOrderOf(status, index + 1))) + 1
      : 1;

    const defaults = {
      milestone: {
        project_id: project.id,
        status: 'PENDING',
        active: true,
      },
      taskStatus: {
        project_id: project.id,
        color: token.colorPrimary,
        sort_order: nextStatusOrder,
        active: true,
      },
      task: {
        project_id: project.id,
        milestone_id: firstMilestone,
        task_status_id: firstStatus,
        priority_id: firstPriority,
        completion_time: 0,
        active: true,
      },
      team: {
        project_id: project.id,
        active: true,
      },
      teamMember: {
        project_team_id: firstTeam,
        active: true,
      },
      assignee: {
        task_id: firstTask,
        active: true,
      },
    };

    return defaults[type] ? { ...defaults[type], ...overrides } : overrides;
  };

  const normalizeChildValues = (type, row = {}) => ({
    ...row,
    start_date: dateValue(row.start_date),
    end_date: dateValue(row.end_date),
    active: row.active !== false,
    project_team_id: row.project_team_id || row.team?.id,
    task_id: row.task_id || row.task?.id,
    milestone_id: row.milestone_id || row.milestone?.id,
    priority_id: row.priority_id || row.priority?.id,
    task_status_id: row.task_status_id || getTaskStatus(row)?.id,
    sort_order: row.sort_order ?? row.sortOrder ?? row.order,
  });

  const openChildEditor = (type, row = null, overrides = {}) => {
    setChildType(type);
    setEditingChild(row);

    childForm.setFieldsValue(
      row ? normalizeChildValues(type, row) : defaultsFor(type, overrides)
    );

    setChildOpen(true);
  };

  const openTaskForStatus = (statusId) => {
    openChildEditor('task', null, {
      task_status_id: statusId === UNASSIGNED_STATUS_ID ? undefined : statusId,
      milestone_id: selectedMilestone !== 'all' ? selectedMilestone : milestones[0]?.id,
    });
  };

  const saveChild = async (values) => {
    const meta = childMeta[childType];

    if (!meta) return;

    setSaving(true);

    try {
      const payload = {
        ...values,
        active: values.active !== false,
      };

      if (['milestone', 'taskStatus', 'task', 'team'].includes(childType)) {
        payload.project_id = project.id;
      }

      const url = editingChild ? `${meta.endpoint}/${editingChild.id}` : meta.endpoint;
      const method = editingChild ? 'patch' : 'post';

      await axios[method](api(url), payload);

      message.success(`${meta.title} saved.`);
      setChildOpen(false);

      if (childType === 'task' && selectedTask?.id === editingChild?.id) {
        setSelectedTask(null);
      }

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

        if (type === 'task' && selectedTask?.id === row.id) {
          setSelectedTask(null);
        }

        loadProject();
      },
    });
  };

  const moveTaskStatus = async (row, direction) => {
    const ordered = taskStatuses.map((status, index) => ({
      ...status,
      sort_order: statusOrderOf(status, index + 1),
    }));

    const currentIndex = ordered.findIndex((status) => status.id === row.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const reordered = [...ordered];
    const [moved] = reordered.splice(currentIndex, 1);

    reordered.splice(targetIndex, 0, moved);

    const normalized = reordered.map((status, index) => ({
      ...status,
      sort_order: index + 1,
    }));

    const previousStatuses = taskStatuses;

    updateProjectTaskStatuses(() => normalized);

    try {
      await Promise.all(
        normalized.map((status) => (
          axios.patch(api(`/api/hrm/task-statuses/${status.id}`), {
            sort_order: status.sort_order,
          })
        ))
      );

      message.success('Status order updated.');
      loadProject();
    } catch (error) {
      updateProjectTaskStatuses(() => previousStatuses);
      message.error(error?.response?.data?.message || 'Unable to update status order.');
    }
  };

  const resolveDropStatusId = (over) => {
    if (!over) return null;

    const data = over.data?.current;

    if (data?.type === 'column') {
      return normalizeDropStatusId(data.statusId);
    }

    if (data?.type === 'task') {
      const overTask = tasks.find((task) => String(task.id) === String(data.taskId));

      return normalizeDropStatusId(statusIdOf(overTask));
    }

    const idValue = String(over.id || '');

    if (idValue.startsWith('column-')) {
      return normalizeDropStatusId(idValue.replace('column-', ''));
    }

    if (idValue.startsWith('task-')) {
      const overTaskId = idValue.replace('task-', '');
      const overTask = tasks.find((task) => String(task.id) === String(overTaskId));

      return normalizeDropStatusId(statusIdOf(overTask));
    }

    return null;
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return;

    const taskId = String(active.id).replace('task-', '');
    const task = tasks.find((item) => String(item.id) === String(taskId));

    if (!task) return;

    const targetStatus = resolveDropStatusId(over);

    if (!targetStatus) return;

    const oldStatusId = normalizeDropStatusId(statusIdOf(task));

    if (oldStatusId === targetStatus) return;

    const newStatus = targetStatus === UNASSIGNED_STATUS_ID
      ? null
      : taskStatuses.find((status) => String(status.id) === String(targetStatus));

    if (targetStatus !== UNASSIGNED_STATUS_ID && !newStatus) {
      message.error('Invalid target status.');
      return;
    }

    const newStatusId = newStatus?.id ?? null;
    const previousTasks = tasks;

    setLocalTasks((current) => current.map((item) => (
      String(item.id) === String(taskId)
        ? {
            ...item,
            task_status_id: newStatusId,
            taskStatusId: newStatusId,
            task_status: newStatus,
            taskStatus: newStatus,
          }
        : item
    )));

    try {
      await axios.patch(api(`/api/hrm/tasks/${task.id}`), {
        task_status_id: newStatusId,
      });

      message.success('Task status updated.');
    } catch (error) {
      setLocalTasks(previousTasks);

      const data = error?.response?.data;
      const firstFieldError = data && typeof data === 'object'
        ? Object.entries(data)?.[0]
        : null;

      const errorMessage =
        data?.message ||
        data?.detail ||
        (firstFieldError ? `${firstFieldError[0]}: ${Array.isArray(firstFieldError[1]) ? firstFieldError[1].join(', ') : firstFieldError[1]}` : null) ||
        'Unable to move task.';

      message.error(errorMessage);
    }
  };

  const renderChildFields = () => {
    if (childType === 'milestone') {
      return (
        <>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="Status">
            <Select options={MILESTONE_STATUSES.map((value) => ({ label: humanize(value), value }))} />
          </Form.Item>

          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </>
      );
    }

    if (childType === 'taskStatus') {
      return (
        <>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="color" label="Color">
                <Input type="color" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="sort_order" label="Order" rules={[{ required: true }]}>
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </>
      );
    }

    if (childType === 'task') {
      return (
        <>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="milestone_id" label="Milestone" rules={[{ required: true }]}>
                <Select options={optionMilestones} showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="priority_id" label="Priority" rules={[{ required: true }]}>
                <Select options={optionPriorities} showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="task_status_id" label="Status" rules={[{ required: true }]}>
                <Select options={optionTaskStatuses} showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="completion_time" label="Completion Time" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </>
      );
    }

    if (childType === 'team') {
      return (
        <>
          <Form.Item name="project_team_name" label="Team Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </>
      );
    }

    if (childType === 'teamMember') {
      return (
        <>
          <Form.Item name="project_team_id" label="Team" rules={[{ required: true }]}>
            <Select options={optionTeams} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item name="user_id" label="Employee" rules={[{ required: true }]}>
            <Select options={optionUsers} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </>
      );
    }

    if (childType === 'assignee') {
      return (
        <>
          <Form.Item name="task_id" label="Task" rules={[{ required: true }]}>
            <Select options={optionTasks} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item name="user_id" label="Employee" rules={[{ required: true }]}>
            <Select options={optionUsers} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </>
      );
    }

    return null;
  };

  const milestoneProgress = (milestone) => {
    const milestoneTasks = tasks.filter((task) => String(milestoneIdOf(task)) === String(milestone.id));

    return milestoneTasks.length
      ? Math.round((milestoneTasks.filter(isCompletedTask).length / milestoneTasks.length) * 100)
      : 0;
  };

  const workload = useMemo(() => {
    const byUser = new Map();

    tasks.forEach((task) => {
      getTaskAssignees(task).forEach((assignee) => {
        const user = assignee.user;
        const userId = assignee.user_id || user?.id;

        if (!userId) return;

        if (!byUser.has(userId)) {
          byUser.set(userId, {
            user,
            total: 0,
            completed: 0,
            overdue: 0,
          });
        }

        const row = byUser.get(userId);

        row.total += 1;

        if (isCompletedTask(task)) row.completed += 1;
        if (isOverdueTask(task)) row.overdue += 1;
      });
    });

    return Array.from(byUser.values());
  }, [tasks]);

  const tableColumns = useMemo(() => ({
    milestones: [
      {
        title: 'Name',
        dataIndex: 'name',
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: 'Start',
        dataIndex: 'start_date',
        width: 120,
        render: formatDate,
      },
      {
        title: 'End',
        dataIndex: 'end_date',
        width: 120,
        render: formatDate,
      },
      {
        title: 'Tasks',
        width: 90,
        render: (_, row) => tasks.filter((task) => String(milestoneIdOf(task)) === String(row.id)).length,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 130,
        render: (value) => <StatusTag value={value} />,
      },
      {
        title: '',
        width: 56,
        render: (_, row) => (
          <ActionMenu
            onEdit={() => openChildEditor('milestone', row)}
            onDelete={() => deleteChild('milestone', row)}
          />
        ),
      },
    ],
    statuses: [
      {
        title: 'Order',
        dataIndex: 'sort_order',
        width: 150,
        render: (value, row, index) => (
          <Space size={4}>
            <Tag icon={<HolderOutlined />}>{value ?? index + 1}</Tag>

            <Tooltip title="Move up">
              <Button
                size="small"
                onClick={() => moveTaskStatus(row, 'up')}
                disabled={index === 0}
              >
                Up
              </Button>
            </Tooltip>

            <Tooltip title="Move down">
              <Button
                size="small"
                onClick={() => moveTaskStatus(row, 'down')}
                disabled={index === taskStatuses.length - 1}
              >
                Down
              </Button>
            </Tooltip>
          </Space>
        ),
      },
      {
        title: 'Name',
        dataIndex: 'name',
        render: (value, row) => <Tag color={row.color || 'blue'}>{value}</Tag>,
      },
      {
        title: 'Color',
        dataIndex: 'color',
        width: 110,
        render: (value) => value || '-',
      },
      {
        title: 'Active',
        dataIndex: 'active',
        width: 100,
        render: (value) => <ActiveTag value={value} />,
      },
      {
        title: '',
        width: 56,
        render: (_, row) => (
          <ActionMenu
            onEdit={() => openChildEditor('taskStatus', row)}
            onDelete={() => deleteChild('taskStatus', row)}
          />
        ),
      },
    ],
    tasks: [
      {
        title: 'Task',
        dataIndex: 'name',
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: 'Milestone',
        render: (_, row) => relationLabel(row.milestone),
      },
      {
        title: 'Priority',
        render: (_, row) => row.priority?.name
          ? <Tag color={row.priority.color || 'default'}>{row.priority.name}</Tag>
          : '-',
      },
      {
        title: 'Status',
        render: (_, row) => getTaskStatus(row)?.name
          ? <Tag color={getTaskStatus(row)?.color || 'blue'}>{getTaskStatus(row)?.name}</Tag>
          : '-',
      },
      {
        title: 'Assignees',
        render: (_, row) => (
          <Avatar.Group max={{ count: 3 }}>
            {getTaskAssignees(row).map((assignee) => (
              <Tooltip key={assignee.id} title={getUserLabel(assignee.user)}>
                <Avatar size="small">{getInitials(assignee.user)}</Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        ),
      },
      {
        title: 'Start',
        dataIndex: 'start_date',
        width: 120,
        render: formatDate,
      },
      {
        title: 'Due',
        dataIndex: 'end_date',
        width: 120,
        render: (value, row) => (
          <Text type={isOverdueTask(row) ? 'danger' : undefined}>
            {formatDate(value)}
          </Text>
        ),
      },
      {
        title: 'Active',
        dataIndex: 'active',
        width: 100,
        render: (value) => <ActiveTag value={value} />,
      },
      {
        title: '',
        width: 56,
        render: (_, row) => (
          <ActionMenu
            onEdit={() => openChildEditor('task', row)}
            onDelete={() => deleteChild('task', row)}
          />
        ),
      },
    ],
    teams: [
      {
        title: 'Team',
        dataIndex: 'project_team_name',
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: 'Members',
        width: 110,
        render: (_, row) => toArray(row.project_team_members || row.projectTeamMembers).length,
      },
      {
        title: 'Active',
        dataIndex: 'active',
        width: 100,
        render: (value) => <ActiveTag value={value} />,
      },
      {
        title: '',
        width: 56,
        render: (_, row) => (
          <ActionMenu
            onEdit={() => openChildEditor('team', row)}
            onDelete={() => deleteChild('team', row)}
          />
        ),
      },
    ],
    teamMembers: [
      {
        title: 'Member',
        render: (_, row) => <Text strong>{getUserLabel(row.user)}</Text>,
      },
      {
        title: 'Team',
        render: (_, row) => row.team?.project_team_name || '-',
      },
      {
        title: 'Active',
        dataIndex: 'active',
        width: 100,
        render: (value) => <ActiveTag value={value} />,
      },
      {
        title: '',
        width: 56,
        render: (_, row) => (
          <ActionMenu
            onEdit={() => openChildEditor('teamMember', row)}
            onDelete={() => deleteChild('teamMember', row)}
          />
        ),
      },
    ],
    assignees: [
      {
        title: 'Task',
        render: (_, row) => row.task?.name || '-',
      },
      {
        title: 'Assignee',
        render: (_, row) => <Text strong>{getUserLabel(row.user)}</Text>,
      },
      {
        title: 'Active',
        dataIndex: 'active',
        width: 100,
        render: (value) => <ActiveTag value={value} />,
      },
      {
        title: '',
        width: 56,
        render: (_, row) => (
          <ActionMenu
            onEdit={() => openChildEditor('assignee', row)}
            onDelete={() => deleteChild('assignee', row)}
          />
        ),
      },
    ],
  }), [tasks, teams, taskStatuses]);

  const boardTab = (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Flex className="project-show__filters" align="center" justify="space-between" gap={10} wrap>
        <Space wrap size={[6, 6]}>
          <Tag.CheckableTag
            checked={selectedMilestone === 'all'}
            onChange={() => setSelectedMilestone('all')}
          >
            All
          </Tag.CheckableTag>

          {milestones.map((milestone) => (
            <Tag.CheckableTag
              key={milestone.id}
              checked={String(selectedMilestone) === String(milestone.id)}
              onChange={() => setSelectedMilestone(milestone.id)}
            >
              {milestone.name}
            </Tag.CheckableTag>
          ))}
        </Space>

        <Space wrap size={8}>
          <Input
            allowClear
            size="middle"
            prefix={<SearchOutlined />}
            placeholder="Search tasks"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 220 }}
          />

          <Select
            allowClear
            placeholder="Priority"
            options={optionPriorities}
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 150 }}
          />

          <Select
            allowClear
            placeholder="Assignee"
            options={assigneeOptions}
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            style={{ width: 170 }}
            showSearch
            optionFilterProp="label"
          />
        </Space>
      </Flex>

      {columnsForBoard.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragEnd={handleDragEnd}
        >
          <div className="project-show__kanban-board">
            {columnsForBoard.map((column) => {
              const columnTasks = tasksByColumn.get(column.id) || [];

              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                  onAddTask={openTaskForStatus}
                >
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onOpen={() => setSelectedTask(task)}
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        </DndContext>
      ) : (
        <Empty description="Add task statuses to build the board" />
      )}
    </Space>
  );

  const milestoneTab = (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Flex justify="end">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openChildEditor('milestone')}
        >
          Add Milestone
        </Button>
      </Flex>

      <Row gutter={[12, 12]}>
        {milestones.map((milestone) => {
          const relatedTasks = tasks.filter((task) => String(milestoneIdOf(task)) === String(milestone.id));

          return (
            <Col xs={24} md={12} xl={8} key={milestone.id}>
              <Card className="project-show__timeline-card" bordered={false}>
                <Flex justify="space-between" align="start" gap={8}>
                  <div>
                    <Text strong>{milestone.name}</Text>
                    <div>
                      <Text type="secondary">
                        {formatDate(milestone.start_date)} to {formatDate(milestone.end_date)}
                      </Text>
                    </div>
                  </div>

                  <StatusTag value={milestone.status} />
                </Flex>

                <Progress percent={milestoneProgress(milestone)} size="small" />
                <Text type="secondary">{relatedTasks.length} tasks</Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Table
        size="small"
        rowKey="id"
        dataSource={milestones}
        columns={tableColumns.milestones}
        scroll={{ x: 760 }}
      />
    </Space>
  );

  const teamTab = (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Row gutter={[12, 12]}>
        {workload.map((item) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={item.user?.id || getUserLabel(item.user)}>
            <Card className="project-show__workload-card" bordered={false}>
              <Space align="center">
                <Avatar>{getInitials(item.user)}</Avatar>

                <div>
                  <Text strong>{getUserLabel(item.user)}</Text>
                  <div>
                    <Text type="secondary">{item.total} assigned</Text>
                  </div>
                </div>
              </Space>

              <Progress
                percent={item.total ? Math.round((item.completed / item.total) * 100) : 0}
                size="small"
              />

              <Space size={6}>
                <Tag color="green">{item.completed} done</Tag>
                <Tag color={item.overdue ? 'red' : 'default'}>{item.overdue} overdue</Tag>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={12}>
          <Card
            title="Project Teams"
            extra={(
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openChildEditor('team')}
              >
                Add
              </Button>
            )}
            bordered={false}
          >
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={teams}
              columns={tableColumns.teams}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title="Team Members"
            extra={(
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openChildEditor('teamMember')}
              >
                Add
              </Button>
            )}
            bordered={false}
          >
            <Table
              size="small"
              rowKey="id"
              pagination={{ pageSize: 6 }}
              dataSource={teamMembers}
              columns={tableColumns.teamMembers}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title="Task Assignees"
            extra={(
              <Button
                size="small"
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => openChildEditor('assignee')}
              >
                Add
              </Button>
            )}
            bordered={false}
          >
            <Table
              size="small"
              rowKey="id"
              pagination={{ pageSize: 8 }}
              dataSource={assignees}
              columns={tableColumns.assignees}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );

  const detailsTab = (
    <Row gutter={[12, 12]}>
      <Col span={24}>
        <Card title="Project Details" bordered={false}>
          <Descriptions size="small" bordered column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label="Name">{project?.name}</Descriptions.Item>
            <Descriptions.Item label="Manager">{getUserLabel(project?.project_manager || project?.projectManager)}</Descriptions.Item>
            <Descriptions.Item label="Status"><StatusTag value={project?.status} /></Descriptions.Item>
            <Descriptions.Item label="Active"><ActiveTag value={project?.active} /></Descriptions.Item>
            <Descriptions.Item label="Start Date">{formatDate(project?.start_date)}</Descriptions.Item>
            <Descriptions.Item label="End Date">{formatDate(project?.end_date)}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDate(project?.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Updated">{formatDate(project?.updated_at)}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>{project?.description || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
    </Row>
  );

  const statusTab = (
    <Card
      title="Task Statuses"
      extra={(
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openChildEditor('taskStatus')}
        >
          Add Status
        </Button>
      )}
      bordered={false}
    >
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={taskStatuses}
        columns={tableColumns.statuses}
      />
    </Card>
  );

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={project?.name || 'Project'} />

      <style>{`
        .project-show {
          --ps-bg: ${token.colorBgLayout};
          --ps-container: ${token.colorBgContainer};
          --ps-border: ${token.colorBorderSecondary};
          --ps-text: ${token.colorText};
          --ps-secondary: ${token.colorTextSecondary};
          --ps-primary: ${token.colorPrimary};
          --ps-radius: ${token.borderRadiusLG}px;
          --ps-shadow: ${token.boxShadowTertiary};
          min-height: calc(100vh - 64px);
          background: var(--ps-bg);
          padding: ${token.padding}px;
        }

        .project-show__header,
        .project-show__surface,
        .project-show .ant-card {
          border-radius: var(--ps-radius);
          box-shadow: none;
        }

        .project-show__header {
          background: var(--ps-container);
          border: 1px solid var(--ps-border);
          padding: ${token.paddingSM}px ${token.padding}px;
          margin-bottom: ${token.margin}px;
        }

        .project-show__header-title {
          min-width: 220px;
        }

        .project-show__header-title h3 {
          margin: 0;
          line-height: 1.2;
        }

        .project-show__header-meta {
          color: var(--ps-secondary);
          font-size: ${token.fontSizeSM}px;
        }

        .project-show__metric .ant-card-body {
          padding: ${token.padding}px;
        }

        .project-show__metric strong {
          display: block;
          color: var(--ps-text);
          font-size: ${token.fontSizeXL}px;
          line-height: 1.2;
        }

        .project-show__metric-icon {
          width: 34px;
          height: 34px;
          border-radius: ${token.borderRadius}px;
          display: grid;
          place-items: center;
          color: var(--ps-primary);
          background: ${token.colorPrimaryBg};
          flex: none;
        }

        .project-show__surface {
          background: var(--ps-container);
          border: 1px solid var(--ps-border);
          padding: ${token.padding}px;
        }

        .project-show__tabs .ant-tabs-nav {
          margin-bottom: ${token.marginSM}px;
        }

        .project-show__filters {
          border-bottom: 1px solid var(--ps-border);
          padding-bottom: ${token.paddingSM}px;
        }

        .project-show__kanban-board {
          display: flex;
          gap: ${token.marginSM}px;
          min-height: 560px;
          max-height: calc(100vh - 360px);
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: ${token.paddingXS}px;
        }

        .project-show__kanban-column {
          min-width: 300px;
          width: 300px;
          background: var(--ps-bg);
          border: 1px solid var(--ps-border);
          border-radius: var(--ps-radius);
          display: flex;
          flex-direction: column;
          transition: border-color .2s ease, box-shadow .2s ease;
        }

        .project-show__kanban-column.is-over {
          border-color: var(--ps-primary);
          box-shadow: var(--ps-shadow);
        }

        .project-show__kanban-column-head {
          position: sticky;
          top: 0;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${token.marginXS}px;
          padding: ${token.paddingSM}px;
          background: var(--ps-container);
          border-bottom: 1px solid var(--ps-border);
          border-radius: var(--ps-radius) var(--ps-radius) 0 0;
        }

        .project-show__status-dot,
        .project-show__task-card::before {
          background: var(--status-accent, var(--task-accent, var(--ps-primary)));
        }

        .project-show__status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .project-show__kanban-list {
          flex: 1;
          min-height: 220px;
          overflow-y: auto;
          padding: ${token.paddingSM}px;
          display: flex;
          flex-direction: column;
          gap: ${token.marginSM}px;
        }

        .project-show__task-card {
          position: relative;
          cursor: pointer;
          border-color: var(--ps-border);
          transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease;
          overflow: hidden;
        }

        .project-show__task-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
        }

        .project-show__task-card:hover {
          box-shadow: var(--ps-shadow);
          border-color: ${token.colorBorder};
        }

        .project-show__task-card.is-dragging {
          opacity: .72;
          box-shadow: var(--ps-shadow);
        }

        .project-show__task-drag-handle {
          cursor: grab;
          color: var(--ps-secondary);
          flex: none;
        }

        .project-show__task-drag-handle:active {
          cursor: grabbing;
        }

        .project-show__task-title {
          display: block;
          line-height: 1.35;
          padding-left: ${token.paddingXXS}px;
        }

        .project-show__task-tags {
          margin-top: ${token.marginXS}px;
        }

        .project-show__task-description {
          margin: ${token.marginXS}px 0;
          font-size: ${token.fontSizeSM}px;
        }

        .project-show__task-time {
          display: block;
          margin-top: ${token.marginXS}px;
          font-size: ${token.fontSizeSM}px;
        }

        .project-show__timeline-card .ant-card-body,
        .project-show__workload-card .ant-card-body {
          display: flex;
          flex-direction: column;
          gap: ${token.marginXS}px;
        }

        .project-show .ant-table-thead > tr > th {
          background: ${token.colorFillAlter};
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .project-show {
            padding: ${token.paddingSM}px;
          }

          .project-show__header {
            align-items: stretch;
          }

          .project-show__header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .project-show__metric .ant-card-body {
            padding: ${token.paddingSM}px;
          }

          .project-show__kanban-board {
            max-height: calc(100vh - 420px);
          }
        }
      `}</style>

      <div className="project-show">
        {loading ? (
          <Skeleton active paragraph={{ rows: 12 }} />
        ) : !project ? (
          <Empty style={{ paddingTop: 80 }} description="Project not found" />
        ) : (
          <>
            <Flex className="project-show__header" align="center" justify="space-between" gap={12} wrap>
              <Space size={12} align="center" wrap>
                <Link href={route('hrm.projects.index')}>
                  <Button icon={<ArrowLeftOutlined />}>Back</Button>
                </Link>

                <div className="project-show__header-title">
                  <Space size={8} wrap>
                    <ProjectOutlined style={{ color: token.colorPrimary }} />
                    <Title level={3}>{project.name}</Title>
                  </Space>

                  <Space className="project-show__header-meta" wrap split={<Divider type="vertical" />}>
                    <span>{getUserLabel(project.project_manager || project.projectManager)}</span>
                    <span>
                      <CalendarOutlined /> {formatDate(project.start_date)} to {formatDate(project.end_date)}
                    </span>
                  </Space>
                </div>

                <StatusTag value={project.status} />
                <ActiveTag value={project.active} />
              </Space>

              <Space className="project-show__header-actions" wrap>
                <Button icon={<EditOutlined />} onClick={openProjectEditor}>
                  Edit Project
                </Button>

                <Button type="primary" icon={<PlusOutlined />} onClick={() => openChildEditor('task')}>
                  Add Task
                </Button>
              </Space>
            </Flex>

            {project.active === false ? (
              <Alert
                showIcon
                type="warning"
                message="This project is inactive."
                style={{ marginBottom: token.margin }}
                action={(
                  <Button
                    type="primary"
                    onClick={() => updateProjectStatus({ active: true }, 'Project activated.')}
                  >
                    Make Active
                  </Button>
                )}
              />
            ) : null}

            <Row gutter={[12, 12]} style={{ marginBottom: token.margin }}>
              <Col xs={24} sm={12} lg={6} xl={3}>
                <WorkCard label="Total Tasks" value={tasks.length} icon={<UnorderedListOutlined />} />
              </Col>

              <Col xs={24} sm={12} lg={6} xl={3}>
                <WorkCard label="Completed" value={completedTasks.length} icon={<CheckCircleOutlined />} />
              </Col>

              <Col xs={24} sm={12} lg={6} xl={3}>
                <WorkCard label="In Progress" value={inProgressTasks.length} icon={<ClockCircleOutlined />} />
              </Col>

              <Col xs={24} sm={12} lg={6} xl={3}>
                <WorkCard label="Overdue" value={overdueTasks.length} icon={<ExclamationCircleOutlined />} />
              </Col>

              <Col xs={24} sm={12} lg={6} xl={3}>
                <WorkCard label="Team Members" value={teamMembers.length} icon={<TeamOutlined />} />
              </Col>

              <Col xs={24} sm={12} lg={6} xl={3}>
                <WorkCard label="Milestones" value={milestones.length} icon={<FlagOutlined />} />
              </Col>

              <Col xs={24} lg={12} xl={6}>
                <WorkCard label="Project Progress" value={`${progressPercent}%`} icon={<ProjectOutlined />}>
                  <Progress type="circle" size={52} percent={progressPercent} />
                </WorkCard>
              </Col>
            </Row>

            <div className="project-show__surface">
              <Tabs
                className="project-show__tabs"
                defaultActiveKey="board"
                items={[
                  {
                    key: 'board',
                    label: 'Board',
                    children: boardTab,
                  },
                  {
                    key: 'milestones',
                    label: 'Milestones',
                    children: milestoneTab,
                  },
                  {
                    key: 'team',
                    label: 'Team',
                    children: teamTab,
                  },
                  {
                    key: 'tasks',
                    label: 'All Tasks',
                    children: (
                      <Card
                        bordered={false}
                        extra={(
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openChildEditor('task')}
                          >
                            Add Task
                          </Button>
                        )}
                      >
                        <Table
                          size="small"
                          rowKey="id"
                          pagination={{ pageSize: 10 }}
                          dataSource={tasks}
                          columns={tableColumns.tasks}
                          scroll={{ x: 1100 }}
                        />
                      </Card>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    children: statusTab,
                  },
                  {
                    key: 'details',
                    label: 'Details',
                    children: detailsTab,
                  },
                ]}
              />
            </div>
          </>
        )}
      </div>

      <Drawer
        title={selectedTaskFresh?.name || 'Task'}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        width={520}
        extra={selectedTaskFresh ? (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => openChildEditor('task', selectedTaskFresh)}
            >
              Edit Task
            </Button>

            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteChild('task', selectedTaskFresh)}
            >
              Delete
            </Button>
          </Space>
        ) : null}
        styles={{ body: { padding: token.paddingLG } }}
      >
        {selectedTaskFresh ? (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Space wrap>
              {getTaskStatus(selectedTaskFresh)?.name ? (
                <Tag color={getTaskStatus(selectedTaskFresh)?.color || 'blue'}>
                  {getTaskStatus(selectedTaskFresh)?.name}
                </Tag>
              ) : null}

              {selectedTaskFresh.priority?.name ? (
                <Tag color={selectedTaskFresh.priority.color || 'default'}>
                  {selectedTaskFresh.priority.name}
                </Tag>
              ) : null}

              {selectedTaskFresh.milestone?.name ? (
                <Tag icon={<FlagOutlined />}>{selectedTaskFresh.milestone.name}</Tag>
              ) : null}

              <ActiveTag value={selectedTaskFresh.active} />

              {isOverdueTask(selectedTaskFresh) ? (
                <Tag color="red" icon={<ExclamationCircleOutlined />}>Overdue</Tag>
              ) : null}
            </Space>

            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="Start date">
                {formatDate(selectedTaskFresh.start_date)}
              </Descriptions.Item>

              <Descriptions.Item label="End date">
                {formatDate(selectedTaskFresh.end_date)}
              </Descriptions.Item>

              <Descriptions.Item label="Completion time">
                {selectedTaskFresh.completion_time ?? '-'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text type="secondary">Assignees</Text>

              <div style={{ marginTop: token.marginXS }}>
                <Avatar.Group max={{ count: 5 }}>
                  {getTaskAssignees(selectedTaskFresh).map((assignee) => (
                    <Tooltip key={assignee.id} title={getUserLabel(assignee.user)}>
                      <Avatar>{getInitials(assignee.user)}</Avatar>
                    </Tooltip>
                  ))}
                </Avatar.Group>
              </div>
            </div>

            <div>
              <Text type="secondary">Description</Text>

              <Paragraph style={{ marginTop: token.marginXS, whiteSpace: 'pre-wrap' }}>
                {selectedTaskFresh.description || '-'}
              </Paragraph>
            </div>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="Edit Project"
        open={projectOpen}
        onCancel={() => setProjectOpen(false)}
        onOk={() => projectForm.submit()}
        confirmLoading={saving}
        width={760}
      >
        <Form form={projectForm} layout="vertical" onFinish={saveProject}>
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="project_manager_id" label="Project Manager" rules={[{ required: true }]}>
                <Select options={optionUsers} showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="status" label="Status">
                <Select options={PROJECT_STATUSES.map((value) => ({ label: humanize(value), value }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
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