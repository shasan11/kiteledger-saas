import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function ProductShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Product"
            endpoint="/api/products/"
            backRoute="inventory.products.index"
            backLabel="Back to Products"
            titleField="name"
            subtitleField="sku"
        />
    );
}
