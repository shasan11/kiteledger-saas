import InventoryRecordShow from '@/Pages/App/Inventory/Shared/InventoryRecordShow';

export default function InventoryAdjustmentShow({ id }) {
    return (
        <InventoryRecordShow
            id={id}
            title="Inventory Adjustment"
            endpoint="/api/inventory-adjustments/"
            backRoute="inventory.adjustments.index"
            backLabel="Back to Inventory Adjustments"
            documentType="inventory_adjustment"
        />
    );
}
