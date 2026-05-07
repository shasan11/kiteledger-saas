import InventoryRecordShow from '@/Pages/App/Inventory/Shared/InventoryRecordShow';

export default function ProductionOrderShow({ id }) {
    return (
        <InventoryRecordShow
            id={id}
            title="Production Order"
            endpoint="/api/production-orders/"
            backRoute="inventory.production-orders.index"
            backLabel="Back to Production Orders"
            documentType="production_order"
        />
    );
}
