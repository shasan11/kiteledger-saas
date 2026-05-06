import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function PurchaseOrderShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Purchase Order"
            endpoint="/api/purchase-orders/"
            backRoute="payment-out.purchase-orders.index"
            backLabel="Back to Purchase Orders"
            titleField="purchase_order_no"
            subtitleField="reference"
        />
    );
}
