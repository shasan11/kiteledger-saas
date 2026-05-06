import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function BillOfMaterialsShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Bill of Materials"
            endpoint="/api/bills-of-material/"
            backRoute="inventory.bill-of-materials.index"
            backLabel="Back to Bill of Materials"
            titleField="name"
            subtitleField="description"
        />
    );
}
