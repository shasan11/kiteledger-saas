import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert, Avatar, Badge, Button, Card, Col, Descriptions, Divider,
  DatePicker, Drawer, Dropdown, Empty, Flex, Form, Input, InputNumber, Modal,
  Progress, Row, Select, Skeleton, Space, Switch, Table, Tabs, Tag,
  Tooltip, Typography, message, theme,
} from 'antd';
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, DeleteOutlined, EditOutlined,
  ExclamationCircleOutlined, FieldTimeOutlined, FlagOutlined,
  HolderOutlined, MoreOutlined, PlusOutlined, ProjectOutlined,
  SearchOutlined, TeamOutlined, UnorderedListOutlined, UserAddOutlined,
  MoneyCollectOutlined,
} from '@ant-design/icons';
import {
  DndContext, PointerSensor, pointerWithin, rectIntersection,
  useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
} from 'recharts';

const { Paragraph, Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const PROJECT_STATUSES  = ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED','ON_HOLD'];
const MILESTONE_STATUSES = ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED','ON_HOLD'];

const STATUS_COLORS = {
  PENDING:'default', IN_PROGRESS:'blue', COMPLETED:'green',
  CANCELLED:'red',   ON_HOLD:'orange',
};

const COMPLETED_STATUS_NAMES  = ['COMPLETED','COMPLETE','DONE','FINISHED','CLOSED','RESOLVED'];
const IN_PROGRESS_STATUS_NAMES = ['IN_PROGRESS','IN PROGRESS','DOING','STARTED','ACTIVE'];

const childMeta = {
  milestone:  { title:'Milestone',     endpoint:'/api/hrm/milestones' },
  taskStatus: { title:'Task Status',   endpoint:'/api/hrm/task-statuses' },
  task:       { title:'Task',          endpoint:'/api/hrm/tasks' },
  team:       { title:'Project Team',  endpoint:'/api/hrm/project-teams' },
  teamMember: { title:'Team Member',   endpoint:'/api/hrm/project-team-members' },
  assignee:   { title:'Task Assignee', endpoint:'/api/hrm/assigned-tasks' },
};

const toArray = (value) => (Array.isArray(value) ? value : []);
const humanize = (value) => (value ? String(value).replace(/_/g,' ') : '-');
const normalizeText = (value) => String(value||'').replace(/[_-]/g,' ').trim().toUpperCase();
const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-');
const toDatePickerValue = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value.isValid() ? value : null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};
const toApiDate = (value) => {
  const parsed = toDatePickerValue(value);
  return parsed ? parsed.format('YYYY-MM-DD') : null;
};
const dateValue = toDatePickerValue;
const collection = (payload) => payload?.results || payload?.data || (Array.isArray(payload) ? payload : []);
const relationLabel = (record,fallback='-') => record?.name || record?.project_team_name || record?.label || fallback;
const apiErrorMessage = (error,fallback='Something went wrong.') => {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return first[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
};
const kanbanCollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length ? pointerCollisions : rectIntersection(args);
};

function getTaskStatus(task) {
  return task?.task_status || task?.taskStatus || null;
}
const statusIdOf = (task) => task?.task_status_id ?? task?.taskStatusId ?? getTaskStatus(task)?.id ?? null;
const milestoneIdOf = (task) => task?.milestone_id ?? task?.milestoneId ?? task?.milestone?.id ?? null;
const priorityIdOf = (task) => task?.priority_id ?? task?.priorityId ?? task?.priority?.id ?? null;
const statusSortValue = (status) => {
  const explicitOrder = status?.sort_order ?? status?.sortOrder ?? status?.order;
  if (explicitOrder !== null && explicitOrder !== undefined && explicitOrder !== '') return Number(explicitOrder);
  const name = String(status?.name || '');
  const stepMatch = name.match(/\bstep\s*(\d+)\b/i);
  if (stepMatch) return Number(stepMatch[1]);
  const leadingNumber = name.match(/^\s*(\d+)\b/);
  if (leadingNumber) return Number(leadingNumber[1]);
  return Number.MAX_SAFE_INTEGER;
};
const sortTaskStatuses = (statuses) => [...statuses].sort((a,b) => {
  const diff = statusSortValue(a) - statusSortValue(b);
  return diff !== 0 ? diff : String(a?.name || '').localeCompare(String(b?.name || ''));
});
const statusOrderOf = (status,fallback=0) => {
  const value = status?.sort_order ?? status?.sortOrder ?? status?.order;
  return value !== null && value !== undefined && value !== '' ? Number(value) : fallback;
};

function getTaskAssignees(task) {
  return toArray(task?.assigned_tasks || task?.assignedTasks);
}
function getUserLabel(user) {
  return user
    ? [user.first_name,user.last_name].filter(Boolean).join(' ') || user.name || user.username || user.email || `User #${user.id}`
    : '-';
}
function getInitials(user) {
  return getUserLabel(user).split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
}
const isCompletedTask = (task) => COMPLETED_STATUS_NAMES.includes(normalizeText(getTaskStatus(task)?.name));
const isInProgressTask = (task) => IN_PROGRESS_STATUS_NAMES.includes(normalizeText(getTaskStatus(task)?.name));
const isOverdueTask = (task) => Boolean(task?.end_date && dayjs(task.end_date).isBefore(dayjs(),'day') && !isCompletedTask(task));

