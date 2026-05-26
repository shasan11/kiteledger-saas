import ManufacturingShow from '@/Pages/App/Inventory/Shared/ManufacturingShow';

export default function ProductionJournalShow({ id, ...props }) {
    return <ManufacturingShow id={id} documentType="production_journal" {...props} />;
}
