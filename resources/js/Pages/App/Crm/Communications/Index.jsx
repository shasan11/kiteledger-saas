import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { api, dateText } from '../Shared/crmApi';

export default function Communications({ auth }) {
  const typeOptions = ['email', 'whatsapp', 'sms', 'call', 'meeting', 'note'].map((value) => ({ value, label: value }));
  const directionOptions = ['inbound', 'outbound', 'internal'].map((value) => ({ value, label: value }));

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Communication Hub" />
      <ReusableCrud
        title="Communication Hub"
        apiUrl={api('/api/crm-communications/')}
        columns={[
          { title: 'Subject', dataIndex: 'subject', render: (value, row) => value || row.type },
          { title: 'Type', dataIndex: 'type', width: 110 },
          { title: 'Direction', dataIndex: 'direction', width: 120 },
          { title: 'Contact', render: (_, row) => row.contact?.name || row.lead?.name || row.deal?.title || row.account?.name || '-' },
          { title: 'Date', dataIndex: 'communication_date', width: 150, render: dateText },
        ]}
        fields={[
          { name: 'type', label: 'Type', type: 'select', options: typeOptions, required: true, col: 6 },
          { name: 'direction', label: 'Direction', type: 'select', options: directionOptions, col: 6 },
          { name: 'sentiment', label: 'Sentiment', type: 'select', options: ['positive', 'neutral', 'negative'].map((value) => ({ value, label: value })), col: 6 },
          { name: 'communication_date', label: 'Date', type: 'datePicker', col: 6 },
          { name: 'account_id', label: 'Account', type: 'fkSelect', col: 8, fkUrl: api('/api/crm-accounts/'), fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
          { name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 8, fkUrl: api('/api/contacts/'), fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
          { name: 'deal_id', label: 'Deal', type: 'fkSelect', col: 8, fkUrl: api('/api/deals/'), fkValueKey: 'id', fkLabelKey: 'title', fkSearchParam: 'search' },
          { name: 'subject', label: 'Subject', type: 'text', col: 12 },
          { name: 'from', label: 'From', type: 'text', col: 6 },
          { name: 'to', label: 'To', type: 'text', col: 6 },
          { name: 'body', label: 'Body', type: 'textarea', col: 24, rows: 4 },
        ]}
        validationSchema={Yup.object({ type: Yup.string().required() })}
        crudInitialValues={{ type: 'note', direction: 'internal', sentiment: 'neutral' }}
        transformPayload={(values) => values}
        form_ui="drawer"
        drawerWidth={1000}
        enableServerPagination
        showSearch
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
      />
    </AuthenticatedLayout>
  );
}
