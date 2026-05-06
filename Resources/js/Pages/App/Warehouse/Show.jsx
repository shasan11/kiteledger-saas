import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function WarehouseShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Warehouse"
            endpoint="/api/warehouses/"
            backRoute="warehouse.index"
            backLabel="Back to Warehouses"
            titleField="name"
            subtitleField="code"
        />
    );
}
