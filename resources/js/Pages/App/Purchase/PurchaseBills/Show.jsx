import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

export default function PurchaseBillShow({ id }) {
    return (
        <PaymentOutRecordShow
            id={id}
            title="Purchase Bill"
            endpoint="/api/purchase-bills/"
            backRoute="payment-out.purchase-bills.index"
            backLabel="Back to Purchase Bills"
            documentType="purchase_bill"
            editRoute="payment-out.purchase-bills.edit"
        />
    );
}