function StatusTag({value}) {
  return <Tag color={STATUS_COLORS[value] || 'default'} style={{borderRadius:100,fontWeight:600,fontSize:11}}>{humanize(value)}</Tag>;
}
function ActiveTag({value}) {
  return <Tag color={value !== false ? 'green' : 'red'} style={{borderRadius:100,fontWeight:600,fontSize:11}}>{value !== false ? 'Active' : 'Inactive'}</Tag>;
}
function MoneyText({value}) {
  const amount = Number(value || 0);
  return <Text strong={amount !== 0} type={amount < 0 ? 'danger' : undefined}>{amount.toLocaleString('en-NP',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>;
}
function SummaryTile({label,value,icon,tone='default'}) {
  const {token} = theme.useToken();
  const toneMap = {
    success: [token.colorSuccess, token.colorSuccessBg],
    warning: [token.colorWarning, token.colorWarningBg],
    danger: [token.colorError, token.colorErrorBg],
    muted: [token.colorTextSecondary, token.colorFillAlter],
    default: [token.colorPrimary, token.colorPrimaryBg],
  };
  const [color,bg] = toneMap[tone] || toneMap.default;
  return (
    <Card size="small" bordered={false} style={{border:`1px solid ${token.colorBorderSecondary}`,borderRadius:token.borderRadiusLG,boxShadow:token.boxShadowTertiary}}>
      <Space align="start" size={token.marginSM}>
        <span style={{width:34,height:34,borderRadius:token.borderRadius,display:'inline-flex',alignItems:'center',justifyContent:'center',background:bg,color,fontSize:16}}>{icon}</span>
        <span style={{minWidth:0}}>
          <Text type="secondary" style={{display:'block',fontSize:token.fontSizeSM}}>{label}</Text>
          <span style={{display:'block',fontSize:token.fontSizeLG,fontWeight:700,lineHeight:1.2,marginTop:4}}>{value}</span>
        </span>
      </Space>
    </Card>
  );
}
function ActionMenu({onEdit,onDelete,disabled=false}) {
  return (
    <Dropdown trigger={['click']} menu={{items:[
      {key:'edit', label:'Edit', icon:<EditOutlined />, disabled, onClick:onEdit},
      {key:'delete', danger:true, label:'Delete', icon:<DeleteOutlined />, disabled, onClick:onDelete},
    ]}}>
      <Button type="text" icon={<MoreOutlined />} disabled={disabled} />
    </Dropdown>
  );
}

/* ── KanbanColumn ─────────────────────────────────────────────────────── */
function KanbanColumn({column,tasks,children,onAddTask,disabled=false}) {
  const {token} = theme.useToken();
  const {setNodeRef,isOver} = useDroppable({
    id:`column-${column.id}`,
    data:{type:'column', statusId:column.statusId, columnId:column.id},
  });
  return (
    <section ref={setNodeRef} style={{
      minWidth:288, width:288, flexShrink:0,
      background: token.colorBgLayout,
      border: `1px solid ${isOver ? token.colorPrimary : token.colorBorderSecondary}`,
      borderRadius: token.borderRadiusLG,
      display:'flex', flexDirection:'column',
      boxShadow: isOver ? token.boxShadow : 'none',
      transition:'border-color .2s, box-shadow .2s',
    }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding: `${token.paddingSM}px ${token.padding}px`,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: `${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0`,
        position:'sticky', top:0, zIndex:1,
      }}>
        <Space size={token.marginXS}>
          <span style={{width:8,height:8,borderRadius:'50%',background:column.color,display:'inline-block'}}/>
          <Text strong style={{fontSize:token.fontSizeSM+1}}>{column.name}</Text>
          <Badge count={tasks.length} style={{background:column.color,fontSize:10}}/>
        </Space>
        <Tooltip title={`Add task to ${column.name}`}>
          <Button size="small" type="text" icon={<PlusOutlined />} disabled={disabled} onClick={()=>onAddTask(column.id)}/>
        </Tooltip>
      </div>

      <SortableContext items={tasks.map(t=>`task-${t.id}`)} strategy={verticalListSortingStrategy}>
        <div style={{
          flex:1, minHeight:200, overflowY:'auto',
          padding:token.paddingSM,
          display:'flex', flexDirection:'column', gap:token.marginSM,
        }}>
          {tasks.length ? children : (
            <div style={{display:'grid',placeItems:'center',minHeight:120}}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks"/>
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

/* ── TaskCard ─────────────────────────────────────────────────────────── */
function TaskCard({task,onOpen,dragDisabled=false}) {
  const {token} = theme.useToken();
  const status    = getTaskStatus(task);
  const assignees = getTaskAssignees(task);
  const overdue   = isOverdueTask(task);
  const accent    = status?.color||task?.priority?.color||token.colorPrimary;

  const {attributes,listeners,setNodeRef,transform,transition,isDragging} = useSortable({
    id:`task-${task.id}`,
    disabled:dragDisabled,
    data:{type:'task', taskId:task.id, statusId:statusIdOf(task)?String(statusIdOf(task)):null},
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:CSS.Transform.toString(transform), transition,
        background: token.colorBgContainer,
        border: `1px solid ${overdue ? token.colorError : token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        cursor:'pointer', position:'relative', overflow:'hidden', display:'flex',
        opacity: isDragging ? .7 : 1,
        boxShadow: isDragging ? token.boxShadow : token.boxShadowTertiary,
        transition:'box-shadow .2s, transform .15s, border-color .2s',
      }}
      onClick={onOpen}
      onMouseEnter={e=>{ if(!isDragging){e.currentTarget.style.boxShadow=token.boxShadow; e.currentTarget.style.transform='translateY(-1px)';}}}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow=token.boxShadowTertiary; e.currentTarget.style.transform='';}}
    >
      {/* left accent bar */}
      <div style={{width:3,flexShrink:0,background:accent,borderRadius:`${token.borderRadiusLG}px 0 0 ${token.borderRadiusLG}px`}}/>
      <div style={{flex:1,padding:`${token.paddingSM}px ${token.paddingSM}px ${token.paddingXS}px`,minWidth:0}}>
        <Flex align="start" justify="space-between" gap={token.marginXS}>
          <Space size={token.marginXXS} align="start">
            <Button type="text" size="small" icon={<HolderOutlined />} disabled={dragDisabled}
              style={{color:token.colorTextTertiary, cursor:'grab', flexShrink:0}}
              {...(!dragDisabled?attributes:{})} {...(!dragDisabled?listeners:{})}
              onClick={e=>e.stopPropagation()}
            />
            <Text strong style={{fontSize:token.fontSize, lineHeight:1.35}}>{task.name}</Text>
          </Space>
          <ActiveTag value={task.active}/>
        </Flex>

        <Space wrap size={[token.marginXXS,token.marginXXS]} style={{marginTop:token.marginXS}}>
          {task?.priority?.name && <Tag color={task.priority.color||'default'} style={{borderRadius:100,fontSize:10,margin:0}}>{task.priority.name}</Tag>}
          {task?.milestone?.name && <Tag icon={<FlagOutlined />} style={{borderRadius:100,fontSize:10,margin:0}}>{task.milestone.name}</Tag>}
          {overdue && <Tag color="error" icon={<ExclamationCircleOutlined />} style={{borderRadius:100,fontSize:10,margin:0}}>Overdue</Tag>}
        </Space>

        {task.description && (
          <Paragraph type="secondary" ellipsis={{rows:2}} style={{fontSize:token.fontSizeSM, margin:`${token.marginXS}px 0 0`}}>
            {task.description}
          </Paragraph>
        )}

        <Flex align="center" justify="space-between" style={{marginTop:token.marginXS}}>
          <Space size={token.marginXXS}>
            <CalendarOutlined style={{fontSize:11, color:token.colorTextTertiary}}/>
            <Text type={overdue?'danger':'secondary'} style={{fontSize:token.fontSizeSM}}>{formatDate(task.end_date)}</Text>
          </Space>
          <Avatar.Group max={{count:3}} size={22}>
            {assignees.map(a=>(
              <Tooltip key={a.id} title={getUserLabel(a.user)}>
                <Avatar size={22} style={{fontSize:10, background:token.colorPrimary}}>{getInitials(a.user)}</Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        </Flex>

        {task.completion_time!=null && (
          <Text type="secondary" style={{display:'block', fontSize:token.fontSizeSM, marginTop:token.marginXXS}}>
            <FieldTimeOutlined /> {task.completion_time}h
          </Text>
        )}
      </div>
    </div>
  );
}

/* ── Charts (token-aware) ─────────────────────────────────────────────── */
function useChartColors() {
  const {token} = theme.useToken();
  return [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorError,
    token.colorInfo,
    token.colorTextSecondary,
  ];
}

function TaskStatusPie({taskStatuses,tasks}) {
  const {token} = theme.useToken();
  const colors = useChartColors();
  const data = taskStatuses.map((s,i)=>({
    name:s.name,
    value:tasks.filter(t=>String(statusIdOf(t))===String(s.id)).length,
    color:s.color||colors[i%colors.length],
  })).filter(d=>d.value>0);

  if (!data.length) return <Empty description="No data" style={{padding:`${token.paddingLG}px 0`}}/>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3} dataKey="value">
          {data.map((e,i)=><Cell key={i} fill={e.color}/>)}
        </Pie>
        <ReTooltip contentStyle={{background:token.colorBgElevated, border:`1px solid ${token.colorBorder}`, borderRadius:token.borderRadius, color:token.colorText, fontSize:token.fontSizeSM}}/>
        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:token.fontSizeSM, color:token.colorText}}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

function WorkloadBar({workload}) {
  const {token} = theme.useToken();
  const data = workload.slice(0,8).map(w=>({
    name: getUserLabel(w.user).split(' ')[0],
    Total:     w.total,
    Completed: w.completed,
    Overdue:   w.overdue,
  }));
  if (!data.length) return <Empty description="No workload data" style={{padding:`${token.paddingLG}px 0`}}/>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={13} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} vertical={false}/>
        <XAxis dataKey="name" tick={{fontSize:token.fontSizeSM, fill:token.colorTextSecondary}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:token.fontSizeSM, fill:token.colorTextSecondary}} axisLine={false} tickLine={false} allowDecimals={false}/>
        <ReTooltip contentStyle={{background:token.colorBgElevated, border:`1px solid ${token.colorBorder}`, borderRadius:token.borderRadius, color:token.colorText, fontSize:token.fontSizeSM}}
          cursor={{fill:token.colorFillAlter}}/>
        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:token.fontSizeSM, color:token.colorText}}/>
        <Bar dataKey="Total"     fill={token.colorPrimary}        radius={[token.borderRadiusSM,token.borderRadiusSM,0,0]}/>
        <Bar dataKey="Completed" fill={token.colorSuccess}        radius={[token.borderRadiusSM,token.borderRadiusSM,0,0]}/>
        <Bar dataKey="Overdue"   fill={token.colorError}          radius={[token.borderRadiusSM,token.borderRadiusSM,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MilestoneBar({milestones,tasks}) {
  const {token} = theme.useToken();
  const data = milestones.map(m=>{
    const rel  = tasks.filter(t=>String(milestoneIdOf(t))===String(m.id));
    const done = rel.filter(isCompletedTask).length;
    return {name:m.name.length>14?m.name.slice(0,12)+'…':m.name, Progress:rel.length?Math.round(done/rel.length*100):0};
  });
  if (!data.length) return <Empty description="No milestones" style={{padding:`${token.paddingLG}px 0`}}/>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} horizontal={false}/>
        <XAxis type="number" domain={[0,100]} tick={{fontSize:token.fontSizeSM, fill:token.colorTextSecondary}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
        <YAxis type="category" dataKey="name" tick={{fontSize:token.fontSizeSM, fill:token.colorTextSecondary}} axisLine={false} tickLine={false} width={90}/>
        <ReTooltip formatter={v=>`${v}%`} contentStyle={{background:token.colorBgElevated, border:`1px solid ${token.colorBorder}`, borderRadius:token.borderRadius, color:token.colorText, fontSize:token.fontSizeSM}}
          cursor={{fill:token.colorFillAlter}}/>
        <Bar dataKey="Progress" radius={[0,token.borderRadiusSM,token.borderRadiusSM,0]} fill={token.colorPrimary}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProgressRadial({percent,health}) {
  const {token} = theme.useToken();
  const fill = health.color==='green' ? token.colorSuccess
             : health.color==='red'   ? token.colorError
             : token.colorWarning;
  const data = [{name:'Progress', value:percent, fill}];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
        <RadialBar dataKey="value" cornerRadius={token.borderRadius} background={{fill:token.colorFillTertiary}}/>
        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle"
          style={{fontSize:token.fontSizeHeading2, fontWeight:800, fill}}>
          {percent}%
        </text>
        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
          style={{fontSize:token.fontSizeSM, fill:token.colorTextSecondary, fontWeight:600}}>
          {health.label}
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════ */
export default function ProjectShow({auth,id}) {
  const {token} = theme.useToken();

  const [project,setProject]         = useState(null);
  const [localTasks,setLocalTasks]   = useState([]);
  const [loading,setLoading]         = useState(true);
  const [users,setUsers]             = useState([]);
  const [priorities,setPriorities]   = useState([]);
  const [projectOpen,setProjectOpen] = useState(false);
  const [childOpen,setChildOpen]     = useState(false);
  const [childType,setChildType]     = useState(null);
  const [editingChild,setEditingChild] = useState(null);
  const [saving,setSaving]           = useState(false);
  const [selectedMilestone,setSelectedMilestone] = useState('all');
  const [searchText,setSearchText]   = useState('');
  const [priorityFilter,setPriorityFilter] = useState();
  const [assigneeFilter,setAssigneeFilter] = useState();
  const [selectedTask,setSelectedTask] = useState(null);
  const [financialSummary,setFinancialSummary] = useState(null);
  const [financialLoading,setFinancialLoading] = useState(false);

  const [projectForm] = Form.useForm();
  const [childForm]   = Form.useForm();

  const sensors = useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));

  /* ── derived data ───────────────────────────────────────────────── */
  const milestones   = toArray(project?.milestones);
  const taskStatuses = useMemo(()=>sortTaskStatuses(toArray(project?.task_statuses||project?.taskStatuses)),[project]);
  const tasks        = localTasks;
  const projectInactive = project?.active===false;
  const hasTaskStatuses = taskStatuses.length>0;
  const teams       = toArray(project?.project_teams||project?.projectTeams);
  const teamMembers = teams.flatMap(team=>toArray(team.project_team_members||team.projectTeamMembers).map(m=>({...m,team})));
  const assignees   = tasks.flatMap(task=>getTaskAssignees(task).map(a=>({...a,task})));
  const earnings = financialSummary?.earnings || {};
  const costs = financialSummary?.costs || {};

  const completedTasks  = tasks.filter(isCompletedTask);
  const inProgressTasks = tasks.filter(isInProgressTask);
  const overdueTasks    = tasks.filter(isOverdueTask);
  const progressPercent = tasks.length ? Math.round(completedTasks.length/tasks.length*100) : 0;
  const daysToDeadline = project?.end_date ? dayjs(project.end_date).diff(dayjs(),'day') : null;
  const deadlineSummary = daysToDeadline === null
    ? {label:'No deadline', tone:'muted'}
    : daysToDeadline < 0
      ? {label:`${Math.abs(daysToDeadline)} days overdue`, tone:'danger'}
      : {label:daysToDeadline === 0 ? 'Due today' : `${daysToDeadline} days left`, tone:daysToDeadline <= 7 ? 'warning' : 'default'};
  const currentUserId   = auth?.user?.id;
  const myTasks = currentUserId
    ? tasks.filter(t=>getTaskAssignees(t).some(a=>String(a.user_id||a.user?.id)===String(currentUserId)))
    : [];

  const projectHealth = (()=>{
    const done      = normalizeText(project?.status)==='COMPLETED';
    const overdue   = project?.end_date&&dayjs(project.end_date).isBefore(dayjs(),'day')&&!done;
    const dueSoon   = project?.end_date&&dayjs(project.end_date).diff(dayjs(),'day')<=7&&!done;
    if (overdue) return {label:'Delayed',  color:'red'};
    if (overdueTasks.length||dueSoon) return {label:'At Risk', color:'orange'};
    if (progressPercent>70) return {label:'On Track', color:'green'};
    return {label:'At Risk', color:'orange'};
  })();

  /* select options */
  const optionUsers       = users.map(u=>({label:getUserLabel(u),value:u.id}));
  const optionPriorities  = priorities.map(p=>({label:p.name,value:p.id}));
  const optionMilestones  = milestones.map(m=>({label:m.name,value:m.id}));
  const optionTaskStatuses= taskStatuses.map(s=>({label:s.name,value:s.id}));
  const optionTeams       = teams.map(t=>({label:t.project_team_name,value:t.id}));
  const optionTasks       = tasks.map(t=>({label:t.name,value:t.id}));
  const assigneeOptions   = useMemo(()=>{
    const byId=new Map();
    assignees.forEach(a=>{ const uid=a.user_id||a.user?.id; if(uid) byId.set(uid,{label:getUserLabel(a.user),value:uid}); });
    return Array.from(byId.values());
  },[assignees]);

  const workload = useMemo(()=>{
    const byUser=new Map();
    tasks.forEach(task=>getTaskAssignees(task).forEach(a=>{
      const user=a.user, uid=a.user_id||user?.id;
      if(!uid) return;
      if(!byUser.has(uid)) byUser.set(uid,{user,total:0,completed:0,overdue:0});
      const row=byUser.get(uid);
      row.total++;
      if(isCompletedTask(task))  row.completed++;
      if(isOverdueTask(task))    row.overdue++;
    }));
    return Array.from(byUser.values());
  },[tasks]);

  /* ── API ────────────────────────────────────────────────────────── */
  const loadProject = async () => {
    setLoading(true);
    try {
      const {data} = await axios.get(api(`/api/hrm/projects/${id}`));
      setProject(data); setLocalTasks(toArray(data?.tasks));
    } catch(e) { message.error(apiErrorMessage(e,'Unable to load project.')); }
    finally    { setLoading(false); }
  };
  const loadFinancialSummary = async () => {
    setFinancialLoading(true);
    try {
      const {data} = await axios.get(api(`/api/hrm/projects/${id}/financial-summary`));
      setFinancialSummary(data);
    } catch(e) { message.error(apiErrorMessage(e,'Unable to load project financials.')); }
    finally    { setFinancialLoading(false); }
  };
  const loadLookups = async () => {
    const [u,p] = await Promise.all([
      axios.get(api('/api/hrm/users'),{params:{page_size:100}}),
      axios.get(api('/api/hrm/priorities'),{params:{page_size:100}}),
    ]);
    setUsers(collection(u.data)); setPriorities(collection(p.data));
  };
  useEffect(()=>{ loadProject(); loadFinancialSummary(); loadLookups().catch(e=>message.error(apiErrorMessage(e,'Unable to load lookups.'))); },[id]);

  /* ── kanban columns ─────────────────────────────────────────────── */
  const columnsForBoard = useMemo(()=>taskStatuses.map(s=>({
    id:String(s.id), statusId:s.id, name:s.name, color:s.color||token.colorPrimary,
  })),[taskStatuses,token.colorPrimary]);

  const filteredTasks = useMemo(()=>{
    const q=searchText.trim().toLowerCase();
    return tasks.filter(task=>{
      const aids=getTaskAssignees(task).map(a=>a.user_id||a.user?.id);
      return (selectedMilestone==='all'||String(milestoneIdOf(task))===String(selectedMilestone))
          && (!q||[task.name,task.description].filter(Boolean).join(' ').toLowerCase().includes(q))
          && (!priorityFilter||String(priorityIdOf(task))===String(priorityFilter))
          && (!assigneeFilter||aids.map(String).includes(String(assigneeFilter)));
    });
  },[tasks,selectedMilestone,searchText,priorityFilter,assigneeFilter]);

  const tasksByColumn = useMemo(()=>{
    const g=new Map(columnsForBoard.map(c=>[c.id,[]]));
    filteredTasks.forEach(task=>{
      const k=statusIdOf(task)?String(statusIdOf(task)):null;
      if(k&&g.has(k)) g.get(k).push(task);
    });
    g.forEach((items,key)=>g.set(key,items.sort((a,b)=>(Number(a.sort_order??0)-Number(b.sort_order??0))||String(a.created_at||'').localeCompare(String(b.created_at||'')))));
    return g;
  },[columnsForBoard,filteredTasks]);

  const selectedTaskFresh = useMemo(()=>{
    if(!selectedTask?.id) return selectedTask;
    return tasks.find(t=>t.id===selectedTask.id)||selectedTask;
  },[selectedTask,tasks]);

  /* ── project editor ─────────────────────────────────────────────── */
  const openProjectEditor = () => {
    projectForm.setFieldsValue({
      name:project?.name, project_manager_id:project?.project_manager_id,
      status:project?.status||'PENDING', start_date:dateValue(project?.start_date),
      end_date:dateValue(project?.end_date), description:project?.description, active:project?.active!==false,
    });
    setProjectOpen(true);
  };
  const saveProject = async (values) => {
    setSaving(true);
    try {
      await axios.patch(api(`/api/hrm/projects/${project.id}`),{
        ...values,
        start_date:toApiDate(values.start_date),
        end_date:toApiDate(values.end_date),
        active:values.active!==false,
      });
      message.success('Project updated.'); setProjectOpen(false); loadProject();
    } catch(e) { message.error(apiErrorMessage(e,'Unable to save project.')); }
    finally    { setSaving(false); }
  };
  const updateProjectStatus = async (values,text) => {
    setSaving(true);
    try { await axios.patch(api(`/api/hrm/projects/${project.id}`),values); message.success(text); loadProject(); }
    catch(e) { message.error(apiErrorMessage(e,'Unable to update project.')); }
    finally  { setSaving(false); }
  };
  const openProjectDocument = (type) => {
    if (!project?.id) return;
    const payload = {
      _source: 'project',
      _source_id: project.id,
      _source_no: project.name,
      project_id: project.id,
      project_id_detail: {id:project.id,name:project.name},
      reference: project.name,
      notes: `Project: ${project.name}`,
    };
    if (type === 'invoice') {
      sessionStorage.setItem('kiteledger_invoice_prefill', JSON.stringify(payload));
      router.visit(route('payment-in.invoices.add'));
      return;
    }
    sessionStorage.setItem('kiteledger_bill_prefill', JSON.stringify(payload));
    router.visit(route('payment-out.purchase-bills.add'));
  };

  /* ── task-status reorder ────────────────────────────────────────── */
  const updateProjectTaskStatuses = (updater) => {
    setProject(cur=>{
      if(!cur) return cur;
      const next=updater(toArray(cur.task_statuses||cur.taskStatuses));
      return {...cur,task_statuses:next,taskStatuses:next};
    });
  };
  const moveTaskStatus = async (row,direction) => {
    if(projectInactive) return;
    const ordered=taskStatuses.map((s,i)=>({...s,sort_order:statusOrderOf(s,i+1)}));
    const ci=ordered.findIndex(s=>s.id===row.id);
    const ti=direction==='up'?ci-1:ci+1;
    if(ci<0||ti<0||ti>=ordered.length) return;
    const r=[...ordered]; const [m]=r.splice(ci,1); r.splice(ti,0,m);
    const norm=r.map((s,i)=>({...s,sort_order:i+1}));
    const prev=taskStatuses;
    updateProjectTaskStatuses(()=>norm);
    try {
      await Promise.all(norm.map(s=>axios.patch(api(`/api/hrm/task-statuses/${s.id}`),{sort_order:s.sort_order})));
      message.success('Status order updated.'); loadProject();
    } catch(e) { updateProjectTaskStatuses(()=>prev); message.error(apiErrorMessage(e,'Unable to update status order.')); }
  };

  /* ── child CRUD ─────────────────────────────────────────────────── */
  const defaultsFor = (type,overrides={}) => {
    const nextOrder=taskStatuses.length?Math.max(...taskStatuses.map((s,i)=>statusOrderOf(s,i+1)))+1:1;
    const defs={
      milestone:  {project_id:project.id,status:'PENDING',active:true},
      taskStatus: {project_id:project.id,color:token.colorPrimary,sort_order:nextOrder,active:true},
      task:       {project_id:project.id,milestone_id:milestones[0]?.id,task_status_id:taskStatuses[0]?.id,priority_id:priorities[0]?.id,completion_time:0,active:true},
      team:       {project_id:project.id,active:true},
      teamMember: {project_team_id:teams[0]?.id,active:true},
      assignee:   {task_id:tasks[0]?.id,active:true},
    };
    return defs[type]?{...defs[type],...overrides}:overrides;
  };
  const normalizeChildValues = (type,row={}) => ({
    ...row, start_date:dateValue(row.start_date), end_date:dateValue(row.end_date), active:row.active!==false,
    project_team_id:row.project_team_id||row.team?.id, task_id:row.task_id||row.task?.id,
    milestone_id:row.milestone_id||row.milestone?.id, priority_id:row.priority_id||row.priority?.id,
    task_status_id:row.task_status_id||getTaskStatus(row)?.id, sort_order:row.sort_order??row.sortOrder??row.order,
  });
  const openChildEditor = (type,row=null,overrides={}) => {
    if(projectInactive){message.warning('Make the project active first.');return;}
    if(type==='task'&&!hasTaskStatuses){message.warning('Create a task status first.');return;}
    setChildType(type); setEditingChild(row);
    childForm.setFieldsValue(row?normalizeChildValues(type,row):defaultsFor(type,overrides));
    setChildOpen(true);
  };
  const openTaskForStatus = (statusId) => openChildEditor('task',null,{
    task_status_id:statusId,
    milestone_id:selectedMilestone!=='all'?selectedMilestone:milestones[0]?.id,
  });
  const saveChild = async (values) => {
    const meta=childMeta[childType]; if(!meta) return;
    setSaving(true);
    try {
      const payload={...values,active:values.active!==false};
      if(['milestone','taskStatus','task','team'].includes(childType)) payload.project_id=project.id;
      if(['milestone','task'].includes(childType)) {
        payload.start_date = toApiDate(payload.start_date);
        payload.end_date = toApiDate(payload.end_date);
      }
      Object.keys(payload).forEach(k=>{if(payload[k]==='')payload[k]=null;});
      const url=editingChild?`${meta.endpoint}/${editingChild.id}`:meta.endpoint;
      await axios[editingChild?'patch':'post'](api(url),payload);
      message.success(`${meta.title} saved.`); setChildOpen(false);
      if(childType==='task'&&selectedTask?.id===editingChild?.id) setSelectedTask(null);
      loadProject();
    } catch(e) { message.error(apiErrorMessage(e,`Unable to save ${meta.title.toLowerCase()}.`)); }
    finally    { setSaving(false); }
  };
  const deleteChild = (type,row) => {
    const meta=childMeta[type];
    Modal.confirm({
      title:`Delete ${meta.title}?`, content:'This removes the record from the project.',
      okText:'Delete', okButtonProps:{danger:true},
      onOk:async()=>{
        try {
          await axios.delete(api(`${meta.endpoint}/${row.id}`));
          message.success(`${meta.title} deleted.`);
          if(type==='task'&&selectedTask?.id===row.id) setSelectedTask(null);
          loadProject();
        } catch(e) { message.error(apiErrorMessage(e,`Unable to delete ${meta.title.toLowerCase()}.`)); throw e; }
      },
    });
  };

  /* ── drag-and-drop ──────────────────────────────────────────────── */
  const resolveDropStatusId = (over) => {
    if(!over) return null;
    const d=over.data?.current;
    if(d?.type==='column') return d.statusId?String(d.statusId):null;
    if(d?.type==='task')   { const t=tasks.find(x=>String(x.id)===String(d.taskId)); return statusIdOf(t)?String(statusIdOf(t)):null; }
    const iv=String(over.id||'');
    if(iv.startsWith('column-')) return iv.replace('column-','');
    if(iv.startsWith('task-'))   { const t=tasks.find(x=>String(x.id)===String(iv.replace('task-',''))); return statusIdOf(t)?String(statusIdOf(t)):null; }
    return null;
  };
  const handleDragEnd = async ({active,over}) => {
    if(projectInactive||!over) return;
    const taskId=String(active.id).replace('task-','');
    const task=tasks.find(t=>String(t.id)===String(taskId)); if(!task) return;
    const targetStatus=resolveDropStatusId(over); if(!targetStatus) return;
    const oldId=statusIdOf(task)?String(statusIdOf(task)):null;
    const newStatus=taskStatuses.find(s=>String(s.id)===String(targetStatus));
    if(!newStatus){message.error('Invalid target status.');return;}
    const prev=tasks;
    const targetColumnTasks = tasks
      .filter(t=>String(statusIdOf(t))===String(targetStatus)&&String(t.id)!==String(taskId))
      .sort((a,b)=>(Number(a.sort_order??0)-Number(b.sort_order??0))||String(a.created_at||'').localeCompare(String(b.created_at||'')));
    const overTaskId = String(over.id||'').startsWith('task-') ? String(over.id).replace('task-','') : null;
    const insertAt = overTaskId ? Math.max(targetColumnTasks.findIndex(t=>String(t.id)===String(overTaskId)),0) : targetColumnTasks.length;
    const reordered = [...targetColumnTasks];
    reordered.splice(insertAt,0,{...task,task_status_id:newStatus.id,taskStatusId:newStatus.id,task_status:newStatus,taskStatus:newStatus});
    const orderMap = new Map(reordered.map((t,i)=>[String(t.id),i+1]));
    if(oldId===targetStatus && Number(task.sort_order||0)===Number(orderMap.get(String(taskId)))) return;
    setLocalTasks(cur=>cur.map(t=>{
      if(orderMap.has(String(t.id))) {
        return {...t,sort_order:orderMap.get(String(t.id)),task_status_id:newStatus.id,taskStatusId:newStatus.id,task_status:newStatus,taskStatus:newStatus};
      }
      return t;
    }));
    try {
      await Promise.all(reordered.map((t,i)=>axios.patch(api(`/api/hrm/tasks/${t.id}`),{
        task_status_id:newStatus.id,
        sort_order:i+1,
      })));
      message.success('Task order updated.');
    } catch(e) { setLocalTasks(prev); message.error(apiErrorMessage(e,'Unable to move task.')); }
  };

  /* ── milestone progress ─────────────────────────────────────────── */
  const milestoneProgress = (m) => {
    const rel=tasks.filter(t=>String(milestoneIdOf(t))===String(m.id));
    return rel.length?Math.round(rel.filter(isCompletedTask).length/rel.length*100):0;
  };

  /* ── table column definitions ───────────────────────────────────── */
  const tableColumns = useMemo(()=>({
    milestones:[
      {title:'Name',dataIndex:'name',render:v=><Text strong>{v}</Text>},
      {title:'Start',dataIndex:'start_date',width:120,render:formatDate},
      {title:'End',dataIndex:'end_date',width:120,render:formatDate},
      {title:'Tasks',width:80,render:(_,row)=>tasks.filter(t=>String(milestoneIdOf(t))===String(row.id)).length},
      {title:'Status',dataIndex:'status',width:130,render:v=><StatusTag value={v}/>},
      {title:'',width:56,render:(_,row)=><ActionMenu onEdit={()=>openChildEditor('milestone',row)} onDelete={()=>deleteChild('milestone',row)} disabled={projectInactive}/>},
    ],
    statuses:[
      {title:'Order',dataIndex:'sort_order',width:170,render:(v,row,i)=>(
        <Space size={token.marginXXS}>
          <Tag icon={<HolderOutlined />} style={{borderRadius:token.borderRadius}}>{v??i+1}</Tag>
          <Button size="small" onClick={()=>moveTaskStatus(row,'up')}   disabled={projectInactive||i===0}>↑</Button>
          <Button size="small" onClick={()=>moveTaskStatus(row,'down')} disabled={projectInactive||i===taskStatuses.length-1}>↓</Button>
        </Space>
      )},
      {title:'Name',dataIndex:'name',render:(v,row)=><Tag color={row.color||'blue'} style={{borderRadius:100}}>{v}</Tag>},
      {title:'Color',dataIndex:'color',width:110,render:v=>v?<Space><span style={{display:'inline-block',width:14,height:14,borderRadius:'50%',background:v,verticalAlign:'middle'}}/>{v}</Space>:'-'},
      {title:'Active',dataIndex:'active',width:100,render:v=><ActiveTag value={v}/>},
      {title:'',width:56,render:(_,row)=><ActionMenu onEdit={()=>openChildEditor('taskStatus',row)} onDelete={()=>deleteChild('taskStatus',row)} disabled={projectInactive}/>},
    ],
    tasks:[
      {title:'Task',dataIndex:'name',render:v=><Text strong>{v}</Text>},
      {title:'Milestone',render:(_,row)=>relationLabel(row.milestone)},
      {title:'Priority',render:(_,row)=>row.priority?.name?<Tag color={row.priority.color||'default'} style={{borderRadius:100}}>{row.priority.name}</Tag>:'-'},
      {title:'Status',render:(_,row)=>getTaskStatus(row)?.name?<Tag color={getTaskStatus(row)?.color||'blue'} style={{borderRadius:100}}>{getTaskStatus(row)?.name}</Tag>:'-'},
      {title:'Assignees',render:(_,row)=>(
        <Avatar.Group max={{count:3}}>{getTaskAssignees(row).map(a=><Tooltip key={a.id} title={getUserLabel(a.user)}><Avatar size="small" style={{background:token.colorPrimary}}>{getInitials(a.user)}</Avatar></Tooltip>)}</Avatar.Group>
      )},
      {title:'Start',dataIndex:'start_date',width:120,render:formatDate},
      {title:'Due',dataIndex:'end_date',width:120,render:(v,row)=><Text type={isOverdueTask(row)?'danger':undefined}>{formatDate(v)}</Text>},
      {title:'Active',dataIndex:'active',width:100,render:v=><ActiveTag value={v}/>},
      {title:'',width:56,render:(_,row)=><ActionMenu onEdit={()=>openChildEditor('task',row)} onDelete={()=>deleteChild('task',row)} disabled={projectInactive}/>},
    ],
    teams:[
      {title:'Team',dataIndex:'project_team_name',render:v=><Text strong>{v}</Text>},
      {title:'Members',width:100,render:(_,row)=>toArray(row.project_team_members||row.projectTeamMembers).length},
      {title:'Active',dataIndex:'active',width:100,render:v=><ActiveTag value={v}/>},
      {title:'',width:56,render:(_,row)=><ActionMenu onEdit={()=>openChildEditor('team',row)} onDelete={()=>deleteChild('team',row)} disabled={projectInactive}/>},
    ],
    teamMembers:[
      {title:'Member',render:(_,row)=><Text strong>{getUserLabel(row.user)}</Text>},
      {title:'Team',render:(_,row)=>row.team?.project_team_name||'-'},
      {title:'Active',dataIndex:'active',width:100,render:v=><ActiveTag value={v}/>},
      {title:'',width:56,render:(_,row)=><ActionMenu onEdit={()=>openChildEditor('teamMember',row)} onDelete={()=>deleteChild('teamMember',row)} disabled={projectInactive}/>},
    ],
    assignees:[
      {title:'Task',render:(_,row)=>row.task?.name||'-'},
      {title:'Assignee',render:(_,row)=><Text strong>{getUserLabel(row.user)}</Text>},
      {title:'Active',dataIndex:'active',width:100,render:v=><ActiveTag value={v}/>},
      {title:'',width:56,render:(_,row)=><ActionMenu onEdit={()=>openChildEditor('assignee',row)} onDelete={()=>deleteChild('assignee',row)} disabled={projectInactive}/>},
    ],
  }),[tasks,teams,taskStatuses,projectInactive,token]);

  /* ── child form fields ──────────────────────────────────────────── */
  const renderChildFields = () => {
    if(childType==='milestone') return(<>
      <Form.Item name="name" label="Name" rules={[{required:true}]}><Input/></Form.Item>
      <Row gutter={token.margin}><Col span={12}><Form.Item name="start_date" label="Start Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} format="YYYY-MM-DD"/></Form.Item></Col><Col span={12}><Form.Item name="end_date" label="End Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} format="YYYY-MM-DD"/></Form.Item></Col></Row>
      <Form.Item name="status" label="Status"><Select options={MILESTONE_STATUSES.map(v=>({label:humanize(v),value:v}))}/></Form.Item>
      <Form.Item name="description" label="Description"><Input.TextArea rows={3}/></Form.Item>
      <Form.Item name="active" label="Active" valuePropName="checked"><Switch/></Form.Item>
    </>);
    if(childType==='taskStatus') return(<>
      <Form.Item name="name" label="Name" rules={[{required:true}]}><Input/></Form.Item>
      <Row gutter={token.margin}><Col xs={24} md={12}><Form.Item name="color" label="Color"><Input type="color"/></Form.Item></Col><Col xs={24} md={12}><Form.Item name="sort_order" label="Order" rules={[{required:true}]}><InputNumber min={0} precision={0} style={{width:'100%'}}/></Form.Item></Col></Row>
      <Form.Item name="active" label="Active" valuePropName="checked"><Switch/></Form.Item>
    </>);
    if(childType==='task') return(<>
      <Form.Item name="name" label="Name" rules={[{required:true}]}><Input/></Form.Item>
      <Row gutter={token.margin}><Col xs={24} md={8}><Form.Item name="milestone_id" label="Milestone"><Select allowClear options={optionMilestones} showSearch optionFilterProp="label"/></Form.Item></Col><Col xs={24} md={8}><Form.Item name="priority_id" label="Priority"><Select allowClear options={optionPriorities} showSearch optionFilterProp="label"/></Form.Item></Col><Col xs={24} md={8}><Form.Item name="task_status_id" label="Status" rules={[{required:true}]}><Select options={optionTaskStatuses} showSearch optionFilterProp="label"/></Form.Item></Col></Row>
      <Row gutter={token.margin}><Col xs={24} md={8}><Form.Item name="start_date" label="Start Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} format="YYYY-MM-DD"/></Form.Item></Col><Col xs={24} md={8}><Form.Item name="end_date" label="End Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} format="YYYY-MM-DD"/></Form.Item></Col><Col xs={24} md={8}><Form.Item name="completion_time" label="Completion Time"><InputNumber min={0} style={{width:'100%'}}/></Form.Item></Col></Row>
      <Form.Item name="description" label="Description"><Input.TextArea rows={3}/></Form.Item>
      <Form.Item name="active" label="Active" valuePropName="checked"><Switch/></Form.Item>
    </>);
    if(childType==='team') return(<>
      <Form.Item name="project_team_name" label="Team Name" rules={[{required:true}]}><Input/></Form.Item>
      <Form.Item name="active" label="Active" valuePropName="checked"><Switch/></Form.Item>
    </>);
    if(childType==='teamMember') return(<>
      <Form.Item name="project_team_id" label="Team" rules={[{required:true}]}><Select options={optionTeams} showSearch optionFilterProp="label"/></Form.Item>
      <Form.Item name="user_id" label="Employee" rules={[{required:true}]}><Select options={optionUsers} showSearch optionFilterProp="label"/></Form.Item>
      <Form.Item name="active" label="Active" valuePropName="checked"><Switch/></Form.Item>
    </>);
    if(childType==='assignee') return(<>
      <Form.Item name="task_id" label="Task" rules={[{required:true}]}><Select options={optionTasks} showSearch optionFilterProp="label"/></Form.Item>
      <Form.Item name="user_id" label="Employee" rules={[{required:true}]}><Select options={optionUsers} showSearch optionFilterProp="label"/></Form.Item>
      <Form.Item name="active" label="Active" valuePropName="checked"><Switch/></Form.Item>
    </>);
    return null;
  };

  /* ══ Shared inline style helpers (all token-sourced) ══════════════ */
  const cardStyle = {
    background:    token.colorBgContainer,
    border:        `1px solid ${token.colorBorderSecondary}`,
    borderRadius:  token.borderRadiusLG,
    boxShadow:     token.boxShadowTertiary,
  };
  const sectionLabel = {
    fontSize:        token.fontSizeSM,
    fontWeight:      700,
    textTransform:   'uppercase',
    letterSpacing:   '.6px',
    color:           token.colorTextSecondary,
    marginBottom:    token.marginXS,
  };

  /* ══ OVERVIEW TAB ════════════════════════════════════════════════ */
  const overviewHighlights = [
    {label:'Progress', value:`${progressPercent}%`, tone:'default', icon:<CheckCircleOutlined />},
    {label:'Tasks', value:`${completedTasks.length}/${tasks.length}`, tone:'success', icon:<UnorderedListOutlined />},
    {label:'Deadline', value:deadlineSummary.label, tone:deadlineSummary.tone, icon:<CalendarOutlined />},
    {label:'Profit / Loss', value:(Number(financialSummary?.profit_loss||0)).toLocaleString('en-NP'), tone:Number(financialSummary?.profit_loss||0) < 0 ? 'danger' : 'success', icon:<MoneyCollectOutlined />},
  ];

  const overviewTab = (
    <Space direction="vertical" size={token.margin} style={{width:'100%'}}>
      <Row gutter={[token.marginSM,token.marginSM]}>
        {overviewHighlights.map(item=>(
          <Col xs={24} sm={12} lg={6} key={item.label}>
            <SummaryTile label={item.label} value={item.value} icon={item.icon} tone={item.tone}/>
          </Col>
        ))}
      </Row>

      <Row gutter={[token.margin,token.margin]} align="stretch">
        <Col xs={24} lg={12}>
          <Card title="Project Progress" bordered={false} style={{height:'100%'}} styles={{body:{height:300,padding:token.padding},header:{fontWeight:700}}}>
            <ProgressRadial percent={progressPercent} health={projectHealth}/>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Tasks by Status" bordered={false} style={{height:'100%'}} styles={{body:{height:300,padding:token.padding},header:{fontWeight:700}}}>
            <TaskStatusPie taskStatuses={taskStatuses} tasks={tasks}/>
          </Card>
        </Col>
      </Row>

      <Row gutter={[token.margin,token.margin]} align="stretch">
        <Col xs={24} lg={12}>
          <Card title="Milestone Progress" bordered={false} style={{height:'100%'}} styles={{body:{height:300,padding:token.padding},header:{fontWeight:700}}}>
            <MilestoneBar milestones={milestones} tasks={tasks}/>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Team Workload" bordered={false} style={{height:'100%'}} styles={{body:{height:300,padding:token.padding},header:{fontWeight:700}}}>
            <WorkloadBar workload={workload}/>
          </Card>
        </Col>
      </Row>
    </Space>
  );

  /* ══ BOARD TAB ═══════════════════════════════════════════════════ */
  const boardTab = (
    <Space direction="vertical" size={token.margin} style={{width:'100%'}}>
      {/* Filters bar */}
      <Flex align="center" justify="space-between" gap={token.marginSM} wrap
        style={{borderBottom:`1px solid ${token.colorBorderSecondary}`, paddingBottom:token.paddingSM}}>
        <Space wrap size={[token.marginXXS,token.marginXXS]}>
          <Tag.CheckableTag checked={selectedMilestone==='all'} onChange={()=>setSelectedMilestone('all')}
            style={{borderRadius:100, fontWeight:600, fontSize:token.fontSizeSM}}>All</Tag.CheckableTag>
          {milestones.map(m=>(
            <Tag.CheckableTag key={m.id} checked={String(selectedMilestone)===String(m.id)} onChange={()=>setSelectedMilestone(m.id)}
              style={{borderRadius:100, fontWeight:600, fontSize:token.fontSizeSM}}>{m.name}</Tag.CheckableTag>
          ))}
        </Space>
        <Space wrap size={token.marginSM}>
          <Input allowClear prefix={<SearchOutlined />} placeholder="Search tasks…" value={searchText}
            onChange={e=>setSearchText(e.target.value)} style={{width:220, borderRadius:token.borderRadiusLG}}/>
          <Select allowClear placeholder="Priority" options={optionPriorities} value={priorityFilter} onChange={setPriorityFilter} style={{width:140}}/>
          <Select allowClear placeholder="Assignee" options={assigneeOptions} value={assigneeFilter} onChange={setAssigneeFilter} style={{width:160}} showSearch optionFilterProp="label"/>
        </Space>
      </Flex>

      {columnsForBoard.length ? (
        <DndContext sensors={sensors} collisionDetection={kanbanCollisionDetection} onDragEnd={handleDragEnd}>
          <div style={{display:'flex', gap:token.marginSM, minHeight:540, maxHeight:'calc(100vh - 360px)', overflowX:'auto', overflowY:'hidden', paddingBottom:token.paddingXS}}>
            {columnsForBoard.map(col=>{
              const colTasks=tasksByColumn.get(col.id)||[];
              return (
                <KanbanColumn key={col.id} column={col} tasks={colTasks} onAddTask={openTaskForStatus} disabled={projectInactive}>
                  {colTasks.map(task=>(
                    <TaskCard key={task.id} task={task} dragDisabled={projectInactive} onOpen={()=>setSelectedTask(task)}/>
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        </DndContext>
      ) : (
        <Empty description="Create task statuses first.">
          <Button type="primary" icon={<PlusOutlined />} disabled={projectInactive} onClick={()=>openChildEditor('taskStatus')}>Add Status</Button>
        </Empty>
      )}
    </Space>
  );

  /* ══ MILESTONES TAB ══════════════════════════════════════════════ */
  const milestoneTab = (
    <Space direction="vertical" size={token.margin} style={{width:'100%'}}>
      <Flex justify="end">
        <Button type="primary" icon={<PlusOutlined />} disabled={projectInactive} onClick={()=>openChildEditor('milestone')} shape="round">Add Milestone</Button>
      </Flex>

      <Row gutter={[token.margin,token.margin]}>
        {milestones.map(m=>{
          const pct=milestoneProgress(m);
          const rel=tasks.filter(t=>String(milestoneIdOf(t))===String(m.id));
          return (
            <Col xs={24} md={12} xl={8} key={m.id}>
              <div style={{...cardStyle, padding:`${token.padding}px`, transition:'box-shadow .2s'}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow=token.boxShadow}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=token.boxShadowTertiary}
              >
                <Flex justify="space-between" align="flex-start" gap={token.marginSM} style={{marginBottom:token.marginSM}}>
                  <div>
                    <Text strong style={{fontSize:token.fontSize+1}}>{m.name}</Text>
                    <div><Text type="secondary" style={{fontSize:token.fontSizeSM}}>{formatDate(m.start_date)} → {formatDate(m.end_date)}</Text></div>
                  </div>
                  <StatusTag value={m.status}/>
                </Flex>
                <Progress percent={pct} size="small" strokeColor={token.colorPrimary} trailColor={token.colorFillTertiary} style={{marginBottom:token.marginXS}}/>
                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{fontSize:token.fontSizeSM}}>{rel.length} tasks · {pct}% done</Text>
                  <ActionMenu onEdit={()=>openChildEditor('milestone',m)} onDelete={()=>deleteChild('milestone',m)} disabled={projectInactive}/>
                </Flex>
              </div>
            </Col>
          );
        })}
      </Row>

      <Table size="small" rowKey="id" dataSource={milestones} columns={tableColumns.milestones} scroll={{x:760}}/>
    </Space>
  );

  /* ══ TEAM TAB ════════════════════════════════════════════════════ */
  const teamTab = (
    <Space direction="vertical" size={token.margin} style={{width:'100%'}}>
      <Row gutter={[token.marginSM,token.marginSM]}>
        {workload.map(item=>{
          const pct=item.total?Math.round(item.completed/item.total*100):0;
          return (
            <Col xs={24} sm={12} lg={8} xl={6} key={item.user?.id}>
              <div style={{...cardStyle, padding:token.padding, display:'flex', flexDirection:'column', gap:token.marginSM,
                transition:'box-shadow .2s'}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow=token.boxShadow}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=token.boxShadowTertiary}
              >
                <Space align="center">
                  <Avatar size={40} style={{background:token.colorPrimary, fontWeight:700}}>{getInitials(item.user)}</Avatar>
                  <div>
                    <Text strong style={{fontSize:token.fontSize}}>{getUserLabel(item.user)}</Text>
                    <div><Text type="secondary" style={{fontSize:token.fontSizeSM}}>{item.total} assigned</Text></div>
                  </div>
                </Space>
                <Progress percent={pct} size="small" strokeColor={token.colorPrimary} trailColor={token.colorFillTertiary}/>
                <Space size={token.marginXS}>
                  <Tag color="success" style={{borderRadius:100}}>{item.completed} done</Tag>
                  <Tag color={item.overdue?'error':'default'} style={{borderRadius:100}}>{item.overdue} overdue</Tag>
                </Space>
              </div>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[token.margin,token.margin]}>
        <Col xs={24} xl={12}>
          <Card title={<><TeamOutlined style={{marginRight:token.marginXXS}}/> Project Teams</>}
            extra={<Button size="small" type="primary" icon={<PlusOutlined />} disabled={projectInactive} onClick={()=>openChildEditor('team')} shape="round">Add</Button>}
            bordered={false} styles={{header:{fontWeight:700}}}>
            <Table size="small" rowKey="id" pagination={false} dataSource={teams} columns={tableColumns.teams}/>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title={<><UserAddOutlined style={{marginRight:token.marginXXS}}/> Team Members</>}
            extra={<Button size="small" type="primary" icon={<PlusOutlined />} disabled={projectInactive} onClick={()=>openChildEditor('teamMember')} shape="round">Add</Button>}
            bordered={false} styles={{header:{fontWeight:700}}}>
            <Table size="small" rowKey="id" pagination={{pageSize:6}} dataSource={teamMembers} columns={tableColumns.teamMembers}/>
          </Card>
        </Col>
        <Col span={24}>
          <Card title={<><UserAddOutlined style={{marginRight:token.marginXXS}}/> Task Assignees</>}
            extra={<Button size="small" type="primary" icon={<UserAddOutlined />} disabled={projectInactive} onClick={()=>openChildEditor('assignee')} shape="round">Add</Button>}
            bordered={false} styles={{header:{fontWeight:700}}}>
            <Table size="small" rowKey="id" pagination={{pageSize:8}} dataSource={assignees} columns={tableColumns.assignees}/>
          </Card>
        </Col>
      </Row>
    </Space>
  );

  /* ══ STATUS TAB ══════════════════════════════════════════════════ */
  const statusTab = (
    <Card title="Task Statuses"
      extra={<Button type="primary" icon={<PlusOutlined />} disabled={projectInactive} onClick={()=>openChildEditor('taskStatus')} shape="round">Add Status</Button>}
      bordered={false} styles={{header:{fontWeight:700}}}>
      <Table size="small" rowKey="id" pagination={false} dataSource={taskStatuses} columns={tableColumns.statuses}/>
    </Card>
  );

  /* ══ DETAILS TAB ═════════════════════════════════════════════════ */
  const financialTab = (
    <Space direction="vertical" size={token.margin} style={{width:'100%'}}>
      <Row gutter={[token.marginSM,token.marginSM]}>
        {[
          {label:'Total Earnings',value:earnings.total},
          {label:'Total Costs',value:costs.total},
          {label:'Profit / Loss',value:financialSummary?.profit_loss},
          {label:'Invoice Balance Due',value:earnings.balance_due},
          {label:'Purchase Bill Balance Due',value:costs.balance_due},
        ].map(item=>(
          <Col xs={24} sm={12} lg={8} xl={5} key={item.label}>
            <Card size="small" bordered={false} style={{border:`1px solid ${token.colorBorderSecondary}`}}>
              <Text type="secondary" style={{display:'block',fontSize:token.fontSizeSM}}>{item.label}</Text>
              <div style={{fontSize:token.fontSizeLG,marginTop:4}}><MoneyText value={item.value}/></div>
            </Card>
          </Col>
        ))}
      </Row>
      <Card title="Linked Invoices" bordered={false} loading={financialLoading} styles={{header:{fontWeight:700}}}
        extra={<Button size="small" icon={<PlusOutlined />} onClick={()=>openProjectDocument('invoice')}>Add Invoice</Button>}>
        <Table size="small" rowKey="id" pagination={{pageSize:6}} dataSource={toArray(financialSummary?.invoices)} columns={[
          {title:'Invoice No',dataIndex:'invoice_no',render:(v,row)=><Link href={`/payment-in/invoices/${row.id}`}>{v||'-'}</Link>},
          {title:'Customer',render:(_,row)=>row.contact?.name||'-'},
          {title:'Invoice Date',dataIndex:'invoice_date',render:formatDate},
          {title:'Due Date',dataIndex:'due_date',render:formatDate},
          {title:'Status',dataIndex:'status',render:v=><Tag style={{textTransform:'capitalize'}}>{v||'-'}</Tag>},
          {title:'Total',dataIndex:'total',align:'right',render:v=><MoneyText value={v}/>},
          {title:'Paid',dataIndex:'paid_total',align:'right',render:v=><MoneyText value={v}/>},
          {title:'Balance',dataIndex:'balance_due',align:'right',render:v=><MoneyText value={v}/>},
        ]}/>
      </Card>
      <Card title="Linked Purchase Bills" bordered={false} loading={financialLoading} styles={{header:{fontWeight:700}}}
        extra={<Button size="small" icon={<PlusOutlined />} onClick={()=>openProjectDocument('bill')}>Add Bill</Button>}>
        <Table size="small" rowKey="id" pagination={{pageSize:6}} dataSource={toArray(financialSummary?.purchase_bills)} columns={[
          {title:'Bill No',dataIndex:'bill_no',render:(v,row)=><Link href={`/payment-out/purchase-bills/${row.id}`}>{v||'-'}</Link>},
          {title:'Supplier',render:(_,row)=>row.contact?.name||'-'},
          {title:'Bill Date',dataIndex:'bill_date',render:formatDate},
          {title:'Due Date',dataIndex:'due_date',render:formatDate},
          {title:'Status',dataIndex:'status',render:v=><Tag style={{textTransform:'capitalize'}}>{v||'-'}</Tag>},
          {title:'Total',dataIndex:'total',align:'right',render:v=><MoneyText value={v}/>},
          {title:'Paid',dataIndex:'paid_total',align:'right',render:v=><MoneyText value={v}/>},
          {title:'Balance',dataIndex:'balance_due',align:'right',render:v=><MoneyText value={v}/>},
        ]}/>
      </Card>
    </Space>
  );

  const detailsTab = (
    <Row gutter={[token.margin,token.margin]}>
      <Col span={24}>
        <Card title={<><ProjectOutlined style={{marginRight:token.marginXXS}}/> Project Details</>} bordered={false} styles={{header:{fontWeight:700}}}>
          <Descriptions size="small" bordered column={{xs:1,md:2}}>
            <Descriptions.Item label="Name">{project?.name}</Descriptions.Item>
            <Descriptions.Item label="Manager">{getUserLabel(project?.project_manager||project?.projectManager)}</Descriptions.Item>
            <Descriptions.Item label="Branch">{project?.branch?.name||'-'}</Descriptions.Item>
            <Descriptions.Item label="Status"><StatusTag value={project?.status}/></Descriptions.Item>
            <Descriptions.Item label="Active"><ActiveTag value={project?.active}/></Descriptions.Item>
            <Descriptions.Item label="Start Date">{formatDate(project?.start_date)}</Descriptions.Item>
            <Descriptions.Item label="End Date">{formatDate(project?.end_date)}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDate(project?.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Updated">{formatDate(project?.updated_at)}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>{project?.description||'-'}</Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
    </Row>
  );

  /* ══ RENDER ══════════════════════════════════════════════════════ */
  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={project?.name||'Project'}/>

      {/* One minimal <style> block — only structural rules that can't be expressed as inline styles */}
      <style>{`
        .ps-kanban-board::-webkit-scrollbar { height: 6px; }
        .ps-kanban-board::-webkit-scrollbar-track { background: ${token.colorFillAlter}; border-radius: ${token.borderRadius}px; }
        .ps-kanban-board::-webkit-scrollbar-thumb { background: ${token.colorBorder}; border-radius: ${token.borderRadius}px; }
        .ps-kanban-list::-webkit-scrollbar { width: 4px; }
        .ps-kanban-list::-webkit-scrollbar-thumb { background: ${token.colorBorder}; border-radius: ${token.borderRadius}px; }
        .ps-tab .ant-tabs-tab { font-weight: 600; font-size: ${token.fontSizeSM}px; }
        .ps-tab .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${token.colorPrimary} !important; }
        .ps-tab .ant-tabs-ink-bar { background: ${token.colorPrimary}; border-radius: 2px; }
        .ps-tab .ant-tabs-nav { margin-bottom: ${token.marginSM}px; }
        .ant-table-thead > tr > th {
          background: ${token.colorFillAlter} !important;
          font-weight: 700 !important;
          font-size: ${token.fontSizeSM}px !important;
          text-transform: uppercase;
          letter-spacing: .4px;
        }
        @media (max-width: 768px) {
          .ps-kanban-board { max-height: calc(100vh - 420px) !important; }
        }
      `}</style>

      <div style={{background:token.colorBgLayout, minHeight:'calc(100vh - 64px)', padding:token.padding}}>
        {loading ? <Skeleton active paragraph={{rows:14}}/> :
        !project  ? <Empty style={{paddingTop:80}} description="Project not found"/> : (
        <>
          {/* ── HEADER ───────────────────────────────────────────── */}
          <Card bordered={false} style={{...cardStyle, marginBottom:token.margin}} styles={{body:{padding:token.padding}}}>
            <Flex align="center" justify="space-between" gap={token.margin} wrap>
              <Space size={token.marginSM} align="center" wrap>
                <Link href={route('hrm.projects.index')}>
                  <Button icon={<ArrowLeftOutlined />}>Back</Button>
                </Link>
                <span style={{width:44,height:44,borderRadius:token.borderRadiusLG,display:'inline-flex',alignItems:'center',justifyContent:'center',background:token.colorPrimaryBg,color:token.colorPrimary,fontSize:20}}>
                  <ProjectOutlined />
                </span>
                <div>
                  <Space size={token.marginXS} wrap>
                    <Title level={4} style={{margin:0,lineHeight:1.2}} ellipsis={{tooltip:project.name}}>{project.name}</Title>
                  </Space>
                  <div style={{color:token.colorTextSecondary, fontSize:token.fontSizeSM, marginTop:2}}>
                    <Space size={6} split={<span style={{opacity:.35}}>|</span>}>
                      <Text type="secondary">{getUserLabel(project.project_manager||project.projectManager)}</Text>
                      {project.branch?.name&&<Text type="secondary">{project.branch.name}</Text>}
                      <Text type="secondary"><CalendarOutlined style={{marginRight:4}}/>{formatDate(project.start_date)} - {formatDate(project.end_date)}</Text>
                    </Space>
                  </div>
                </div>
                <StatusTag value={project.status}/>
                <ActiveTag value={project.active}/>
              </Space>
              <Space wrap>
                <Button icon={<EditOutlined />} onClick={openProjectEditor}>Edit Project</Button>
                <Button icon={<PlusOutlined />} onClick={()=>openProjectDocument('invoice')}>Add Invoice</Button>
                <Button icon={<PlusOutlined />} onClick={()=>openProjectDocument('bill')}>Add Bill</Button>
                <Button type="primary" icon={<PlusOutlined />}
                  disabled={projectInactive||!hasTaskStatuses}
                  onClick={()=>openChildEditor('task')}>Add Task</Button>
              </Space>
            </Flex>
          </Card>

          {/* Inactive warning */}
          {project.active===false && (
            <Alert showIcon type="warning" message="This project is inactive." style={{marginBottom:token.margin, borderRadius:token.borderRadius}}
              action={<Button type="primary" shape="round" onClick={()=>updateProjectStatus({active:true},'Project activated.')}>Activate</Button>}/>
          )}

          <div style={{...cardStyle, padding:`${token.paddingSM}px ${token.padding}px`}}>
            <Tabs className="ps-tab" defaultActiveKey="overview" items={[
              {key:'overview',   label:'Overview',   children:overviewTab},
              {key:'board',      label:'Board',       children:boardTab},
              {key:'milestones', label:'Milestones',  children:milestoneTab},
              {key:'team',       label:'Team',         children:teamTab},
              {key:'financials', label:'Financials',      children:financialTab},
              {key:'tasks',      label:'All Tasks',    children:(
                <Card bordered={false} styles={{header:{fontWeight:700}}}
                  extra={<Button type="primary" icon={<PlusOutlined />} disabled={projectInactive||!hasTaskStatuses} onClick={()=>openChildEditor('task')} shape="round">Add Task</Button>}>
                  <Table size="small" rowKey="id" pagination={{pageSize:10}} dataSource={tasks} columns={tableColumns.tasks} scroll={{x:1100}}/>
                </Card>
              )},
              {key:'my-tasks',   label:'My Tasks',    children:(
                <Card bordered={false}>
                  <Table size="small" rowKey="id" pagination={{pageSize:10}} dataSource={myTasks} columns={[
                    {title:'Task',dataIndex:'name',render:v=><Text strong>{v}</Text>},
                    {title:'Status',render:(_,row)=>getTaskStatus(row)?.name?<Tag color={getTaskStatus(row)?.color||'blue'} style={{borderRadius:100}}>{getTaskStatus(row)?.name}</Tag>:'-'},
                    {title:'Priority',render:(_,row)=>row.priority?.name?<Tag color={row.priority.color||'default'} style={{borderRadius:100}}>{row.priority.name}</Tag>:'-'},
                    {title:'Due',dataIndex:'end_date',render:(v,row)=><Space size={token.marginXS}><Text type={isOverdueTask(row)?'danger':undefined}>{formatDate(v)}</Text>{isOverdueTask(row)&&<Tag color="error" style={{borderRadius:100}}>Overdue</Tag>}</Space>},
                  ]}/>
                </Card>
              )},
              {key:'status',  label:'Statuses', children:statusTab},
              {key:'details', label:'Details',  children:detailsTab},
            ]}/>
          </div>
        </>
        )}
      </div>

      {/* ── TASK DETAIL DRAWER ───────────────────────────────────── */}
      <Drawer
        title={<Text strong style={{fontSize:token.fontSizeLG}}>{selectedTaskFresh?.name||'Task'}</Text>}
        open={Boolean(selectedTask)} onClose={()=>setSelectedTask(null)} width={520}
        extra={selectedTaskFresh&&(
          <Space>
            <Button icon={<EditOutlined />} shape="round" disabled={projectInactive} onClick={()=>openChildEditor('task',selectedTaskFresh)}>Edit</Button>
            <Button danger icon={<DeleteOutlined />} shape="round" disabled={projectInactive} onClick={()=>deleteChild('task',selectedTaskFresh)}>Delete</Button>
          </Space>
        )}
        styles={{body:{padding:token.paddingLG}}}
      >
        {selectedTaskFresh&&(
          <Space direction="vertical" size={token.marginMD} style={{width:'100%'}}>
            <Space wrap>
              {getTaskStatus(selectedTaskFresh)?.name&&<Tag color={getTaskStatus(selectedTaskFresh)?.color||'blue'} style={{borderRadius:100}}>{getTaskStatus(selectedTaskFresh)?.name}</Tag>}
              {selectedTaskFresh.priority?.name&&<Tag color={selectedTaskFresh.priority.color||'default'} style={{borderRadius:100}}>{selectedTaskFresh.priority.name}</Tag>}
              {selectedTaskFresh.milestone?.name&&<Tag icon={<FlagOutlined />} style={{borderRadius:100}}>{selectedTaskFresh.milestone.name}</Tag>}
              <ActiveTag value={selectedTaskFresh.active}/>
              {isOverdueTask(selectedTaskFresh)&&<Tag color="error" icon={<ExclamationCircleOutlined />} style={{borderRadius:100}}>Overdue</Tag>}
            </Space>

            <div style={{background:token.colorFillAlter, borderRadius:token.borderRadius, padding:`${token.paddingSM}px ${token.padding}px`}}>
              <div style={sectionLabel}>Assignees</div>
              <Avatar.Group max={{count:6}} style={{marginTop:token.marginXS}}>
                {getTaskAssignees(selectedTaskFresh).map(a=>(
                  <Tooltip key={a.id} title={getUserLabel(a.user)}>
                    <Avatar style={{background:token.colorPrimary, fontWeight:700}}>{getInitials(a.user)}</Avatar>
                  </Tooltip>
                ))}
              </Avatar.Group>
              {!getTaskAssignees(selectedTaskFresh).length&&<Text type="secondary" style={{fontSize:token.fontSizeSM}}>No assignees</Text>}
            </div>

            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="Start date">{formatDate(selectedTaskFresh.start_date)}</Descriptions.Item>
              <Descriptions.Item label="End date">{formatDate(selectedTaskFresh.end_date)}</Descriptions.Item>
              <Descriptions.Item label="Completion time">{selectedTaskFresh.completion_time??'-'}</Descriptions.Item>
            </Descriptions>

            <div>
              <div style={sectionLabel}>Description</div>
              <Paragraph style={{marginTop:token.marginXS, whiteSpace:'pre-wrap'}}>{selectedTaskFresh.description||'-'}</Paragraph>
            </div>
          </Space>
        )}
      </Drawer>

      {/* ── EDIT PROJECT MODAL ───────────────────────────────────── */}
      <Modal title="Edit Project" open={projectOpen} onCancel={()=>setProjectOpen(false)} onOk={()=>projectForm.submit()} confirmLoading={saving} width={760}>
        <Form form={projectForm} layout="vertical" onFinish={saveProject}>
          <Form.Item name="name" label="Project Name" rules={[{required:true}]}><Input/></Form.Item>
          <Row gutter={token.margin}>
            <Col xs={24} md={12}><Form.Item name="project_manager_id" label="Project Manager" rules={[{required:true}]}><Select options={optionUsers} showSearch optionFilterProp="label"/></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="status" label="Status"><Select options={PROJECT_STATUSES.map(v=>({label:humanize(v),value:v}))}/></Form.Item></Col>
          </Row>
          <Row gutter={token.margin}>
            <Col xs={24} md={12}><Form.Item name="start_date" label="Start Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} format="YYYY-MM-DD"/></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="end_date" label="End Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} format="YYYY-MM-DD"/></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3}/></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch/></Form.Item>
        </Form>
      </Modal>

      {/* ── ADD / EDIT CHILD MODAL ───────────────────────────────── */}
      <Modal title={`${editingChild?'Edit':'Add'} ${childMeta[childType]?.title||''}`} open={childOpen} onCancel={()=>setChildOpen(false)} onOk={()=>childForm.submit()} confirmLoading={saving} width={780}>
        <Form form={childForm} layout="vertical" onFinish={saveChild}>
          {renderChildFields()}
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
