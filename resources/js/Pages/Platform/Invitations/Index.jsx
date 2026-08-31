import { MailOutlined } from '@ant-design/icons';
import PageHeader from '@/Components/Central/PageHeader';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import { PortalList, PortalListCard, PortalSection } from '@/Components/Platform/PortalListCard';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PortalInvitationsIndex({ invitations = [] }) {
    return <PlatformLayout title="Invitations">
        <PageHeader eyebrow="Access" title="Invitations" description="Organization invitations connected to your customer account." />
        <PortalSection title="Your invitations" description={`${invitations.length} invitation${invitations.length === 1 ? '' : 's'}`}>
            <PortalList emptyText="You have no organization invitations.">{invitations.map((item) => <PortalListCard
                key={item.id}
                icon={<MailOutlined />}
                title={item.organization || 'Organization invitation'}
                subtitle={`Invited as ${item.role || 'member'}`}
                badges={<StatusBadge value={item.status} />}
                meta={[
                    { label: 'Received', value: formatDate(item.created_at, true) },
                    { label: 'Expires', value: formatDate(item.expires_at, true) },
                    { label: 'Accepted', value: item.accepted_at ? formatDate(item.accepted_at, true) : '-' },
                ]}
            />)}</PortalList>
        </PortalSection>
    </PlatformLayout>;
}
