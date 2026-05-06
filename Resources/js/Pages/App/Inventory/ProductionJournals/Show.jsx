import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function ProductionJournalShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Production Journal"
            endpoint="/api/production-journals/"
            backRoute="inventory.production-journals.index"
            backLabel="Back to Production Journals"
            titleField="journal_no"
            subtitleField="description"
        />
    );
}
