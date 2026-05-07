import InventoryRecordShow from '@/Pages/App/Inventory/Shared/InventoryRecordShow';

export default function BillOfMaterialsShow({ id }) {
    return (
        <InventoryRecordShow
            id={id}
            title="Bill of Materials"
            endpoint="/api/bills-of-material/"
            backRoute="inventory.bill-of-materials.index"
            backLabel="Back to Bill of Materials"
            documentType="bom"
        />
    );
}
