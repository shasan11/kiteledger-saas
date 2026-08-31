import { FileAddOutlined, PlusOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import { PortalList, PortalListCard, PortalSection } from '@/Components/Platform/PortalListCard';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function OrganizationRequestsIndex({ requests = [] }) {
    return <PlatformLayout title="Requests">
        <PageHeader eyebrow="Organization access" title="Requests" description="Track requests for new KiteLedger organizations." actions={<Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => router.visit(route('central.account.requests.create'))}>Add new organization</Button>} />
        <PortalSection title="Organization requests" description={`${requests.length} request${requests.length === 1 ? '' : 's'}`}>
            <PortalList emptyText="No organization requests yet.">{requests.map((item) => <PortalListCard
                key={item.id}
                icon={<FileAddOutlined />}
                title={item.company_name}
                subtitle={item.legal_name || item.contact_email}
                badges={<StatusBadge value={item.status} />}
                meta={[
                    { label: 'Submitted', value: formatDate(item.created_at, true) },
                    { label: 'Country', value: item.country || '-' },
                    { label: 'Contact', value: item.contact_email },
                ]}
            />)}</PortalList>
        </PortalSection>
    </PlatformLayout>;
}
