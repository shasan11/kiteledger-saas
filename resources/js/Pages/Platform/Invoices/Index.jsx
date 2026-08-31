import { FileTextOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Pagination, Segmented } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, formatMoney } from '@/Components/Central/formatters';
import { PortalList, PortalListCard, PortalSection } from '@/Components/Platform/PortalListCard';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PortalInvoicesIndex({ invoices, filter = 'unpaid', counts = {} }) {
    const rows = invoices?.data || [];
    const changeFilter = (status) => router.get(route('central.account.invoices.index'), { status }, { preserveState: true, preserveScroll: true, replace: true });
    return <PlatformLayout title="Invoices">
        <PageHeader eyebrow="Billing" title="Invoices" description="Invoices across every organization you are allowed to view." />
        <PortalSection
            title={filter === 'paid' ? 'Paid invoices' : 'Unpaid invoices'}
            description={`${invoices?.total || 0} invoice${invoices?.total === 1 ? '' : 's'}`}
            action={<Segmented className="portal-status-filter" value={filter} onChange={changeFilter} options={[
                { label: <span>Unpaid <b>{counts.unpaid || 0}</b></span>, value: 'unpaid' },
                { label: <span>Paid <b>{counts.paid || 0}</b></span>, value: 'paid' },
            ]} />}
        >
            <PortalList emptyText="No invoices are available for your organizations.">{rows.map((item) => <PortalListCard
                key={item.id}
                icon={<FileTextOutlined />}
                title={item.invoice_number}
                subtitle={item.organization}
                badges={<StatusBadge value={item.status} />}
                meta={[
                    { label: 'Issued', value: formatDate(item.issue_date) },
                    { label: 'Due', value: formatDate(item.due_date) },
                    { label: 'Total', value: formatMoney(item.total, item.currency) },
                    { label: 'Balance', value: formatMoney(item.balance, item.currency) },
                ]}
                actions={<Button onClick={() => router.visit(route('central.account.tenants.billing.invoice', { tenant: item.tenant_id, invoice: item.id }))}>View invoice</Button>}
            />)}</PortalList>
            {invoices?.last_page > 1 && <Pagination style={{ marginTop: 18, textAlign: 'right' }} current={invoices.current_page} total={invoices.total} pageSize={invoices.per_page} showSizeChanger={false} onChange={(page) => router.get(route('central.account.invoices.index'), { page, status: filter }, { preserveState: true, preserveScroll: true })} />}
        </PortalSection>
    </PlatformLayout>;
}
