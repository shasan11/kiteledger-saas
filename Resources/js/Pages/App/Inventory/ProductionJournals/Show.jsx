import InventoryRecordShow from '@/Pages/App/Inventory/Shared/InventoryRecordShow';

export default function ProductionJournalShow({ id }) {
    return (
        <InventoryRecordShow
            id={id}
            title="Production Journal"
            endpoint="/api/production-journals/"
            backRoute="inventory.production-journals.index"
            backLabel="Back to Production Journals"
            documentType="production_journal"
        />
    );
}
