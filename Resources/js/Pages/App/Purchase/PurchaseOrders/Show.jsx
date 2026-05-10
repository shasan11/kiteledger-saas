import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function PurchaseOrderShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Purchase Order"
            endpoint="/api/purchase-orders/"
            backRoute="payment-out.purchase-orders.index"
            backLabel="Back to Purchase Orders"
            documentType="purchase_order"
            editRoute="payment-out.purchase-orders.edit"
        />
    );
}
