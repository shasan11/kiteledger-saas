import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function InventoryAdjustmentShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Inventory Adjustment"
            endpoint="/api/inventory-adjustments/"
            backRoute="inventory.adjustments.index"
            backLabel="Back to Inventory Adjustments"
            titleField="adjustment_no"
            subtitleField="reason"
        />
    );
}
