import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

export default function PurchaseOrderShow({ id }) {
    return (
        <PaymentOutRecordShow
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