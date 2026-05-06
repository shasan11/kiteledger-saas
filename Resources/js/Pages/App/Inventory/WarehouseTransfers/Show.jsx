import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function WarehouseTransferShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Warehouse Transfer"
            endpoint="/api/warehouse-transfers/"
            backRoute="inventory.warehouse-transfers.index"
            backLabel="Back to Warehouse Transfers"
            titleField="transfer_no"
            subtitleField="reference"
        />
    );
}
