import InventoryRecordShow from '@/Pages/App/Inventory/Shared/InventoryRecordShow';

export default function WarehouseTransferShow({ id }) {
    return (
        <InventoryRecordShow
            id={id}
            title="Warehouse Transfer"
            endpoint="/api/warehouse-transfers/"
            backRoute="inventory.warehouse-transfers.index"
            backLabel="Back to Warehouse Transfers"
            documentType="warehouse_transfer"
        />
    );
}
