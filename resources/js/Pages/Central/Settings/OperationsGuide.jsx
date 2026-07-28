import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import CentralLayout from '@/Layouts/CentralLayout';
import { Link } from '@inertiajs/react';
import { Alert, Button, Col, Row, Space, Table, Typography } from 'antd';

const { Paragraph, Text, Title } = Typography;

function Command({ children }) {
    return <Paragraph copyable={{ text: children }}><Text code>{children}</Text></Paragraph>;
}

export default function OperationsGuide({ runtime, status, commands, scheduledTasks }) {
    return <CentralLayout title="Queue & Cron Guide">
        <PageHeader eyebrow="Operations documentation" title="Queue workers and cron jobs" description="Configure background delivery and scheduled platform work safely, and understand exactly what each switch changes." actions={<Link href={route('central.settings.index', { group: 'queue_scheduler' })}><Button type="primary">Open queue settings</Button></Link>}/>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}><SectionCard title="Queue processing"><Space direction="vertical"><StatusBadge value={runtime.queue_enabled ? 'active' : 'disabled'}/><Text>{runtime.queue_enabled ? 'Background jobs are queued for workers.' : 'Supported jobs run immediately in the web request.'}</Text><Text type="secondary">Connection: {runtime.queue_connection}; default queue: {runtime.default_queue}</Text><Text>Waiting jobs: {status.queued_jobs ?? 'Unavailable'} · Failed jobs: {status.failed_jobs ?? 'Unavailable'}</Text></Space></SectionCard></Col>
            <Col xs={24} md={12}><SectionCard title="Cron scheduler"><Space direction="vertical"><StatusBadge value={runtime.scheduler_enabled ? 'active' : 'disabled'}/><Text>{runtime.scheduler_enabled ? 'Scheduled tasks run on their next due tick.' : 'All application-scheduled tasks are paused.'}</Text><Text type="secondary">Last scheduler heartbeat: {status.scheduler_last_seen_at || 'Not recorded'}</Text></Space></SectionCard></Col>
        </Row>

        <Alert type="warning" showIcon message="The switches do not start operating-system processes" description="Queue enabled controls whether the application dispatches work in the background. Scheduler enabled controls whether registered scheduled tasks execute. Your server must still run a queue worker and call schedule:run every minute." style={{ marginBottom: 16 }}/>

        <SectionCard title="Queue worker setup" description="Use a persistent process manager such as Supervisor or systemd in production. Shared hosting can run the bounded worker command every minute.">
            <Title level={5}>Persistent worker</Title><Command>{commands.worker}</Command>
            <Title level={5}>Shared-hosting cron worker</Title><Command>{commands.worker_once}</Command>
            <Paragraph>Queues are processed in priority order: customer provisioning, campaigns, notifications, mail, then default work. Turning Queue enabled off takes effect immediately for newly dispatched customer setup, invoice mail, notifications, and campaign deliveries. Jobs already in the queue remain there until a worker processes them.</Paragraph>
        </SectionCard>

        <SectionCard title="Cron scheduler setup" description="Create exactly one scheduler entry. Laravel decides which individual tasks are due.">
            <Title level={5}>Linux or hosting control panel</Title><Command>{commands.scheduler}</Command>
            <Title level={5}>Windows Task Scheduler</Title><Paragraph>Run every minute from the project directory:</Paragraph><Command>{commands.windows_scheduler}</Command>
            <Paragraph>When Scheduler enabled is turned off, the next scheduler invocation skips KiteLedger tasks. Manual administrator actions—such as pausing or reactivating a subscription—still happen immediately. Automatic expiry, suspension, timed resume, invoice generation, usage collection, and publishing wait until the scheduler is enabled again.</Paragraph>
        </SectionCard>

        <SectionCard title="Scheduled task reference"><Table rowKey="name" pagination={false} dataSource={scheduledTasks} columns={[{ title: 'Task', dataIndex: 'name' }, { title: 'Frequency', dataIndex: 'frequency' }, { title: 'What it does', dataIndex: 'effect' }]} scroll={{ x: 760 }}/></SectionCard>

        <SectionCard title="Diagnostics and recovery">
            <Title level={5}>Inspect registered tasks</Title><Command>{commands.inspect_schedule}</Command>
            <Title level={5}>Inspect failed jobs</Title><Command>{commands.failed_jobs}</Command>
            <Title level={5}>Retry all failed jobs</Title><Command>{commands.retry_failed}</Command>
            <Paragraph>After changing either switch, save the settings and perform one small test: create a test customer, send a test email, or schedule a short campaign. If queue processing is on, confirm the job disappears from the waiting count. If scheduling is on, confirm the scheduler heartbeat updates within two minutes.</Paragraph>
        </SectionCard>
    </CentralLayout>;
}
